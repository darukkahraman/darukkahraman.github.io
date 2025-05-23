import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Tables
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name").notNull(),
  avatarColor: text("avatar_color").notNull(),
  avatarInitial: text("avatar_initial").notNull(),
  profileImageUrl: text("profile_image_url"),
  isVerified: boolean("is_verified").default(false),
});

export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  imageUrl: text("image_url"),
  originalPostId: integer("original_post_id").references(() => posts.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull().references(() => posts.id),
  userId: integer("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const likes = pgTable("likes", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull().references(() => posts.id),
  userId: integer("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  sourceUserId: integer("source_user_id").notNull().references(() => users.id),
  type: text("type").notNull(), // 'like', 'comment', 'mention', 'follow'
  postId: integer("post_id").references(() => posts.id),
  read: boolean("read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const trending = pgTable("trending", {
  id: serial("id").primaryKey(),
  topic: text("topic").notNull().unique(),
  postCount: integer("post_count").notNull(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").notNull().references(() => users.id),
  receiverId: integer("receiver_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  read: boolean("read").default(false).notNull(),
});

export const messagesRelations = relations(messages, ({ one }) => ({
  sender: one(users, { fields: [messages.senderId], references: [users.id] }),
  receiver: one(users, { fields: [messages.receiverId], references: [users.id] }),
}));

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
  comments: many(comments),
  likes: many(likes),
  receivedNotifications: many(notifications, { relationName: "userNotifications" }),
  sentNotifications: many(notifications, { relationName: "sourceUserNotifications" }),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  user: one(users, { fields: [posts.userId], references: [users.id] }),
  comments: many(comments),
  likes: many(likes),
  notifications: many(notifications),
  originalPost: one(posts, { fields: [posts.originalPostId], references: [posts.id], relationName: "reposts" }),
  reposts: many(posts, { relationName: "reposts" }),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  post: one(posts, { fields: [comments.postId], references: [posts.id] }),
  user: one(users, { fields: [comments.userId], references: [users.id] }),
}));

export const likesRelations = relations(likes, ({ one }) => ({
  post: one(posts, { fields: [likes.postId], references: [posts.id] }),
  user: one(users, { fields: [likes.userId], references: [users.id] }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id], relationName: "userNotifications" }),
  sourceUser: one(users, { fields: [notifications.sourceUserId], references: [users.id], relationName: "sourceUserNotifications" }),
  post: one(posts, { fields: [notifications.postId], references: [posts.id] }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  displayName: true,
  avatarColor: true,
  avatarInitial: true,
  profileImageUrl: true,
});

export const insertPostSchema = createInsertSchema(posts).pick({
  userId: true,
  content: true,
  imageUrl: true,
  originalPostId: true,
});

export const insertCommentSchema = createInsertSchema(comments).pick({
  postId: true,
  userId: true,
  content: true,
});

export const insertLikeSchema = createInsertSchema(likes).pick({
  postId: true,
  userId: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).pick({
  userId: true,
  sourceUserId: true,
  type: true,
  postId: true,
});

export const insertTrendingSchema = createInsertSchema(trending).pick({
  topic: true,
  postCount: true,
});

// Types
export type User = typeof users.$inferSelect;
export type Post = typeof posts.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type Like = typeof likes.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type Trending = typeof trending.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertPost = z.infer<typeof insertPostSchema>;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type InsertLike = z.infer<typeof insertLikeSchema>;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type InsertTrending = z.infer<typeof insertTrendingSchema>;

// Additional types for frontend
export type PostWithUser = Post & {
  user: User;
  likeCount: number;
  commentCount: number;
  repostCount?: number;
  isLiked: boolean;
  comments?: CommentWithUser[];
  originalPost?: PostWithUser;
  isRepost: boolean;
};

export type CommentWithUser = Comment & {
  user: User;
};

export type NotificationWithUsers = Notification & {
  sourceUser: User;
  post?: Post;
};

// Follows table
export const follows = pgTable('follows', {
  id: serial('id').primaryKey(),
  followerId: integer('follower_id').notNull().references(() => users.id),
  followingId: integer('following_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type Follow = typeof follows.$inferSelect;
