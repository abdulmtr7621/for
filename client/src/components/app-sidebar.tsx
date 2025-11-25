import { useAuth } from '@/lib/auth';
import { canAccessSection } from '@/lib/permissions';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from '@/components/ui/sidebar';
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
  User,
  LogOut,
  Home,
  Mail,
  Shield,
  BarChart3,
  AlertCircle,
  AlertTriangle
} from 'lucide-react';
import { Link, useLocation } from 'wouter';
import qubeAvatar from '@assets/avatar_1763833165895.jpg';
import { RoleBadge } from '@/components/role-badge';
import { Button } from '@/components/ui/button';
import type { Role, Section } from '@shared/schema';

const SECTION_ICONS: Record<Section, any> = {
  'general': MessageSquare,
  'off-topic': Coffee,
  'code-share': Code,
  'support': HelpCircle,
  'bot': Bot,
  'website': Globe,
  'player-reports': Flag,
  'bug-reports': Bug,
  'support-tickets': Ticket,
  'dev-panel': Wrench,
};

const SECTION_LABELS: Record<Section, string> = {
  'general': 'General',
  'off-topic': 'Off-Topic',
  'code-share': 'Code Share',
  'support': 'Support',
  'bot': 'Bot',
  'website': 'Website',
  'player-reports': 'Player Reports',
  'bug-reports': 'Bug Reports',
  'support-tickets': 'Support Tickets',
  'dev-panel': 'Developer Panel',
};

const PUBLIC_SECTIONS: Section[] = ['general', 'off-topic', 'code-share', 'support', 'bot', 'website'];
const PRIVATE_SECTIONS: Section[] = ['player-reports', 'bug-reports', 'support-tickets'];
const DEV_SECTIONS: Section[] = ['dev-panel'];

export function AppSidebar() {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  if (!user) return null;

  const ROLE_HIERARCHY: Record<string, number> = {
    user: 0, helper: 1, moderator: 2, admin: 3, developer: 3, owner: 4,
  };

  const accessibleDevSections = DEV_SECTIONS.filter(section => 
    canAccessSection(user.role as Role, section)
  );

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b">
        <div className="flex items-center gap-3">
          <img src={qubeAvatar} alt="Qube IA" className="w-10 h-10 rounded-full" />
          <div>
            <h2 className="font-bold text-lg">Qube IA</h2>
            <p className="text-xs text-muted-foreground">Forums</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === '/'}>
                  <Link href="/" data-testid="link-home">
                    <Home className="w-4 h-4" />
                    <span>Home</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === '/profile'}>
                  <Link href="/profile" data-testid="link-profile">
                    <User className="w-4 h-4" />
                    <span>Profile</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === '/messages'}>
                  <Link href="/messages" data-testid="link-messages">
                    <Mail className="w-4 h-4" />
                    <span>Messages</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === '/rules'}>
                  <Link href="/rules" data-testid="link-rules">
                    <Shield className="w-4 h-4" />
                    <span>Rules</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === '/stats'}>
                  <Link href="/stats" data-testid="link-stats">
                    <BarChart3 className="w-4 h-4" />
                    <span>Stats</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {(user.warningPoints || 0) > 0 && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location === '/warnings'}>
                    <Link href="/warnings" data-testid="link-warnings">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Warnings</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {(user.role === 'owner' || user.role === 'admin' || user.role === 'moderator') && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location === '/appeals'}>
                    <Link href="/appeals" data-testid="link-appeals">
                      <AlertCircle className="w-4 h-4" />
                      <span>Appeals</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Public Forums</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {PUBLIC_SECTIONS.map((section) => {
                const Icon = SECTION_ICONS[section];
                return (
                  <SidebarMenuItem key={section}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={location === `/section/${section}`}
                    >
                      <Link href={`/section/${section}`} data-testid={`link-${section}`}>
                        <Icon className="w-4 h-4" />
                        <span>{SECTION_LABELS[section]}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Reports & Support</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {PRIVATE_SECTIONS.map((section) => {
                const Icon = SECTION_ICONS[section];
                return (
                  <SidebarMenuItem key={section}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={location === `/section/${section}`}
                    >
                      <Link href={`/section/${section}`} data-testid={`link-${section}`}>
                        <Icon className="w-4 h-4" />
                        <span>{SECTION_LABELS[section]}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {accessibleDevSections.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Developer</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {accessibleDevSections.map((section) => {
                  const Icon = SECTION_ICONS[section];
                  return (
                    <SidebarMenuItem key={section}>
                      <SidebarMenuButton 
                        asChild 
                        isActive={location === `/section/${section}`}
                      >
                        <Link href={`/section/${section}`} data-testid={`link-${section}`}>
                          <Icon className="w-4 h-4" />
                          <span>{SECTION_LABELS[section]}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4 border-t">
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-semibold text-sm">{user.username}</p>
            <RoleBadge role={user.role as Role} />
          </div>
          <p className="text-xs text-muted-foreground font-mono">ID: {user.userId}</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => logout()}
          className="w-full"
          data-testid="button-logout"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
