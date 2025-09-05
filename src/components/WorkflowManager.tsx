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
  const { user } = useAuth();
  const [transitions, setTransitions] = useState<WorkflowTransition[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isChangingStatus, setIsChangingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [reason, setReason] = useState('');
  const { toast } = useToast();

  const statusOptions = [
    { value: 'proposed', label: 'Proposed', description: 'Initial idea submission' },
    { value: 'under_review', label: 'Under Review', description: 'Being evaluated by the community' },
    { value: 'validated', label: 'Validated', description: 'Passed evaluation criteria' },
    { value: 'investment_ready', label: 'Investment Ready', description: 'Ready for investment consideration' }
  ];

  useEffect(() => {
    fetchTransitions();
    checkAdminStatus();
  }, [ideaId]);

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

  const checkAdminStatus = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!error && data?.role === 'admin') {
        setIsAdmin(true);
      }
    } catch (error: any) {
      console.log('Not admin or error checking status');
    }
  };

  const updateStatus = async () => {
    if (!user || !newStatus || !isAdmin) return;

    try {
      const { error } = await supabase.rpc('update_idea_status', {
        p_idea_id: ideaId,
        p_new_status: newStatus,
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

  const getNextPossibleStatuses = () => {
    const currentIndex = statusOptions.findIndex(option => option.value === currentStatus);
    return statusOptions.filter((_, index) => index !== currentIndex);
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
                    <Select value={newStatus} onValueChange={setNewStatus}>
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