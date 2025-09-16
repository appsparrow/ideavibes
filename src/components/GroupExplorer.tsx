import React, { useState, useEffect } from 'react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { ChevronRight, ChevronDown, Users, Lightbulb, RefreshCw, Building2 } from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { toast } from 'sonner';

interface Group {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  member_count: number;
  idea_count: number;
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

interface Idea {
  id: string;
  title: string;
  submitted_by: string;
  status: string;
  created_at: string;
  author_name: string;
}

const GroupExplorer: React.FC = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [groupIdeas, setGroupIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [membersLoading, setMembersLoading] = useState(false);
  const [ideasLoading, setIdeasLoading] = useState(false);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const { data: groupsData, error } = await supabase
        .from('groups')
        .select('id, name, description, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get member and idea counts for each group
      const groupsWithCounts = await Promise.all(
        (groupsData || []).map(async (group) => {
          const [memberCount, ideaCount] = await Promise.all([
            supabase.from('group_members').select('*', { count: 'exact', head: true }).eq('group_id', group.id),
            supabase.from('ideas').select('*', { count: 'exact', head: true }).eq('group_id', group.id)
          ]);

          return {
            ...group,
            member_count: memberCount.count || 0,
            idea_count: ideaCount.count || 0
          };
        })
      );

      setGroups(groupsWithCounts);
    } catch (error) {
      console.error('Error fetching groups:', error);
      toast.error('Failed to load groups');
    } finally {
      setLoading(false);
    }
  };

  const fetchGroupMembers = async (groupId: string) => {
    setMembersLoading(true);
    try {
      const { data: membersData, error } = await supabase
        .from('group_members')
        .select('id, user_id, role, joined_at')
        .eq('group_id', groupId);

      if (error) throw error;

      const membersWithProfiles = await Promise.all(
        (membersData || []).map(async (member) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('name, email')
            .eq('id', member.user_id)
            .maybeSingle();

          return {
            ...member,
            profiles: profile || { name: 'Unknown', email: 'Unknown' }
          };
        })
      );

      setGroupMembers(membersWithProfiles);
    } catch (error) {
      console.error('Error fetching group members:', error);
      toast.error('Failed to load group members');
    } finally {
      setMembersLoading(false);
    }
  };

  const fetchGroupIdeas = async (groupId: string) => {
    setIdeasLoading(true);
    try {
      const { data: ideasData, error } = await supabase
        .from('ideas')
        .select(`
          id, 
          title, 
          submitted_by, 
          status, 
          created_at,
          profiles!ideas_submitted_by_fkey(name)
        `)
        .eq('group_id', groupId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const ideasWithDetails = (ideasData || []).map(idea => ({
        id: idea.id,
        title: idea.title,
        submitted_by: idea.submitted_by,
        status: idea.status,
        created_at: idea.created_at,
        author_name: idea.profiles?.name || 'Unknown'
      }));

      setGroupIdeas(ideasWithDetails);
    } catch (error) {
      console.error('Error fetching group ideas:', error);
      toast.error('Failed to load group ideas');
    } finally {
      setIdeasLoading(false);
    }
  };

  const handleGroupSelect = (group: Group) => {
    setSelectedGroup(group);
    fetchGroupMembers(group.id);
    fetchGroupIdeas(group.id);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'moderator': return 'bg-blue-100 text-blue-800';
      case 'member': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'proposed': return 'bg-yellow-100 text-yellow-800';
      case 'under_review': return 'bg-blue-100 text-blue-800';
      case 'validated': return 'bg-green-100 text-green-800';
      case 'investment_ready': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Loading groups...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="h-[600px] border rounded-lg overflow-hidden bg-white">
      {/* macOS Finder-style Three-Pane Layout */}
      <div className="flex h-full">
        {/* Left Sidebar - Groups List */}
        <div className="w-1/3 border-r bg-gray-50">
          <div className="p-3 border-b bg-gray-100">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Groups</h3>
              <Button variant="ghost" size="sm" onClick={fetchGroups}>
                <RefreshCw className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <div className="overflow-y-auto h-full">
            {groups.map((group) => (
              <div
                key={group.id}
                className={`p-3 cursor-pointer border-b hover:bg-gray-100 ${
                  selectedGroup?.id === group.id ? 'bg-blue-50 border-blue-200' : ''
                }`}
                onClick={() => handleGroupSelect(group)}
              >
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-orange-600" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{group.name}</div>
                    <div className="text-xs text-gray-500">
                      {group.member_count} members • {group.idea_count} ideas
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Middle Pane - Group Details */}
        <div className="w-1/3 border-r">
          {selectedGroup ? (
            <>
              <div className="p-3 border-b bg-gray-100">
                <h3 className="font-semibold text-sm">{selectedGroup.name}</h3>
                <p className="text-xs text-gray-500">Group Details</p>
              </div>
              <div className="p-3 space-y-4">
                <div>
                  <h4 className="font-medium text-sm mb-2">Description</h4>
                  <p className="text-sm text-gray-600">
                    {selectedGroup.description || 'No description provided'}
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-sm mb-2">Statistics</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Members:</span>
                      <Badge variant="outline" className="text-xs">
                        {selectedGroup.member_count}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Ideas:</span>
                      <Badge variant="outline" className="text-xs">
                        {selectedGroup.idea_count}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Created:</span>
                      <span className="text-xs text-gray-500">
                        {new Date(selectedGroup.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Select a group to view details</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Pane - Members and Ideas */}
        <div className="w-1/3">
          {selectedGroup ? (
            <div className="h-full">
              {/* Tabs for Members and Ideas */}
              <div className="flex border-b">
                <button className="flex-1 p-2 text-xs font-medium border-r bg-gray-50 hover:bg-gray-100">
                  <Users className="h-3 w-3 inline mr-1" />
                  Members ({groupMembers.length})
                </button>
                <button className="flex-1 p-2 text-xs font-medium bg-gray-50 hover:bg-gray-100">
                  <Lightbulb className="h-3 w-3 inline mr-1" />
                  Ideas ({groupIdeas.length})
                </button>
              </div>

              {/* Members List */}
              <div className="overflow-y-auto h-full">
                {membersLoading ? (
                  <div className="p-3 text-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-xs text-gray-500 mt-1">Loading members...</p>
                  </div>
                ) : (
                  <div className="p-2 space-y-1">
                    {groupMembers.map((member) => (
                      <div key={member.id} className="p-2 hover:bg-gray-50 rounded">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">
                              {member.profiles.name}
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                              {member.profiles.email}
                            </div>
                          </div>
                          <Badge className={`text-xs ${getRoleBadgeColor(member.role)}`}>
                            {member.role}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Ideas List (Hidden for now, can be toggled) */}
              <div className="hidden overflow-y-auto h-full">
                {ideasLoading ? (
                  <div className="p-3 text-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-xs text-gray-500 mt-1">Loading ideas...</p>
                  </div>
                ) : (
                  <div className="p-2 space-y-1">
                    {groupIdeas.map((idea) => (
                      <div key={idea.id} className="p-2 hover:bg-gray-50 rounded">
                        <div className="space-y-1">
                          <div className="text-sm font-medium truncate">
                            {idea.title}
                          </div>
                          <div className="text-xs text-gray-500">
                            by {idea.author_name}
                          </div>
                          <div className="flex justify-between items-center">
                            <Badge className={`text-xs ${getStatusBadgeColor(idea.status)}`}>
                              {idea.status}
                            </Badge>
                            <span className="text-xs text-gray-400">
                              {new Date(idea.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Select a group to view members</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GroupExplorer;
