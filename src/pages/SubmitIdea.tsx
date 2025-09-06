import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useGroupContext } from '@/hooks/useGroupContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Sparkles, ArrowLeft } from 'lucide-react';
import Header from '@/components/layout/Header';

const SubmitIdea = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sector, setSector] = useState<string>('');
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [userGroups, setUserGroups] = useState<Array<{id: string, name: string}>>([]);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const { user } = useAuth();
  const { selectedGroupId } = useGroupContext();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchUserGroups();
      // Set default selected group from context
      if (selectedGroupId) {
        setSelectedGroup(selectedGroupId);
      }
    }
  }, [user, selectedGroupId]);

  const fetchUserGroups = async () => {
    if (!user) return;
    
    try {
      const { data } = await supabase
        .from('group_members')
        .select(`
          groups (
            id,
            name
          )
        `)
        .eq('user_id', user.id);

      const groups = (data || []).map(item => item.groups).filter(Boolean) as Array<{id: string, name: string}>;
      setUserGroups(groups);
    } catch (error) {
      console.error('Error fetching user groups:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('ideas')
        .insert({
          title,
          description,
          sector: sector as any,
          submitted_by: user.id,
          group_id: selectedGroup || null,
        });

      if (error) throw error;

      toast({
        title: "Idea submitted!",
        description: "Your investment idea has been successfully submitted.",
      });

      navigate('/ideas');
    } catch (error: any) {
      toast({
        title: "Error submitting idea",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateAISummary = async () => {
    if (!description.trim()) {
      toast({
        title: "No description",
        description: "Please enter a description first to generate AI insights.",
        variant: "destructive",
      });
      return;
    }

    setAiLoading(true);
    try {
      // Simulated AI enhancement - in real app, this would call an AI service
      const aiInsights = [
        "• Market opportunity: High growth potential in emerging sectors",
        "• Key risks: Market competition and regulatory challenges",
        "• Competitive advantage: Unique value proposition and first-mover advantage"
      ];
      
      setDescription(prev => prev + "\n\nAI Insights:\n" + aiInsights.join("\n"));
      
      toast({
        title: "AI insights added",
        description: "AI-generated market analysis has been added to your description.",
      });
    } catch (error) {
      toast({
        title: "AI analysis failed",
        description: "Could not generate AI insights. Please try again.",
        variant: "destructive",
      });
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
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

          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Submit New Investment Idea</CardTitle>
              <CardDescription>
                Share your investment opportunity with the group for evaluation and discussion.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="title">Idea Title *</Label>
                  <Input
                    id="title"
                    placeholder="Enter a compelling title for your investment idea"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="group">Submit to Group</Label>
                  <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a group workspace (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Global (visible to all groups)</SelectItem>
                      {userGroups.map((group) => (
                        <SelectItem key={group.id} value={group.id}>
                          {group.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    Choose which group workspace to submit this idea to. Leave blank for global visibility.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sector">Sector *</Label>
                  <Select value={sector} onValueChange={setSector} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select investment sector" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="technology">Technology</SelectItem>
                      <SelectItem value="healthcare">Healthcare</SelectItem>
                      <SelectItem value="finance">Finance</SelectItem>
                      <SelectItem value="education">Education</SelectItem>
                      <SelectItem value="manufacturing">Manufacturing</SelectItem>
                      <SelectItem value="retail">Retail</SelectItem>
                      <SelectItem value="agriculture">Agriculture</SelectItem>
                      <SelectItem value="energy">Energy</SelectItem>
                      <SelectItem value="transportation">Transportation</SelectItem>
                      <SelectItem value="real_estate">Real Estate</SelectItem>
                      <SelectItem value="entertainment">Entertainment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="description">Description *</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={generateAISummary}
                      disabled={aiLoading}
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      {aiLoading ? 'Analyzing...' : 'AI Insights'}
                    </Button>
                  </div>
                  <Textarea
                    id="description"
                    placeholder="Describe the investment opportunity, market potential, risks, competitive landscape, and why this is a good investment..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="min-h-32"
                    required
                  />
                  <p className="text-sm text-muted-foreground">
                    Include details about the opportunity, market size, competitive advantages, potential risks, and expected returns.
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate('/ideas')}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading || !title.trim() || !description.trim() || !sector}
                    className="flex-1"
                  >
                    {loading ? 'Submitting...' : 'Submit Idea'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default SubmitIdea;