# Qube IA Forums

## Overview

Qube IA Forums is a community discussion platform built as a full-stack web application. It provides a Discord-inspired forum experience with gaming community aesthetics, featuring role-based permissions, multiple discussion sections, messaging capabilities, and a modern dark-themed UI.

The application serves as a forum for the Qube IA bot community, allowing users to discuss general topics, share code, get support, report bugs, and interact with different community sections based on their role permissions.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System:**
- React 18 with TypeScript for type-safe component development
- Vite as the build tool and development server
- Wouter for lightweight client-side routing
- Single-page application (SPA) architecture

**UI Component System:**
- Shadcn/ui component library based on Radix UI primitives
- Tailwind CSS for utility-first styling with custom design tokens
- Dark theme by default with custom color system supporting role-based accent colors
- Custom typography using Palanquin and Palanquin Dark fonts from Google Fonts

**State Management:**
- TanStack Query (React Query) for server state management and caching
- Custom AuthContext for authentication state using React Context API
- Session-based authentication with HTTP-only cookies

**Design System:**
- Discord-inspired layout with sidebar navigation
- Gaming community aesthetic with vibrant role colors (Helper: Blue, Moderator: Green, Admin: Orange, Developer: Cyan, Owner: Purple)
- Responsive design with mobile-first approach
- Custom spacing primitives and elevation system

### Backend Architecture

**Runtime & Framework:**
- Node.js with Express.js for the HTTP server
- TypeScript throughout the entire stack
- Session-based authentication using express-session with MemoryStore

**API Design:**
- RESTful API architecture
- JSON request/response format
- Session-based authentication (no JWT tokens)
- Role-based access control enforced at the route level

**Key API Endpoints:**
- Authentication: `/api/signup`, `/api/login`, `/api/logout`, `/api/user`
- Posts: `/api/posts`, `/api/posts/:id`, `/api/posts/:id/revive`, `/api/posts/:id/status`, `/api/posts/:section`, `/api/user/posts`
- Post Editing: `PATCH /api/posts/:id` - Edit own posts with title/content updates
- Messages: `/api/messages` (GET list, POST new), `/api/messages/:id`
- User Profile: `/api/user/avatar` (POST), `/api/user/banner` (POST)

**Security:**
- Bcrypt for password hashing (10 salt rounds)
- HTTP-only cookies for session management
- Server-side role validation for protected operations
- Session secret configuration via environment variables
- Server-side enforcement of post ownership for edits/deletes

### Data Layer

**Database:**
- PostgreSQL via Neon serverless database
- Drizzle ORM for type-safe database operations
- WebSocket connection for serverless compatibility

**Schema Design:**
- `users` table: Stores user credentials, roles, avatars, banners, and Discord-like user IDs
- `posts` table: Forum posts with soft deletion support, section categorization, status tracking, and edit timestamps
- `messages` table: Direct messaging between users with sender/recipient relationships

**Role Hierarchy:**
- User (0) → Helper (1) → Moderator (2) → Admin/Developer (3) → Owner (4)
- Permissions cascade based on numeric hierarchy
- Special sections (dev-panel) restricted to Developer and Owner roles

**Post Visibility Logic:**
- Standard sections: All users see all posts
- Player reports: Users only see their own reports unless they have Moderator+ role
- Bug reports: Users only see their own reports unless they have Developer+ role
- Support tickets: Users only see their own tickets unless they have Helper+ role
- Soft deletion with `deletedBy` tracking for moderation accountability
- Post editing tracks `updatedAt` timestamp for edit history

### Messaging System

**Direct Messaging:**
- User-to-user private messages with validation
- Message character limit: 1-2000 characters
- Self-message prevention
- Recipients view only messages sent to them
- Senders view their own posts

### External Dependencies

**Core Infrastructure:**
- Neon PostgreSQL serverless database (via `@neondatabase/serverless`)
- WebSocket support for database connections (`ws` package)

**UI Component Libraries:**
- Radix UI primitives for accessible, unstyled components
- Shadcn/ui pre-built component system
- Lucide React for icon system

**Form & Validation:**
- React Hook Form for form state management
- Zod for runtime schema validation
- Drizzle-Zod for database schema to Zod schema conversion

**Styling:**
- Tailwind CSS with custom configuration
- PostCSS with Autoprefixer
- Class Variance Authority (CVA) for component variant management

**Development Tools:**
- Vite plugins for Replit integration (cartographer, dev banner, runtime error overlay)
- ESBuild for production bundling
- TSX for TypeScript execution in development

**Session Management:**
- `express-session` for session handling
- `memorystore` as session store (development/simple deployments)
- `connect-pg-simple` available for PostgreSQL-backed sessions

**Font Loading:**
- Google Fonts CDN for Palanquin and Palanquin Dark fonts
- Preconnect optimization for font loading performance

## Implemented Features

### MVP Complete
✅ User registration/login with Discord-style username and auto-generated user_id
✅ Default owner account (abdul_59260) with full Owner permissions
✅ Five-tier role system with color coding
✅ Forum sections (public and private with filtered visibility)
✅ Developer panel with bug report management
✅ Hierarchical role permissions system
✅ User profile with avatar/banner upload support
✅ Post creation, viewing, editing, and deletion
✅ Direct user-to-user messaging system
✅ Dark theme with purple/cyan/blue gradients

### Recent Additions
✅ Avatar/Banner uploads - POST `/api/user/avatar`, POST `/api/user/banner`
✅ Post editing - PATCH `/api/posts/:id` with title/content updates
✅ Post timestamps - tracks createdAt and updatedAt for edit history
✅ Bug status management - Developers/Owners can mark bugs as pending/fixed/invalid
✅ Server-side filtering - Database-level filtering for private sections based on role
✅ Server-side authorization - Enforced on post creation, editing, deletion, and revival
✅ Discord community link - "Join Discord Server" button linking to discord.gg/j7Ap4xUkG7

## Database Schema

### Users Table
- id (serial, primary key)
- username (unique text)
- userId (unique text) - Discord-style ID format
- password (bcrypt hashed)
- role (text) - user|helper|moderator|admin|developer|owner
- avatar (text, nullable) - avatar URL/data
- banner (text, nullable) - banner URL/data
- createdAt (timestamp)

### Posts Table
- id (serial, primary key)
- authorId (integer, foreign key -> users.id)
- section (text) - forum section identifier
- title (text)
- content (text)
- deleted (boolean) - soft delete flag
- deletedBy (integer, nullable, foreign key -> users.id)
- status (text, nullable) - pending|fixed|invalid (for bug reports)
- createdAt (timestamp)
- updatedAt (timestamp) - tracks last edit time

### Messages Table
- id (serial, primary key)
- senderId (integer, foreign key -> users.id)
- recipientId (integer, foreign key -> users.id)
- content (text)
- createdAt (timestamp)

## Next Phase Features (Planned)

- Real-time notifications for new tickets, reports, and messages
- Advanced moderation tools (ban appeals, warning system, moderation logs)
- File attachments and rich text editor for posts
- Punishment system for moderators (warnings, mutes, bans)
- Moderation logs and audit trail for staff actions
- Enhanced post tagging system (solved/unsolved, fixed/invalid)
- Search and filtering for posts within sections

## Authentication Notes

- **Username-based**: Users login with username + password (NOT Discord OAuth as per user request)
- **Session-based**: HTTP-only cookies manage sessions
- **Auto user_id**: Generated as Discord-style numeric ID (19 digits)
- **Default Owner**: abdul_59260 account available for admin access

## Performance Optimizations

- Database-level filtering for post visibility (no in-memory filtering)
- Efficient Drizzle ORM queries with selective column projection
- TanStack Query caching for client-side state
- Lazy loading of user data
- Optimized avatar/banner updates via targeted API calls

## Security Implementations

- Server-side enforcement of post ownership for edits
- Role-based access control at database query level
- Password hashing with bcrypt (10 salt rounds)
- Session expiration and HTTP-only cookies
- Input validation via Zod schemas
- SQL injection prevention via Drizzle ORM
