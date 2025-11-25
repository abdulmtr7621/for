import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertPostSchema, updatePostSchema, insertAppealSchema, insertPunishmentSchema, insertAnnouncementSchema } from "@shared/schema";
import bcrypt from "bcrypt";
import session from "express-session";
import MemoryStore from "memorystore";
import { verifyUserInGuild } from "./discord-bot";

const MemoryStoreSession = MemoryStore(session);

declare module 'express-session' {
  interface SessionData {
    userId?: number;
  }
}

function generateUserId(): string {
  return Math.floor(1000000000000000000 + Math.random() * 9000000000000000000).toString();
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.use(session({
    secret: process.env.SESSION_SECRET || 'qube-ia-forum-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    store: new MemoryStoreSession({
      checkPeriod: 86400000
    }),
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
    },
  }));

  app.post('/api/signup', async (req: Request, res: Response) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      
      const existingUser = await storage.getUserByUsername(validatedData.username);
      if (existingUser) {
        return res.status(400).json({ message: 'Username already taken' });
      }

      // Verify Discord user ID and guild membership
      if (req.body.discordUserId) {
        const isInGuild = await verifyUserInGuild(req.body.discordUserId);
        if (!isInGuild) {
          return res.status(400).json({ 
            message: 'Discord user not found in any bot servers. Please join the support server: discord.gg/j7Ap4xUkG7' 
          });
        }
      }

      const hashedPassword = await bcrypt.hash(validatedData.password, 10);
      const userId = generateUserId();
      
      const user = await storage.createUser({
        ...validatedData,
        password: hashedPassword,
        userId,
        role: 'user',
      });

      req.session.userId = user.id;
      res.json({ id: user.id, username: user.username, userId: user.userId, role: user.role });
    } catch (error: any) {
      res.status(400).json({ message: error.message || 'Signup failed' });
    }
  });

  app.post('/api/login', async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      req.session.userId = user.id;
      res.json({ id: user.id, username: user.username, userId: user.userId, role: user.role });
    } catch (error: any) {
      res.status(400).json({ message: error.message || 'Login failed' });
    }
  });

  app.post('/api/logout', async (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: 'Logout failed' });
      }
      res.json({ message: 'Logged out successfully' });
    });
  });

  app.get('/api/user', async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  });

  app.post('/api/user/avatar', async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const { avatar } = req.body;
      if (!avatar || typeof avatar !== 'string') {
        return res.status(400).json({ message: 'Invalid avatar data' });
      }

      const user = await storage.updateUser(req.session.userId, { avatar });
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Failed to update avatar' });
    }
  });

  app.post('/api/user/banner', async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const { banner } = req.body;
      if (!banner || typeof banner !== 'string') {
        return res.status(400).json({ message: 'Invalid banner data' });
      }

      const user = await storage.updateUser(req.session.userId, { banner });
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Failed to update banner' });
    }
  });

  app.get('/api/posts/:section', async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }

      const section = req.params.section;
      const posts = await storage.getPosts(section, user.role, user.id);

      res.json(posts);
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Failed to fetch posts' });
    }
  });

  app.get('/api/user/posts', async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const posts = await storage.getUserPosts(req.session.userId);
      
      const postsWithoutPasswords = posts.map(post => ({
        ...post,
        author: {
          ...post.author,
          password: undefined,
        },
      }));

      res.json(postsWithoutPasswords);
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Failed to fetch posts' });
    }
  });

  app.post('/api/posts', async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const validatedData = insertPostSchema.parse(req.body);
      
      const post = await storage.createPost({
        ...validatedData,
        authorId: req.session.userId,
      });
      res.json(post);
    } catch (error: any) {
      res.status(400).json({ message: error.message || 'Failed to create post' });
    }
  });

  app.patch('/api/posts/:id', async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const postId = parseInt(req.params.id);
      const post = await storage.getPost(postId);
      
      if (!post) {
        return res.status(404).json({ message: 'Post not found' });
      }

      if (post.authorId !== req.session.userId) {
        return res.status(403).json({ message: 'You can only edit your own posts' });
      }

      const validatedData = updatePostSchema.parse(req.body);
      if (Object.keys(validatedData).length === 0) {
        return res.status(400).json({ message: 'No fields to update' });
      }

      const updatedPost = await storage.updatePost(postId, validatedData);
      res.json(updatedPost);
    } catch (error: any) {
      res.status(400).json({ message: error.message || 'Failed to update post' });
    }
  });

  app.delete('/api/posts/:id', async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }

      const ROLE_HIERARCHY: Record<string, number> = {
        user: 0, helper: 1, moderator: 2, admin: 3, developer: 3, owner: 4,
      };

      if (ROLE_HIERARCHY[user.role] < ROLE_HIERARCHY.moderator) {
        return res.status(403).json({ message: 'Insufficient permissions' });
      }

      const postId = parseInt(req.params.id);
      const post = await storage.getPost(postId);
      
      if (!post) {
        return res.status(404).json({ message: 'Post not found' });
      }

      await storage.deletePost(postId, req.session.userId);
      res.json({ message: 'Post deleted successfully' });
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Failed to delete post' });
    }
  });

  app.post('/api/posts/:id/revive', async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }

      const ROLE_HIERARCHY: Record<string, number> = {
        user: 0, helper: 1, moderator: 2, admin: 3, developer: 3, owner: 4,
      };

      if (ROLE_HIERARCHY[user.role] < ROLE_HIERARCHY.admin) {
        return res.status(403).json({ message: 'Insufficient permissions' });
      }

      const postId = parseInt(req.params.id);
      const post = await storage.getPost(postId);
      
      if (!post) {
        return res.status(404).json({ message: 'Post not found' });
      }

      await storage.revivePost(postId);
      res.json({ message: 'Post revived successfully' });
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Failed to revive post' });
    }
  });

  app.get('/api/messages', async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const messages = await storage.getMessages(req.session.userId);
      
      const messagesWithoutPasswords = messages.map(msg => ({
        ...msg,
        sender: {
          ...msg.sender,
          password: undefined,
        },
        recipient: {
          ...msg.recipient,
          password: undefined,
        },
      }));

      res.json(messagesWithoutPasswords);
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Failed to fetch messages' });
    }
  });

  app.post('/api/messages', async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const { recipientUsername, content } = req.body;

      if (!recipientUsername || !content) {
        return res.status(400).json({ message: 'Recipient and content are required' });
      }

      if (typeof content !== 'string' || content.length === 0 || content.length > 2000) {
        return res.status(400).json({ message: 'Content must be between 1 and 2000 characters' });
      }

      const recipient = await storage.getUserByUsername(recipientUsername);
      if (!recipient) {
        return res.status(404).json({ message: 'Recipient not found' });
      }

      if (recipient.id === req.session.userId) {
        return res.status(400).json({ message: 'Cannot send message to yourself' });
      }

      const message = await storage.createMessage({
        senderId: req.session.userId,
        recipientId: recipient.id,
        content,
      });

      res.json(message);
    } catch (error: any) {
      res.status(400).json({ message: error.message || 'Failed to send message' });
    }
  });

  app.post('/api/posts/:id/status', async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }

      if (user.role !== 'developer' && user.role !== 'owner') {
        return res.status(403).json({ message: 'Only developers can update bug report status' });
      }

      const postId = parseInt(req.params.id);
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({ message: 'Status is required' });
      }

      await storage.updatePostStatus(postId, status);
      res.json({ message: 'Post status updated successfully' });
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Failed to update post status' });
    }
  });

  app.post('/api/posts/:id/react', async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const postId = parseInt(req.params.id);
      const { emoji } = req.body;

      if (!emoji) {
        return res.status(400).json({ message: 'Emoji is required' });
      }

      await storage.addReaction(postId, req.session.userId, emoji);
      res.json({ message: 'Reaction added' });
    } catch (error: any) {
      res.status(400).json({ message: error.message || 'Failed to add reaction' });
    }
  });

  app.get('/api/counters', async (req: Request, res: Response) => {
    try {
      const counters = await storage.getCounters();
      res.json(counters);
    } catch (error: any) {
      res.status(500).json({ message: 'Failed to get counters' });
    }
  });

  app.get('/api/appeals', async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      const user = await storage.getUser(req.session.userId);
      if (user?.role !== 'owner' && user?.role !== 'admin' && user?.role !== 'moderator') {
        return res.status(403).json({ message: 'Not authorized' });
      }
      const appeals = await storage.getAppeals();
      res.json(appeals);
    } catch (error: any) {
      res.status(500).json({ message: 'Failed to get appeals' });
    }
  });

  app.post('/api/appeals', async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      const data = insertAppealSchema.parse(req.body);
      const appeal = await storage.createAppeal({ ...data, userId: req.session.userId });
      res.json(appeal);
    } catch (error: any) {
      res.status(400).json({ message: error.message || 'Failed to create appeal' });
    }
  });

  app.post('/api/announcements', async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      const user = await storage.getUser(req.session.userId);
      if (user?.role !== 'owner' && user?.role !== 'developer') {
        return res.status(403).json({ message: 'Only owners and developers can create announcements' });
      }
      const data = insertAnnouncementSchema.parse(req.body);
      const announcement = await storage.createAnnouncement({ ...data, authorId: req.session.userId });
      res.json(announcement);
    } catch (error: any) {
      res.status(400).json({ message: error.message || 'Failed to create announcement' });
    }
  });

  app.get('/api/announcements', async (req: Request, res: Response) => {
    try {
      const announcements = await storage.getAnnouncements();
      res.json(announcements);
    } catch (error: any) {
      res.status(500).json({ message: 'Failed to get announcements' });
    }
  });

  app.delete('/api/announcements/:id', async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      const user = await storage.getUser(req.session.userId);
      if (user?.role !== 'owner' && user?.role !== 'developer') {
        return res.status(403).json({ message: 'Not authorized' });
      }
      await storage.deleteAnnouncement(parseInt(req.params.id));
      res.json({ message: 'Announcement deleted' });
    } catch (error: any) {
      res.status(500).json({ message: 'Failed to delete announcement' });
    }
  });

  app.delete('/api/punishments/:id', async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      const user = await storage.getUser(req.session.userId);
      if (user?.role !== 'owner' && user?.role !== 'admin' && user?.role !== 'moderator') {
        return res.status(403).json({ message: 'Not authorized' });
      }
      await storage.revokePunishment(parseInt(req.params.id));
      res.json({ message: 'Punishment revoked' });
    } catch (error: any) {
      res.status(500).json({ message: 'Failed to revoke punishment' });
    }
  });

  app.post('/api/appeals/:id/approve', async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      const user = await storage.getUser(req.session.userId);
      if (user?.role !== 'owner' && user?.role !== 'admin' && user?.role !== 'moderator') {
        return res.status(403).json({ message: 'Not authorized' });
      }
      // Update appeal approval status
      res.json({ message: 'Appeal approved' });
    } catch (error: any) {
      res.status(500).json({ message: 'Failed to approve appeal' });
    }
  });

  app.post('/api/appeals/:id/reject', async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      const user = await storage.getUser(req.session.userId);
      if (user?.role !== 'owner' && user?.role !== 'admin' && user?.role !== 'moderator') {
        return res.status(403).json({ message: 'Not authorized' });
      }
      // Update appeal rejection status
      res.json({ message: 'Appeal rejected' });
    } catch (error: any) {
      res.status(500).json({ message: 'Failed to reject appeal' });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
