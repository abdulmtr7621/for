import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useRoute, Link } from 'wouter';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { canAccessSection, canDeletePost, canRevivePost, canViewAllReports } from '@/lib/permissions';
import { RoleBadge } from '@/components/role-badge';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Trash2, RotateCcw, Plus, Tag, Edit2, Search, Smile } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { PostWithAuthor, Role } from '@shared/schema';

export default function SectionPage() {
  const [, params] = useRoute('/section/:section');
  const section = params?.section as string;
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: posts, isLoading } = useQuery<PostWithAuthor[]>({
    queryKey: ['/api/posts', section],
    enabled: !!section && !!user,
  });

  const deleteMutation = useMutation({
    mutationFn: async (postId: number) => {
      return await apiRequest('DELETE', `/api/posts/${postId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/posts', section] });
      toast({ title: 'Post deleted successfully' });
    },
  });

  const reviveMutation = useMutation({
    mutationFn: async (postId: number) => {
      return await apiRequest('POST', `/api/posts/${postId}/revive`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/posts', section] });
      toast({ title: 'Post restored successfully' });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ postId, status }: { postId: number; status: string }) => {
      return await apiRequest('POST', `/api/posts/${postId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/posts', section] });
      toast({ title: 'Status updated successfully' });
    },
  });

  if (!user) {
    return null;
  }

  if (!canAccessSection(user.role as Role, section as any)) {
    return (
      <div className="container mx-auto max-w-7xl p-6">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              You don't have permission to access this section.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const ROLE_HIERARCHY: Record<string, number> = {
    user: 0, helper: 1, moderator: 2, admin: 3, developer: 3, owner: 4,
  };

  const canViewAllInSection = (section: string, userRole: string): boolean => {
    if (section === 'player-reports') {
      return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY.moderator;
    }
    if (section === 'bug-reports') {
      return userRole === 'developer' || userRole === 'owner';
    }
    if (section === 'support-tickets') {
      return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY.helper;
    }
    return true;
  };

  const visiblePosts = posts?.filter(post => {
    if (!post.deleted) return true;
    return canRevivePost(user.role as Role);
  }).filter(post => {
    if (section === 'player-reports' || section === 'bug-reports' || section === 'support-tickets') {
      if (canViewAllInSection(section, user.role)) {
        return true;
      }
      return post.authorId === user.id;
    }
    return true;
  }).filter(post => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return post.title.toLowerCase().includes(query) || post.content.toLowerCase().includes(query);
  });

  return (
    <div className="container mx-auto max-w-7xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex-1">
          <h1 className="text-3xl font-bold capitalize mb-4">
            {section.replace('-', ' ')}
          </h1>
          <div className="flex items-center gap-2 mb-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search posts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-xs"
              data-testid="input-search"
            />
          </div>
          <p className="text-muted-foreground">
            {visiblePosts?.length || 0} {visiblePosts?.length === 1 ? 'post' : 'posts'}
          </p>
        </div>
        <Link href={`/section/${section}/new`}>
          <Button data-testid="button-create-post">
            <Plus className="w-4 h-4 mr-2" />
            Create Post
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : visiblePosts && visiblePosts.length > 0 ? (
        <div className="space-y-4">
          {visiblePosts.map((post) => (
            <Card key={post.id} className={`transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${post.deleted ? 'opacity-50' : ''}`} data-testid={`card-post-${post.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-xl">{post.title}</CardTitle>
                      {post.authorId === user.id && !post.deleted && (
                        <Link href={`/section/${section}/${post.id}/edit`}>
                          <Button size="sm" variant="ghost" data-testid={`button-edit-post-${post.id}`}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        </Link>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm text-muted-foreground">
                        by {post.author.username}
                      </span>
                      <RoleBadge role={post.author.role as Role} />
                      <span className="text-xs text-muted-foreground">
                        {new Date(post.createdAt).toLocaleDateString()}
                      </span>
                      {post.status && (
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          post.status === 'fixed' || post.status === 'solved' 
                            ? 'bg-green-600 text-white' 
                            : post.status === 'invalid' || post.status === 'unsolved'
                            ? 'bg-red-600 text-white'
                            : 'bg-yellow-600 text-white'
                        }`}>
                          {post.status}
                        </span>
                      )}
                      {post.deleted && (
                        <span className="text-xs px-2 py-0.5 rounded bg-destructive text-destructive-foreground">
                          Deleted
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 items-center">
                    {section === 'bug-reports' && (user.role === 'developer' || user.role === 'owner') && (
                      <Select
                        value={post.status || 'pending'}
                        onValueChange={(value) => updateStatusMutation.mutate({ postId: post.id, status: value })}
                      >
                        <SelectTrigger className="w-32" data-testid={`select-status-${post.id}`}>
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="fixed">Fixed</SelectItem>
                          <SelectItem value="invalid">Invalid</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                    {!post.deleted && canDeletePost(user.role as Role) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(post.id)}
                        data-testid={`button-delete-${post.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                    {post.deleted && canRevivePost(user.role as Role) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => reviveMutation.mutate(post.id)}
                        data-testid={`button-revive-${post.id}`}
                      >
                        <RotateCcw className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-foreground whitespace-pre-wrap mb-4">{post.content}</p>
                <div className="flex gap-2 flex-wrap">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-8"
                    onClick={() => {
                      apiRequest('POST', `/api/posts/${post.id}/react`, { emoji: '👍' }).then(() => {
                        queryClient.invalidateQueries({ queryKey: ['/api/posts', section] });
                      });
                    }}
                    data-testid={`button-react-${post.id}`}
                  >
                    <Smile className="w-3 h-3 mr-1" />
                    👍
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-8"
                    onClick={() => {
                      apiRequest('POST', `/api/posts/${post.id}/react`, { emoji: '❤️' }).then(() => {
                        queryClient.invalidateQueries({ queryKey: ['/api/posts', section] });
                      });
                    }}
                  >
                    ❤️
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-8"
                    onClick={() => {
                      apiRequest('POST', `/api/posts/${post.id}/react`, { emoji: '😂' }).then(() => {
                        queryClient.invalidateQueries({ queryKey: ['/api/posts', section] });
                      });
                    }}
                  >
                    😂
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">No posts yet. Be the first to create one!</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
