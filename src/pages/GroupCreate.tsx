import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import CreateGroupDialog from '@/components/CreateGroupDialog';
import Header from '@/components/layout/Header';

const GroupCreate = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Create Group</h1>
          <p className="text-muted-foreground mb-4">Please sign in first to create a group.</p>
          <a href="/auth" className="text-primary hover:underline">
            Sign in →
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-3xl font-bold mb-4">Create New Group</h1>
          <p className="text-muted-foreground mb-8">
            Set up a new workspace for your team to collaborate on ideas.
          </p>
          
          <CreateGroupDialog onGroupCreated={() => navigate('/')} />
        </div>
      </main>
    </div>
  );
};

export default GroupCreate;