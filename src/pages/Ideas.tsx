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
import Header from '@/components/layout/Header';
import GroupSelector from '@/components/GroupSelector';
import { useToast } from '@/hooks/use-toast';

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
  const { user } = useAuth();
  const { selectedGroupId, setSelectedGroupId, selectedGroupName, setSelectedGroupName } = useGroupContext();
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [showGroupSelector, setShowGroupSelector] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchIdeas();
  }, [selectedGroupId]);

  const fetchIdeas = async () => {
    try {
      // Build query with group filtering
      let query = supabase.from('ideas').select('*').order('created_at', { ascending: false });
      
      if (selectedGroupId) {
        query = query.eq('group_id', selectedGroupId);
      } else if (user) {
        // Show ideas from all user's groups or global ideas
        const userGroupIds = await getUserGroupIds();
        query = query.or(`group_id.is.null,group_id.in.(${userGroupIds})`);
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
          {idea.description}
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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Group Selector */}
        {showGroupSelector ? (
          <div className="mb-8">
            <GroupSelector 
              onGroupSelect={handleGroupSelect}
              selectedGroupId={selectedGroupId}
            />
          </div>
        ) : (
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold">Investment Ideas</h1>
                {selectedGroupName ? (
                  <Badge variant="outline" className="text-sm">
                    {selectedGroupName}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-sm">All Groups</Badge>
                )}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowGroupSelector(true)}
                >
                  Switch Workspace
                </Button>
              </div>
              <p className="text-muted-foreground">
                Collaborative deal flow and idea evaluation pipeline
              </p>
            </div>
            <Button asChild>
              <Link to="/submit-idea">
                <Plus className="mr-2 h-4 w-4" />
                Submit Idea
              </Link>
            </Button>
          </div>
        )}

        <Tabs defaultValue="all" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all">All Ideas ({ideas.length})</TabsTrigger>
            <TabsTrigger value="proposed">Proposed ({filterIdeasByStatus('proposed').length})</TabsTrigger>
            <TabsTrigger value="under_review">Under Review ({filterIdeasByStatus('under_review').length})</TabsTrigger>
            <TabsTrigger value="validated">Validated ({filterIdeasByStatus('validated').length})</TabsTrigger>
            <TabsTrigger value="investment_ready">Investment Ready ({filterIdeasByStatus('investment_ready').length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
      </main>
    </div>
  );
};

export default Ideas;