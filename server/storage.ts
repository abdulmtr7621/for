import { users, posts, messages, reactions, punishments, appeals, announcements, type User, type InsertUser, type Post, type InsertPost, type PostWithAuthor, type InsertMessage, type Message, type MessageWithUsers, type Punishment, type Appeal, type Announcement } from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByUserId(userId: string): Promise<User | undefined>;
  createUser(user: InsertUser & { userId: string; role?: string }): Promise<User>;
  updateUser(id: number, updates: Partial<{ avatar: string | null; banner: string | null }>): Promise<User>;
  
  getPosts(section: string, requesterRole: string, requesterId: number): Promise<PostWithAuthor[]>;
  getUserPosts(userId: number): Promise<PostWithAuthor[]>;
  getPost(id: number): Promise<Post | undefined>;
  createPost(post: InsertPost): Promise<Post>;
  updatePost(id: number, updates: Partial<{ title: string; content: string }>): Promise<Post>;
  deletePost(id: number, deletedBy: number): Promise<void>;
  revivePost(id: number): Promise<void>;
  updatePostStatus(id: number, status: string): Promise<void>;
  
  getMessages(userId: number): Promise<MessageWithUsers[]>;
  createMessage(message: InsertMessage): Promise<Message>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByUserId(userId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.userId, userId));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser & { userId: string; role?: string }): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<{ avatar: string | null; banner: string | null }>): Promise<User> {
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getPosts(section: string, requesterRole: string, requesterId: number): Promise<PostWithAuthor[]> {
    const ROLE_HIERARCHY: Record<string, number> = {
      user: 0, helper: 1, moderator: 2, admin: 3, developer: 3, owner: 4,
    };

    let whereConditions = eq(posts.section, section);

    if (section === 'player-reports') {
      if (ROLE_HIERARCHY[requesterRole] < ROLE_HIERARCHY.moderator) {
        whereConditions = and(whereConditions, eq(posts.authorId, requesterId))!;
      }
    } else if (section === 'bug-reports') {
      if (requesterRole !== 'developer' && requesterRole !== 'owner') {
        whereConditions = and(whereConditions, eq(posts.authorId, requesterId))!;
      }
    } else if (section === 'support-tickets') {
      if (ROLE_HIERARCHY[requesterRole] < ROLE_HIERARCHY.helper) {
        whereConditions = and(whereConditions, eq(posts.authorId, requesterId))!;
      }
    }

    const results = await db
      .select({
        post: posts,
        author: {
          id: users.id,
          username: users.username,
          userId: users.userId,
          role: users.role,
          avatar: users.avatar,
          banner: users.banner,
        },
      })
      .from(posts)
      .where(whereConditions)
      .leftJoin(users, eq(posts.authorId, users.id))
      .orderBy(desc(posts.createdAt));

    return results.map(r => ({
      ...r.post,
      author: r.author!,
    }));
  }

  async getUserPosts(userId: number): Promise<PostWithAuthor[]> {
    const results = await db
      .select({
        post: posts,
        author: {
          id: users.id,
          username: users.username,
          userId: users.userId,
          role: users.role,
          avatar: users.avatar,
          banner: users.banner,
        },
      })
      .from(posts)
      .where(eq(posts.authorId, userId))
      .leftJoin(users, eq(posts.authorId, users.id))
      .orderBy(desc(posts.createdAt));

    return results.map(r => ({
      ...r.post,
      author: r.author!,
    }));
  }

  async getPost(id: number): Promise<Post | undefined> {
    const [post] = await db.select().from(posts).where(eq(posts.id, id));
    return post || undefined;
  }

  async createPost(insertPost: InsertPost): Promise<Post> {
    const [post] = await db
      .insert(posts)
      .values(insertPost)
      .returning();
    return post;
  }

  async updatePost(id: number, updates: Partial<{ title: string; content: string }>): Promise<Post> {
    const [post] = await db
      .update(posts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(posts.id, id))
      .returning();
    return post;
  }

  async deletePost(id: number, deletedBy: number): Promise<void> {
    await db
      .update(posts)
      .set({ deleted: true, deletedBy })
      .where(eq(posts.id, id));
  }

  async revivePost(id: number): Promise<void> {
    await db
      .update(posts)
      .set({ deleted: false, deletedBy: null })
      .where(eq(posts.id, id));
  }

  async updatePostStatus(id: number, status: string): Promise<void> {
    await db
      .update(posts)
      .set({ status })
      .where(eq(posts.id, id));
  }

  async getMessages(userId: number): Promise<MessageWithUsers[]> {
    const results = await db
      .select({
        message: messages,
        sender: users,
      })
      .from(messages)
      .where(eq(messages.recipientId, userId))
      .leftJoin(users, eq(messages.senderId, users.id))
      .orderBy(desc(messages.createdAt));

    const currentUser = await this.getUser(userId);

    return results.map(r => ({
      ...r.message,
      sender: r.sender!,
      recipient: currentUser!,
    }));
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db
      .insert(messages)
      .values(insertMessage)
      .returning();
    return message;
  }

  async addReaction(postId: number, userId: number, emoji: string): Promise<void> {
    await db.insert((await import('@shared/schema')).reactions).values({
      postId,
      userId,
      emoji,
    });
  }

  async updateUserBadge(userId: number): Promise<void> {
    const user = await this.getUser(userId);
    if (!user) return;

    const { BADGE_THRESHOLDS } = await import('@shared/schema');
    const totalCount = (user.postCount || 0) + (user.messageCount || 0);
    
    let newBadge: string | null = null;
    if (totalCount >= 300) newBadge = 'legendary-qube';
    else if (totalCount >= 225) newBadge = 'unique-qube';
    else if (totalCount >= 150) newBadge = 'epic-qube';
    else if (totalCount >= 80) newBadge = 'qubed';
    else if (totalCount >= 35) newBadge = 'climber';
    else if (totalCount >= 10) newBadge = 'member';
    else newBadge = 'new-member';

    if (newBadge !== user.badge) {
      await db.update(users).set({ badge: newBadge }).where(eq(users.id, userId));
    }
  }

  async incrementPostCount(userId: number): Promise<void> {
    await db.update(users).set({ postCount: users.postCount + 1 }).where(eq(users.id, userId));
    await this.updateUserBadge(userId);
  }

  async incrementMessageCount(userId: number): Promise<void> {
    await db.update(users).set({ messageCount: users.messageCount + 1 }).where(eq(users.id, userId));
    await this.updateUserBadge(userId);
  }

  async createPunishment(punishment: { userId: number; reason: string; warningPoints: number; issuedBy: number }): Promise<Punishment> {
    const [result] = await db.insert(punishments).values(punishment).returning();
    return result;
  }

  async getUserPunishments(userId: number): Promise<Punishment[]> {
    return db.select().from(punishments).where(eq(punishments.userId, userId));
  }

  async createAppeal(appeal: { userId: number; punishmentId: number; reason: string }): Promise<Appeal> {
    const [result] = await db.insert(appeals).values(appeal).returning();
    return result;
  }

  async getAppeals(): Promise<Appeal[]> {
    return db.select().from(appeals).where(eq(appeals.approved, null)).orderBy(desc(appeals.createdAt));
  }

  async getCounters(): Promise<{ totalMembers: number; totalPosts: number }> {
    const memberCount = await db.select({ count: users.id }).from(users);
    const postCount = await db.select({ count: posts.id }).from(posts);
    return { totalMembers: memberCount.length, totalPosts: postCount.length };
  }

  async createAnnouncement(announcement: { authorId: number; title: string; content: string; pinnedUntil?: Date }): Promise<Announcement> {
    const [result] = await db.insert(announcements).values(announcement).returning();
    return result;
  }

  async getAnnouncements(): Promise<Announcement[]> {
    return db.select().from(announcements).orderBy(desc(announcements.createdAt)).limit(10);
  }

  async deleteAnnouncement(id: number): Promise<void> {
    await db.delete(announcements).where(eq(announcements.id, id));
  }

  async revokePunishment(id: number): Promise<void> {
    await db.delete(punishments).where(eq(punishments.id, id));
  }
}

export const storage = new DatabaseStorage();
