import React, { useState, useEffect } from 'react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { ChevronRight, ChevronDown, Users, Building2, RefreshCw, Mail, Calendar } from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { toast } from 'sonner';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
  group_count: number;
}

interface UserGroup {
  id: string;
  group_id: string;
  role: string;
  joined_at: string;
  groups: {
    name: string;
    description: string | null;
  };
}

interface UserIdea {
  id: string;
  title: string;
  status: string;
  created_at: string;
  group_id: string | null;
  group_name: string | null;
}

const UserExplorer: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userGroups, setUserGroups] = useState<UserGroup[]>([]);
  const [userIdeas, setUserIdeas] = useState<UserIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [ideasLoading, setIdeasLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data: usersData, error } = await supabase
        .from('profiles')
        .select('id, name, email, role, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get group count for each user
      const usersWithCounts = await Promise.all(
        (usersData || []).map(async (user) => {
          const { count } = await supabase
            .from('group_members')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id);

          return {
            ...user,
            group_count: count || 0
          };
        })
      );

      setUsers(usersWithCounts);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserGroups = async (userId: string) => {
    setGroupsLoading(true);
    try {
      const { data: groupsData, error } = await supabase
        .from('group_members')
        .select(`
          id,
          group_id,
          role,
          joined_at,
          groups (
            name,
            description
          )
        `)
        .eq('user_id', userId);

      if (error) throw error;

      setUserGroups(groupsData || []);
    } catch (error) {
      console.error('Error fetching user groups:', error);
      toast.error('Failed to load user groups');
    } finally {
      setGroupsLoading(false);
    }
  };

  const fetchUserIdeas = async (userId: string) => {
    setIdeasLoading(true);
    try {
      const { data: ideasData, error } = await supabase
        .from('ideas')
        .select(`
          id,
          title,
          status,
          created_at,
          group_id,
          groups (
            name
          )
        `)
        .eq('submitted_by', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const ideasWithGroups = (ideasData || []).map(idea => ({
        id: idea.id,
        title: idea.title,
        status: idea.status,
        created_at: idea.created_at,
        group_id: idea.group_id,
        group_name: idea.groups?.name || null
      }));

      setUserIdeas(ideasWithGroups);
    } catch (error) {
      console.error('Error fetching user ideas:', error);
      toast.error('Failed to load user ideas');
    } finally {
      setIdeasLoading(false);
    }
  };

  const handleUserSelect = (user: User) => {
    setSelectedUser(user);
    fetchUserGroups(user.id);
    fetchUserIdeas(user.id);
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
            <span className="ml-2">Loading users...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="h-[600px] border rounded-lg overflow-hidden bg-white">
      {/* macOS Finder-style Three-Pane Layout */}
      <div className="flex h-full">
        {/* Left Sidebar - Users List */}
        <div className="w-1/3 border-r bg-gray-50">
          <div className="p-3 border-b bg-gray-100">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Users</h3>
              <Button variant="ghost" size="sm" onClick={fetchUsers}>
                <RefreshCw className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <div className="overflow-y-auto h-full">
            {users.map((user) => (
              <div
                key={user.id}
                className={`p-3 cursor-pointer border-b hover:bg-gray-100 ${
                  selectedUser?.id === user.id ? 'bg-blue-50 border-blue-200' : ''
                }`}
                onClick={() => handleUserSelect(user)}
              >
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-600" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {user.name || user.email}
                    </div>
                    <div className="text-xs text-gray-500">
                      {user.group_count} groups • {user.role}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Middle Pane - User Details */}
        <div className="w-1/3 border-r">
          {selectedUser ? (
            <>
              <div className="p-3 border-b bg-gray-100">
                <h3 className="font-semibold text-sm">{selectedUser.name || selectedUser.email}</h3>
                <p className="text-xs text-gray-500">User Details</p>
              </div>
              <div className="p-3 space-y-4">
                <div>
                  <h4 className="font-medium text-sm mb-2">Contact Information</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <Mail className="h-3 w-3 text-gray-400" />
                      <span className="text-gray-600">{selectedUser.email}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-sm mb-2">Account Information</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Role:</span>
                      <Badge className={`text-xs ${getRoleBadgeColor(selectedUser.role)}`}>
                        {selectedUser.role}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Groups:</span>
                      <Badge variant="outline" className="text-xs">
                        {selectedUser.group_count}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Joined:</span>
                      <span className="text-xs text-gray-500">
                        {new Date(selectedUser.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Select a user to view details</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Pane - Groups and Ideas */}
        <div className="w-1/3">
          {selectedUser ? (
            <div className="h-full">
              {/* Tabs for Groups and Ideas */}
              <div className="flex border-b">
                <button className="flex-1 p-2 text-xs font-medium border-r bg-gray-50 hover:bg-gray-100">
                  <Building2 className="h-3 w-3 inline mr-1" />
                  Groups ({userGroups.length})
                </button>
                <button className="flex-1 p-2 text-xs font-medium bg-gray-50 hover:bg-gray-100">
                  <Calendar className="h-3 w-3 inline mr-1" />
                  Ideas ({userIdeas.length})
                </button>
              </div>

              {/* Groups List */}
              <div className="overflow-y-auto h-full">
                {groupsLoading ? (
                  <div className="p-3 text-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-xs text-gray-500 mt-1">Loading groups...</p>
                  </div>
                ) : (
                  <div className="p-2 space-y-1">
                    {userGroups.map((userGroup) => (
                      <div key={userGroup.id} className="p-2 hover:bg-gray-50 rounded">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="text-sm font-medium truncate">
                              {userGroup.groups.name}
                            </div>
                            <Badge className={`text-xs ${getRoleBadgeColor(userGroup.role)}`}>
                              {userGroup.role}
                            </Badge>
                          </div>
                          <div className="text-xs text-gray-500">
                            Joined: {new Date(userGroup.joined_at).toLocaleDateString()}
                          </div>
                          {userGroup.groups.description && (
                            <div className="text-xs text-gray-600 truncate">
                              {userGroup.groups.description}
                            </div>
                          )}
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
                    {userIdeas.map((idea) => (
                      <div key={idea.id} className="p-2 hover:bg-gray-50 rounded">
                        <div className="space-y-1">
                          <div className="text-sm font-medium truncate">
                            {idea.title}
                          </div>
                          <div className="flex justify-between items-center">
                            <Badge className={`text-xs ${getStatusBadgeColor(idea.status)}`}>
                              {idea.status}
                            </Badge>
                            <span className="text-xs text-gray-400">
                              {new Date(idea.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          {idea.group_name && (
                            <div className="text-xs text-gray-500">
                              Group: {idea.group_name}
                            </div>
                          )}
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
                <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Select a user to view groups</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserExplorer;
