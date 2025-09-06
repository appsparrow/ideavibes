import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  ArrowRight, 
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Shield
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface WorkflowTransition {
  id: string;
  from_status: string | null;
  to_status: string;
  reason: string | null;
  changed_by: string;
  created_at: string;
  changer_name?: string;
}

interface WorkflowManagerProps {
  ideaId: string;
  currentStatus: string;
  onStatusChange?: () => void;
}

const WorkflowManager = ({ ideaId, currentStatus, onStatusChange }: WorkflowManagerProps) => {
  const { user, isAdmin } = useAuth();
  const [transitions, setTransitions] = useState<WorkflowTransition[]>([]);
  const [loading, setLoading] = useState(true);
  const [isChangingStatus, setIsChangingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [reason, setReason] = useState('');
  const [progressionStatus, setProgressionStatus] = useState<{
    canProgress: boolean;
    metCriteria: string[];
    unmetCriteria: string[];
  } | null>(null);
  const [nextStageStatus, setNextStageStatus] = useState<{
    canProgress: boolean;
    metCriteria: string[];
    unmetCriteria: string[];
  } | null>(null);
  const { toast } = useToast();

  const statusOptions = [
    { value: 'proposed', label: 'Proposed', description: 'Initial idea submission' },
    { value: 'under_review', label: 'Under Review', description: 'Being evaluated by the community' },
    { value: 'validated', label: 'Validated', description: 'Passed evaluation criteria' },
    { value: 'investment_ready', label: 'Investment Ready', description: 'Ready for investment consideration' }
  ];

  useEffect(() => {
    fetchTransitions();
    checkNextStageProgress();
  }, [ideaId, currentStatus]);

  const fetchTransitions = async () => {
    try {
      const { data, error } = await supabase
        .from('workflow_transitions')
        .select(`
          *,
          profiles!workflow_transitions_changed_by_fkey(name)
        `)
        .eq('idea_id', ideaId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setTransitions((data || []).map(transition => ({
        ...transition,
        changer_name: (transition as any).profiles?.name
      })));
    } catch (error: any) {
      toast({
        title: "Error loading workflow history",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const checkNextStageProgress = async () => {
    const nextStatusIndex = statusOptions.findIndex(option => option.value === currentStatus) + 1;
    if (nextStatusIndex < statusOptions.length) {
      const nextStatus = statusOptions[nextStatusIndex].value;
      const status = await checkProgressionCriteria(nextStatus);
      setNextStageStatus(status);
    }
  };

  const updateStatus = async () => {
    if (!user || !newStatus || !isAdmin) return;

    try {
      const { error } = await supabase.rpc('update_idea_status', {
        p_idea_id: ideaId,
        p_new_status: newStatus as 'proposed' | 'under_review' | 'validated' | 'investment_ready',
        p_reason: reason.trim() || null
      });

      if (error) throw error;

      setIsChangingStatus(false);
      setNewStatus('');
      setReason('');
      fetchTransitions();
      onStatusChange?.();

      toast({
        title: "Status updated",
        description: "Idea status has been changed successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error updating status",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'proposed': return <Clock className="h-4 w-4" />;
      case 'under_review': return <AlertCircle className="h-4 w-4" />;
      case 'validated': return <CheckCircle className="h-4 w-4" />;
      case 'investment_ready': return <TrendingUp className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
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

  const getCurrentStatusInfo = () => {
    return statusOptions.find(option => option.value === currentStatus);
  };

  const getProgressionCriteria = (fromStatus: string, toStatus: string) => {
    const criteria: { [key: string]: string[] } = {
      'proposed->under_review': [
        'At least 3-5 members show interest (votes or comments)',
        'At least 1 evaluation submitted',
        'Optional: Rough capital requirement estimate'
      ],
      'under_review->validated': [
        'Minimum 5 evaluations submitted',
        'Average composite score ≥ 12/20 (60%)',
        'At least one key risk addressed in comments',
        'Initial financial snapshot provided (investment needs, ROI, timeline)'
      ],
      'validated->investment_ready': [
        'Validation tasks completed by working group',
        'Composite score maintained above threshold',
        'At least 3 investors express interest',
        'Preliminary commitments logged',
        'At least one document uploaded (deck, memo, 1-pager)'
      ]
    };
    return criteria[`${fromStatus}->${toStatus}`] || [];
  };

  const checkProgressionCriteria = async (targetStatus: string): Promise<{ canProgress: boolean; metCriteria: string[]; unmetCriteria: string[] }> => {
    const metCriteria: string[] = [];
    const unmetCriteria: string[] = [];

    try {
      if (currentStatus === 'proposed' && targetStatus === 'under_review') {
        // Check votes and comments count
        const { data: votesData } = await supabase
          .from('votes')
          .select('id')
          .eq('idea_id', ideaId);
        
        const { data: commentsData } = await supabase
          .from('comments')
          .select('id')
          .eq('idea_id', ideaId);
        
        const { data: evaluationsData } = await supabase
          .from('evaluations')
          .select('id')
          .eq('idea_id', ideaId);

        const totalInteractions = (votesData?.length || 0) + (commentsData?.length || 0);
        
        if (totalInteractions >= 3) {
          metCriteria.push('Community interest demonstrated (votes/comments)');
        } else {
          unmetCriteria.push(`Need ${3 - totalInteractions} more community interactions`);
        }

        if ((evaluationsData?.length || 0) >= 1) {
          metCriteria.push('At least 1 evaluation submitted');
        } else {
          unmetCriteria.push('Need at least 1 evaluation');
        }
      }

      if (currentStatus === 'under_review' && targetStatus === 'validated') {
        const { data: evaluationsData } = await supabase
          .from('evaluations')
          .select('market_size, feasibility, strategic_fit, novelty')
          .eq('idea_id', ideaId);

        if ((evaluationsData?.length || 0) >= 5) {
          metCriteria.push('Minimum 5 evaluations submitted');
        } else {
          unmetCriteria.push(`Need ${5 - (evaluationsData?.length || 0)} more evaluations`);
        }

        // Calculate average score
        if (evaluationsData && evaluationsData.length > 0) {
          const totalScore = evaluationsData.reduce((sum, evaluation) => {
            return sum + (evaluation.market_size || 0) + (evaluation.feasibility || 0) + 
                   (evaluation.strategic_fit || 0) + (evaluation.novelty || 0);
          }, 0);
          const averageScore = totalScore / evaluationsData.length;
          
          if (averageScore >= 12) {
            metCriteria.push(`Average score above threshold (${averageScore.toFixed(1)}/20)`);
          } else {
            unmetCriteria.push(`Average score too low (${averageScore.toFixed(1)}/20, need ≥12)`);
          }
        }

        const { data: commentsData } = await supabase
          .from('comments')
          .select('content')
          .eq('idea_id', ideaId);

        if ((commentsData?.length || 0) >= 3) {
          metCriteria.push('Community discussion active');
        } else {
          unmetCriteria.push('Need more community discussion');
        }
      }

      if (currentStatus === 'validated' && targetStatus === 'investment_ready') {
        const { data: investorData } = await supabase
          .from('investor_interest')
          .select('id')
          .eq('idea_id', ideaId);

        if ((investorData?.length || 0) >= 3) {
          metCriteria.push('Investor interest demonstrated');
        } else {
          unmetCriteria.push(`Need ${3 - (investorData?.length || 0)} more investor expressions of interest`);
        }

        const { data: documentsData } = await supabase
          .from('documents')
          .select('id')
          .eq('idea_id', ideaId);

        if ((documentsData?.length || 0) >= 1) {
          metCriteria.push('Supporting documents provided');
        } else {
          unmetCriteria.push('Need at least 1 supporting document');
        }
      }

      return {
        canProgress: unmetCriteria.length === 0,
        metCriteria,
        unmetCriteria
      };
    } catch (error) {
      console.error('Error checking progression criteria:', error);
      return {
        canProgress: false,
        metCriteria: [],
        unmetCriteria: ['Error checking criteria']
      };
    }
  };

  const canProgressTo = (targetStatus: string) => {
    // Allow admin override, but we'll show criteria status
    return isAdmin;
  };

  const getNextPossibleStatuses = () => {
    const currentIndex = statusOptions.findIndex(option => option.value === currentStatus);
    return statusOptions.filter((option, index) => 
      index !== currentIndex && canProgressTo(option.value)
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  const currentStatusInfo = getCurrentStatusInfo();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {getStatusIcon(currentStatus)}
              Workflow Status
            </CardTitle>
            <CardDescription>
              Track idea progress through the evaluation pipeline
            </CardDescription>
          </div>
          {isAdmin && (
            <Dialog open={isChangingStatus} onOpenChange={setIsChangingStatus}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Shield className="h-4 w-4 mr-1" />
                  Change Status
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Update Idea Status</DialogTitle>
                  <DialogDescription>
                    Change the workflow status of this idea (Admin only)
                  </DialogDescription>
                </DialogHeader>
                  <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">New Status</label>
                    <Select value={newStatus} onValueChange={async (value) => {
                      setNewStatus(value);
                      const status = await checkProgressionCriteria(value);
                      setProgressionStatus(status);
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select new status..." />
                      </SelectTrigger>
                      <SelectContent>
                        {getNextPossibleStatuses().map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(option.value)}
                              <div>
                                <div className="font-medium">{option.label}</div>
                                <div className="text-xs text-muted-foreground">{option.description}</div>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Progression Criteria Status */}
                  {progressionStatus && newStatus && (
                    <div className="space-y-3 p-3 border rounded-lg bg-muted/50">
                      <h4 className="font-medium text-sm">Progression Criteria</h4>
                      
                      {progressionStatus.metCriteria.length > 0 && (
                        <div className="space-y-1">
                          <div className="text-xs font-medium text-green-700">✓ Requirements Met:</div>
                          {progressionStatus.metCriteria.map((criteria, index) => (
                            <div key={index} className="text-xs text-green-600 flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" />
                              {criteria}
                            </div>
                          ))}
                        </div>
                      )}

                      {progressionStatus.unmetCriteria.length > 0 && (
                        <div className="space-y-1">
                          <div className="text-xs font-medium text-orange-700">⚠ Requirements Not Met:</div>
                          {progressionStatus.unmetCriteria.map((criteria, index) => (
                            <div key={index} className="text-xs text-orange-600 flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              {criteria}
                            </div>
                          ))}
                        </div>
                      )}

                      {!progressionStatus.canProgress && (
                        <div className="text-xs text-amber-600 p-2 bg-amber-50 rounded border border-amber-200">
                          <strong>Admin Override:</strong> You can still proceed as an admin, but consider if the idea is truly ready for the next stage.
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Reason (Optional)</label>
                    <Textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Explain why this status change is being made..."
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      onClick={updateStatus}
                      disabled={!newStatus}
                      className="flex-1"
                    >
                      Update Status
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setIsChangingStatus(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Status */}
        <div className="p-4 border rounded-lg bg-muted/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              {getStatusIcon(currentStatus)}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">Current Status:</span>
                <Badge className={getStatusColor(currentStatus)}>
                  {currentStatusInfo?.label}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {currentStatusInfo?.description}
              </p>
            </div>
          </div>
        </div>

        {/* Next Stage Progression Criteria */}
        {nextStageStatus && statusOptions.findIndex(opt => opt.value === currentStatus) < statusOptions.length - 1 && (
          <div className="p-4 border rounded-lg">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <ArrowRight className="h-4 w-4" />
              Progress to Next Stage
            </h4>
            
            {nextStageStatus.metCriteria.length > 0 && (
              <div className="space-y-1 mb-3">
                <div className="text-xs font-medium text-green-700">✓ Requirements Met:</div>
                {nextStageStatus.metCriteria.map((criteria, index) => (
                  <div key={index} className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    {criteria}
                  </div>
                ))}
              </div>
            )}

            {nextStageStatus.unmetCriteria.length > 0 && (
              <div className="space-y-1">
                <div className="text-xs font-medium text-orange-700">⚠ Requirements Needed:</div>
                {nextStageStatus.unmetCriteria.map((criteria, index) => (
                  <div key={index} className="text-xs text-orange-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {criteria}
                  </div>
                ))}
              </div>
            )}

            <div className="mt-3 text-xs text-muted-foreground">
              {nextStageStatus.canProgress ? (
                <span className="text-green-600 font-medium">✓ Ready for next stage!</span>
              ) : (
                <span>Complete the requirements above to progress to the next stage.</span>
              )}
            </div>
          </div>
        )}

        {/* Workflow History */}
        <div>
          <h4 className="font-medium mb-3">Status History</h4>
          {transitions.length > 0 ? (
            <div className="space-y-3">
              {transitions.map((transition, index) => (
                <div key={transition.id} className="flex items-start gap-3 p-3 border rounded-lg">
                  <div className="flex items-center gap-2 mt-0.5">
                    {transition.from_status && (
                      <>
                        <Badge className={getStatusColor(transition.from_status)} variant="outline">
                          {statusOptions.find(s => s.value === transition.from_status)?.label}
                        </Badge>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      </>
                    )}
                    <Badge className={getStatusColor(transition.to_status)}>
                      {statusOptions.find(s => s.value === transition.to_status)?.label}
                    </Badge>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium">{transition.changer_name}</span>
                      <span className="text-muted-foreground">
                        • {new Date(transition.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {transition.reason && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {transition.reason}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No status changes yet</p>
            </div>
          )}
        </div>

        {/* Status Flow Guide */}
        <div className="p-4 border rounded-lg bg-muted/20">
          <h4 className="font-medium mb-3">Workflow Process</h4>
          <div className="flex items-center gap-2 text-sm">
            {statusOptions.map((status, index) => (
              <div key={status.value} className="flex items-center gap-2">
                <Badge 
                  className={getStatusColor(status.value)}
                  variant={status.value === currentStatus ? "default" : "outline"}
                >
                  {status.label}
                </Badge>
                {index < statusOptions.length - 1 && (
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Ideas progress through these stages based on community evaluation and admin review
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default WorkflowManager;