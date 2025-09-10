import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useGroupContext } from '@/hooks/useGroupContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Calendar, Clock, Users, FileText, CheckSquare, MessageSquare, Bot } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Layout from '@/components/layout/Layout';

interface Meeting {
  id: string;
  date: string;
  meeting_time: string | null;
  agenda: string;
  notes: string;
  action_items: any;
  session_feedback: string | null;
  status: string;
  group_id: string;
  created_at: string;
}

interface MeetingNote {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  profiles: {
    first_name: string | null;
    last_name: string | null;
    name: string;
  } | null;
}

function Meetings() {
  const { user, isAdmin, isModerator } = useAuth();
  const { selectedGroupId, selectedGroupName } = useGroupContext();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [meetingNotes, setMeetingNotes] = useState<MeetingNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [loading, setLoading] = useState(true);

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
      fetchMeetings();
    }
  }, [user, selectedGroupId]);

  useEffect(() => {
    if (selectedMeeting) {
      fetchMeetingNotes(selectedMeeting.id);
    }
  }, [selectedMeeting]);

  const fetchMeetings = async () => {
    try {
      const { data, error } = await supabase
        .from('meetings')
        .select('*')
        .eq('group_id', selectedGroupId)
        .order('date', { ascending: false });

      if (error) throw error;
      setMeetings(data || []);
    } catch (error) {
      console.error('Error fetching meetings:', error);
      toast.error('Failed to load meetings');
    } finally {
      setLoading(false);
    }
  };

  const fetchMeetingNotes = async (meetingId: string) => {
    try {
      const { data, error } = await supabase
        .from('meeting_notes')
        .select(`
          id,
          content,
          user_id,
          created_at
        `)
        .eq('meeting_id', meetingId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      // Fetch user profiles separately
      const notesWithProfiles = await Promise.all(
        (data || []).map(async (note) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name, name')
            .eq('id', note.user_id)
            .maybeSingle();
          
          return {
            ...note,
            profiles: profile
          };
        })
      );
      
      setMeetingNotes(notesWithProfiles);
    } catch (error) {
      console.error('Error fetching meeting notes:', error);
    }
  };

  const createMeeting = async () => {
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

      toast.success('Meeting created successfully');
      setIsCreating(false);
      setFormData({ date: '', meeting_time: '', agenda: '', notes: '' });
      fetchMeetings();
    } catch (error) {
      console.error('Error creating meeting:', error);
      toast.error('Failed to create meeting');
    }
  };

  const addNote = async () => {
    if (!user || !selectedMeeting || !newNote.trim()) return;

    try {
      const { error } = await supabase.from('meeting_notes').insert({
        meeting_id: selectedMeeting.id,
        user_id: user.id,
        content: newNote.trim()
      });

      if (error) throw error;

      setNewNote('');
      fetchMeetingNotes(selectedMeeting.id);
      toast.success('Note added successfully');
    } catch (error) {
      console.error('Error adding note:', error);
      toast.error('Failed to add note');
    }
  };

  const addActionItem = async (item: string) => {
    if (!selectedMeeting || !item.trim()) return;

    try {
      const updatedActionItems = [...(selectedMeeting.action_items || []), {
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
        .eq('id', selectedMeeting.id);

      if (error) throw error;

      setSelectedMeeting({ ...selectedMeeting, action_items: updatedActionItems });
      toast.success('Action item added');
    } catch (error) {
      console.error('Error adding action item:', error);
      toast.error('Failed to add action item');
    }
  };

  const generateAINotes = async (meetingId: string) => {
    try {
      toast.info('Generating AI summary...');
      const { data, error } = await supabase.functions.invoke('generate-meeting-notes', {
        body: { meetingId }
      });

      if (error) throw error;

      toast.success('AI summary generated successfully');
      fetchMeetings(); // Refresh to show updated meeting with AI summary
    } catch (error) {
      console.error('Error generating AI notes:', error);
      toast.error('Failed to generate AI summary');
    }
  };

  if (!selectedGroupId) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Group Selected</h3>
            <p className="text-muted-foreground">Please select a group to view meetings.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Meetings</h1>
          <p className="text-muted-foreground">Group: {selectedGroupName}</p>
        </div>
        {(isAdmin || isModerator) && (
          <Dialog open={isCreating} onOpenChange={setIsCreating}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Schedule Meeting
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Schedule New Meeting</DialogTitle>
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
                  <Textarea
                    id="agenda"
                    placeholder="Meeting agenda..."
                    value={formData.agenda}
                    onChange={(e) => setFormData({ ...formData, agenda: e.target.value })}
                    rows={4}
                  />
                </div>
                <div>
                  <Label htmlFor="notes">Initial Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Initial meeting notes..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsCreating(false)}>
                    Cancel
                  </Button>
                  <Button onClick={createMeeting}>
                    Schedule Meeting
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Meetings List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Meetings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {loading ? (
                <p>Loading meetings...</p>
              ) : meetings.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No meetings scheduled</p>
              ) : (
                meetings.map((meeting) => (
                  <Card
                    key={meeting.id}
                    className={`cursor-pointer transition-colors ${
                      selectedMeeting?.id === meeting.id ? 'border-primary' : ''
                    }`}
                    onClick={() => setSelectedMeeting(meeting)}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">
                            {new Date(meeting.date).toLocaleDateString()}
                          </p>
                          {meeting.meeting_time && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {meeting.meeting_time}
                            </p>
                          )}
                        </div>
                        <Badge variant={meeting.status === 'completed' ? 'default' : 'secondary'}>
                          {meeting.status}
                        </Badge>
                      </div>
                      <p className="text-sm mt-2 line-clamp-2">{meeting.agenda}</p>
                    </CardContent>
                  </Card>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Meeting Details */}
        <div className="lg:col-span-2">
          {selectedMeeting ? (
            <div className="space-y-6">
              {/* Meeting Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Meeting Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Date</Label>
                      <p>{new Date(selectedMeeting.date).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Time</Label>
                      <p>{selectedMeeting.meeting_time || 'Not set'}</p>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Agenda</Label>
                    <p className="mt-1">{selectedMeeting.agenda}</p>
                  </div>
                  {selectedMeeting.notes && (
                    <div>
                      <Label className="text-sm font-medium">Initial Notes</Label>
                      <p className="mt-1">{selectedMeeting.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Collaborative Notes */}
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5" />
                      Collaborative Notes
                    </CardTitle>
                    {(isAdmin || isModerator) && meetingNotes.length > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => generateAINotes(selectedMeeting.id)}
                        className="flex items-center gap-2"
                      >
                        <Bot className="h-4 w-4" />
                        Generate AI Summary
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {meetingNotes.map((note) => (
                      <div key={note.id} className="flex gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {((note.profiles?.first_name || note.profiles?.name || 'U').charAt(0) +
                              (note.profiles?.last_name || '').charAt(0)).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              {note.profiles?.first_name && note.profiles?.last_name
                                ? `${note.profiles.first_name} ${note.profiles.last_name}`
                                : note.profiles?.name || 'Unknown User'}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(note.created_at).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm mt-1">{note.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Add a note..."
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      rows={2}
                      className="flex-1"
                    />
                    <Button onClick={addNote} disabled={!newNote.trim()}>
                      Add Note
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Action Items */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckSquare className="h-5 w-5" />
                    Action Items
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    {selectedMeeting.action_items?.map((item: any, index: number) => (
                      <div key={index} className="flex items-center gap-2 p-2 border rounded">
                        <input
                          type="checkbox"
                          checked={item.completed}
                          className="rounded"
                          readOnly
                        />
                        <span className={item.completed ? 'line-through text-muted-foreground' : ''}>
                          {item.text}
                        </span>
                      </div>
                    )) || <p className="text-muted-foreground">No action items yet</p>}
                  </div>
                  {(isAdmin || isModerator) && (
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add action item..."
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            addActionItem(e.currentTarget.value);
                            e.currentTarget.value = '';
                          }
                        }}
                      />
                      <Button
                        onClick={(e) => {
                          const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                          addActionItem(input.value);
                          input.value = '';
                        }}
                      >
                        Add
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Select a Meeting</h3>
                <p className="text-muted-foreground">Choose a meeting from the list to view details and notes.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      </div>
    </Layout>
  );
}

export default Meetings;