import type { Role, Section } from '@shared/schema';

export const ROLE_HIERARCHY: Record<string, number> = {
  user: 0,
  helper: 1,
  moderator: 2,
  admin: 3,
  developer: 3,
  owner: 4,
};

export const ROLE_COLORS: Record<string, string> = {
  user: 'bg-muted text-muted-foreground',
  helper: 'bg-blue-600 text-white',
  moderator: 'bg-green-600 text-white',
  admin: 'bg-orange-500 text-white',
  developer: 'bg-cyan-500 text-white',
  owner: 'bg-primary text-primary-foreground',
};

export const ROLE_LABELS: Record<string, string> = {
  user: 'User',
  helper: 'Helper',
  moderator: 'Moderator',
  admin: 'Admin',
  developer: 'Developer',
  owner: 'Owner',
};

export function canAccessSection(role: Role, section: Section): boolean {
  if (section === 'dev-panel') {
    return role === 'developer' || role === 'owner';
  }
  return true;
}

export function canDeletePost(role: Role): boolean {
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY.moderator;
}

export function canRevivePost(role: Role): boolean {
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY.admin;
}

export function canTagBugReport(role: Role): boolean {
  return role === 'developer' || role === 'owner';
}

export function canViewAllReports(role: Role, section: Section): boolean {
  if (section === 'player-reports') {
    return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY.moderator;
  }
  if (section === 'bug-reports') {
    return role === 'developer' || role === 'owner';
  }
  if (section === 'support-tickets') {
    return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY.helper;
  }
  return false;
}
