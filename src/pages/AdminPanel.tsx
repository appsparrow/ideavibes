import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, Crown, Zap } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { toast } from 'sonner';

interface UserProfile {
  id: string;
  email: string;
  subscription_tier: string | null;
  subscription_expires_at: string | null;
  role: string;
  created_at: string;
}

const AdminPanel = () => {
  const { user, isAdmin } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchEmail, setSearchEmail] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  useEffect(() => {
    if (searchEmail) {
      setFilteredUsers(users.filter(user => 
        user.email.toLowerCase().includes(searchEmail.toLowerCase())
      ));
    } else {
      setFilteredUsers(users);
    }
  }, [searchEmail, users]);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          subscription_tier,
          subscription_expires_at,
          role,
          created_at
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const updateSubscription = async (userId: string, tier: string) => {
    try {
      const expiresAt = tier === 'pro' 
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
        : null;

      const { error } = await supabase
        .from('profiles')
        .update({
          subscription_tier: tier === 'free' ? null : tier,
          subscription_expires_at: expiresAt
        })
        .eq('id', userId);

      if (error) {
        console.error('Subscription update error:', error);
        throw new Error(`Database error: ${error.message}. Please run the database updates first.`);
      }

      toast.success(`Subscription updated to ${tier === 'free' ? 'Free' : 'Pro'}`);
      fetchUsers();
    } catch (error) {
      console.error('Error updating subscription:', error);
      toast.error('Failed to update subscription');
    }
  };

  const updateRole = async (userId: string, role: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role })
        .eq('id', userId);

      if (error) throw error;

      toast.success(`Role updated to ${role}`);
      fetchUsers();
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Failed to update role');
    }
  };

  if (!isAdmin) {
    return (
      <Layout>
        <div className="container mx-auto py-8">
          <Card>
            <CardContent className="p-8 text-center">
              <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
              <p className="text-muted-foreground">You need admin privileges to access this page.</p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto py-8">
          <div className="text-center">Loading...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto py-8 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Admin Panel</h1>
            <p className="text-muted-foreground">Manage user subscriptions and roles</p>
          </div>
          <Badge variant="destructive" className="flex items-center gap-1">
            <Crown className="h-3 w-3" />
            Admin Only
          </Badge>
        </div>

        {/* Search */}
        <Card>
          <CardHeader>
            <CardTitle>Search Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by email..."
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                className="max-w-sm"
              />
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Test Account Setup</CardTitle>
            <CardDescription>
              Set up test accounts with different subscription tiers
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Button
                onClick={() => {
                  const freeUser = users.find(u => u.email === 'free@streakzilla.com');
                  if (freeUser) {
                    updateSubscription(freeUser.id, 'free');
                  } else {
                    toast.error('User free@streakzilla.com not found. Please create account first.');
                  }
                }}
                variant="outline"
                className="justify-start"
              >
                <Zap className="h-4 w-4 mr-2" />
                Set free@streakzilla.com to FREE
              </Button>
              <Button
                onClick={() => {
                  const paidUser = users.find(u => u.email === 'paid@streakzilla.com');
                  if (paidUser) {
                    updateSubscription(paidUser.id, 'pro');
                  } else {
                    toast.error('User paid@streakzilla.com not found. Please create account first.');
                  }
                }}
                variant="outline"
                className="justify-start"
              >
                <Crown className="h-4 w-4 mr-2" />
                Set paid@streakzilla.com to PRO
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Users List */}
        <Card>
          <CardHeader>
            <CardTitle>All Users ({filteredUsers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredUsers.map((userProfile) => (
                <div key={userProfile.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{userProfile.email}</p>
                        <Badge variant={userProfile.subscription_tier === 'pro' ? 'default' : 'secondary'}>
                          {userProfile.subscription_tier === 'pro' ? 'Pro' : 'Free'}
                        </Badge>
                        {userProfile.role && (
                          <Badge variant="outline">{userProfile.role}</Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <p>Created: {new Date(userProfile.created_at).toLocaleDateString()}</p>
                        {userProfile.subscription_expires_at && (
                          <p>Expires: {new Date(userProfile.subscription_expires_at).toLocaleDateString()}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Select onValueChange={(value) => updateSubscription(userProfile.id, value)}>
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder="Subscription" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="free">Free</SelectItem>
                          <SelectItem value="pro">Pro</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <Select onValueChange={(value) => updateRole(userProfile.id, value)}>
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder="Role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="moderator">Moderator</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ))}
              
              {filteredUsers.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No users found matching your search.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Testing Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-semibold">1. Create Test Accounts</h4>
              <p className="text-sm text-muted-foreground">
                Sign up with free@streakzilla.com and paid@streakzilla.com using the auth page
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">2. Set Subscription Tiers</h4>
              <p className="text-sm text-muted-foreground">
                Use the quick actions above or the dropdowns to assign subscription tiers
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">3. Test Features</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Free: Limited to 2 AI summaries/month, no feedback surveys</li>
                <li>• Pro: Unlimited AI summaries, feedback surveys, rich text editing</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default AdminPanel;
