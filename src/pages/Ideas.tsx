import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useGroupContext } from '@/hooks/useGroupContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, MessageSquare, TrendingUp, Users, Calendar } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import PageHeader from '@/components/layout/PageHeader';
import GroupSelector from '@/components/GroupSelector';
import BulkPDFExport from '@/components/BulkPDFExport';
import { useToast } from '@/hooks/use-toast';
import { RichTextDisplay } from '@/components/ui/rich-text-display';

interface Idea {
  id: string;
  title: string;
  description: string;
  sector: string;
  status: string;
  created_at: string;
  ai_summary: string | null;
  submitted_by: string;
}

interface Profile {
  id: string;
  name: string;
}

const Ideas = () => {
  const { user, isAdmin } = useAuth();
  const { selectedGroupId, setSelectedGroupId, selectedGroupName, setSelectedGroupName } = useGroupContext();
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [showGroupSelector, setShowGroupSelector] = useState(false);
  const [userHasGroups, setUserHasGroups] = useState(true);
  const [userGroupCount, setUserGroupCount] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    fetchIdeas();
    if (user) {
      checkUserGroups();
    }
  }, [selectedGroupId, user]);

  const checkUserGroups = async () => {
    if (!user) return;
    
    try {
      const { data } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id);
      
      const groupCount = (data || []).length;
      const hasGroups = groupCount > 0;
      
      setUserHasGroups(hasGroups);
      setUserGroupCount(groupCount);
      
      // Auto-open group selector if user has no groups
      if (!hasGroups && !showGroupSelector) {
        setShowGroupSelector(true);
      }
    } catch (error) {
      console.error('Error checking user groups:', error);
    }
  };

  const fetchIdeas = async () => {
    try {
      // Build query with group filtering
      let query = supabase.from('ideas').select('*').order('created_at', { ascending: false });
      
      if (selectedGroupId) {
        query = query.eq('group_id', selectedGroupId);
      } else if (user && isAdmin) {
        // Admins can see ALL ideas across the organization
        // No group filtering - show everything
      } else if (user) {
        // Regular users see ideas from their groups only
        const userGroupIds = await getUserGroupIds();
        query = query.in('group_id', userGroupIds);
      }

      const { data: ideasData, error } = await query;

      if (error) throw error;

      setIdeas(ideasData || []);

      // Fetch profiles for idea submitters
      const userIds = [...new Set(ideasData?.map(idea => idea.submitted_by) || [])];
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, name')
          .in('id', userIds);

        const profilesMap = (profilesData || []).reduce((acc, profile) => {
          acc[profile.id] = profile;
          return acc;
        }, {} as Record<string, Profile>);

        setProfiles(profilesMap);
      }
    } catch (error: any) {
      toast({
        title: "Error loading ideas",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getUserGroupIds = async (): Promise<string> => {
    if (!user) return 'none';
    
    const { data } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', user.id);
    
    return (data || []).map(item => item.group_id).join(',') || 'none';
  };

  const handleGroupSelect = async (groupId: string | null) => {
    setSelectedGroupId(groupId);
    
    if (groupId) {
      // Fetch group name
      const { data } = await supabase
        .from('groups')
        .select('name')
        .eq('id', groupId)
        .single();
      
      setSelectedGroupName(data?.name || null);
    } else {
      setSelectedGroupName(null);
    }
    
    setShowGroupSelector(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'proposed': return 'bg-blue-100 text-blue-800';
      case 'under_review': return 'bg-yellow-100 text-yellow-800';
      case 'validated': return 'bg-green-100 text-green-800';
      case 'investment_ready': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSectorColor = (sector: string) => {
    switch (sector) {
      case 'technology': return 'bg-indigo-100 text-indigo-800';
      case 'healthcare': return 'bg-emerald-100 text-emerald-800';
      case 'finance': return 'bg-amber-100 text-amber-800';
      case 'real_estate': return 'bg-rose-100 text-rose-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  const filterIdeasByStatus = (status: string) => {
    return ideas.filter(idea => idea.status === status);
  };

  const IdeaCard = ({ idea }: { idea: Idea }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg leading-tight mb-2">
              <Link 
                to={`/ideas/${idea.id}`}
                className="hover:text-primary transition-colors"
              >
                {idea.title}
              </Link>
            </CardTitle>
            <div className="flex flex-wrap gap-2 mb-2">
              <Badge className={getSectorColor(idea.sector)}>
                {idea.sector.replace('_', ' ')}
              </Badge>
              <Badge className={getStatusColor(idea.status)}>
                {idea.status.replace('_', ' ')}
              </Badge>
            </div>
          </div>
        </div>
        <CardDescription className="line-clamp-2">
          <RichTextDisplay content={idea.description} className="text-sm" />
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {profiles[idea.submitted_by]?.name || 'Unknown'}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {new Date(idea.created_at).toLocaleDateString()}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-3 w-3" />
            <TrendingUp className="h-3 w-3" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Group Selector */}
        {showGroupSelector ? (
          <div className="mb-8">
            <GroupSelector 
              onGroupSelect={handleGroupSelect}
              selectedGroupId={selectedGroupId}
            />
          </div>
        ) : (
          <PageHeader
            title="Ideas"
            subtitle={isAdmin && !selectedGroupName 
              ? "Administrative view - All ideas across the organization" 
              : "Collaborative idea evaluation and management pipeline"
            }
            badge={selectedGroupName 
              ? selectedGroupName 
              : isAdmin 
                ? "Admin View - All Ideas" 
                : "All Groups"
            }
            actions={
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                {userGroupCount > 1 && !isAdmin && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setShowGroupSelector(true)}
                    className="text-xs sm:text-sm"
                  >
                    Switch Workspace
                  </Button>
                )}
                <BulkPDFExport ideas={ideas} selectedGroupName={selectedGroupName} />
                <Button asChild className="w-full sm:w-auto">
                  <Link to="/submit-idea">
                    <Plus className="mr-2 h-4 w-4" />
                    Submit Idea
                  </Link>
                </Button>
              </div>
            }
          />
        )}

        <Tabs defaultValue="all" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 md:grid-cols-5 gap-1">
            <TabsTrigger value="all" className="text-xs md:text-sm">All ({ideas.length})</TabsTrigger>
            <TabsTrigger value="proposed" className="text-xs md:text-sm">Proposed ({filterIdeasByStatus('proposed').length})</TabsTrigger>
            <TabsTrigger value="under_review" className="text-xs md:text-sm">Review ({filterIdeasByStatus('under_review').length})</TabsTrigger>
            <TabsTrigger value="validated" className="text-xs md:text-sm">Valid ({filterIdeasByStatus('validated').length})</TabsTrigger>
            <TabsTrigger value="investment_ready" className="text-xs md:text-sm">Ready ({filterIdeasByStatus('investment_ready').length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
              <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {ideas.map((idea) => (
                <IdeaCard key={idea.id} idea={idea} />
              ))}
            </div>
            {ideas.length === 0 && (
              <div className="text-center py-12">
                <h3 className="text-lg font-medium mb-2">No ideas submitted yet</h3>
                <p className="text-muted-foreground mb-4">Be the first to share an investment opportunity!</p>
                <Button asChild>
                  <Link to="/submit-idea">
                    <Plus className="mr-2 h-4 w-4" />
                    Submit First Idea
                  </Link>
                </Button>
              </div>
            )}
          </TabsContent>

          {(['proposed', 'under_review', 'validated', 'investment_ready'] as const).map((status) => (
            <TabsContent key={status} value={status} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filterIdeasByStatus(status).map((idea) => (
                  <IdeaCard key={idea.id} idea={idea} />
                ))}
              </div>
              {filterIdeasByStatus(status).length === 0 && (
                <div className="text-center py-12">
                  <h3 className="text-lg font-medium mb-2">No {status.replace('_', ' ')} ideas</h3>
                  <p className="text-muted-foreground">Ideas will appear here as they progress through the pipeline.</p>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </Layout>
  );
};

export default Ideas;