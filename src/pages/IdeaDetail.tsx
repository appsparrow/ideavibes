import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, 
  MessageSquare, 
  ThumbsUp, 
  ThumbsDown, 
  TrendingUp, 
  Users, 
  Calendar,
  Target,
  DollarSign,
  Sparkles
} from 'lucide-react';
import Header from '@/components/layout/Header';

interface IdeaData {
  id: string;
  title: string;
  description: string;
  sector: string;
  status: string;
  created_at: string;
  ai_summary: string | null;
  submitted_by: string;
  submitter_name?: string;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  commenter_name?: string;
}

interface Evaluation {
  id: string;
  market_size: number | null;
  feasibility: number | null;
  strategic_fit: number | null;
  novelty: number | null;
  user_id: string;
  evaluator_name?: string;
}

interface Vote {
  id: string;
  vote: boolean;
  user_id: string;
}

interface InvestorInterest {
  id: string;
  interest_type: string;
  amount_commitment: number | null;
  user_id: string;
  investor_name?: string;
}

const IdeaDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [idea, setIdea] = useState<IdeaData | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [interests, setInterests] = useState<InvestorInterest[]>([]);
  const [newComment, setNewComment] = useState('');
  const [userVote, setUserVote] = useState<boolean | null>(null);
  const [userEvaluation, setUserEvaluation] = useState<Partial<Evaluation>>({});
  const [userInterest, setUserInterest] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchIdeaData();
    }
  }, [id]);

  const fetchIdeaData = async () => {
    try {
      // Fetch idea details
      const { data: ideaData, error: ideaError } = await supabase
        .from('ideas')
        .select(`
          *,
          profiles!ideas_submitted_by_fkey(name)
        `)
        .eq('id', id)
        .single();

      if (ideaError) throw ideaError;

      setIdea({
        ...ideaData,
        submitter_name: ideaData.profiles?.name
      });

      // Fetch comments
      const { data: commentsData } = await supabase
        .from('comments')
        .select(`
          *,
          profiles!comments_user_id_fkey(name)
        `)
        .eq('idea_id', id)
        .order('created_at', { ascending: true });

      setComments((commentsData || []).map(comment => ({
        ...comment,
        commenter_name: comment.profiles?.name
      })));

      // Fetch evaluations
      const { data: evaluationsData } = await supabase
        .from('evaluations')
        .select(`
          *,
          profiles!evaluations_user_id_fkey(name)
        `)
        .eq('idea_id', id);

      setEvaluations((evaluationsData || []).map(evaluation => ({
        ...evaluation,
        evaluator_name: evaluation.profiles?.name
      })));

      // Fetch votes
      const { data: votesData } = await supabase
        .from('votes')
        .select('*')
        .eq('idea_id', id);

      setVotes(votesData || []);

      // Fetch investor interests
      const { data: interestsData } = await supabase
        .from('investor_interest')
        .select(`
          *,
          profiles!investor_interest_user_id_fkey(name)
        `)
        .eq('idea_id', id);

      setInterests((interestsData || []).map(interest => ({
        ...interest,
        investor_name: interest.profiles?.name
      })));

      // Set user's current vote and evaluation
      if (user) {
        const userVoteData = votesData?.find(v => v.user_id === user.id);
        setUserVote(userVoteData?.vote ?? null);

        const userEvalData = evaluationsData?.find(e => e.user_id === user.id);
        if (userEvalData) {
          setUserEvaluation(userEvalData);
        }

        const userInterestData = interestsData?.find(i => i.user_id === user.id);
        setUserInterest(userInterestData?.interest_type || '');
      }

    } catch (error: any) {
      toast({
        title: "Error loading idea",
        description: error.message,
        variant: "destructive",
      });
      navigate('/ideas');
    } finally {
      setLoading(false);
    }
  };

  const submitComment = async () => {
    if (!user || !newComment.trim()) return;

    try {
      const { error } = await supabase
        .from('comments')
        .insert({
          idea_id: id,
          user_id: user.id,
          content: newComment.trim()
        });

      if (error) throw error;

      setNewComment('');
      fetchIdeaData(); // Refresh data
      toast({
        title: "Comment added",
        description: "Your comment has been posted successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error posting comment",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const submitVote = async (vote: boolean) => {
    if (!user) return;

    try {
      if (userVote === vote) {
        // Remove vote if clicking same option
        await supabase
          .from('votes')
          .delete()
          .eq('idea_id', id)
          .eq('user_id', user.id);
        setUserVote(null);
      } else {
        // Upsert vote
        await supabase
          .from('votes')
          .upsert({
            idea_id: id,
            user_id: user.id,
            vote
          });
        setUserVote(vote);
      }

      fetchIdeaData(); // Refresh data
    } catch (error: any) {
      toast({
        title: "Error voting",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const submitEvaluation = async () => {
    if (!user) return;

    try {
      await supabase
        .from('evaluations')
        .upsert({
          idea_id: id,
          user_id: user.id,
          ...userEvaluation
        });

      fetchIdeaData(); // Refresh data
      toast({
        title: "Evaluation saved",
        description: "Your evaluation has been recorded.",
      });
    } catch (error: any) {
      toast({
        title: "Error saving evaluation",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const submitInterest = async () => {
    if (!user || !userInterest) return;

    try {
      await supabase
        .from('investor_interest')
        .upsert({
          idea_id: id,
          user_id: user.id,
          interest_type: userInterest as 'active' | 'passive' | 'strategic'
        });

      fetchIdeaData(); // Refresh data
      toast({
        title: "Interest recorded",
        description: "Your investment interest has been recorded.",
      });
    } catch (error: any) {
      toast({
        title: "Error recording interest",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const calculateAverageScores = () => {
    if (evaluations.length === 0) return null;

    const totals = evaluations.reduce((acc, evaluation) => ({
      market_size: acc.market_size + (evaluation.market_size || 0),
      feasibility: acc.feasibility + (evaluation.feasibility || 0),
      strategic_fit: acc.strategic_fit + (evaluation.strategic_fit || 0),
      novelty: acc.novelty + (evaluation.novelty || 0)
    }), { market_size: 0, feasibility: 0, strategic_fit: 0, novelty: 0 });

    return {
      market_size: totals.market_size / evaluations.length,
      feasibility: totals.feasibility / evaluations.length,
      strategic_fit: totals.strategic_fit / evaluations.length,
      novelty: totals.novelty / evaluations.length
    };
  };

  const getVoteStats = () => {
    const upvotes = votes.filter(v => v.vote).length;
    const downvotes = votes.filter(v => !v.vote).length;
    return { upvotes, downvotes, total: upvotes + downvotes };
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

  if (!idea) return null;

  const averageScores = calculateAverageScores();
  const voteStats = getVoteStats();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2 mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/ideas')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Ideas
            </Button>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Idea Overview */}
              <Card>
                <CardHeader>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge variant="secondary">{idea.sector.replace('_', ' ')}</Badge>
                    <Badge className={
                      idea.status === 'proposed' ? 'bg-blue-100 text-blue-800' :
                      idea.status === 'under_review' ? 'bg-yellow-100 text-yellow-800' :
                      idea.status === 'validated' ? 'bg-green-100 text-green-800' :
                      'bg-purple-100 text-purple-800'
                    }>
                      {idea.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <CardTitle className="text-2xl">{idea.title}</CardTitle>
                  <CardDescription className="flex items-center gap-4 text-base">
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      Submitted by {idea.submitter_name}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {new Date(idea.created_at).toLocaleDateString()}
                    </span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none">
                    <p className="whitespace-pre-wrap">{idea.description}</p>
                  </div>
                  {idea.ai_summary && (
                    <div className="mt-6 p-4 bg-muted rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <span className="font-medium">AI Summary</span>
                      </div>
                      <p className="text-sm">{idea.ai_summary}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Comments Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Discussion ({comments.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Add Comment */}
                  {user && (
                    <div className="space-y-2">
                      <Textarea
                        placeholder="Share your thoughts, questions, or feedback..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                      />
                      <Button 
                        onClick={submitComment}
                        disabled={!newComment.trim()}
                        size="sm"
                      >
                        Post Comment
                      </Button>
                    </div>
                  )}

                  <Separator />

                  {/* Comments List */}
                  <div className="space-y-4">
                    {comments.map((comment) => (
                      <div key={comment.id} className="border-l-2 border-muted pl-4">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{comment.commenter_name}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(comment.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                      </div>
                    ))}
                    {comments.length === 0 && (
                      <p className="text-center text-muted-foreground py-4">
                        No comments yet. Be the first to share your thoughts!
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Voting */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Community Vote</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Button
                      variant={userVote === true ? "default" : "outline"}
                      onClick={() => submitVote(true)}
                      className="flex-1"
                      disabled={!user}
                    >
                      <ThumbsUp className="h-4 w-4 mr-1" />
                      {voteStats.upvotes}
                    </Button>
                    <Button
                      variant={userVote === false ? "destructive" : "outline"}
                      onClick={() => submitVote(false)}
                      className="flex-1"
                      disabled={!user}
                    >
                      <ThumbsDown className="h-4 w-4 mr-1" />
                      {voteStats.downvotes}
                    </Button>
                  </div>
                  {voteStats.total > 0 && (
                    <div className="text-center text-sm text-muted-foreground">
                      {voteStats.upvotes} positive • {voteStats.downvotes} negative
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Evaluation Scores */}
              {averageScores && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Evaluation Scores</CardTitle>
                    <CardDescription>
                      Average scores from {evaluations.length} evaluation(s)
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {Object.entries(averageScores).map(([key, value]) => (
                      <div key={key}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="capitalize">{key.replace('_', ' ')}</span>
                          <span>{value.toFixed(1)}/5</span>
                        </div>
                        <Progress value={(value / 5) * 100} className="h-2" />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* User Evaluation */}
              {user && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Your Evaluation</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {(['market_size', 'feasibility', 'strategic_fit', 'novelty'] as const).map((field) => (
                      <div key={field} className="space-y-2">
                        <label className="text-sm font-medium capitalize">
                          {field.replace('_', ' ')} (1-5)
                        </label>
                        <Select
                          value={userEvaluation[field]?.toString() || ''}
                          onValueChange={(value) => setUserEvaluation(prev => ({
                            ...prev,
                            [field]: parseInt(value)
                          }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Rate 1-5" />
                          </SelectTrigger>
                          <SelectContent>
                            {[1, 2, 3, 4, 5].map(num => (
                              <SelectItem key={num} value={num.toString()}>
                                {num} - {
                                  num === 1 ? 'Poor' :
                                  num === 2 ? 'Fair' :
                                  num === 3 ? 'Good' :
                                  num === 4 ? 'Very Good' :
                                  'Excellent'
                                }
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                    <Button onClick={submitEvaluation} className="w-full">
                      Save Evaluation
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Investment Interest */}
              {user && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Investment Interest</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Select value={userInterest} onValueChange={setUserInterest}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select interest type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">🟢 Active (time + expertise)</SelectItem>
                        <SelectItem value="passive">🟡 Passive (capital only)</SelectItem>
                        <SelectItem value="strategic">🔵 Strategic (connections)</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button 
                      onClick={submitInterest} 
                      className="w-full"
                      disabled={!userInterest}
                    >
                      <DollarSign className="h-4 w-4 mr-2" />
                      Record Interest
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Current Investors */}
              {interests.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Interested Investors</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {interests.map((interest) => (
                        <div key={interest.id} className="flex items-center justify-between text-sm">
                          <span>{interest.investor_name}</span>
                          <Badge variant="outline">
                            {interest.interest_type === 'active' ? '🟢' :
                             interest.interest_type === 'passive' ? '🟡' : '🔵'} 
                            {interest.interest_type}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default IdeaDetail;