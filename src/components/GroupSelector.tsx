import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Plus, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Group {
  id: string;
  name: string;
  description: string | null;
  invite_code: string;
  created_at: string;
  member_role?: string;
  member_count?: number;
}

interface GroupSelectorProps {
  onGroupSelect: (groupId: string | null) => void;
  selectedGroupId: string | null;
}

const GroupSelector = ({ onGroupSelect, selectedGroupId }: GroupSelectorProps) => {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchUserGroups();
    }
  }, [user]);

  const fetchUserGroups = async () => {
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
            created_at
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

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-24 bg-muted rounded-lg animate-pulse" />
        <div className="h-24 bg-muted rounded-lg animate-pulse" />
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <Card>
        <CardHeader className="text-center">
          <CardTitle>No Groups Yet</CardTitle>
          <CardDescription>
            You're not part of any group yet. Create a new group or join with an invite code.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-2">
          <Button asChild className="w-full">
            <a href="/groups/create" className="inline-flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create New Group
            </a>
          </Button>
          <Button variant="outline" asChild className="w-full">
            <a href="/groups/join" className="inline-flex items-center gap-2">
              <ExternalLink className="h-4 w-4" />
              Join with Invite Code
            </a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Select Workspace</h2>
        <Button variant="outline" size="sm" asChild>
          <a href="/groups/create">
            <Plus className="h-4 w-4 mr-2" />
            Create Group
          </a>
        </Button>
      </div>

      {/* Global/All Groups Option */}
      <Card 
        className={`cursor-pointer transition-colors ${
          selectedGroupId === null ? 'ring-2 ring-primary' : 'hover:bg-muted/50'
        }`}
        onClick={() => onGroupSelect(null)}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">All Groups</h3>
              <p className="text-sm text-muted-foreground">View ideas from all your groups</p>
            </div>
            <Badge variant="secondary">Global</Badge>
          </div>
        </CardContent>
      </Card>

      {/* User's Groups */}
      {groups.map((group) => (
        <Card 
          key={group.id}
          className={`cursor-pointer transition-colors ${
            selectedGroupId === group.id ? 'ring-2 ring-primary' : 'hover:bg-muted/50'
          }`}
          onClick={() => onGroupSelect(group.id)}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium">{group.name}</h3>
                  <Badge variant={group.member_role === 'admin' ? 'default' : 'secondary'}>
                    {group.member_role}
                  </Badge>
                </div>
                {group.description && (
                  <p className="text-sm text-muted-foreground mb-2">{group.description}</p>
                )}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {group.member_count} members
                  </span>
                  <span>Code: {group.invite_code}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default GroupSelector;