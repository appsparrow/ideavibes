import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { ChevronRight, ChevronDown, Users, Building2, FolderOpen, Lightbulb, Shield, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { toast } from 'sonner';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
}

interface Organization {
  id: string;
  name: string;
  type: string;
  created_at: string;
}

interface Group {
  id: string;
  name: string;
  description: string;
  created_by: string;
  created_at: string;
  member_count: number;
  idea_count: number;
}

interface Idea {
  id: string;
  title: string;
  submitted_by: string;
  group_id: string | null;
  status: string;
  created_at: string;
}

interface SystemData {
  users: User[];
  organizations: Organization[];
  groups: Group[];
  ideas: Idea[];
  summary: {
    total_users: number;
    admin_users: number;
    member_users: number;
    moderator_users: number;
    total_ideas: number;
    ideas_with_groups: number;
    ideas_without_groups: number;
    total_groups: number;
    total_organizations: number;
  };
}

const SystemExplorer: React.FC = () => {
  const [data, setData] = useState<SystemData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [showDetails, setShowDetails] = useState(false);

  const fetchSystemData = async () => {
    try {
      setLoading(true);

      // Fetch users
      const { data: users } = await supabase
        .from('profiles')
        .select('id, name, email, role, created_at')
        .order('created_at', { ascending: false });

      // Fetch organizations (if table exists)
      let organizations: Organization[] = [];
      try {
        const { data: orgs } = await supabase
          .from('organizations')
          .select('id, name, type, created_at')
          .order('created_at', { ascending: false });
        organizations = orgs || [];
      } catch (error) {
        console.log('Organizations table does not exist');
      }

      // Fetch groups (if table exists)
      let groups: Group[] = [];
      try {
        const { data: groupsData } = await supabase
          .from('groups')
          .select(`
            id, 
            name, 
            description, 
            created_by, 
            created_at
          `)
          .order('created_at', { ascending: false });
        
        // Get member counts for each group
        const groupsWithCounts = await Promise.all(
          (groupsData || []).map(async (group) => {
            try {
              const { count: memberCount } = await supabase
                .from('group_members')
                .select('*', { count: 'exact', head: true })
                .eq('group_id', group.id);
              
              const { count: ideaCount } = await supabase
                .from('ideas')
                .select('*', { count: 'exact', head: true })
                .eq('group_id', group.id);
              
              return {
                id: group.id,
                name: group.name,
                description: group.description,
                created_by: group.created_by,
                created_at: group.created_at,
                member_count: memberCount || 0,
                idea_count: ideaCount || 0
              };
            } catch (error) {
              console.log(`Error getting counts for group ${group.id}:`, error);
              return {
                id: group.id,
                name: group.name,
                description: group.description,
                created_by: group.created_by,
                created_at: group.created_at,
                member_count: 0,
                idea_count: 0
              };
            }
          })
        );
        
        groups = groupsWithCounts;
      } catch (error) {
        console.log('Groups table does not exist or access denied:', error);
      }

      // Fetch ideas
      const { data: ideas } = await supabase
        .from('ideas')
        .select('id, title, submitted_by, group_id, status, created_at')
        .order('created_at', { ascending: false });

      // Calculate summary
      const summary = {
        total_users: users?.length || 0,
        admin_users: users?.filter(u => u.role === 'admin').length || 0,
        member_users: users?.filter(u => u.role === 'member').length || 0,
        moderator_users: users?.filter(u => u.role === 'moderator').length || 0,
        total_ideas: ideas?.length || 0,
        ideas_with_groups: ideas?.filter(i => i.group_id).length || 0,
        ideas_without_groups: ideas?.filter(i => !i.group_id).length || 0,
        total_groups: groups.length,
        total_organizations: organizations.length
      };

      setData({
        users: users || [],
        organizations,
        groups,
        ideas: ideas || [],
        summary
      });

    } catch (error) {
      console.error('Error fetching system data:', error);
      toast.error('Failed to load system data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSystemData();
  }, []);

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
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
            <span className="ml-2">Loading system data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            Failed to load system data
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              System Explorer
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDetails(!showDetails)}
              >
                {showDetails ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {showDetails ? 'Hide Details' : 'Show Details'}
              </Button>
              <Button variant="outline" size="sm" onClick={fetchSystemData}>
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{data.summary.total_users}</div>
              <div className="text-sm text-gray-600">Total Users</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{data.summary.total_ideas}</div>
              <div className="text-sm text-gray-600">Total Ideas</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{data.summary.total_groups}</div>
              <div className="text-sm text-gray-600">Groups</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{data.summary.total_organizations}</div>
              <div className="text-sm text-gray-600">Organizations</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tree Structure */}
      <Card>
        <CardHeader>
          <CardTitle>System Structure</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {/* Organizations Level */}
            {data.organizations.length > 0 && (
              <Collapsible>
                <CollapsibleTrigger
                  className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                  onClick={() => toggleNode('organizations')}
                >
                  {expandedNodes.has('organizations') ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  <Building2 className="h-4 w-4 text-orange-600" />
                  <span className="font-medium">Organizations ({data.organizations.length})</span>
                </CollapsibleTrigger>
                <CollapsibleContent className="ml-6 space-y-1">
                  {data.organizations.map(org => (
                    <div key={org.id} className="p-2 border-l-2 border-orange-200">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-3 w-3 text-orange-500" />
                        <span className="font-medium">{org.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {org.type}
                        </Badge>
                      </div>
                      {showDetails && (
                        <div className="ml-5 text-xs text-gray-600 mt-1">
                          ID: {org.id} | Created: {new Date(org.created_at).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Groups Level */}
            {data.groups.length > 0 && (
              <Collapsible>
                <CollapsibleTrigger
                  className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                  onClick={() => toggleNode('groups')}
                >
                  {expandedNodes.has('groups') ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  <FolderOpen className="h-4 w-4 text-purple-600" />
                  <span className="font-medium">Groups ({data.groups.length})</span>
                </CollapsibleTrigger>
                <CollapsibleContent className="ml-6 space-y-1">
                  {data.groups.map(group => (
                    <div key={group.id} className="p-2 border-l-2 border-purple-200">
                      <div className="flex items-center gap-2">
                        <FolderOpen className="h-3 w-3 text-purple-500" />
                        <span className="font-medium">{group.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {group.member_count} members
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {group.idea_count} ideas
                        </Badge>
                      </div>
                      {showDetails && (
                        <div className="ml-5 text-xs text-gray-600 mt-1">
                          {group.description} | Created: {new Date(group.created_at).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Users Level */}
            <Collapsible>
              <CollapsibleTrigger
                className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                onClick={() => toggleNode('users')}
              >
                {expandedNodes.has('users') ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                <Users className="h-4 w-4 text-blue-600" />
                <span className="font-medium">Users ({data.users.length})</span>
              </CollapsibleTrigger>
              <CollapsibleContent className="ml-6 space-y-1">
                {data.users.map(user => (
                  <div key={user.id} className="p-2 border-l-2 border-blue-200">
                    <div className="flex items-center gap-2">
                      <Users className="h-3 w-3 text-blue-500" />
                      <span className="font-medium">{user.name}</span>
                      <Badge className={`text-xs ${getRoleBadgeColor(user.role)}`}>
                        {user.role}
                      </Badge>
                      <span className="text-xs text-gray-500">({user.email})</span>
                    </div>
                    {showDetails && (
                      <div className="ml-5 text-xs text-gray-600 mt-1">
                        ID: {user.id} | Created: {new Date(user.created_at).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>

            {/* Ideas Level */}
            <Collapsible>
              <CollapsibleTrigger
                className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                onClick={() => toggleNode('ideas')}
              >
                {expandedNodes.has('ideas') ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                <Lightbulb className="h-4 w-4 text-green-600" />
                <span className="font-medium">Ideas ({data.ideas.length})</span>
              </CollapsibleTrigger>
              <CollapsibleContent className="ml-6 space-y-1">
                {data.ideas.map(idea => {
                  const author = data.users.find(u => u.id === idea.submitted_by);
                  const group = data.groups.find(g => g.id === idea.group_id);
                  
                  return (
                    <div key={idea.id} className="p-2 border-l-2 border-green-200">
                      <div className="flex items-center gap-2">
                        <Lightbulb className="h-3 w-3 text-green-500" />
                        <span className="font-medium">{idea.title}</span>
                        <Badge className={`text-xs ${getStatusBadgeColor(idea.status)}`}>
                          {idea.status}
                        </Badge>
                        {group && (
                          <Badge variant="outline" className="text-xs">
                            {group.name}
                          </Badge>
                        )}
                        {!group && (
                          <Badge variant="outline" className="text-xs bg-red-100 text-red-800">
                            No Group
                          </Badge>
                        )}
                      </div>
                      {showDetails && (
                        <div className="ml-5 text-xs text-gray-600 mt-1">
                          By: {author?.name || 'Unknown'} | Created: {new Date(idea.created_at).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  );
                })}
              </CollapsibleContent>
            </Collapsible>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">User Breakdown</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Admins:</span>
                  <Badge className="bg-red-100 text-red-800">{data.summary.admin_users}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Moderators:</span>
                  <Badge className="bg-blue-100 text-blue-800">{data.summary.moderator_users}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Members:</span>
                  <Badge className="bg-green-100 text-green-800">{data.summary.member_users}</Badge>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-2">Ideas Breakdown</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>With Groups:</span>
                  <Badge className="bg-green-100 text-green-800">{data.summary.ideas_with_groups}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Without Groups:</span>
                  <Badge className="bg-red-100 text-red-800">{data.summary.ideas_without_groups}</Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SystemExplorer;
