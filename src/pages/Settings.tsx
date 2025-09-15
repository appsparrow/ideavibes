import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Settings as SettingsIcon,
  User,
  Shield,
  Database,
  Trash2,
  Edit
} from 'lucide-react';
import Header from '@/components/layout/Header';
import { useToast } from '@/hooks/use-toast';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  investor_type: string;
  profile: string | null;
}

const Settings = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchProfile();
      checkAdminStatus();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user!.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error: any) {
      toast({
        title: "Error loading profile",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const checkAdminStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user!.id)
        .single();

      if (!error && data?.role === 'admin') {
        setIsAdmin(true);
        fetchAllUsers();
      }
    } catch (error: any) {
      console.log('Not admin or error checking status');
    }
  };

  const fetchAllUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAllUsers(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading users",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const updateProfile = async () => {
    if (!profile) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: profile.name,
          investor_type: profile.investor_type as 'active' | 'passive' | 'strategic',
          profile: profile.profile
        })
        .eq('id', user!.id);

      if (error) throw error;

      toast({
        title: "Profile updated",
        description: "Your profile has been saved successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error updating profile",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole as 'member' | 'admin' })
        .eq('id', userId);

      if (error) throw error;

      setAllUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, role: newRole } : user
      ));

      toast({
        title: "User role updated",
        description: "User role has been changed successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error updating role",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteUser = async () => {
    if (!userToDelete) return;

    setIsDeletingUser(true);
    try {
      // Note: In a real app, you'd want to handle this through a proper user deletion process
      // that cleans up all related data and possibly uses Supabase's auth admin functions
      toast({
        title: "User deletion",
        description: `User deletion for ${userToDelete.name} would be handled through admin authentication API.`,
        variant: "destructive",
      });
      
      setUserToDelete(null);
    } catch (error: any) {
      toast({
        title: "Error deleting user",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsDeletingUser(false);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'moderator': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </main>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2 mb-8">
            <SettingsIcon className="h-6 w-6" />
            <h1 className="text-3xl font-bold">Settings</h1>
          </div>

          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList>
              <TabsTrigger value="profile">Profile</TabsTrigger>
              {isAdmin && <TabsTrigger value="admin">Admin Panel</TabsTrigger>}
              <TabsTrigger value="preferences">Preferences</TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Profile Information
                  </CardTitle>
                  <CardDescription>
                    Update your personal information and preferences
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        value={profile.name}
                        onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        value={profile.email}
                        disabled
                        className="bg-muted"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="role">Role</Label>
                      <div className="flex items-center gap-2">
                        <Badge className={getRoleColor(profile.role)} variant="secondary">
                          {profile.role}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          (Contact admin to change)
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="investor_type">Investor Type</Label>
                      <Select
                        value={profile.investor_type}
                        onValueChange={(value) => setProfile({ ...profile, investor_type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active (Time + Expertise)</SelectItem>
                          <SelectItem value="passive">Passive (Capital Only)</SelectItem>
                          <SelectItem value="strategic">Strategic (Connections)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="profile">Bio / Profile</Label>
                    <Textarea
                      id="profile"
                      placeholder="Tell the community about your interests, expertise, and background..."
                      value={profile.profile || ''}
                      onChange={(e) => setProfile({ ...profile, profile: e.target.value })}
                      className="min-h-[100px]"
                    />
                  </div>

                  <Button 
                    onClick={updateProfile} 
                    disabled={saving}
                    className="w-full md:w-auto"
                  >
                    {saving ? 'Saving...' : 'Save Profile'}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {isAdmin && (
              <TabsContent value="admin" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      User Management
                    </CardTitle>
                    <CardDescription>
                      Manage user roles and permissions
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {allUsers.map((userProfile) => (
                        <div key={userProfile.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex-1">
                            <div className="font-medium">{userProfile.name}</div>
                            <div className="text-sm text-muted-foreground">{userProfile.email}</div>
                            <div className="flex gap-2 mt-1">
                              <Badge className={getRoleColor(userProfile.role)} variant="secondary">
                                {userProfile.role}
                              </Badge>
                              <Badge variant="outline">
                                {userProfile.investor_type}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Select
                              value={userProfile.role}
                              onValueChange={(value) => updateUserRole(userProfile.id, value)}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="member">Member</SelectItem>
                                <SelectItem value="moderator">Moderator</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setUserToDelete(userProfile)}
                              disabled={userProfile.id === user?.id}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Database className="h-5 w-5" />
                      System Settings
                    </CardTitle>
                    <CardDescription>
                      Configure platform-wide settings
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="p-4 border rounded-lg">
                        <h4 className="font-medium mb-2">Workflow Settings</h4>
                        <p className="text-sm text-muted-foreground mb-3">
                          Configure how ideas progress through the evaluation pipeline
                        </p>
                        <Button variant="outline" size="sm">
                          Configure Workflow
                        </Button>
                      </div>

                      <div className="p-4 border rounded-lg">
                        <h4 className="font-medium mb-2">Notification Settings</h4>
                        <p className="text-sm text-muted-foreground mb-3">
                          Manage email notifications and alerts
                        </p>
                        <Button variant="outline" size="sm">
                          Configure Notifications
                        </Button>
                      </div>

                      <div className="p-4 border rounded-lg">
                        <h4 className="font-medium mb-2">Data Export</h4>
                        <p className="text-sm text-muted-foreground mb-3">
                          Export platform data for analysis
                        </p>
                        <Button variant="outline" size="sm">
                          Export Data
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            <TabsContent value="preferences" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Notification Preferences</CardTitle>
                  <CardDescription>
                    Control how you receive updates about ideas and activities
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">New Idea Notifications</div>
                        <div className="text-sm text-muted-foreground">
                          Get notified when new ideas are submitted
                        </div>
                      </div>
                      <input type="checkbox" defaultChecked className="toggle" />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">Comment Notifications</div>
                        <div className="text-sm text-muted-foreground">
                          Get notified when someone comments on your ideas
                        </div>
                      </div>
                      <input type="checkbox" defaultChecked className="toggle" />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">Evaluation Reminders</div>
                        <div className="text-sm text-muted-foreground">
                          Reminders to evaluate ideas in your areas of interest
                        </div>
                      </div>
                      <input type="checkbox" defaultChecked className="toggle" />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">Weekly Digest</div>
                        <div className="text-sm text-muted-foreground">
                          Weekly summary of platform activity
                        </div>
                      </div>
                      <input type="checkbox" defaultChecked className="toggle" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Privacy Settings</CardTitle>
                  <CardDescription>
                    Control your privacy and data sharing preferences
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">Profile Visibility</div>
                        <div className="text-sm text-muted-foreground">
                          Allow other members to see your profile
                        </div>
                      </div>
                      <input type="checkbox" defaultChecked className="toggle" />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">Activity Tracking</div>
                        <div className="text-sm text-muted-foreground">
                          Include your activities in platform analytics
                        </div>
                      </div>
                      <input type="checkbox" defaultChecked className="toggle" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Delete User Confirmation Dialog */}
      <Dialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete <strong>{userToDelete?.name}</strong>? 
              This action cannot be undone and will remove all their data, ideas, and group memberships.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Button 
              variant="destructive" 
              onClick={deleteUser} 
              disabled={isDeletingUser}
              className="flex-1"
            >
              {isDeletingUser ? "Deleting..." : "Delete Permanently"}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setUserToDelete(null)}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Settings;