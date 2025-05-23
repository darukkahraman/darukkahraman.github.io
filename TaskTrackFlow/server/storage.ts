import {
  User, InsertUser,
  Post, InsertPost,
  Comment, InsertComment,
  Like, InsertLike,
  Notification, InsertNotification,
  Trending, InsertTrending,
  PostWithUser, CommentWithUser, NotificationWithUsers,
  users, posts, comments, likes, notifications, trending, messages
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, like as dbLike, SQL, sql, or } from "drizzle-orm";

import session from "express-session";
import createPgSessionStore from "connect-pg-simple";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUsers(): Promise<User[]>;

  // Post operations
  createPost(post: InsertPost): Promise<Post>;
  getPosts(currentUserId?: number | null): Promise<PostWithUser[]>;
  getPostById(id: number, currentUserId?: number | null): Promise<PostWithUser | undefined>;
  getPostsByUserId(userId: number, currentUserId?: number | null): Promise<PostWithUser[]>;
  searchPosts(query: string, currentUserId?: number | null): Promise<PostWithUser[]>;
  deletePost(id: number): Promise<void>;
  updatePost(id: number, content: string): Promise<PostWithUser>;

  // Comment operations
  createComment(comment: InsertComment): Promise<Comment>;
  getCommentsByPostId(postId: number): Promise<CommentWithUser[]>;

  // Like operations
  createLike(like: InsertLike): Promise<Like>;
  deleteLike(postId: number, userId: number): Promise<void>;
  getLikesByPostId(postId: number): Promise<Like[]>;
  getLikesByUserId(userId: number): Promise<Like[]>;
  getLikeByPostAndUser(postId: number, userId: number): Promise<Like | undefined>;

  // Notification operations
  createNotification(notification: InsertNotification): Promise<Notification>;
  getNotificationsByUserId(userId: number): Promise<NotificationWithUsers[]>;
  markNotificationAsRead(id: number): Promise<void>;

  // Trending operations
  createTrending(trending: InsertTrending): Promise<Trending>;
  getTrending(): Promise<Trending[]>;
  updateTrendingCount(topic: string, count: number): Promise<Trending>;

  // Message operations
  createMessage(message: { senderId: number; receiverId: number; content: string }): Promise<any>;
  getConversations(userId: number): Promise<any[]>;
  getConversationMessages(userId1: number, userId2: number): Promise<any[]>;

  // Session storage
  sessionStore: session.Store;
}

// Database Storage Implementation
export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    const PostgresSessionStore = createPgSessionStore(session);

    this.sessionStore = new PostgresSessionStore({
      conObject: { connectionString: process.env.DATABASE_URL },
      tableName: 'user_sessions',
      createTableIfMissing: true
    });
  }
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async getUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  // Post operations
  async createPost(post: InsertPost): Promise<Post> {
    const [newPost] = await db.insert(posts).values(post).returning();

    // Extract hashtags and update trending
    const hashtags = newPost.content.match(/#\w+/g) || [];
    for (const hashtag of hashtags) {
      const [existingTrending] = await db
        .select()
        .from(trending)
        .where(eq(trending.topic, hashtag));

      if (existingTrending) {
        await this.updateTrendingCount(hashtag, existingTrending.postCount + 1);
      } else {
        await this.createTrending({ topic: hashtag, postCount: 1 });
      }
    }

    return newPost;
  }

  async getPosts(currentUserId: number | null = null): Promise<PostWithUser[]> {
    const allPosts = await db.select().from(posts).orderBy(desc(posts.createdAt));

    return Promise.all(allPosts.map(async post => {
      const [user] = await db.select().from(users).where(eq(users.id, post.userId));
      const postLikes = await this.getLikesByPostId(post.id);
      const postComments = await this.getCommentsByPostId(post.id);

      let originalPost: PostWithUser | undefined = undefined;

      if (post.originalPostId) {
        originalPost = await this.getPostById(post.originalPostId);
      }

      return {
        ...post,
        user: user!,
        likeCount: postLikes.length,
        commentCount: postComments.length,
        isLiked: currentUserId ? postLikes.some(like => like.userId === currentUserId) : false,
        comments: postComments,
        originalPost,
        isRepost: !!post.originalPostId
      };
    }));
  }

  async getPostById(id: number, currentUserId: number | null = null): Promise<PostWithUser | undefined> {
    try {
      if (isNaN(id)) {
        console.error("Invalid post ID (NaN) passed to getPostById");
        return undefined;
      }

      const [post] = await db.select().from(posts).where(eq(posts.id, id));
      if (!post) return undefined;

      const [user] = await db.select().from(users).where(eq(users.id, post.userId));
      const postLikes = await this.getLikesByPostId(post.id);
      const postComments = await this.getCommentsByPostId(post.id);

      let originalPost: PostWithUser | undefined = undefined;

      if (post.originalPostId && post.originalPostId !== post.id) { // Prevent recursive loops
        // We need to avoid infinite recursion by not fetching the original post's original post
        const [origPost] = await db.select().from(posts).where(eq(posts.id, post.originalPostId));
        if (origPost) {
          const [origUser] = await db.select().from(users).where(eq(users.id, origPost.userId));
          const origPostLikes = await this.getLikesByPostId(origPost.id);
          const origPostComments = await this.getCommentsByPostId(origPost.id);

          originalPost = {
            ...origPost,
            user: origUser!,
            likeCount: origPostLikes.length,
            commentCount: origPostComments.length,
            isLiked: currentUserId ? origPostLikes.some(like => like.userId === currentUserId) : false,
            comments: origPostComments,
            isRepost: false
          };
        }
      }

      return {
        ...post,
        user: user!,
        likeCount: postLikes.length,
        commentCount: postComments.length,
        isLiked: currentUserId ? postLikes.some(like => like.userId === currentUserId) : false,
        comments: postComments,
        originalPost,
        isRepost: !!post.originalPostId
      };
    } catch (error) {
      console.error("Error in getPostById:", error);
      return undefined;
    }
  }

  async deletePost(id: number): Promise<void> {
    try {
      // Check if the post is a repost/alıntı
      const [post] = await db.select().from(posts).where(eq(posts.id, id));

      // First delete all comments and likes associated with the post
      await db.delete(comments).where(eq(comments.postId, id));
      await db.delete(likes).where(eq(likes.postId, id));

      // Delete notifications related to this post
      await db.delete(notifications).where(eq(notifications.postId, id));

      // Delete reposts of this post if it's an original post
      await db.delete(posts).where(eq(posts.originalPostId, id));

      // Delete the post itself
      await db.delete(posts).where(eq(posts.id, id));

      console.log(`Post ID ${id} deleted successfully`);
    } catch (error) {
      console.error("Error in deletePost:", error);
      throw new Error("Failed to delete post");
    }
  }

  async updatePost(id: number, content: string): Promise<PostWithUser> {
    try {
      await db.update(posts)
        .set({ content })
        .where(eq(posts.id, id));

      const updatedPost = await this.getPostById(id);
      if (!updatedPost) {
        throw new Error("Post not found after update");
      }

      // Update trending topics
      // First, extract hashtags from the updated content
      const hashtags = content.match(/#[a-zA-Z0-9ğüşöçıİĞÜŞÖÇ_-]+/g) || [];

      for (const hashtag of hashtags) {
        const [existing] = await db
          .select()
          .from(trending)
          .where(eq(trending.topic, hashtag));

        const currentCount = existing ? existing.postCount : 0;
        await this.updateTrendingCount(hashtag, currentCount + 1);
      }

      return updatedPost;
    } catch (error) {
      console.error("Error in updatePost:", error);
      throw new Error("Failed to update post");
    }
  }

  async getPostsByUserId(userId: number, currentUserId: number | null = null): Promise<PostWithUser[]> {
    const userPosts = await db
      .select()
      .from(posts)
      .where(eq(posts.userId, userId))
      .orderBy(desc(posts.createdAt));

    return Promise.all(userPosts.map(async post => {
      const [user] = await db.select().from(users).where(eq(users.id, post.userId));
      const postLikes = await this.getLikesByPostId(post.id);
      const postComments = await this.getCommentsByPostId(post.id);

      let originalPost: PostWithUser | undefined = undefined;

      if (post.originalPostId) {
        originalPost = await this.getPostById(post.originalPostId, currentUserId);
      }

      return {
        ...post,
        user: user!,
        likeCount: postLikes.length,
        commentCount: postComments.length,
        isLiked: currentUserId ? postLikes.some(like => like.userId === currentUserId) : false,
        comments: postComments,
        originalPost,
        isRepost: !!post.originalPostId
      };
    }));
  }

  async searchPosts(query: string, currentUserId: number | null = null): Promise<PostWithUser[]> {
    if (!query.trim()) return [];

    const searchQuery = `%${query.toLowerCase()}%`;
    const searchResults = await db
      .select()
      .from(posts)
      .where(dbLike(sql`LOWER(${posts.content})`, searchQuery))
      .orderBy(desc(posts.createdAt));

    return Promise.all(searchResults.map(async post => {
      const [user] = await db.select().from(users).where(eq(users.id, post.userId));
      const postLikes = await this.getLikesByPostId(post.id);
      const postComments = await this.getCommentsByPostId(post.id);

      // Handle reposts
      let originalPost: PostWithUser | undefined = undefined;

      if (post.originalPostId) {
        originalPost = await this.getPostById(post.originalPostId, currentUserId);
      }

      return {
        ...post,
        user: user!,
        likeCount: postLikes.length,
        commentCount: postComments.length,
        isLiked: currentUserId ? postLikes.some(like => like.userId === currentUserId) : false,
        comments: postComments,
        originalPost,
        isRepost: !!post.originalPostId
      };
    }));
  }

  // Comment operations
  async createComment(comment: InsertComment): Promise<Comment> {
    const [newComment] = await db.insert(comments).values(comment).returning();

    // Create notification for post owner
    const [post] = await db.select().from(posts).where(eq(posts.id, comment.postId));
    if (post && post.userId !== comment.userId) {
      await this.createNotification({
        userId: post.userId,
        sourceUserId: comment.userId,
        type: "comment",
        postId: comment.postId
      });
    }

    return newComment;
  }

  async getCommentsByPostId(postId: number): Promise<CommentWithUser[]> {
    const postComments = await db
      .select()
      .from(comments)
      .where(eq(comments.postId, postId))
      .orderBy(desc(comments.createdAt));

    return Promise.all(postComments.map(async comment => {
      const [user] = await db.select().from(users).where(eq(users.id, comment.userId));
      return { ...comment, user: user! };
    }));
  }

  // Like operations
  async createLike(like: InsertLike): Promise<Like> {
    // Check if already liked
    const existing = await this.getLikeByPostAndUser(like.postId, like.userId);
    if (existing) return existing;

    const [newLike] = await db.insert(likes).values(like).returning();

    // Create notification for post owner
    const [post] = await db.select().from(posts).where(eq(posts.id, like.postId));
    if (post && post.userId !== like.userId) {
      await this.createNotification({
        userId: post.userId,
        sourceUserId: like.userId,
        type: "like",
        postId: like.postId
      });
    }

    return newLike;
  }

  async deleteLike(postId: number, userId: number): Promise<void> {
    await db
      .delete(likes)
      .where(
        and(
          eq(likes.postId, postId),
          eq(likes.userId, userId)
        )
      );
  }

  async getLikesByPostId(postId: number): Promise<Like[]> {
    return db
      .select()
      .from(likes)
      .where(eq(likes.postId, postId));
  }

  async getLikesByUserId(userId: number): Promise<Like[]> {
    return db
      .select()
      .from(likes)
      .where(eq(likes.userId, userId));
  }

  async getLikeByPostAndUser(postId: number, userId: number): Promise<Like | undefined> {
    const [like] = await db
      .select()
      .from(likes)
      .where(
        and(
          eq(likes.postId, postId),
          eq(likes.userId, userId)
        )
      );
    return like;
  }

  // Notification operations
  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [newNotification] = await db
      .insert(notifications)
      .values({ ...notification, read: false })
      .returning();
    return newNotification;
  }

  async getNotificationsByUserId(userId: number): Promise<NotificationWithUsers[]> {
    const userNotifications = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));

    return Promise.all(userNotifications.map(async notification => {
      const [sourceUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, notification.sourceUserId));

      let post;
      if (notification.postId) {
        const [postFound] = await db
          .select()
          .from(posts)
          .where(eq(posts.id, notification.postId));
        post = postFound;
      }

      return {
        ...notification,
        sourceUser: sourceUser!,
        post
      };
    }));
  }

  async markNotificationAsRead(id: number): Promise<void> {
    await db
      .update(notifications)
      .set({ read: true })
      .where(eq(notifications.id, id));
  }

  // Trending operations
  async createTrending(trendingData: InsertTrending): Promise<Trending> {
    try {
      const [newTrending] = await db
        .insert(trending)
        .values({
          topic: trendingData.topic,
          postCount: trendingData.postCount
        })
        .returning();
      return newTrending;
    } catch (error) {
      console.error("Error creating trending:", error);
      throw error;
    }
  }

  async getTrending(): Promise<Trending[]> {
    return db
      .select()
      .from(trending)
      .orderBy(desc(trending.postCount))
      .limit(10);
  }

  async updateTrendingCount(topic: string, count: number): Promise<Trending> {
    const [existing] = await db
      .select()
      .from(trending)
      .where(eq(trending.topic, topic));

    if (existing) {
      const [updated] = await db
        .update(trending)
        .set({ postCount: count })
        .where(eq(trending.topic, topic))
        .returning();
      return updated;
    }

    return this.createTrending({ topic, postCount: count });
  }

  async createMessage(message: { senderId: number; receiverId: number; content: string }) {
    const [newMessage] = await db
      .insert(messages)
      .values(message)
      .returning();
    return newMessage;
  }

  async getConversations(userId: number) {
    const userMessages = await db
      .select()
      .from(messages)
      .where(
        or(
          eq(messages.senderId, userId),
          eq(messages.receiverId, userId)
        )
      )
      .orderBy(desc(messages.createdAt));

    const conversationUsers = new Set<number>();
    const conversations = [];

    for (const message of userMessages) {
      const otherUserId = message.senderId === userId ? message.receiverId : message.senderId;

      if (!conversationUsers.has(otherUserId)) {
        conversationUsers.add(otherUserId);
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.id, otherUserId));

        conversations.push({
          userId: otherUserId,
          user,
          lastMessage: message
        });
      }
    }

    return conversations;
  }

  async getConversationMessages(userId1: number, userId2: number) {
    return db
      .select()
      .from(messages)
      .where(
        or(
          and(
            eq(messages.senderId, userId1),
            eq(messages.receiverId, userId2)
          ),
          and(
            eq(messages.senderId, userId2),
            eq(messages.receiverId, userId1)
          )
        )
      )
      .orderBy(messages.createdAt);
  }

  // Helper function to initialize data
  async initializeData() {
    try {
      // Check if we already have users
      const existingUsers = await this.getUsers();
      if (existingUsers.length > 0) {
        console.log('Database already has data, skipping initialization');
        return;
      }

      console.log('Initializing database with sample data');

      // Create initial users
      const users = [
        {
          username: "darukkahraman",
          password: "password",
          displayName: "Daruk Kahraman",
          avatarColor: "#0085ff",
          avatarInitial: "D"
        },
        {
          username: "newsBot",
          password: "password",
          displayName: "News Bot",
          avatarColor: "#FF6B6B",
          avatarInitial: "📰"
        },
        {
          username: "weatherBot",
          password: "password",
          displayName: "Weather Bot",
          avatarColor: "#4ECDC4",
          avatarInitial: "🌤"
        },
        {
          username: "cryptoBot",
          password: "password",
          displayName: "Crypto Bot",
          avatarColor: "#45B7D1",
          avatarInitial: "💰"
        },
        {
          username: "techBot",
          password: "password",
          displayName: "Tech Bot",
          avatarColor: "#96CEB4",
          avatarInitial: "💻"
        }
      ];

      const createdUsers = await Promise.all(users.map(user => this.createUser(user)));

      // Create initial posts
      const posts = [
        {
          userId: 2, // newsBot
          content: "Breaking: New quantum computing breakthrough announced! Scientists at MIT have developed a stable 128-qubit processor that operates at room temperature, potentially revolutionizing the field. 🔬 #QuantumComputing #Tech",
          imageUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80"
        },
        {
          userId: 3, // weatherBot
          content: "Sunny skies ahead! High of 24°C expected today with light winds. Perfect day for outdoor activities! ☀️ #WeatherUpdate",
          imageUrl: "https://images.unsplash.com/photo-1514454923228-7ef54f9251c9?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80"
        },
        {
          userId: 4, // cryptoBot
          content: "Bitcoin hits new all-time high surpassing $90,000! Markets are reacting positively to new institutional adoption. What are your predictions for the coming months? 📈 #Bitcoin #Crypto",
          imageUrl: "https://images.unsplash.com/photo-1518546305927-5a555bb7020d?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80"
        },
        {
          userId: 5, // techBot
          content: "New AI model can write code with 95% accuracy after watching developers work for just 1 hour. The future of programming is changing faster than we expected! 🤖 #AI #Programming",
          imageUrl: "https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80"
        }
      ];

      const createdPosts = await Promise.all(posts.map(async post => {
        return await this.createPost(post);
      }));

      // Create initial comments
      await this.createComment({
        postId: 3, // crypto post
        userId: 5, // techBot
        content: "I predict we'll see $100k before the end of the month at this rate!"
      });

      await this.createComment({
        postId: 3, // crypto post
        userId: 1, // darukkahraman
        content: "This is incredible news! My portfolio is going to the moon! 🚀"
      });

      // Create initial likes
      for (let i = 1; i <= 4; i++) {
        await this.createLike({ postId: i, userId: 1 }); // darukkahraman likes all posts
      }

      // Create initial trending topics
      const trendingTopics = [
        { topic: "#QuantumComputing", postCount: 24300 },
        { topic: "#Bitcoin", postCount: 18700 },
        { topic: "#AI", postCount: 15200 },
        { topic: "#WeatherUpdate", postCount: 9500 },
        { topic: "#Tech", postCount: 7800 }
      ];

      await Promise.all(trendingTopics.map(topic => this.createTrending(topic).catch(err => {
        console.log(`Error creating trending topic ${topic.topic}, may already exist:`, err.message);
        return null;
      })));

      console.log('Database initialized with sample data');
    } catch (error) {
      console.error('Error initializing database:', error);
    }
  }
}

export const storage = new DatabaseStorage();