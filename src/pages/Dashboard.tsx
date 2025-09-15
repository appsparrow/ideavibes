import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useGroupContext } from '@/hooks/useGroupContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  Target, 
  Calendar,
  MessageSquare,
  Plus,
  BarChart3
} from 'lucide-react';
import Header from '@/components/layout/Header';
import GroupSelector from '@/components/GroupSelector';
import { useToast } from '@/hooks/use-toast';

interface DashboardStats {
  totalIdeas: number;
  myIdeas: number;
  myEvaluations: number;
  myInterests: number;
  recentActivity: any[];
  topIdeas: any[];
  myTasks: any[];
}

const Dashboard = () => {
  const { user } = useAuth();
  const { selectedGroupId, setSelectedGroupId, selectedGroupName, setSelectedGroupName } = useGroupContext();
  const [stats, setStats] = useState<DashboardStats>({
    totalIdeas: 0,
    myIdeas: 0,
    myEvaluations: 0,
    myInterests: 0,
    recentActivity: [],
    topIdeas: [],
    myTasks: []
  });
  const [loading, setLoading] = useState(true);
  const [showGroupSelector, setShowGroupSelector] = useState(false);
  const [userHasGroups, setUserHasGroups] = useState(true);
  const [userGroupCount, setUserGroupCount] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchDashboardData();
      checkUserGroups();
    }
  }, [user, selectedGroupId]);

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

  const fetchDashboardData = async () => {
    try {
      // Build group filter - always filter by selected group or user's groups
      const groupFilter = selectedGroupId ? { eq: ['group_id', selectedGroupId] } : 
        { in: ['group_id', await getUserGroupIds()] };

      // Fetch total ideas count (scoped to groups user has access to)
      let totalIdeasQuery = supabase.from('ideas').select('*', { count: 'exact', head: true });
      if (selectedGroupId) {
        totalIdeasQuery = totalIdeasQuery.eq('group_id', selectedGroupId);
      } else {
        const userGroupIds = await getUserGroupIds();
        totalIdeasQuery = totalIdeasQuery.or(`group_id.is.null,group_id.in.(${userGroupIds})`);
      }
      const { count: totalIdeas } = await totalIdeasQuery;

      // Fetch user's ideas count
      let myIdeasQuery = supabase.from('ideas').select('*', { count: 'exact', head: true }).eq('submitted_by', user!.id);
      if (selectedGroupId) {
        myIdeasQuery = myIdeasQuery.eq('group_id', selectedGroupId);
      }
      const { count: myIdeas } = await myIdeasQuery;

      // Fetch user's evaluations count
      const { count: myEvaluations } = await supabase
        .from('evaluations')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user!.id);

      // Fetch user's interests count
      const { count: myInterests } = await supabase
        .from('investor_interest')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user!.id);

      // Fetch top ideas (by vote count) - scoped to current group
      let topIdeasQuery = supabase
        .from('ideas')
        .select(`
          id,
          title,
          sector,
          status,
          created_at,
          votes(vote),
          evaluations(market_size, feasibility, strategic_fit, novelty)
        `)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (selectedGroupId) {
        topIdeasQuery = topIdeasQuery.eq('group_id', selectedGroupId);
      } else {
        const userGroupIds = await getUserGroupIds();
        topIdeasQuery = topIdeasQuery.or(`group_id.is.null,group_id.in.(${userGroupIds})`);
      }
      
      const { data: ideasWithVotes } = await topIdeasQuery;

      const topIdeas = (ideasWithVotes || []).map(idea => {
        const votes = idea.votes || [];
        const upvotes = votes.filter((v: any) => v.vote).length;
        const downvotes = votes.filter((v: any) => !v.vote).length;
        const score = upvotes - downvotes;

        const evaluations = idea.evaluations || [];
        const avgScore = evaluations.length > 0 
          ? evaluations.reduce((acc: number, evaluation: any) => 
              acc + (evaluation.market_size + evaluation.feasibility + evaluation.strategic_fit + evaluation.novelty) / 4, 0
            ) / evaluations.length
          : 0;

        return {
          ...idea,
          voteScore: score,
          evaluationScore: avgScore,
          evaluationCount: evaluations.length
        };
      }).sort((a, b) => b.voteScore - a.voteScore);

      // Fetch user's tasks
      const { data: myTasks } = await supabase
        .from('tasks')
        .select(`
          id,
          title,
          status,
          due_date,
          ideas(title)
        `)
        .eq('assigned_to', user!.id)
        .order('due_date', { ascending: true })
        .limit(5);

      // Fetch recent activity (recent comments, votes, etc.)
      const { data: recentComments } = await supabase
        .from('comments')
        .select(`
          id,
          content,
          created_at,
          ideas(title),
          profiles(name)
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      setStats({
        totalIdeas: totalIdeas || 0,
        myIdeas: myIdeas || 0,
        myEvaluations: myEvaluations || 0,
        myInterests: myInterests || 0,
        topIdeas: topIdeas || [],
        myTasks: myTasks || [],
        recentActivity: recentComments || []
      });

    } catch (error: any) {
      toast({
        title: "Error loading dashboard",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getUserGroupIds = async (): Promise<string> => {
    const { data } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', user!.id);
    
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

  const getTaskStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-orange-100 text-orange-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'done': return 'bg-green-100 text-green-800';
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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Group Selector */}
          {showGroupSelector ? (
            <div className="mb-8">
              <GroupSelector 
                onGroupSelect={handleGroupSelect}
                selectedGroupId={selectedGroupId}
              />
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
              <div className="flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                  <h1 className="text-2xl sm:text-3xl font-bold">Idea Board</h1>
                  <div className="flex items-center gap-2">
                    {selectedGroupName ? (
                      <Badge variant="outline" className="text-xs sm:text-sm">
                        {selectedGroupName}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs sm:text-sm">All Groups</Badge>
                    )}
                    {userGroupCount > 1 && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setShowGroupSelector(true)}
                        className="text-xs sm:text-sm"
                      >
                        Switch Workspace
                      </Button>
                    )}
                  </div>
                </div>
                <p className="text-sm sm:text-base text-muted-foreground">
                  Track your ideas, evaluations, and opportunities
                </p>
              </div>
              <Button asChild className="w-full sm:w-auto">
                <Link to="/submit-idea">
                  <Plus className="mr-2 h-4 w-4" />
                  Submit Idea
                </Link>
              </Button>
            </div>
          )}

          {/* Stats Overview */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Ideas</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalIdeas}</div>
                <p className="text-xs text-muted-foreground">
                  In the pipeline
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">My Ideas</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.myIdeas}</div>
                <p className="text-xs text-muted-foreground">
                  Ideas submitted
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Evaluations</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.myEvaluations}</div>
                <p className="text-xs text-muted-foreground">
                  Ideas evaluated
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Interests</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.myInterests}</div>
                <p className="text-xs text-muted-foreground">
                  Investment interests
                </p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="tasks">My Tasks</TabsTrigger>
              <TabsTrigger value="activity">Recent Activity</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Top Ideas */}
                <Card>
                  <CardHeader>
                    <CardTitle>Top Performing Ideas</CardTitle>
                    <CardDescription>
                      Ideas ranked by community votes and evaluation scores
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {stats.topIdeas.slice(0, 5).map((idea, index) => (
                        <div key={idea.id} className="flex items-center space-x-4">
                          <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-sm font-medium">
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <Link 
                              to={`/ideas/${idea.id}`}
                              className="font-medium hover:text-primary transition-colors line-clamp-1"
                            >
                              {idea.title}
                            </Link>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge className={getStatusColor(idea.status)} variant="secondary">
                                {idea.status.replace('_', ' ')}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {idea.voteScore > 0 ? '+' : ''}{idea.voteScore} votes
                              </span>
                              {idea.evaluationCount > 0 && (
                                <span className="text-xs text-muted-foreground">
                                  {idea.evaluationScore.toFixed(1)}/5 avg
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      {stats.topIdeas.length === 0 && (
                        <p className="text-center text-muted-foreground py-4">
                          No ideas submitted yet
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                    <CardDescription>
                      Common tasks and workflows
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button asChild className="w-full justify-start">
                      <Link to="/submit-idea">
                        <Plus className="mr-2 h-4 w-4" />
                        Submit New Investment Idea
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="w-full justify-start">
                      <Link to="/ideas">
                        <TrendingUp className="mr-2 h-4 w-4" />
                        Browse All Ideas
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="w-full justify-start">
                      <Link to="/ideas?status=under_review">
                        <BarChart3 className="mr-2 h-4 w-4" />
                        Ideas Needing Evaluation
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="w-full justify-start">
                      <Link to="/meetings">
                        <Calendar className="mr-2 h-4 w-4" />
                        Schedule Meeting
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="tasks" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>My Assigned Tasks</CardTitle>
                  <CardDescription>
                    Tasks assigned to you across various investment ideas
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {stats.myTasks.map((task) => (
                      <div key={task.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-1">
                          <h4 className="font-medium">{task.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            Related to: {task.ideas?.title}
                          </p>
                          {task.due_date && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Due: {new Date(task.due_date).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <Badge className={getTaskStatusColor(task.status)}>
                          {task.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    ))}
                    {stats.myTasks.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">
                        No tasks assigned to you yet
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activity" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>
                    Latest discussions and updates across all ideas
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {stats.recentActivity.map((activity) => (
                      <div key={activity.id} className="flex gap-3 p-3 border rounded-lg">
                        <MessageSquare className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm">
                            <span className="font-medium">{activity.profiles?.name}</span>
                            {' commented on '}
                            <Link 
                              to={`/ideas/${activity.ideas?.id}`}
                              className="font-medium text-primary hover:underline"
                            >
                              {activity.ideas?.title}
                            </Link>
                          </p>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {activity.content}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(activity.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                    {stats.recentActivity.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">
                        No recent activity
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;