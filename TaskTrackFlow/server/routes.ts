import express, { Router, type Express } from "express";
import { createServer, type Server } from "http";
import { storage as dbStorage } from "./storage";
import { insertPostSchema, insertCommentSchema, insertLikeSchema, follows } from "@shared/schema";
import { z } from "zod";
import { setupAuth } from "./auth";
import multer from "multer";
import path from "path";
import fs from "fs";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { users, trending } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication
  setupAuth(app);
  const apiRouter = Router();
  
  // Set up multer for file uploads
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  
  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      cb(null, uniqueSuffix + ext);
    }
  });
  
  const upload = multer({ 
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WEBP are allowed.') as any);
      }
    }
  });
  
  // User endpoints
  apiRouter.get("/users", async (req, res) => {
    const users = await dbStorage.getUsers();
    res.json(users);
  });
  
  apiRouter.get("/users/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const user = await dbStorage.getUser(id);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    res.json(user);
  });
  
  apiRouter.get("/users/username/:username", async (req, res) => {
    const username = req.params.username;
    const user = await dbStorage.getUserByUsername(username);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    res.json(user);
  });
  
  // Post endpoints
  apiRouter.get("/posts", async (req, res) => {
    const currentUserId = req.user?.id || null;
    console.log(`Current user ID from session in /api/posts: ${currentUserId}`);
    const posts = await dbStorage.getPosts(currentUserId);
    res.json(posts);
  });
  
  apiRouter.post("/posts", async (req, res) => {
    try {
      const postData = insertPostSchema.parse(req.body);
      const post = await dbStorage.createPost(postData);
      
      // If this is a repost, create a notification for the original post's author
      if (post.originalPostId) {
        const originalPost = await dbStorage.getPostById(post.originalPostId);
        if (originalPost && originalPost.userId !== post.userId) {
          await dbStorage.createNotification({
            userId: originalPost.userId,
            sourceUserId: post.userId,
            type: "repost",
            postId: post.id
          });
        }
      }
      
      // Process hashtags and update trending topics - support for Turkish characters
      const hashtags = post.content.match(/#[a-zA-Z0-9ğüşöçıİĞÜŞÖÇ_-]+/g) || [];
      
      for (const hashtag of hashtags) {
        const [existing] = await db
          .select()
          .from(trending)
          .where(eq(trending.topic, hashtag));
        
        const currentCount = existing ? existing.postCount : 0;
        await dbStorage.updateTrendingCount(hashtag, currentCount + 1);
      }
      
      const postWithUser = await dbStorage.getPostById(post.id);
      res.status(201).json(postWithUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid post data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create post" });
    }
  });
  
  apiRouter.get("/posts/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid post ID" });
      }
      
      const currentUserId = req.user?.id || null;
      const post = await dbStorage.getPostById(id, currentUserId);
      
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }
      
      res.json(post);
    } catch (error) {
      console.error("Error fetching post by ID:", error);
      res.status(500).json({ message: "Failed to fetch post" });
    }
  });
  
  apiRouter.get("/posts/user/:userId", async (req, res) => {
    const userId = parseInt(req.params.userId);
    const currentUserId = req.user?.id || null;
    const posts = await dbStorage.getPostsByUserId(userId, currentUserId);
    res.json(posts);
  });
  
  apiRouter.get("/posts/search", async (req, res) => {
    try {
      const query = req.query.q as string || "";
      if (!query.trim()) {
        return res.json([]);
      }
      const currentUserId = req.user?.id || null;
      const posts = await dbStorage.searchPosts(query, currentUserId);
      res.json(posts);
    } catch (error) {
      console.error("Error searching posts:", error);
      res.status(500).json({ message: "Failed to search posts" });
    }
  });
  
  // Comment endpoints
  apiRouter.post("/comments", async (req, res) => {
    try {
      const commentData = insertCommentSchema.parse(req.body);
      const comment = await dbStorage.createComment(commentData);
      
      const comments = await dbStorage.getCommentsByPostId(comment.postId);
      const userComment = comments.find((c: any) => c.id === comment.id);
      
      res.status(201).json(userComment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid comment data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create comment" });
    }
  });
  
  apiRouter.get("/comments/post/:postId", async (req, res) => {
    const postId = parseInt(req.params.postId);
    const comments = await dbStorage.getCommentsByPostId(postId);
    res.json(comments);
  });
  
  // Like endpoints
  apiRouter.post("/likes", async (req, res) => {
    try {
      const likeData = insertLikeSchema.parse(req.body);
      const like = await dbStorage.createLike(likeData);
      const currentUserId = req.user?.id || null;
      
      const post = await dbStorage.getPostById(like.postId, currentUserId);
      res.status(201).json(post);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid like data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create like" });
    }
  });
  
  apiRouter.delete("/likes/:postId/:userId", async (req, res) => {
    const postId = parseInt(req.params.postId);
    const userId = parseInt(req.params.userId);
    const currentUserId = req.user?.id || null;
    
    await dbStorage.deleteLike(postId, userId);
    
    const post = await dbStorage.getPostById(postId, currentUserId);
    res.json(post);
  });

  // Follow routes
  app.post('/api/follows', async (req, res) => {
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { followingId } = req.body;
    await db.insert(follows).values({
      followerId: userId,
      followingId
    });

    res.json({ success: true });
  });

  app.delete('/api/follows/:id', async (req, res) => {
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await db.delete(follows)
      .where(and(
        eq(follows.followerId, userId),
        eq(follows.followingId, parseInt(req.params.id))
      ));

    res.json({ success: true });
  });

  app.get('/api/users/:id/follow-stats', async (req, res) => {
    const userId = parseInt(req.params.id);
    
    const followers = await db.select()
      .from(follows)
      .where(eq(follows.followingId, userId));

    const following = await db.select()
      .from(follows)
      .where(eq(follows.followerId, userId));

    res.json({
      followers: followers.length,
      following: following.length
    });
  });


  
  // Notification endpoints
  apiRouter.get("/notifications/user/:userId", async (req, res) => {
    const userId = parseInt(req.params.userId);
    const notifications = await dbStorage.getNotificationsByUserId(userId);
    res.json(notifications);
  });
  
  apiRouter.patch("/notifications/:id/read", async (req, res) => {
    const id = parseInt(req.params.id);
    await dbStorage.markNotificationAsRead(id);
    res.json({ success: true });
  });
  
  // Trending endpoints
  apiRouter.get("/trending", async (req, res) => {
    const trending = await dbStorage.getTrending();
    res.json(trending);
  });

  // Message endpoints
  apiRouter.post("/messages", async (req, res) => {
    try {
      const { receiverId, content } = req.body;
      const senderId = req.user?.id;

      if (!senderId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const message = await dbStorage.createMessage({
        senderId,
        receiverId,
        content
      });

      res.status(201).json(message);
    } catch (error) {
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  apiRouter.get("/messages/conversations", async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const conversations = await dbStorage.getConversations(userId);
      res.json(conversations);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  apiRouter.get("/messages/conversation/:userId", async (req, res) => {
    try {
      const currentUserId = req.user?.id;
      const otherUserId = parseInt(req.params.userId);

      if (!currentUserId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const messages = await dbStorage.getConversationMessages(currentUserId, otherUserId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });
  
  apiRouter.get("/posts/hashtag/:topic", async (req, res) => {
    try {
      const topic = req.params.topic;
      if (!topic) {
        return res.status(400).json({ message: "Topic parameter is required" });
      }
      const currentUserId = req.user?.id || null;
      const posts = await dbStorage.searchPosts(topic, currentUserId);
      res.json(posts);
    } catch (error) {
      console.error("Error fetching posts by hashtag:", error);
      res.status(500).json({ message: "Failed to fetch posts by hashtag" });
    }
  });
  
  // Bot post endpoint
  apiRouter.post("/bot/posts", async (req, res) => {
    try {
      // Get bot user
      const botUser = await dbStorage.getUserByUsername("ConnecTEDBot");
      if (!botUser) {
        // Create bot user if doesn't exist
        const botUser = await dbStorage.createUser({
          username: "ConnecTEDBot",
          password: "secure-bot-password-" + Date.now(),
          displayName: "ConnecTED Bot",
          avatarColor: "#FF6B6B",
          avatarInitial: "B",
          isVerified: true
        });
      }

      const postContent = [
        "ConnecTED ile etkileşime geçmek için hemen post atın! 🚀",
        "Yeni fikirlerinizi ConnecTED'de paylaşın ✨",
        "ConnecTED topluluğuna katılın ve ağınızı genişletin 🌐",
        "Günün en popüler konularını keşfedin #trending",
        "ConnecTED'de neler oluyor? Hemen göz atın!"
      ];

      const randomPost = postContent[Math.floor(Math.random() * postContent.length)];
      
      const post = await dbStorage.createPost({
        userId: botUser.id,
        content: randomPost
      });

      res.status(201).json(post);
    } catch (error) {
      console.error("Bot post error:", error);
      res.status(500).json({ message: "Failed to create bot post" });
    }
  });

  // Delete post endpoint
  apiRouter.delete("/posts/:id", async (req, res) => {
    try {
      const postId = parseInt(req.params.id);
      if (isNaN(postId)) {
        return res.status(400).json({ message: "Invalid post ID" });
      }
      
      // Get the post to verify ownership
      const currentUserId = req.user?.id || null;
      const post = await dbStorage.getPostById(postId, currentUserId);
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }
      
      // Check if the current user is the owner of the post
      if (req.user?.id !== post.userId) {
        return res.status(403).json({ message: "You can only delete your own posts" });
      }
      
      await dbStorage.deletePost(postId);
      res.status(200).json({ message: "Post deleted successfully" });
    } catch (error) {
      console.error("Error deleting post:", error);
      res.status(500).json({ message: "Failed to delete post" });
    }
  });
  
  // Delete last 5 posts endpoint (including quotes/reposts)
  apiRouter.delete("/posts/user/last-five", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const userId = req.user.id;
      
      // Get the user's posts sorted by creation date (newest first)
      const posts = await dbStorage.getPostsByUserId(userId, userId);
      
      // Get the last 5 posts (or all if less than 5)
      const postsToDelete = posts.slice(0, 5);
      
      if (postsToDelete.length === 0) {
        return res.status(200).json({ message: "No posts to delete" });
      }
      
      // Delete each post
      for (const post of postsToDelete) {
        await dbStorage.deletePost(post.id);
      }
      
      res.status(200).json({ 
        message: `Successfully deleted ${postsToDelete.length} posts`, 
        deletedCount: postsToDelete.length,
        deletedPosts: postsToDelete.map(p => p.id)
      });
    } catch (error) {
      console.error("Error deleting last 5 posts:", error);
      res.status(500).json({ message: "Failed to delete posts" });
    }
  });
  
  // Update post endpoint
  apiRouter.patch("/posts/:id", async (req, res) => {
    try {
      const postId = parseInt(req.params.id);
      if (isNaN(postId)) {
        return res.status(400).json({ message: "Invalid post ID" });
      }
      
      const { content } = req.body;
      if (!content || typeof content !== 'string') {
        return res.status(400).json({ message: "Content is required" });
      }
      
      // Get the post to verify ownership
      const currentUserId = req.user?.id || null;
      const post = await dbStorage.getPostById(postId, currentUserId);
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }
      
      // Check if the current user is the owner of the post
      if (req.user?.id !== post.userId) {
        return res.status(403).json({ message: "You can only edit your own posts" });
      }
      
      const updatedPost = await dbStorage.updatePost(postId, content);
      res.status(200).json(updatedPost);
    } catch (error) {
      console.error("Error updating post:", error);
      res.status(500).json({ message: "Failed to update post" });
    }
  });
  
  // Profile image upload endpoint
  apiRouter.post("/users/:id/profile-image", upload.single('image'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      const userId = parseInt(req.params.id);
      const user = await dbStorage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Format the URL
      const imageUrl = `/uploads/${req.file.filename}`;
      
      // Update the user's profile image URL in the database
      await db.update(users)
        .set({ profileImageUrl: imageUrl })
        .where(eq(users.id, userId));
      
      // Get the updated user
      const updatedUser = await dbStorage.getUser(userId);
      
      res.json(updatedUser);
    } catch (error) {
      console.error("Error uploading profile image:", error);
      res.status(500).json({ message: "Failed to upload profile image" });
    }
  });
  
  // Serve uploaded files
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
  
  app.use("/api", apiRouter);
  
  const httpServer = createServer(app);
  
  return httpServer;
}
