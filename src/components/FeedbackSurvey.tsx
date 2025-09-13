import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { MessageSquare, Send } from 'lucide-react';

interface Question {
  id: string;
  text: string;
  type: 'single-choice' | 'multi-choice';
  choices: string[];
}

interface FeedbackSurveyProps {
  meetupId: string;
  onSubmitted?: () => void;
}

const questions: Question[] = [
  {
    id: "q0",
    text: "I came here for…",
    type: "multi-choice",
    choices: ["🚀 Startup vibes", "🤝 Connections", "💡 Ideas", "Learning", "🛋️ Chill", "😂 Collaborating"]
  },
  {
    id: "q2",
    text: "Content",
    type: "multi-choice",
    choices: ["🚀 Inspiring", "💡 Useful", "⏳ Too long", "🤔 Confusing", "🔥 Engaging"]
  },
  {
    id: "q3",
    text: "People/Networking",
    type: "multi-choice",
    choices: ["🤝 Collaborative", "😃 Friendly", "🧠 Smart", "👌 Okay", "👀 Meh"]
  },
  {
    id: "q4",
    text: "Best Part",
    type: "single-choice",
    choices: ["🍕 Food", "💡 Content", "🧑‍🤝‍🧑 People", "✨ Collab", "🍻 Networking"]
  },
  {
    id: "q5",
    text: "Improve Next Time",
    type: "multi-choice",
    choices: ["🤝 More networking", "🍴 Better food", "⏳ Shorter talks", "🚀 More pitches", "🎉 Keep it"]
  }
];

export default function FeedbackSurvey({ meetupId, onSubmitted }: FeedbackSurveyProps) {
  const { user } = useAuth();
  const [responses, setResponses] = useState<Record<string, string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [existingFeedback, setExistingFeedback] = useState<any>(null);

  useEffect(() => {
    checkExistingFeedback();
  }, [meetupId, user]);

  const checkExistingFeedback = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('meetup_feedback')
        .select('*')
        .eq('meetup_id', meetupId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setExistingFeedback(data);
        setResponses(data.responses);
        setIsSubmitted(true);
      }
    } catch (error) {
      console.error('Error checking existing feedback:', error);
    }
  };

  const handleChoiceClick = (questionId: string, choice: string, isMultiChoice: boolean) => {
    setResponses(prev => {
      const current = prev[questionId] || [];
      
      if (isMultiChoice) {
        // Multi-choice: toggle selection
        if (current.includes(choice)) {
          return { ...prev, [questionId]: current.filter(c => c !== choice) };
        } else {
          return { ...prev, [questionId]: [...current, choice] };
        }
      } else {
        // Single-choice: replace selection
        return { ...prev, [questionId]: [choice] };
      }
    });
  };

  const submitFeedback = async () => {
    if (!user) return;
    
    setIsSubmitting(true);
    try {
      if (existingFeedback) {
        // Update existing feedback
        const { error } = await supabase
          .from('meetup_feedback')
          .update({
            responses: responses,
            submitted_at: new Date().toISOString()
          })
          .eq('id', existingFeedback.id);

        if (error) throw error;
        toast.success('Feedback updated! 🎉');
      } else {
        // Create new feedback
        const { error } = await supabase
          .from('meetup_feedback')
          .insert({
            meetup_id: meetupId,
            user_id: user.id,
            responses: responses,
            submitted_at: new Date().toISOString()
          });

        if (error) throw error;
        toast.success('Thank you for your feedback! 🎉');
      }

      setIsSubmitted(true);
      onSubmitted?.();
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast.error('Failed to submit feedback');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h3 className="text-lg font-semibold mb-2">Thank You!</h3>
          <p className="text-muted-foreground">Your anonymous feedback helps us improve future meetups.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Quick Feedback
        </CardTitle>
        <p className="text-sm text-muted-foreground">Anonymous • Takes 30 seconds</p>
      </CardHeader>
      <CardContent className="space-y-6">
        {questions.map((question) => (
          <div key={question.id} className="space-y-3">
            <h4 className="font-medium">{question.text}</h4>
            <div className="flex flex-wrap gap-2">
              {question.choices.map((choice) => {
                const isSelected = responses[question.id]?.includes(choice) || false;
                return (
                  <Button
                    key={choice}
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleChoiceClick(question.id, choice, question.type === 'multi-choice')}
                    className="h-auto px-3 py-2 text-sm rounded-full"
                  >
                    {choice}
                  </Button>
                );
              })}
            </div>
            {question.type === 'multi-choice' && (
              <p className="text-xs text-muted-foreground">Select all that apply</p>
            )}
          </div>
        ))}
        
        <div className="pt-4 border-t">
          <Button 
            onClick={submitFeedback} 
            disabled={isSubmitting || Object.keys(responses).length === 0}
            className="w-full"
          >
            {isSubmitting ? 'Submitting...' : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Submit Feedback
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
