import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useGroupContext } from '@/hooks/useGroupContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Calendar, Clock, Users, CheckSquare, MessageSquare, Bot, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { RichTextDisplay } from '@/components/ui/rich-text-display';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Layout from '@/components/layout/Layout';
import PageHeader from '@/components/layout/PageHeader';
import { useIsMobile } from '@/hooks/use-mobile';
import FeedbackSurvey from '@/components/FeedbackSurvey';

interface Meetup {
  id: string;
  date: string;
  meeting_time: string | null;
  agenda: string;
  notes: string;
  ai_summary: string | null;
  action_items: any;
  session_feedback: string | null;
  status: string;
  group_id: string;
  created_at: string;
  updated_at: string | null;
  groups?: {
    name: string;
  };
}

interface MeetupNote {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  profiles: {
    name: string;
  } | null;
}

function Meetups() {
  const { user, isAdmin, isModerator } = useAuth();
  const { selectedGroupId, selectedGroupName } = useGroupContext();
  const isMobile = useIsMobile();
  const [meetups, setMeetups] = useState<Meetup[]>([]);
  const [selectedMeetup, setSelectedMeetup] = useState<Meetup | null>(null);
  const [meetupNotes, setMeetupNotes] = useState<MeetupNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [activeTab, setActiveTab] = useState('agenda');
  const [editingSummary, setEditingSummary] = useState(false);
  const [summaryText, setSummaryText] = useState('');
  const [myNotes, setMyNotes] = useState('');
  const [othersNotes, setOthersNotes] = useState<MeetupNote[]>([]);
  const [isPaidUser, setIsPaidUser] = useState(false);
  const [isGroupAdmin, setIsGroupAdmin] = useState(false);
  const [showAllMeetings, setShowAllMeetings] = useState(false);
  const myNotesRef = useRef<HTMLTextAreaElement | null>(null);

  // Form states
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    date: '',
    meeting_time: '',
    agenda: '',
    notes: ''
  });

  useEffect(() => {
    if (user && selectedGroupId) {
      fetchMeetups();
      checkUserSubscription();
      checkGroupAdmin();
    }
  }, [user, selectedGroupId, showAllMeetings]);

  const checkUserSubscription = async () => {
    if (!user) return;
    
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_tier, subscription_expires_at')
        .eq('id', user.id)
        .single();
      
      if (profile) {
        const isPro = profile.subscription_tier === 'pro' && 
                     (!profile.subscription_expires_at || 
                      new Date(profile.subscription_expires_at) > new Date());
        setIsPaidUser(isPro);
      } else {
        setIsPaidUser(false);
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
      setIsPaidUser(false);
    }
  };

  const checkGroupAdmin = async () => {
    if (!user || !selectedGroupId) return;
    
    try {
      const { data } = await supabase
        .from('group_members')
        .select('role')
        .eq('user_id', user.id)
        .eq('group_id', selectedGroupId)
        .single();
      
      setIsGroupAdmin(data?.role === 'admin');
    } catch (error) {
      console.error('Error checking group admin status:', error);
      setIsGroupAdmin(false);
    }
  };

  useEffect(() => {
    if (selectedMeetup) {
      fetchMeetupNotes(selectedMeetup.id);
      setSummaryText(selectedMeetup.ai_summary || '');
    }
  }, [selectedMeetup]);

  useEffect(() => {
    if (meetupNotes.length > 0 && user) {
      const userNotes = meetupNotes.filter(note => note.user_id === user.id);
      const otherNotes = meetupNotes.filter(note => note.user_id !== user.id);
      
      // Combine user's notes into a single text
      const myNotesText = userNotes.map(note => note.content).join('\n\n');
      setMyNotes(myNotesText);
      setOthersNotes(otherNotes);
    }
  }, [meetupNotes, user]);

  // Auto-resize textarea whenever content changes or component mounts
  useEffect(() => {
    if (myNotesRef.current) {
      autoResizeTextarea(myNotesRef.current);
    }
  }, [myNotes, activeTab, selectedMeetup]);

  const fetchMeetups = async () => {
    try {
      // For admins with showAllMeetings, fetch all meetings across all groups
      if (isAdmin && showAllMeetings) {
        const { data, error } = await supabase
          .from('meetings')
          .select('*, ai_summary, groups(name)')
          .order('date', { ascending: false });

        if (error) throw error;
        setMeetups(data || []);
        return;
      }

      // Check if user is member of the selected group
      const { data: membershipData } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user!.id)
        .eq('group_id', selectedGroupId);

      if (!membershipData || membershipData.length === 0) {
        setMeetups([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('meetings')
        .select('*, ai_summary')
        .eq('group_id', selectedGroupId)
        .order('date', { ascending: false });

      if (error) throw error;
      setMeetups(data || []);
    } catch (error) {
      console.error('Error fetching meetups:', error);
      toast.error('Failed to load meetups');
    } finally {
      setLoading(false);
    }
  };

  const fetchMeetupNotes = async (meetupId: string) => {
    try {
      const { data, error } = await supabase
        .from('meeting_notes')
        .select(`
          id,
          content,
          user_id,
          created_at
        `)
        .eq('meeting_id', meetupId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      // Fetch user profiles separately
      const notesWithProfiles = await Promise.all(
        (data || []).map(async (note) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', note.user_id)
            .maybeSingle();
          
          return {
            ...note,
            profiles: profile
          };
        })
      );
      
      setMeetupNotes(notesWithProfiles);
    } catch (error) {
      console.error('Error fetching meetup notes:', error);
    }
  };

  const createMeetup = async () => {
    if (!user || !selectedGroupId) return;

    try {
      const { error } = await supabase.from('meetings').insert({
        group_id: selectedGroupId,
        date: formData.date,
        meeting_time: formData.meeting_time,
        agenda: formData.agenda,
        notes: formData.notes,
        action_items: [],
        status: 'scheduled'
      });

      if (error) throw error;

      toast.success('Meetup created successfully');
      setIsCreating(false);
      setFormData({ date: '', meeting_time: '', agenda: '', notes: '' });
      fetchMeetups();
    } catch (error) {
      console.error('Error creating meetup:', error);
      toast.error('Failed to create meetup');
    }
  };

  const addNote = async () => {
    if (!user || !selectedMeetup || !newNote.trim()) return;

    try {
      const { error } = await supabase.from('meeting_notes').insert({
        meeting_id: selectedMeetup.id,
        user_id: user.id,
        content: newNote.trim()
      });

      if (error) throw error;

      setNewNote('');
      setIsAddingNote(false);
      fetchMeetupNotes(selectedMeetup.id);
      toast.success('Note added successfully');
    } catch (error) {
      console.error('Error adding note:', error);
      toast.error('Failed to add note');
    }
  };

  const addActionItem = async (item: string) => {
    if (!selectedMeetup || !item.trim()) return;

    try {
      const updatedActionItems = [...(selectedMeetup.action_items || []), {
        id: Date.now(),
        text: item.trim(),
        completed: false,
        assignedTo: null,
        createdBy: user?.id,
        createdAt: new Date().toISOString()
      }];

      const { error } = await supabase
        .from('meetings')
        .update({ action_items: updatedActionItems })
        .eq('id', selectedMeetup.id);

      if (error) throw error;

      setSelectedMeetup({ ...selectedMeetup, action_items: updatedActionItems });
      toast.success('Action item added');
    } catch (error) {
      console.error('Error adding action item:', error);
      toast.error('Failed to add action item');
    }
  };

  const generateAINotes = async (meetupId: string) => {
    try {
      // Check free user AI summary limits (2 per month)
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_tier')
        .eq('id', user?.id)
        .single();
      
      if (!profile?.subscription_tier || profile.subscription_tier === 'free') {
        // Check usage in current month
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        
        const { data: trackingData } = await supabase
          .from('usage_tracking')
          .select('ai_summaries_generated')
          .eq('user_id', user?.id)
          .eq('month_year', new Date().toISOString().slice(0, 7)) // YYYY-MM format
          .single();

        const currentUsage = trackingData?.ai_summaries_generated || 0;
        
        if (currentUsage >= 2) {
          toast.error('Free users get 2 AI summaries per month. Upgrade to Pro for unlimited summaries.');
          return;
        }
      }
      
      toast.info('Generating AI summary...');
      console.log('Generating AI summary for meetupId:', meetupId);
      
      // Fetch meeting notes
      const { data: notes, error: notesError } = await supabase
        .from('meeting_notes')
        .select(`
          content,
          created_at,
          user_id
        `)
        .eq('meeting_id', meetupId)
        .order('created_at', { ascending: true });

      if (notesError) {
        console.error('Error fetching notes:', notesError);
        toast.error('Failed to fetch meetup notes');
        return;
      }

      if (!notes || notes.length === 0) {
        toast.error('No notes found for this meetup. Please add some notes first.');
        return;
      }

      // Fetch user profiles for the notes
      const notesWithProfiles = await Promise.all(
        notes.map(async (note) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', note.user_id)
            .maybeSingle();
          
          return {
            ...note,
            profiles: profile
          };
        })
      );

      // Format notes for AI processing
      const formattedNotes = notesWithProfiles.map(note => {
        const authorName = note.profiles?.name || 'Unknown User';
        
        return `[${authorName}]: ${note.content}`;
      }).join('\n\n');

      console.log('Formatted notes for AI:', formattedNotes);

      // Generate AI summary using Gemini API
      const aiSummary = await generateWithGemini(formattedNotes);

      if (!aiSummary) {
        toast.error('Failed to generate AI summary. Please check your API configuration.');
        return;
      }

      // Save AI summary to database
      const { error: updateError } = await supabase
        .from('meetings')
        .update({ 
          ai_summary: aiSummary
        })
        .eq('id', meetupId);

      if (updateError) {
        console.error('Error updating meetup:', updateError);
        toast.error('Failed to save AI summary');
        return;
      }

      // Track usage for free users
      if (!profile?.subscription_tier || profile.subscription_tier === 'free') {
        try {
          // Use upsert to increment usage count
          const monthYear = new Date().toISOString().slice(0, 7);
          
          // Get current usage again in case it changed
          const { data: currentTrackingData } = await supabase
            .from('usage_tracking')
            .select('ai_summaries_generated')
            .eq('user_id', user?.id)
            .eq('month_year', monthYear)
            .single();

          const currentUsageCount = currentTrackingData?.ai_summaries_generated || 0;
          
          await supabase
            .from('usage_tracking')
            .upsert({
              user_id: user?.id,
              month_year: monthYear,
              ai_summaries_generated: currentUsageCount + 1
            }, { 
              onConflict: 'user_id,month_year'
            });
        } catch (error) {
          // Ignore tracking errors - don't affect user experience
          console.log('Usage tracking error (safe to ignore):', error);
        }
      }

      toast.success('AI summary generated successfully');
      setSummaryText(aiSummary);
      fetchMeetups(); // Refresh to show updated meetup with AI summary
      
    } catch (error) {
      console.error('Error generating AI notes:', error);
      toast.error(`Failed to generate AI summary: ${error.message || 'Unknown error'}`);
    }
  };

  const saveSummary = async () => {
    if (!selectedMeetup) return;

    try {
      const { error } = await supabase
        .from('meetings')
        .update({ ai_summary: summaryText })
        .eq('id', selectedMeetup.id);

      if (error) throw error;

      toast.success('Summary saved successfully');
      setEditingSummary(false);
      fetchMeetups(); // Refresh data
    } catch (error) {
      console.error('Error saving summary:', error);
      toast.error('Failed to save summary');
    }
  };

  const saveMyNotes = async () => {
    if (!user || !selectedMeetup || !myNotes.trim()) return;

    try {
      // Delete existing user notes for this meeting
      await supabase
        .from('meeting_notes')
        .delete()
        .eq('meeting_id', selectedMeetup.id)
        .eq('user_id', user.id);

      // Add new consolidated note
      if (myNotes.trim()) {
        const { error } = await supabase
          .from('meeting_notes')
          .insert({
            meeting_id: selectedMeetup.id,
            user_id: user.id,
            content: myNotes.trim()
          });

        if (error) throw error;
      }

      toast.success('Your notes saved successfully');
      fetchMeetupNotes(selectedMeetup.id);
    } catch (error) {
      console.error('Error saving my notes:', error);
      toast.error('Failed to save notes');
    }
  };

  const autoResizeTextarea = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto';
    el.style.height = `${Math.max(el.scrollHeight, 80)}px`;
  };

  const handleMyNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget;
    setMyNotes(el.value);
    autoResizeTextarea(el);
  };

  const generateWithGemini = async (formattedNotes: string): Promise<string | null> => {
    const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
    
    if (!GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY not found in environment variables');
      return null;
    }

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Analyze the meetup notes below and produce a concise, well-structured HTML summary.

STRICT OUTPUT RULES:
- Return ONLY a valid HTML fragment (no markdown, no code fences, no extra pre/post text)
- Use these exact sections and tags:
  <h3>Key Discussion Points</h3>
  <ul><li>point</li>...</ul>
  <h3>Decisions Made</h3>
  <ul><li>decision</li>...</ul>
  <h3>Next Steps</h3>
  <ul><li>next step</li>...</ul>
- Keep bullets short and scannable; combine duplicates; avoid filler
- Use only tags: h3, ul, li, p, strong, em, a

Meetup Notes:
${formattedNotes}`
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          }
        })
      });

      if (!response.ok) {
        console.error('Gemini API error:', response.status, response.statusText);
        return null;
      }

      const data = await response.json();
      const aiSummary = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      console.log('Generated summary with Gemini:', aiSummary);
      return aiSummary;
      
    } catch (error) {
      console.error('Gemini API error:', error);
      return null;
    }
  };

  if (!selectedGroupId) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Group Selected</h3>
            <p className="text-muted-foreground">Please select a group to view meetups.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  

  return (
    <Layout>
      <div className="container mx-auto py-8 space-y-6">
      <PageHeader
        title={isAdmin && showAllMeetings ? "All Meetups" : "Meetups"}
        subtitle={isAdmin && showAllMeetings ? "All groups" : `Group: ${selectedGroupName}`}
        actions={
          (isAdmin || isModerator || isGroupAdmin || isPaidUser) && (
            <Dialog open={isCreating} onOpenChange={setIsCreating}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto">
                  <Plus className="h-4 w-4 mr-2" />
                  Schedule Meetup
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Schedule New Meetup</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="date">Date</Label>
                      <Input
                        id="date"
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="time">Time</Label>
                      <Input
                        id="time"
                        type="time"
                        value={formData.meeting_time}
                        onChange={(e) => setFormData({ ...formData, meeting_time: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="agenda">Agenda</Label>
                    <RichTextEditor
                      value={formData.agenda}
                      onChange={(value) => setFormData({ ...formData, agenda: value })}
                      placeholder="Meetup agenda..."
                      className="min-h-[120px]"
                    />
                  </div>
                    <div>
                      <Label htmlFor="notes">Initial Notes</Label>
                      <Textarea
                        id="notes"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Initial meetup notes..."
                        className="min-h-[100px]"
                      />
                    </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsCreating(false)}>
                      Cancel
                    </Button>
                    <Button onClick={createMeetup}>
                      Schedule Meetup
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )
        }
      />

      {/* Admin Workspace Switch */}
      {isAdmin && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Admin Workspace View</h3>
                <p className="text-sm text-muted-foreground">
                  {showAllMeetings 
                    ? "Viewing all meetups across all groups" 
                    : "Viewing only meetups from selected group"
                  }
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">My Group Only</span>
                <Button
                  variant={showAllMeetings ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowAllMeetings(!showAllMeetings)}
                >
                  {showAllMeetings ? "All Meetups" : "My Group"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className={`grid grid-cols-1 ${isMobile ? 'space-y-4' : 'lg:grid-cols-3'} gap-4 md:gap-6`}>
        {/* Meetups List */}
        <div className={`${!isMobile ? 'lg:col-span-1' : ''} ${isMobile && selectedMeetup ? 'hidden' : ''}`}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {isAdmin && showAllMeetings ? "All Meetups" : "Meetups"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {loading ? (
                <p>Loading meetups...</p>
              ) : meetups.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No meetups scheduled</p>
              ) : (
                meetups.map((meetup) => (
                  <Card
                    key={meetup.id}
                    className={`cursor-pointer transition-colors ${
                      selectedMeetup?.id === meetup.id ? 'border-primary' : ''
                    }`}
                    onClick={() => setSelectedMeetup(meetup)}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">
                            {new Date(meetup.date).toLocaleDateString()}
                          </p>
                          {meetup.meeting_time && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {meetup.meeting_time}
                            </p>
                          )}
                          {isAdmin && showAllMeetings && meetup.groups && (
                            <p className="text-xs text-blue-600 font-medium mt-1">
                              {meetup.groups.name}
                            </p>
                          )}
                        </div>
                        <Badge variant={meetup.status === 'completed' ? 'default' : 'secondary'}>
                          {meetup.status}
                        </Badge>
                      </div>
                      <p className="text-sm mt-2 line-clamp-2">{meetup.agenda}</p>
                    </CardContent>
                  </Card>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Meetup Details */}
        <div className={`${!isMobile ? 'lg:col-span-2' : ''} ${isMobile && !selectedMeetup ? 'hidden' : ''}`}>
          {selectedMeetup ? (
            <div className="h-full">
              <div className="flex gap-2 mb-4">
                {isMobile && (
                  <Button 
                    variant="ghost" 
                    onClick={() => setSelectedMeetup(null)}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Meetups
                  </Button>
                )}
                
              </div>
              
              <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                <TabsList className={`grid w-full ${
                  (isAdmin || isModerator) && isPaidUser ? 'grid-cols-4' : 
                  (isAdmin || isModerator) || isPaidUser ? 'grid-cols-3' : 'grid-cols-2'
                }`}>
                  <TabsTrigger value="agenda">Agenda</TabsTrigger>
                  <TabsTrigger value="notes" className="relative">
                    Notes
                    {selectedMeetup.status === 'in_progress' && (
                      <Badge variant="secondary" className="ml-2 text-xs">Live</Badge>
                    )}
                  </TabsTrigger>
                  {(isAdmin || isModerator) && (
                    <TabsTrigger value="summary" className="relative">
                      Summary
                      {selectedMeetup.ai_summary && (
                        <Badge variant="outline" className="ml-2 text-xs">AI</Badge>
                      )}
                    </TabsTrigger>
                  )}
                  {isPaidUser && (
                    <TabsTrigger value="feedback">Feedback</TabsTrigger>
                  )}
                </TabsList>
                
                <TabsContent value="agenda" className="flex-1 mt-4">
                  <div className="space-y-4">
                    {/* Meetup Info */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Meetup Details</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm font-medium">Date</Label>
                            <p>{new Date(selectedMeetup.date).toLocaleDateString()}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Time</Label>
                            <p>{selectedMeetup.meeting_time || 'Not set'}</p>
                          </div>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Agenda</Label>
                          <RichTextDisplay content={selectedMeetup.agenda} className="mt-1" />
                        </div>
                        {selectedMeetup.notes && (
                        <div>
                          <Label className="text-sm font-medium">Initial Notes</Label>
                          <p className="mt-1 text-sm whitespace-pre-wrap">{selectedMeetup.notes}</p>
                        </div>
                        )}
                      </CardContent>
                    </Card>

                  </div>
                </TabsContent>
                
                <TabsContent value="notes" className="flex-1 mt-4">
                  <div className="grid gap-4">
                    {/* My Notes */}
                    <Card className="flex flex-col">
                      <CardHeader className="flex-shrink-0">
                        <div className="flex justify-between items-center">
                          <CardTitle className="text-lg">My Notes</CardTitle>
                          <Button 
                            size="sm" 
                            onClick={saveMyNotes}
                            disabled={!myNotes.trim()}
                          >
                            Save
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4">
                        <Textarea
                          ref={(el) => {
                            myNotesRef.current = el;
                            if (el) {
                              // Force initial resize on mount
                              setTimeout(() => autoResizeTextarea(el), 0);
                            }
                          }}
                          value={myNotes}
                          onChange={handleMyNotesChange}
                          onInput={(e) => handleMyNotesChange(e as unknown as React.ChangeEvent<HTMLTextAreaElement>)}
                          placeholder="Add your personal notes here..."
                          className="w-full resize-none border-0 focus:ring-0 p-0"
                          style={{ 
                            minHeight: '80px',
                            overflow: 'hidden',
                            height: 'auto',
                            boxShadow: 'none'
                          }}
                        />
                      </CardContent>
                    </Card>

                    {/* Others' Notes */}
                    <Card className="flex flex-col">
                      <CardHeader className="flex-shrink-0">
                        <CardTitle className="text-lg">Others' Notes</CardTitle>
                      </CardHeader>
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          {othersNotes.map((note) => (
                            <div key={note.id} className="flex gap-3">
                              <Avatar className="h-8 w-8 flex-shrink-0">
                                <AvatarFallback className="text-xs">
                                  {(note.profiles?.name || 'Unknown User').substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-sm font-medium">
                                    {note.profiles?.name || 'Unknown User'}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(note.created_at).toLocaleTimeString()}
                                  </span>
                                </div>
                                <div className="bg-muted/30 p-3 rounded-lg">
                                  <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                          {othersNotes.length === 0 && (
                            <div className="text-center text-muted-foreground py-8">
                              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                              <p>No notes from others yet.</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {(isAdmin || isModerator) && (
                  <TabsContent value="summary" className="flex-1 mt-4">
                    <Card className="h-full flex flex-col">
                      <CardHeader className="flex-shrink-0">
                        <div className="flex justify-between items-center">
                          <CardTitle className="flex items-center gap-2">
                            <Bot className="h-5 w-5" />
                            AI Summary
                          </CardTitle>
                          <div className="flex gap-2">
                            {summaryText && (
                              <>
                                <Button
                                  size="sm"
                                  variant={editingSummary ? "default" : "outline"}
                                  onClick={() => editingSummary ? saveSummary() : setEditingSummary(true)}
                                >
                                  {editingSummary ? 'Save' : 'Edit'}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setSummaryText('');
                                    setEditingSummary(false);
                                  }}
                                >
                                  Reset
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="flex-1 flex flex-col p-4">
                        {!summaryText ? (
                          <div className="flex-1 flex items-center justify-center text-center">
                            <div>
                              <Bot className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                              <h3 className="text-lg font-semibold mb-2">No Summary Generated</h3>
                              <p className="text-muted-foreground mb-6">
                                {meetupNotes.length > 0 
                                  ? 'Generate an AI-powered summary from the meetup notes' 
                                  : 'Add some notes first, then generate a summary'}
                              </p>
                              {meetupNotes.length > 0 && (
                                <Button onClick={() => generateAINotes(selectedMeetup.id)} size="lg">
                                  <Bot className="h-4 w-4 mr-2" />
                                  Generate AI Summary
                                </Button>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="flex-1 space-y-4">
                            <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                              <p className="text-sm text-amber-800 flex items-center gap-2">
                                <Bot className="h-4 w-4" />
                                Generated by AI • Saved you {Math.ceil(meetupNotes.length * 2)} minutes consolidating {meetupNotes.length} notes
                              </p>
                            </div>
                            {editingSummary ? (
                              <div className="space-y-3">
                                <RichTextEditor
                                  value={summaryText}
                                  onChange={setSummaryText}
                                  placeholder="Edit the AI-generated summary..."
                                  className="min-h-[400px]"
                                />
                                <div className="flex gap-2">
                                  <Button onClick={saveSummary}>Save Changes</Button>
                                  <Button 
                                    variant="outline" 
                                    onClick={() => {
                                      setEditingSummary(false);
                                      setSummaryText(selectedMeetup.ai_summary || '');
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="bg-blue-50 p-4 rounded-md border-l-4 border-blue-400 min-h-[400px]">
                                <RichTextDisplay 
                                  content={summaryText} 
                                  className="prose-headings:text-blue-900 prose-headings:font-semibold prose-headings:mb-3 prose-ul:ml-0 prose-li:ml-4"
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                )}

                {isPaidUser && (
                  <TabsContent value="feedback" className="flex-1 mt-4">
                    <FeedbackSurvey 
                      meetupId={selectedMeetup.id} 
                      onSubmitted={() => toast.success('Thanks for helping us improve! 🚀')}
                    />
                  </TabsContent>
                )}
              </Tabs>
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Select a Meetup</h3>
                <p className="text-muted-foreground">Choose a meetup from the list to view details and notes.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      </div>
    </Layout>
  );
}

export default Meetups;