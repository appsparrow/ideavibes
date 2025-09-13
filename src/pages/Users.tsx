import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users as UsersIcon, 
  MessageSquare, 
  TrendingUp, 
  Target,
  Mail,
  Shield,
  Activity
} from 'lucide-react';
import Header from '@/components/layout/Header';
import { useToast } from '@/hooks/use-toast';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  investor_type: string;
  created_at: string;
  profile: string | null;
}

interface UserActivity {
  user_id: string;
  ideas_submitted: number;
  comments_posted: number;
  votes_cast: number;
  evaluations_submitted: number;
  documents_added: number;
  last_activity: string | null;
  engagement_score: number;
}

const Users = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [userActivities, setUserActivities] = useState<Record<string, UserActivity>>({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchUsersData();
  }, []);

  const fetchUsersData = async () => {
    try {
      // Fetch all user profiles
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;

      setUsers(usersData || []);

      // Fetch user activities
      const userIds = usersData?.map(u => u.id) || [];
      if (userIds.length > 0) {
        const activities: Record<string, UserActivity> = {};

        for (const userId of userIds) {
          // Count different types of activities
          const [ideasCount, commentsCount, votesCount, evaluationsCount, documentsCount, lastActivity] = await Promise.all([
            supabase.from('ideas').select('*', { count: 'exact', head: true }).eq('submitted_by', userId),
            supabase.from('comments').select('*', { count: 'exact', head: true }).eq('user_id', userId),
            supabase.from('votes').select('*', { count: 'exact', head: true }).eq('user_id', userId),
            supabase.from('evaluations').select('*', { count: 'exact', head: true }).eq('user_id', userId),
            supabase.from('documents').select('*', { count: 'exact', head: true }).eq('created_by', userId),
            supabase.from('user_activities').select('created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(1)
          ]);

          const ideas = ideasCount.count || 0;
          const comments = commentsCount.count || 0;
          const votes = votesCount.count || 0;
          const evaluations = evaluationsCount.count || 0;
          const documents = documentsCount.count || 0;

          // Calculate engagement score (weighted)
          const engagementScore = (ideas * 5) + (evaluations * 3) + (comments * 2) + (votes * 1) + (documents * 2);

          activities[userId] = {
            user_id: userId,
            ideas_submitted: ideas,
            comments_posted: comments,
            votes_cast: votes,
            evaluations_submitted: evaluations,
            documents_added: documents,
            last_activity: lastActivity.data?.[0]?.created_at || null,
            engagement_score: engagementScore
          };
        }

        setUserActivities(activities);
      }

    } catch (error: any) {
      toast({
        title: "Error loading users",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'moderator': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getInvestorTypeColor = (type: string) => {
    switch (type) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'strategic': return 'bg-blue-100 text-blue-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getEngagementLevel = (score: number) => {
    if (score >= 20) return { level: 'High', color: 'bg-green-500', percentage: 100 };
    if (score >= 10) return { level: 'Medium', color: 'bg-yellow-500', percentage: 70 };
    if (score >= 5) return { level: 'Low', color: 'bg-orange-500', percentage: 40 };
    return { level: 'Inactive', color: 'bg-gray-500', percentage: 10 };
  };

  const sortedUsers = users.sort((a, b) => {
    const scoreA = userActivities[a.id]?.engagement_score || 0;
    const scoreB = userActivities[b.id]?.engagement_score || 0;
    return scoreB - scoreA;
  });

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
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-2">Community Members</h1>
              <p className="text-muted-foreground">
                Track participation and engagement across the investment community
              </p>
            </div>
          </div>

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="detailed">Detailed View</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {sortedUsers.map((userProfile) => {
                  const activity = userActivities[userProfile.id];
                  const engagement = getEngagementLevel(activity?.engagement_score || 0);

                  return (
                    <Card key={userProfile.id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg leading-tight mb-2">
                              {userProfile.name}
                            </CardTitle>
                            <div className="flex flex-wrap gap-1 mb-2">
                              <Badge className={getRoleColor(userProfile.role)} variant="secondary">
                                {userProfile.role}
                              </Badge>
                              <Badge className={getInvestorTypeColor(userProfile.investor_type)} variant="secondary">
                                {userProfile.investor_type}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          <div className="flex items-center gap-1 mb-1">
                            <Mail className="h-3 w-3" />
                            {userProfile.email}
                          </div>
                          <div className="flex items-center gap-1">
                            <Activity className="h-3 w-3" />
                            {engagement.level} Engagement
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-3">
                          <div>
                            <div className="flex justify-between text-xs mb-1">
                              <span>Engagement Score</span>
                              <span>{activity?.engagement_score || 0}</span>
                            </div>
                            <Progress value={engagement.percentage} className="h-2" />
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="flex items-center gap-1">
                              <Target className="h-3 w-3 text-muted-foreground" />
                              <span>{activity?.ideas_submitted || 0} ideas</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <MessageSquare className="h-3 w-3 text-muted-foreground" />
                              <span>{activity?.comments_posted || 0} comments</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <TrendingUp className="h-3 w-3 text-muted-foreground" />
                              <span>{activity?.votes_cast || 0} votes</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Shield className="h-3 w-3 text-muted-foreground" />
                              <span>{activity?.evaluations_submitted || 0} evaluations</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="detailed" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Detailed User Information</CardTitle>
                  <CardDescription>
                    Complete user profiles with contact information and participation metrics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Name</th>
                          <th className="text-left p-2">Email</th>
                          <th className="text-left p-2">Role</th>
                          <th className="text-left p-2">Type</th>
                          <th className="text-left p-2">Ideas</th>
                          <th className="text-left p-2">Comments</th>
                          <th className="text-left p-2">Votes</th>
                          <th className="text-left p-2">Evaluations</th>
                          <th className="text-left p-2">Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedUsers.map((userProfile) => {
                          const activity = userActivities[userProfile.id];
                          return (
                            <tr key={userProfile.id} className="border-b">
                              <td className="p-2 font-medium">{userProfile.name}</td>
                              <td className="p-2 text-sm text-muted-foreground">{userProfile.email}</td>
                              <td className="p-2">
                                <Badge className={getRoleColor(userProfile.role)} variant="secondary">
                                  {userProfile.role}
                                </Badge>
                              </td>
                              <td className="p-2">
                                <Badge className={getInvestorTypeColor(userProfile.investor_type)} variant="secondary">
                                  {userProfile.investor_type}
                                </Badge>
                              </td>
                              <td className="p-2 text-center">{activity?.ideas_submitted || 0}</td>
                              <td className="p-2 text-center">{activity?.comments_posted || 0}</td>
                              <td className="p-2 text-center">{activity?.votes_cast || 0}</td>
                              <td className="p-2 text-center">{activity?.evaluations_submitted || 0}</td>
                              <td className="p-2 text-center font-medium">{activity?.engagement_score || 0}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Engagement Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {['High', 'Medium', 'Low', 'Inactive'].map((level) => {
                        const count = users.filter(u => {
                          const score = userActivities[u.id]?.engagement_score || 0;
                          const engagement = getEngagementLevel(score);
                          return engagement.level === level;
                        }).length;
                        const percentage = users.length > 0 ? (count / users.length) * 100 : 0;

                        return (
                          <div key={level} className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>{level} Engagement</span>
                              <span>{count} users ({percentage.toFixed(1)}%)</span>
                            </div>
                            <Progress value={percentage} className="h-2" />
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Role Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {['admin', 'moderator', 'member'].map((role) => {
                        const count = users.filter(u => u.role === role).length;
                        const percentage = users.length > 0 ? (count / users.length) * 100 : 0;

                        return (
                          <div key={role} className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="capitalize">{role}</span>
                              <span>{count} users ({percentage.toFixed(1)}%)</span>
                            </div>
                            <Progress value={percentage} className="h-2" />
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle>Top Contributors</CardTitle>
                    <CardDescription>Most active community members by engagement score</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {sortedUsers.slice(0, 10).map((userProfile, index) => {
                        const activity = userActivities[userProfile.id];
                        const engagement = getEngagementLevel(activity?.engagement_score || 0);

                        return (
                          <div key={userProfile.id} className="flex items-center gap-3 p-3 border rounded-lg">
                            <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-sm font-medium">
                              #{index + 1}
                            </div>
                            <div className="flex-1">
                              <div className="font-medium">{userProfile.name}</div>
                              <div className="text-sm text-muted-foreground">{userProfile.email}</div>
                            </div>
                            <div className="text-right">
                              <div className="font-medium">{activity?.engagement_score || 0} points</div>
                              <div className="text-xs text-muted-foreground">{engagement.level} engagement</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default Users;