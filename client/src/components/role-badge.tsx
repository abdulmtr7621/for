import { Badge } from '@/components/ui/badge';
import { ROLE_COLORS, ROLE_LABELS } from '@/lib/permissions';
import { Users, Shield, Crown, Code, Wrench } from 'lucide-react';

const ROLE_ICONS: Record<string, React.ReactNode> = {
  user: <Users className="w-3 h-3" />,
  helper: <Shield className="w-3 h-3" />,
  moderator: <Shield className="w-3 h-3" />,
  admin: <Wrench className="w-3 h-3" />,
  developer: <Code className="w-3 h-3" />,
  owner: <Crown className="w-3 h-3" />,
};

interface RoleBadgeProps {
  role: string;
  className?: string;
}

export function RoleBadge({ role, className }: RoleBadgeProps) {
  const colorClass = ROLE_COLORS[role] || ROLE_COLORS.user;
  const label = ROLE_LABELS[role] || 'User';
  const icon = ROLE_ICONS[role];

  return (
    <Badge 
      className={`${colorClass} ${className || ''} text-xs inline-flex gap-1 items-center`}
      data-testid={`badge-role-${role}`}
    >
      {icon}
      {label}
    </Badge>
  );
}
