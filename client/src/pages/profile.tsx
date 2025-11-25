import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { RoleBadge } from '@/components/role-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import type { Role, PostWithAuthor } from '@shared/schema';

export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: posts, isLoading } = useQuery<PostWithAuthor[]>({
    queryKey: ['/api/user/posts'],
    enabled: !!user,
  });

  const avatarMutation = useMutation({
    mutationFn: async (file: File) => {
      const reader = new FileReader();
      return new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      }).then(async (data) => {
        const res = await apiRequest('POST', '/api/user/avatar', { avatar: data });
        return res.json();
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      toast({ title: 'Avatar updated successfully' });
    },
    onError: () => toast({ title: 'Failed to update avatar', variant: 'destructive' }),
  });

  const bannerMutation = useMutation({
    mutationFn: async (file: File) => {
      const reader = new FileReader();
      return new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      }).then(async (data) => {
        const res = await apiRequest('POST', '/api/user/banner', { banner: data });
        return res.json();
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      toast({ title: 'Banner updated successfully' });
    },
    onError: () => toast({ title: 'Failed to update banner', variant: 'destructive' }),
  });

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) avatarMutation.mutate(file);
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) bannerMutation.mutate(file);
  };

  if (!user) {
    return null;
  }

  const initials = user.username.substring(0, 2).toUpperCase();

  return (
    <div className="container mx-auto max-w-5xl p-6">
      <Card className="mb-6">
        <CardHeader>
          <div className="relative">
            {user.banner && (
              <div className="w-full h-32 rounded-lg overflow-hidden mb-4 -mt-6 -mx-6 relative group">
                <img 
                  src={user.banner} 
                  alt="Banner" 
                  className="w-full h-full object-cover"
                />
                <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                  <Upload className="w-6 h-6 text-white" />
                  <input type="file" accept="image/*" onChange={handleBannerChange} className="hidden" data-testid="input-banner" disabled={bannerMutation.isPending} />
                </label>
              </div>
            )}
            {!user.banner && (
              <label className="w-full h-32 rounded-lg overflow-hidden mb-4 -mt-6 -mx-6 bg-muted flex items-center justify-center cursor-pointer hover:bg-muted/80 transition-colors">
                <Upload className="w-6 h-6 text-muted-foreground" />
                <input type="file" accept="image/*" onChange={handleBannerChange} className="hidden" data-testid="input-banner" disabled={bannerMutation.isPending} />
              </label>
            )}
          </div>
          <div className="flex items-start gap-6">
            <label className="relative group">
              <Avatar className="w-24 h-24 border-4 border-background cursor-pointer">
                <AvatarImage src={user.avatar || undefined} alt={user.username} />
                <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Upload className="w-5 h-5 text-white" />
              </div>
              <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" data-testid="input-avatar" disabled={avatarMutation.isPending} />
            </label>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <CardTitle className="text-2xl">{user.username}</CardTitle>
                <RoleBadge role={user.role as Role} />
              </div>
              {user.badge && (
                <div className="mb-2">
                  <span className="inline-block px-2 py-1 rounded bg-purple-500/20 text-purple-600 dark:text-purple-400 text-xs font-semibold">
                    {user.badge.replace('-', ' ').toUpperCase()}
                  </span>
                </div>
              )}
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="text-center">
                  <p className="text-lg font-bold">{user.postCount || 0}</p>
                  <p className="text-xs text-muted-foreground">Posts</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold">{user.messageCount || 0}</p>
                  <p className="text-xs text-muted-foreground">Messages</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold">{user.warningPoints || 0}</p>
                  <p className="text-xs text-muted-foreground">⚠️ Points</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground font-mono mb-1">
                ID: {user.userId}
              </p>
              <p className="text-sm text-muted-foreground">
                Member since {new Date(user.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="mb-4">
        <h2 className="text-2xl font-bold">Your Posts</h2>
        <p className="text-muted-foreground">
          {posts?.length || 0} {posts?.length === 1 ? 'post' : 'posts'} created
        </p>
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
      ) : posts && posts.length > 0 ? (
        <div className="space-y-4">
          {posts.map((post) => (
            <Card key={post.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg mb-1">{post.title}</CardTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="capitalize">{post.section.replace('-', ' ')}</span>
                      <span>•</span>
                      <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                      {post.status && (
                        <>
                          <span>•</span>
                          <span className="capitalize">{post.status}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-foreground line-clamp-3">{post.content}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">You haven't created any posts yet.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
