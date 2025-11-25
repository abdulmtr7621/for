import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { canAccessSection } from '@/lib/permissions';
import { Link } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import type { Announcement } from '@shared/schema';
import { 
  MessageSquare, 
  Coffee, 
  Code, 
  HelpCircle, 
  Bot, 
  Globe, 
  Flag, 
  Bug, 
  Ticket,
  Wrench,
  MessageCircle,
  Edit3,
  Search,
  Shield,
  User
} from 'lucide-react';
import type { Section } from '@shared/schema';

interface SectionInfo {
  key: Section;
  name: string;
  description: string;
  icon: any;
  restricted: boolean;
}

const SECTIONS: SectionInfo[] = [
  { 
    key: 'general', 
    name: 'General Discussion', 
    description: 'General conversations and community topics',
    icon: MessageSquare,
    restricted: false
  },
  { 
    key: 'off-topic', 
    name: 'Off-Topic', 
    description: 'Casual conversations and non-forum related discussions',
    icon: Coffee,
    restricted: false
  },
  { 
    key: 'code-share', 
    name: 'Code Share', 
    description: 'Share code snippets, scripts, and programming solutions',
    icon: Code,
    restricted: false
  },
  { 
    key: 'support', 
    name: 'Support', 
    description: 'Get help with general issues and questions',
    icon: HelpCircle,
    restricted: false
  },
  { 
    key: 'bot', 
    name: 'Bot Discussion', 
    description: 'Discuss Qube IA bot features and functionality',
    icon: Bot,
    restricted: false
  },
  { 
    key: 'website', 
    name: 'Website Feedback', 
    description: 'Suggestions and feedback about the website',
    icon: Globe,
    restricted: false
  },
  { 
    key: 'player-reports', 
    name: 'Player Reports', 
    description: 'Report rule violations (Staff only)',
    icon: Flag,
    restricted: true
  },
  { 
    key: 'bug-reports', 
    name: 'Bug Reports', 
    description: 'Report technical bugs (Developers only)',
    icon: Bug,
    restricted: true
  },
  { 
    key: 'support-tickets', 
    name: 'Support Tickets', 
    description: 'Private support requests (Staff only)',
    icon: Ticket,
    restricted: true
  },
  { 
    key: 'dev-panel', 
    name: 'Developer Panel', 
    description: 'Developer workspace and bug management',
    icon: Wrench,
    restricted: true
  },
];

interface GuideItem {
  icon: any;
  title: string;
  description: string;
  steps: string[];
}

const GUIDES: GuideItem[] = [
  {
    icon: Edit3,
    title: 'Creating a Post',
    description: 'Share your thoughts, questions, or ideas with the community',
    steps: [
      'Navigate to any forum section',
      'Click the "Create Post" button in the top right',
      'Add a clear, descriptive title',
      'Write your message content',
      'Click "Create Post" to share'
    ]
  },
  {
    icon: Search,
    title: 'Searching Posts',
    description: 'Find posts by title or content quickly',
    steps: [
      'Go to any section',
      'Look for the search box at the top',
      'Type keywords to filter posts',
      'Results update in real-time',
      'Click any post to view details'
    ]
  },
  {
    icon: Edit3,
    title: 'Editing Your Posts',
    description: 'Made a mistake? Update your posts anytime',
    steps: [
      'Find your post in a section',
      'Click the edit icon next to the title',
      'Update the title or content',
      'Save your changes',
      'Edit history is tracked automatically'
    ]
  },
  {
    icon: MessageCircle,
    title: 'Direct Messaging',
    description: 'Send private messages to other users',
    steps: [
      'Click "Messages" in the navigation',
      'Search for a user to message',
      'Type your message (1-2000 characters)',
      'Click send to deliver',
      'View all conversations in one place'
    ]
  },
  {
    icon: User,
    title: 'Updating Your Profile',
    description: 'Customize your avatar and banner',
    steps: [
      'Click your profile icon/name in the header',
      'Go to your profile page',
      'Hover over avatar or banner to upload',
      'Click to select an image',
      'Changes save automatically'
    ]
  },
  {
    icon: Shield,
    title: 'Understanding Roles',
    description: 'Learn about the role system',
    steps: [
      'Helper (Blue): Can assist with general support',
      'Moderator (Green): Can moderate and view reports',
      'Admin (Orange): Full administrative access',
      'Developer (Cyan): Can manage bug reports',
      'Owner (Purple): Complete control'
    ]
  }
];

export default function HomePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const { data: counters } = useQuery({
    queryKey: ['/api/counters'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: announcements } = useQuery<Announcement[]>({
    queryKey: ['/api/announcements'],
    refetchInterval: 30000,
  });

  const announcementMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('POST', '/api/announcements', { title, content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/announcements'] });
      setTitle('');
      setContent('');
      setShowAnnouncementForm(false);
      toast({ title: 'Announcement created successfully' });
    },
    onError: () => toast({ title: 'Failed to create announcement', variant: 'destructive' }),
  });

  const accessibleSections = SECTIONS.filter(section => 
    user && canAccessSection(user.role as any, section.key)
  );

  return (
    <div className="container mx-auto max-w-7xl p-6">
      {/* Live Counters */}
      <div className="mb-12 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{counters?.totalMembers || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Posts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{counters?.totalPosts || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Your Posts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{user?.postCount || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Welcome Section */}
      <div className="mb-12">
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-8 border border-primary/20">
          <h1 className="text-4xl font-bold mb-2">Welcome to Qube IA Forums</h1>
          <p className="text-lg text-muted-foreground mb-4">
            A Discord-inspired community hub for the Qube IA bot community
          </p>
          <p className="text-muted-foreground">
            Connect with other users, share ideas, get support, and stay updated on the latest features. Whether you're looking to report bugs, share code, or just chat—you're in the right place!
          </p>
        </div>
      </div>

      {/* Announcements Section */}
      {announcements && announcements.length > 0 && (
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Announcements</h2>
          <div className="space-y-3">
            {announcements.map((announcement) => (
              <Card key={announcement.id} className="border-l-4 border-l-primary">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle>{announcement.title}</CardTitle>
                    <span className="text-xs text-muted-foreground">
                      {new Date(announcement.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground whitespace-pre-wrap">{announcement.content}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Create Announcement Form (Owner/Developer only) */}
      {(user?.role === 'owner' || user?.role === 'developer') && (
        <div className="mb-12">
          {!showAnnouncementForm ? (
            <Button onClick={() => setShowAnnouncementForm(true)} data-testid="button-create-announcement">
              Create Announcement
            </Button>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Create Announcement</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  placeholder="Announcement Title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  data-testid="input-announcement-title"
                />
                <Textarea
                  placeholder="Announcement Content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  data-testid="input-announcement-content"
                  rows={4}
                />
                <div className="flex gap-2">
                  <Button
                    onClick={() => announcementMutation.mutate()}
                    disabled={announcementMutation.isPending || !title || !content}
                    data-testid="button-submit-announcement"
                  >
                    {announcementMutation.isPending ? 'Creating...' : 'Create'}
                  </Button>
                  <Button variant="outline" onClick={() => setShowAnnouncementForm(false)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Quick Start Guides */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold mb-6">How to Get Started</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {GUIDES.map((guide, idx) => {
            const Icon = guide.icon;
            return (
              <Card key={idx} className="h-full flex flex-col">
                <CardHeader>
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-md bg-primary/10 text-primary">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg">{guide.title}</CardTitle>
                      <CardDescription className="mt-1">{guide.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  <ol className="space-y-2">
                    {guide.steps.map((step, stepIdx) => (
                      <li key={stepIdx} className="text-sm text-muted-foreground flex gap-2">
                        <span className="font-semibold text-primary min-w-fit">{stepIdx + 1}.</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Forum Sections */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Forum Sections</h2>
        <p className="text-muted-foreground mb-6">
          Choose a section to start exploring and participating in conversations
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accessibleSections.map((section) => {
            const Icon = section.icon;
            return (
              <Link key={section.key} href={`/section/${section.key}`}>
                <Card className="hover-elevate cursor-pointer h-full">
                  <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
                    <div className="p-2 rounded-md bg-primary/10 text-primary">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg">{section.name}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>{section.description}</CardDescription>
                    {section.restricted && (
                      <div className="mt-2">
                        <span className="text-xs text-primary">Restricted Access</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Feature Highlights */}
      <div className="mb-12 grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Post Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Create posts to share discussions, ask questions, or share knowledge. Edit your posts anytime to fix mistakes or add more information.
            </p>
            <p className="text-xs text-muted-foreground italic">
              Posts show when they were last edited, so the community knows if something has been updated.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Private Messaging
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Send direct messages to any community member. Perfect for one-on-one conversations, collaboration, or getting help.
            </p>
            <p className="text-xs text-muted-foreground italic">
              All messages are private and only visible to you and the recipient.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Role-Based Access
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Different roles unlock different sections and permissions. Helpers can assist, Moderators manage, and Developers handle technical issues.
            </p>
            <p className="text-xs text-muted-foreground italic">
              Some sections are private and only visible to users with the appropriate role.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              Quick Search
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Search for posts by title or content within any section. Find answers to common questions instantly.
            </p>
            <p className="text-xs text-muted-foreground italic">
              Search results update in real-time as you type.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tips Section */}
      <div className="mb-12">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle>Tips for a Great Community Experience</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <li className="text-sm text-muted-foreground flex gap-2">
                <span>✓</span>
                <span>Use clear, descriptive titles for your posts so others can find them easily</span>
              </li>
              <li className="text-sm text-muted-foreground flex gap-2">
                <span>✓</span>
                <span>Search before posting to avoid duplicate discussions</span>
              </li>
              <li className="text-sm text-muted-foreground flex gap-2">
                <span>✓</span>
                <span>Be respectful and constructive in all conversations</span>
              </li>
              <li className="text-sm text-muted-foreground flex gap-2">
                <span>✓</span>
                <span>Edit your posts if you find mistakes or want to add more information</span>
              </li>
              <li className="text-sm text-muted-foreground flex gap-2">
                <span>✓</span>
                <span>Use DMs for private conversations with other members</span>
              </li>
              <li className="text-sm text-muted-foreground flex gap-2">
                <span>✓</span>
                <span>Check restricted sections—your role might unlock special areas</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Support Section */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t">
        <div>
          <h3 className="font-semibold mb-1">Need Real-Time Support?</h3>
          <p className="text-sm text-muted-foreground">Join our Discord community for instant help and discussions</p>
        </div>
        <a 
          href="https://discord.gg/j7Ap4xUkG7" 
          target="_blank" 
          rel="noopener noreferrer"
          data-testid="link-discord-support"
        >
          <Button className="bg-[#5865F2] hover:bg-[#4752C4]">
            Join Discord Server
          </Button>
        </a>
      </div>
    </div>
  );
}
