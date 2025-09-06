import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CreateGroupDialogProps {
  onGroupCreated?: () => void;
}

const CreateGroupDialog = ({ onGroupCreated }: CreateGroupDialogProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });
  const [createdGroup, setCreatedGroup] = useState<{ id: string; name: string; invite_code: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      // Create the group
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .insert({
          name: formData.name,
          description: formData.description || null,
          created_by: user.id
        })
        .select()
        .single();

      if (groupError) throw groupError;

      // Add creator as admin member
      const { error: memberError } = await supabase
        .from('group_members')
        .insert({
          group_id: groupData.id,
          user_id: user.id,
          role: 'admin'
        });

      if (memberError) throw memberError;

      setCreatedGroup({
        id: groupData.id,
        name: groupData.name,
        invite_code: groupData.invite_code
      });

      toast({
        title: "Group created successfully!",
        description: `${formData.name} is ready for members.`,
      });

      onGroupCreated?.();
    } catch (error: any) {
      toast({
        title: "Error creating group",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyInviteLink = async () => {
    if (!createdGroup) return;
    
    const inviteUrl = `${window.location.origin}/groups/join/${createdGroup.invite_code}`;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    toast({
      title: "Invite link copied!",
      description: "Share this link with people you want to invite.",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const resetForm = () => {
    setFormData({ name: '', description: '' });
    setCreatedGroup(null);
    setCopied(false);
    setOpen(false);
  };

  if (createdGroup) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Group
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Group Created Successfully! 🎉</DialogTitle>
            <DialogDescription>
              Your group "{createdGroup.name}" is ready. Share the invite link below to add members.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Invite Code</Label>
              <div className="flex gap-2 mt-1">
                <Input value={createdGroup.invite_code} readOnly />
                <Button variant="outline" size="sm" onClick={copyInviteLink}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            
            <div>
              <Label>Invite Link</Label>
              <div className="flex gap-2 mt-1">
                <Input 
                  value={`${window.location.origin}/groups/join/${createdGroup.invite_code}`}
                  readOnly 
                  className="text-xs"
                />
                <Button variant="outline" size="sm" onClick={copyInviteLink}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={resetForm}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Group
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Group</DialogTitle>
          <DialogDescription>
            Create a new workspace for your team to collaborate on investment ideas.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Group Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Beyond IT Investment Club"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="What is this group about?"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.name.trim()}>
              {loading ? "Creating..." : "Create Group"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateGroupDialog;