import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { CheckCircle, XCircle } from 'lucide-react';
import type { Appeal } from '@shared/schema';

export default function AppealsPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: appeals, isLoading } = useQuery<Appeal[]>({
    queryKey: ['/api/appeals'],
    enabled: !!user && (user.role === 'owner' || user.role === 'admin' || user.role === 'moderator'),
  });

  const approveMutation = useMutation({
    mutationFn: async (appealId: number) => {
      await apiRequest('POST', `/api/appeals/${appealId}/approve`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/appeals'] });
      toast({ title: 'Appeal approved' });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (appealId: number) => {
      await apiRequest('POST', `/api/appeals/${appealId}/reject`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/appeals'] });
      toast({ title: 'Appeal rejected' });
    },
  });

  if (user?.role !== 'owner' && user?.role !== 'admin' && user?.role !== 'moderator') {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">You don't have permission to view appeals.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Appeal Management</h1>
        <p className="text-muted-foreground">Review and manage user appeals</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-2/3" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : appeals && appeals.length > 0 ? (
        <div className="space-y-4">
          {appeals.map((appeal) => (
            <Card key={appeal.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">Appeal from User {appeal.userId}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Submitted {new Date(appeal.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant={appeal.approved === null ? 'outline' : appeal.approved ? 'default' : 'destructive'}>
                    {appeal.approved === null ? 'Pending' : appeal.approved ? 'Approved' : 'Rejected'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-muted p-3 rounded mb-4">
                  <p className="text-sm">{appeal.reason}</p>
                </div>
                {appeal.approved === null && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => approveMutation.mutate(appeal.id)}
                      disabled={approveMutation.isPending}
                      data-testid={`button-approve-appeal-${appeal.id}`}
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => rejectMutation.mutate(appeal.id)}
                      disabled={rejectMutation.isPending}
                      data-testid={`button-reject-appeal-${appeal.id}`}
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">No pending appeals.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
