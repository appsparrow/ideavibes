import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Users, Copy, Plus, ExternalLink, Settings, Calendar, Phone, Mail } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import Header from '@/components/layout/Header';
import CreateGroupDialog from '@/components/CreateGroupDialog';
import JoinGroupForm from '@/components/JoinGroupForm';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

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
    first_name: string | null;
    last_name: string | null;
    phone: string | null;
    profile_photo_url: string | null;
    bio: string | null;
    expertise_tags: string[] | null;
    skills: string[] | null;
  };
}

const Groups = () => {
  const { user, isAdmin, isModerator } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [membersLoading, setMembersLoading] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [editForm, setEditForm] = useState({ name: '', description: '' });
  const [showAllGroups, setShowAllGroups] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<GroupMember | null>(null);
  const [isRemovingMember, setIsRemovingMember] = useState(false);
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
          const { data: profile } = await supabase
            .from('profiles')
            .select(`
              name, 
              email, 
              first_name, 
              last_name, 
              phone, 
              profile_photo_url, 
              bio, 
              expertise_tags, 
              skills
            `)
            .eq('id', member.user_id)
            .maybeSingle();

          return {
            ...member,
            profiles: profile || { 
              name: 'Unknown', 
              email: 'Unknown',
              first_name: null,
              last_name: null,
              phone: null,
              profile_photo_url: null,
              bio: null,
              expertise_tags: null,
              skills: null
            }
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

  const removeMember = async () => {
    if (!memberToRemove) return;

    setIsRemovingMember(true);
    try {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('id', memberToRemove.id);

      if (error) throw error;

      toast({
        title: "Member removed successfully",
        description: `${memberToRemove.profiles.name} has been removed from the group.`,
      });

      if (selectedGroup) {
        fetchGroupMembers(selectedGroup.id);
        fetchGroups(); // Refresh member counts
      }
      
      setMemberToRemove(null);
    } catch (error: any) {
      toast({
        title: "Error removing member",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsRemovingMember(false);
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
            <p className="text-muted-foreground">
              {isAdmin || isModerator ? 'Manage your groups, members, and invite codes' : 'View your groups and members'}
            </p>
          </div>
          <div className="flex gap-2">
            {(isAdmin || isModerator) && <CreateGroupDialog onGroupCreated={fetchGroups} />}
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Join Group
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Join a Group</DialogTitle>
                  <DialogDescription>
                    Enter an invite code to join an existing group
                  </DialogDescription>
                </DialogHeader>
                <JoinGroupForm onSuccess={() => {
                  fetchGroups();
                }} />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {groups.length === 0 ? (
          <Card>
            <CardHeader className="text-center">
              <CardTitle>No Groups Yet</CardTitle>
              <CardDescription>
                {isAdmin || isModerator 
                  ? "Create your first group to start collaborating with your team."
                  : "Ask an admin for an invite code to join a group."
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              {(isAdmin || isModerator) && <CreateGroupDialog onGroupCreated={fetchGroups} />}
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
                        {(isAdmin || isModerator) && group.member_role === 'admin' && (
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
                    
                    {(isAdmin || isModerator) && (
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
                    )}
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
                          {(isAdmin || isModerator) && (
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
                          )}

                        {membersLoading ? (
                          <div className="space-y-2">
                            {[1, 2, 3].map((i) => (
                              <div key={i} className="h-12 bg-muted rounded animate-pulse" />
                            ))}
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {groupMembers.map((member) => {
                              const displayName = member.profiles.first_name && member.profiles.last_name 
                                ? `${member.profiles.first_name} ${member.profiles.last_name}`
                                : member.profiles.name;
                              
                              const initials = displayName
                                .split(' ')
                                .map(n => n[0])
                                .join('')
                                .toUpperCase()
                                .slice(0, 2);

                              const shortBio = member.profiles.bio 
                                ? member.profiles.bio.length > 60 
                                  ? `${member.profiles.bio.slice(0, 60)}...`
                                  : member.profiles.bio
                                : null;

                              return (
                                <Card key={member.id} className="relative">
                                  <CardContent className="p-4">
                                    <div className="flex items-start gap-3">
                                      <Avatar className="h-12 w-12">
                                        <AvatarImage 
                                          src={member.profiles.profile_photo_url || undefined} 
                                          alt={displayName}
                                        />
                                        <AvatarFallback className="bg-primary/10 text-primary">
                                          {initials}
                                        </AvatarFallback>
                                      </Avatar>
                                      
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                          <h4 className="font-semibold text-sm truncate">{displayName}</h4>
                                          <Badge variant={member.role === 'admin' ? 'default' : 'secondary'} className="ml-2">
                                            {member.role}
                                          </Badge>
                                        </div>
                                        
                                        <div className="space-y-1 mb-2">
                                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                            <Mail className="h-3 w-3" />
                                            <span className="truncate">{member.profiles.email}</span>
                                          </div>
                                          {member.profiles.phone && (
                                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                              <Phone className="h-3 w-3" />
                                              <span>{member.profiles.phone}</span>
                                            </div>
                                          )}
                                        </div>

                                        {shortBio && (
                                          <p className="text-xs text-muted-foreground mb-2 leading-relaxed">
                                            {shortBio}
                                          </p>
                                        )}

                                        {/* Expertise and Skills Tags */}
                                        <div className="space-y-1">
                                          {member.profiles.expertise_tags && member.profiles.expertise_tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1">
                                              {member.profiles.expertise_tags.slice(0, 3).map((tag, index) => (
                                                <Badge key={index} variant="outline" className="text-xs py-0 px-1.5 h-5">
                                                  {tag}
                                                </Badge>
                                              ))}
                                              {member.profiles.expertise_tags.length > 3 && (
                                                <Badge variant="outline" className="text-xs py-0 px-1.5 h-5">
                                                  +{member.profiles.expertise_tags.length - 3}
                                                </Badge>
                                              )}
                                            </div>
                                          )}
                                          {member.profiles.skills && member.profiles.skills.length > 0 && (
                                            <div className="flex flex-wrap gap-1">
                                              {member.profiles.skills.slice(0, 2).map((skill, index) => (
                                                <Badge key={index} variant="secondary" className="text-xs py-0 px-1.5 h-5">
                                                  {skill}
                                                </Badge>
                                              ))}
                                              {member.profiles.skills.length > 2 && (
                                                <Badge variant="secondary" className="text-xs py-0 px-1.5 h-5">
                                                  +{member.profiles.skills.length - 2}
                                                </Badge>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    
                                    {/* Action buttons */}
                                    {(isAdmin || isModerator) && selectedGroup.member_role === 'admin' && member.user_id !== user?.id && (
                                      <div className="absolute top-2 right-2">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => setMemberToRemove(member)}
                                          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                                        >
                                          ✕
                                        </Button>
                                      </div>
                                    )}
                                  </CardContent>
                                </Card>
                              );
                            })}
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

      {/* Remove Member Confirmation Dialog */}
      <Dialog open={!!memberToRemove} onOpenChange={() => setMemberToRemove(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove <strong>{memberToRemove?.profiles.name}</strong> from this group? 
              They will lose access to all group content and will need to be re-invited to join again.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Button 
              variant="destructive" 
              onClick={removeMember} 
              disabled={isRemovingMember}
              className="flex-1"
            >
              {isRemovingMember ? "Removing..." : "Remove Member"}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setMemberToRemove(null)}
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

export default Groups;