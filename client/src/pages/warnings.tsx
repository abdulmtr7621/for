import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';

export default function WarningsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [appealReason, setAppealReason] = useState('');
  const [selectedWarningId, setSelectedWarningId] = useState<number | null>(null);

  const appealMutation = useMutation({
    mutationFn: async (warningId: number) => {
      await apiRequest('POST', '/api/appeals', { punishmentId: warningId, reason: appealReason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/appeals'] });
      setAppealReason('');
      setSelectedWarningId(null);
      toast({ title: 'Appeal submitted successfully' });
    },
    onError: () => toast({ title: 'Failed to submit appeal', variant: 'destructive' }),
  });

  if (!user) {
    return null;
  }

  return (
    <div className="container mx-auto max-w-4xl p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Your Warnings</h1>
        <p className="text-muted-foreground">View and appeal your community warnings</p>
      </div>

      {(user.warningPoints || 0) === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground text-lg">You have no warnings. Keep up the good behavior!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Warning Points: {user.warningPoints || 0}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                You currently have {user.warningPoints || 0} warning points. Accumulating too many points may result in restrictions on your account.
              </p>
              {selectedWarningId === null ? (
                <Button onClick={() => setSelectedWarningId(1)} data-testid="button-appeal-warning">
                  Appeal Warning
                </Button>
              ) : (
                <div className="space-y-3">
                  <Textarea
                    placeholder="Explain why you believe this warning is unfair..."
                    value={appealReason}
                    onChange={(e) => setAppealReason(e.target.value)}
                    data-testid="input-appeal-reason"
                    rows={4}
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={() => appealMutation.mutate(1)}
                      disabled={appealMutation.isPending || !appealReason.trim()}
                      data-testid="button-submit-appeal"
                    >
                      {appealMutation.isPending ? 'Submitting...' : 'Submit Appeal'}
                    </Button>
                    <Button variant="outline" onClick={() => setSelectedWarningId(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
