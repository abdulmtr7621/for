import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  MessageSquare,
  MessageCircle,
  Edit3,
  Search,
  Shield,
  Users,
  Zap,
  Lock,
  Crown,
  ArrowRight
} from 'lucide-react';

interface FeatureDetail {
  icon: any;
  title: string;
  description: string;
  details: string[];
}

const FEATURES: FeatureDetail[] = [
  {
    icon: MessageSquare,
    title: 'Discussion Forums',
    description: 'Organize conversations by topic',
    details: [
      'Create posts in multiple forum sections (General, Support, Code Share, Bot Discussion, etc.)',
      'Each section groups related discussions together',
      'Public sections visible to all users, private sections restricted by role',
      'Example: Report bugs in Bug Reports section (Developers only) or ask for help in Support (Staff only)'
    ]
  },
  {
    icon: Edit3,
    title: 'Post Editing & History',
    description: 'Update posts with edit tracking',
    details: [
      'Edit your own posts anytime to fix typos, add details, or provide updates',
      'System automatically tracks when posts were last edited',
      'Other users can see "edited" indicator on updated posts',
      'Perfect for keeping solutions up-to-date or clarifying questions'
    ]
  },
  {
    icon: Search,
    title: 'Real-Time Search',
    description: 'Find posts instantly',
    details: [
      'Search by post title or content within any section',
      'Results update as you type—no need to submit',
      'Find answers to common questions without scrolling',
      'Helps prevent duplicate posts by finding existing solutions'
    ]
  },
  {
    icon: MessageCircle,
    title: 'Direct Messaging',
    description: 'Private user-to-user communication',
    details: [
      'Send private messages to any community member',
      'Messages are encrypted and only visible to sender and recipient',
      'Message limit: 1-2000 characters per message',
      'Perfect for collaborations, asking questions, or one-on-one support'
    ]
  },
  {
    icon: Users,
    title: 'Profile Customization',
    description: 'Personalize your community presence',
    details: [
      'Upload custom avatar image to represent yourself',
      'Set a banner image to personalize your profile',
      'Display your username and role to other members',
      'Your profile shows all your posts and contributions'
    ]
  },
  {
    icon: Shield,
    title: 'Role-Based Permissions',
    description: 'Tiered access control system',
    details: [
      'User (base role): Access general sections and messaging',
      'Helper (blue): Can view and assist in support sections',
      'Moderator (green): Can view player reports and manage content',
      'Developer (cyan): Can access bug reports and developer panel',
      'Owner (purple): Full administrative control over the forum'
    ]
  },
  {
    icon: Lock,
    title: 'Private Sections',
    description: 'Role-restricted content areas',
    details: [
      'Player Reports: Staff (Helper+) can see all, others see only their own',
      'Support Tickets: Staff (Helper+) can see all, others see only their own',
      'Bug Reports: Developers can see all, others see only their own',
      'Developer Panel: Developers/Owners only - for technical management'
    ]
  },
  {
    icon: Zap,
    title: 'Quick Features',
    description: 'Productivity tools built-in',
    details: [
      'Post status tracking (for bug reports: pending, fixed, invalid)',
      'Soft delete with restore option (posts marked deleted but recoverable)',
      'Clear timestamps on all posts (creation and edit times)',
      'Discord integration link for real-time community chat'
    ]
  }
];

interface RoleInfo {
  color: string;
  name: string;
  level: string;
  capabilities: string[];
}

const ROLES: RoleInfo[] = [
  {
    color: 'bg-blue-500',
    name: 'Helper',
    level: 'Level 1',
    capabilities: [
      'View player reports & support tickets',
      'Assist other users in support sections',
      'Create and manage own posts',
      'Send direct messages'
    ]
  },
  {
    color: 'bg-green-500',
    name: 'Moderator',
    level: 'Level 2',
    capabilities: [
      'All Helper permissions',
      'View all player reports',
      'Manage forum content',
      'Delete/restore posts'
    ]
  },
  {
    color: 'bg-orange-500',
    name: 'Admin',
    level: 'Level 3',
    capabilities: [
      'All Moderator permissions',
      'Administrative control',
      'User management',
      'System configuration'
    ]
  },
  {
    color: 'bg-cyan-500',
    name: 'Developer',
    level: 'Level 4',
    capabilities: [
      'Access developer panel',
      'View and manage bug reports',
      'Set bug status (pending/fixed/invalid)',
      'Technical support & debugging'
    ]
  },
  {
    color: 'bg-purple-500',
    name: 'Owner',
    level: 'Level 5',
    capabilities: [
      'All permissions across the platform',
      'Full administrative control',
      'System management & configuration',
      'User role assignment'
    ]
  }
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
        <div className="container mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">QIA</span>
            </div>
            <h1 className="text-xl font-bold">Qube IA Forums</h1>
          </div>
          <Link href="/auth">
            <Button data-testid="button-login">
              Login
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto max-w-7xl px-6 py-16 md:py-24">
        <div className="max-w-3xl">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">Community Hub for Qube IA</h2>
          <p className="text-xl text-muted-foreground mb-8">
            A Discord-inspired forum platform where users discuss topics, get support, share code, report bugs, and collaborate in a role-based permission system.
          </p>
          <Link href="/auth">
            <Button size="lg" className="mb-16" data-testid="button-get-started">
              Get Started
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto max-w-7xl px-6 py-12">
        <h3 className="text-3xl font-bold mb-12">Core Features</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {FEATURES.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <Card key={idx}>
                <CardHeader>
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-md bg-primary/10 text-primary">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg">{feature.title}</CardTitle>
                      <CardDescription className="mt-1">{feature.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {feature.details.map((detail, detailIdx) => (
                      <li key={detailIdx} className="text-sm text-muted-foreground flex gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>{detail}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Role System */}
      <section className="container mx-auto max-w-7xl px-6 py-12">
        <h3 className="text-3xl font-bold mb-12">Role-Based Access System</h3>
        <p className="text-muted-foreground mb-8 max-w-3xl">
          Qube IA Forums uses a five-tier role hierarchy. Each role unlocks different sections and permissions. Users progress through roles based on their involvement and trustworthiness in the community.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {ROLES.map((role, idx) => (
            <Card key={idx}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-3 h-3 rounded-full ${role.color}`}></div>
                  <CardTitle className="text-base">{role.name}</CardTitle>
                </div>
                <CardDescription className="text-xs">{role.level}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1">
                  {role.capabilities.map((cap, capIdx) => (
                    <li key={capIdx} className="text-xs text-muted-foreground flex gap-2">
                      <span>✓</span>
                      <span>{cap}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Forum Sections Overview */}
      <section className="container mx-auto max-w-7xl px-6 py-12">
        <h3 className="text-3xl font-bold mb-12">Forum Sections</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Public Sections</CardTitle>
              <CardDescription>Visible to all users</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                <li className="text-sm">
                  <span className="font-semibold text-primary">General Discussion</span> - General conversations and community topics
                </li>
                <li className="text-sm">
                  <span className="font-semibold text-primary">Off-Topic</span> - Casual conversations and non-forum related discussions
                </li>
                <li className="text-sm">
                  <span className="font-semibold text-primary">Code Share</span> - Share code snippets, scripts, and programming solutions
                </li>
                <li className="text-sm">
                  <span className="font-semibold text-primary">Support</span> - Get help with general issues and questions
                </li>
                <li className="text-sm">
                  <span className="font-semibold text-primary">Bot Discussion</span> - Discuss Qube IA bot features
                </li>
                <li className="text-sm">
                  <span className="font-semibold text-primary">Website Feedback</span> - Suggestions about the platform
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Private Sections</CardTitle>
              <CardDescription>Restricted by role</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                <li className="text-sm">
                  <span className="font-semibold text-primary">Player Reports</span> - Report rule violations (Staff+ only)
                </li>
                <li className="text-sm">
                  <span className="font-semibold text-primary">Support Tickets</span> - Private support requests (Staff+ only)
                </li>
                <li className="text-sm">
                  <span className="font-semibold text-primary">Bug Reports</span> - Report technical bugs (Developer+ only)
                </li>
                <li className="text-sm">
                  <span className="font-semibold text-primary">Developer Panel</span> - Bug management and technical workspace (Developer+ only)
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Authentication Info */}
      <section className="container mx-auto max-w-7xl px-6 py-12">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Create an Account</h4>
              <p className="text-sm text-muted-foreground">
                Sign up with a username and password. Your account will be created with the "User" role, giving you access to all public sections and the ability to send direct messages.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Username & User ID</h4>
              <p className="text-sm text-muted-foreground">
                When you create an account, you choose a username and receive a unique User ID (similar to Discord). This ID is used internally and shown on your posts and messages.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Role Progression</h4>
              <p className="text-sm text-muted-foreground">
                Start as a User. Roles like Helper, Moderator, Developer, and Owner are assigned by forum administrators based on contributions and trustworthiness. Each role unlocks new sections and permissions.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Default Admin Account</h4>
              <p className="text-sm text-muted-foreground">
                The account "abdul_59260" is the Owner account with full administrative permissions. This is the default admin created when the forum launches.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto max-w-7xl px-6 py-16 text-center">
        <h3 className="text-3xl font-bold mb-4">Ready to Join the Community?</h3>
        <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
          Create your account and start participating in discussions today. Connect with other users, share your knowledge, and be part of the Qube IA community.
        </p>
        <Link href="/auth">
          <Button size="lg" data-testid="button-cta-login">
            Login or Sign Up
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-background/50 mt-16">
        <div className="container mx-auto max-w-7xl px-6 py-8 text-center text-sm text-muted-foreground">
          <p>© 2025 Qube IA Forums. A Discord-inspired community platform.</p>
          <a 
            href="https://discord.gg/j7Ap4xUkG7" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary hover:underline mt-2 inline-block"
            data-testid="link-discord-footer"
          >
            Join our Discord Server
          </a>
        </div>
      </footer>
    </div>
  );
}
