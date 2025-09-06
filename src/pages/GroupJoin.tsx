import { useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import JoinGroupForm from '@/components/JoinGroupForm';

const GroupJoin = () => {
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Join Group</h1>
          <p className="text-muted-foreground mb-4">Please sign in first to join the group.</p>
          <a href="/auth" className="text-primary hover:underline">
            Sign in →
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <JoinGroupForm inviteCode={inviteCode} />
    </div>
  );
};

export default GroupJoin;