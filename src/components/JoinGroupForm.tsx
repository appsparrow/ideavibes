import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useGroupContext } from '@/hooks/useGroupContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface JoinGroupFormProps {
  inviteCode?: string;
  onSuccess?: () => void;
}

const JoinGroupForm = ({ inviteCode: initialInviteCode, onSuccess }: JoinGroupFormProps) => {
  const { user } = useAuth();
  const { setSelectedGroupId, setSelectedGroupName } = useGroupContext();
  const navigate = useNavigate();
  const [inviteCode, setInviteCode] = useState(initialInviteCode || '');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !inviteCode.trim()) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('join_group_by_invite_code', {
        invite_code_param: inviteCode.trim()
      });

      if (error) throw error;

      const result = data as { success: boolean; group_name?: string; error?: string };

      if (result.success) {
        // Automatically select the joined group
        setSelectedGroupId(result.group_id);
        setSelectedGroupName(result.group_name);
        
        toast({
          title: "Welcome to the group!",
          description: `You've successfully joined ${result.group_name} and it has been selected.`,
        });
        onSuccess?.();
        if (!onSuccess) navigate('/');
      } else {
        toast({
          title: "Failed to join group",
          description: result.error || "Invalid invite code.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error joining group",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
          <Users className="h-6 w-6 text-primary" />
        </div>
        <CardTitle>Join Group</CardTitle>
        <CardDescription>
          Enter your invite code to join a group workspace
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleJoinGroup} className="space-y-4">
          <div>
            <Label htmlFor="inviteCode">Invite Code</Label>
            <Input
              id="inviteCode"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="e.g., GRP-ABCD1234"
              className="text-center font-mono"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Ask your group admin for the invite code
            </p>
          </div>

          <Button type="submit" className="w-full" disabled={loading || !inviteCode.trim()}>
            {loading ? (
              "Joining..."
            ) : (
              <>
                Join Group
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </form>

        <div className="mt-4 pt-4 border-t text-center">
          <p className="text-sm text-muted-foreground">
            Don't have an invite code?{' '}
            <Button variant="link" className="p-0 h-auto" onClick={() => navigate('/')}>
              Go to Dashboard
            </Button>
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default JoinGroupForm;