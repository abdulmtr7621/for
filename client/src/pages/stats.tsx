import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Users, MessageSquare, TrendingUp, Bot } from 'lucide-react';

export default function StatsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [discordUserId, setDiscordUserId] = useState('');
  const [discordStats, setDiscordStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleCheckStats = async () => {
    if (!discordUserId.trim()) {
      toast({ title: 'Please enter a Discord user ID', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/discord-stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discordUserId }),
      });

      if (response.ok) {
        const stats = await response.json();
        setDiscordStats(stats);
        toast({ title: 'Discord stats loaded successfully' });
      } else {
        toast({ title: 'Failed to fetch Discord stats', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error connecting to Discord bot', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-4xl p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Community Stats</h1>
        <p className="text-muted-foreground">View your activity and Discord statistics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="w-4 h-4" />
              Your Posts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{user?.postCount || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Your Messages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{user?.messageCount || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Warnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{user?.warningPoints || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5" />
            Discord Stats
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter Discord User ID..."
                value={discordUserId}
                onChange={(e) => setDiscordUserId(e.target.value)}
                data-testid="input-discord-userid"
              />
              <Button onClick={handleCheckStats} disabled={loading} data-testid="button-check-discord-stats">
                {loading ? 'Loading...' : 'Check Stats'}
              </Button>
            </div>

            {discordStats && (
              <div className="bg-muted p-4 rounded-lg space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Discord Posts:</span>
                  <span className="font-semibold">{discordStats.posts || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Discord Reactions:</span>
                  <span className="font-semibold">{discordStats.reactions || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Member Since:</span>
                  <span className="font-semibold">{discordStats.joinedAt || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Roles:</span>
                  <span className="font-semibold">{discordStats.roles?.join(', ') || 'None'}</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
