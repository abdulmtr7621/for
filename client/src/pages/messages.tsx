import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Send } from 'lucide-react';
import type { MessageWithUsers } from '@shared/schema';

export default function MessagesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [recipientUsername, setRecipientUsername] = useState('');
  const [messageContent, setMessageContent] = useState('');
  const [open, setOpen] = useState(false);

  const { data: messages, isLoading } = useQuery<MessageWithUsers[]>({
    queryKey: ['/api/messages'],
    enabled: !!user,
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      return await apiRequest('POST', '/api/messages', {
        recipientUsername,
        content: messageContent,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/messages'] });
      toast({ title: 'Message sent successfully' });
      setRecipientUsername('');
      setMessageContent('');
      setOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send message',
        variant: 'destructive',
      });
    },
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    sendMutation.mutate();
  };

  if (!user) return null;

  return (
    <div className="container mx-auto max-w-4xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Messages</h1>
          <p className="text-muted-foreground">Your private messages</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-new-message">
              <Send className="w-4 h-4 mr-2" />
              New Message
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Send Message</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSend} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="recipient">Recipient Username</Label>
                <Input
                  id="recipient"
                  type="text"
                  placeholder="Enter username"
                  value={recipientUsername}
                  onChange={(e) => setRecipientUsername(e.target.value)}
                  required
                  data-testid="input-recipient"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  placeholder="Write your message..."
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  required
                  rows={6}
                  data-testid="textarea-message"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={sendMutation.isPending} data-testid="button-send">
                  {sendMutation.isPending ? 'Sending...' : 'Send Message'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-1/3" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : messages && messages.length > 0 ? (
        <div className="space-y-4">
          {messages.map((message) => (
            <Card key={message.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">From: {message.sender.username}</CardTitle>
                  <span className="text-sm text-muted-foreground">
                    {new Date(message.createdAt).toLocaleString()}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-foreground whitespace-pre-wrap">{message.content}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">No messages yet.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
