import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Users, Copy, Plus, ExternalLink, Settings, Calendar } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import Header from '@/components/layout/Header';
import CreateGroupDialog from '@/components/CreateGroupDialog';

interface Group {
  id: string;
  name: string;
  description: string | null;
  invite_code: string;
  created_at: string;
  created_by: string;
  member_role?: string;
  member_count?: number;
  updated_at: string;
}

interface GroupMember {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profiles: {
    name: string;
    email: string;
  };
}

const Groups = () => {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [membersLoading, setMembersLoading] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [editForm, setEditForm] = useState({ name: '', description: '' });
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchGroups();
    }
  }, [user]);

  const fetchGroups = async () => {
    try {
      const { data: groupsData, error } = await supabase
        .from('group_members')
        .select(`
          role,
          groups (
            id,
            name,
            description,
            invite_code,
            created_at,
            created_by,
            updated_at
          )
        `)
        .eq('user_id', user!.id);

      if (error) throw error;

      // Get member counts for each group
      const groupsWithCounts = await Promise.all(
        (groupsData || []).map(async (item) => {
          const group = item.groups as any;
          const { count } = await supabase
            .from('group_members')
            .select('*', { count: 'exact', head: true })
            .eq('group_id', group.id);

          return {
            ...group,
            member_role: item.role,
            member_count: count || 0
          };
        })
      );

      setGroups(groupsWithCounts);
    } catch (error: any) {
      toast({
        title: "Error loading groups",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchGroupMembers = async (groupId: string) => {
    setMembersLoading(true);
    try {
      // First get group members
      const { data: membersData, error: membersError } = await supabase
        .from('group_members')
        .select('id, user_id, role, joined_at')
        .eq('group_id', groupId);

      if (membersError) throw membersError;

      // Then get profiles for each member
      const membersWithProfiles = await Promise.all(
        (membersData || []).map(async (member) => {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('name, email')
            .eq('id', member.user_id)
            .single();

          return {
            ...member,
            profiles: profile || { name: 'Unknown', email: 'Unknown' }
          };
        })
      );

      setGroupMembers(membersWithProfiles);
    } catch (error: any) {
      toast({
        title: "Error loading members",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setMembersLoading(false);
    }
  };

  const copyInviteLink = (inviteCode: string) => {
    const inviteUrl = `${window.location.origin}/groups/join/${inviteCode}`;
    navigator.clipboard.writeText(inviteUrl);
    toast({
      title: "Invite link copied!",
      description: "Share this link with others to invite them to the group.",
    });
  };

  const updateGroup = async () => {
    if (!editingGroup) return;

    try {
      const { error } = await supabase
        .from('groups')
        .update({
          name: editForm.name,
          description: editForm.description,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingGroup.id);

      if (error) throw error;

      toast({
        title: "Group updated successfully",
      });

      setEditingGroup(null);
      fetchGroups();
    } catch (error: any) {
      toast({
        title: "Error updating group",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const removeMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      toast({
        title: "Member removed successfully",
      });

      if (selectedGroup) {
        fetchGroupMembers(selectedGroup.id);
        fetchGroups(); // Refresh member counts
      }
    } catch (error: any) {
      toast({
        title: "Error removing member",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Groups Management</h1>
            <p className="text-muted-foreground">Manage your groups, members, and invite codes</p>
          </div>
          <CreateGroupDialog onGroupCreated={fetchGroups} />
        </div>

        {groups.length === 0 ? (
          <Card>
            <CardHeader className="text-center">
              <CardTitle>No Groups Yet</CardTitle>
              <CardDescription>
                Create your first group to start collaborating with your team.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <CreateGroupDialog onGroupCreated={fetchGroups} />
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Groups List */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Your Groups</h2>
              {groups.map((group) => (
                <Card 
                  key={group.id}
                  className={`cursor-pointer transition-colors ${
                    selectedGroup?.id === group.id ? 'ring-2 ring-primary' : 'hover:bg-muted/50'
                  }`}
                  onClick={() => {
                    setSelectedGroup(group);
                    fetchGroupMembers(group.id);
                  }}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-lg">{group.name}</h3>
                      <div className="flex items-center gap-2">
                        <Badge variant={group.member_role === 'admin' ? 'default' : 'secondary'}>
                          {group.member_role}
                        </Badge>
                        {group.member_role === 'admin' && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingGroup(group);
                                  setEditForm({
                                    name: group.name,
                                    description: group.description || ''
                                  });
                                }}
                              >
                                <Settings className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Edit Group</DialogTitle>
                                <DialogDescription>
                                  Update your group details
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label htmlFor="name">Group Name</Label>
                                  <Input
                                    id="name"
                                    value={editForm.name}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="description">Description</Label>
                                  <Textarea
                                    id="description"
                                    value={editForm.description}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                                  />
                                </div>
                                <Button onClick={updateGroup} className="w-full">
                                  Update Group
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
                      </div>
                    </div>
                    
                    {group.description && (
                      <p className="text-sm text-muted-foreground mb-3">{group.description}</p>
                    )}
                    
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {group.member_count} members
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Created {new Date(group.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-3">
                      <code className="bg-muted px-2 py-1 rounded text-xs">{group.invite_code}</code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          copyInviteLink(group.invite_code);
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Group Details */}
            <div>
              {selectedGroup ? (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        {selectedGroup.name} Members
                      </CardTitle>
                      <CardDescription>
                        Manage group members and their roles
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                          <span className="font-medium">Invite Link:</span>
                          <code className="flex-1 text-sm">{`${window.location.origin}/groups/join/${selectedGroup.invite_code}`}</code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyInviteLink(selectedGroup.invite_code)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>

                        {membersLoading ? (
                          <div className="space-y-2">
                            {[1, 2, 3].map((i) => (
                              <div key={i} className="h-12 bg-muted rounded animate-pulse" />
                            ))}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {groupMembers.map((member) => (
                              <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                                <div>
                                  <p className="font-medium">{member.profiles.name}</p>
                                  <p className="text-sm text-muted-foreground">{member.profiles.email}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant={member.role === 'admin' ? 'default' : 'secondary'}>
                                    {member.role}
                                  </Badge>
                                  {selectedGroup.member_role === 'admin' && member.user_id !== user?.id && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeMember(member.id)}
                                    >
                                      Remove
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-medium mb-2">Select a Group</h3>
                    <p className="text-muted-foreground">
                      Choose a group from the left to view its details and manage members.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Groups;