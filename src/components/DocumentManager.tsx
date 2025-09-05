import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  FileText, 
  Link as LinkIcon, 
  ExternalLink, 
  Plus,
  Trash2,
  Edit,
  Download,
  FileImage,
  FileSpreadsheet,
  File
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Document {
  id: string;
  title: string;
  document_type: string;
  url: string | null;
  file_path: string | null;
  description: string | null;
  created_by: string;
  created_at: string;
  creator_name?: string;
}

interface DocumentManagerProps {
  ideaId: string;
}

const DocumentManager = ({ ideaId }: DocumentManagerProps) => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingDoc, setIsAddingDoc] = useState(false);
  const [ideaCode, setIdeaCode] = useState<string>('');
  const [driveFolderId, setDriveFolderId] = useState<string>('');
  const [newDocument, setNewDocument] = useState({
    title: '',
    document_type: 'url',
    url: '',
    description: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchDocuments();
    fetchIdeaInfo();
  }, [ideaId]);

  const fetchIdeaInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('ideas')
        .select('idea_code, drive_folder_id')
        .eq('id', ideaId)
        .single();

      if (error) throw error;

      setIdeaCode(data.idea_code || '');
      setDriveFolderId(data.drive_folder_id || '');
    } catch (error: any) {
      console.error('Error fetching idea info:', error);
    }
  };

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select(`
          *,
          profiles!documents_created_by_fkey(name)
        `)
        .eq('idea_id', ideaId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setDocuments((data || []).map(doc => ({
        ...doc,
        creator_name: (doc as any).profiles?.name
      })));
    } catch (error: any) {
      toast({
        title: "Error loading documents",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateDriveFolderId = async () => {
    if (!user || !driveFolderId.trim()) return;

    try {
      const { error } = await supabase
        .from('ideas')
        .update({ drive_folder_id: driveFolderId.trim() })
        .eq('id', ideaId);

      if (error) throw error;

      toast({
        title: "Drive folder updated",
        description: "Google Drive folder ID has been saved.",
      });
    } catch (error: any) {
      toast({
        title: "Error updating folder ID",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const addDocument = async () => {
    if (!user || !newDocument.title.trim()) return;

    // Validate Google Drive URLs if folder is configured
    if (driveFolderId && newDocument.document_type === 'google_drive' && newDocument.url) {
      const driveUrl = newDocument.url.trim();
      if (!driveUrl.includes(driveFolderId)) {
        toast({
          title: "Invalid Google Drive URL",
          description: `Document must be from the configured folder: ${driveFolderId}`,
          variant: "destructive",
        });
        return;
      }
    }

    try {
      const { error } = await supabase
        .from('documents')
        .insert({
          idea_id: ideaId,
          title: newDocument.title.trim(),
          document_type: newDocument.document_type,
          url: newDocument.url.trim() || null,
          description: newDocument.description.trim() || null,
          created_by: user.id
        });

      if (error) throw error;

      setNewDocument({
        title: '',
        document_type: 'url',
        url: '',
        description: ''
      });
      setIsAddingDoc(false);
      fetchDocuments();

      toast({
        title: "Document added",
        description: "Document has been linked to this idea.",
      });
    } catch (error: any) {
      toast({
        title: "Error adding document",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteDocument = async (docId: string) => {
    if (!confirm('Are you sure you want to remove this document?')) return;

    try {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', docId);

      if (error) throw error;

      fetchDocuments();
      toast({
        title: "Document removed",
        description: "Document has been removed from this idea.",
      });
    } catch (error: any) {
      toast({
        title: "Error removing document",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getDocumentIcon = (type: string) => {
    switch (type) {
      case 'google_drive':
        return <FileSpreadsheet className="h-4 w-4" />;
      case 'image':
        return <FileImage className="h-4 w-4" />;
      case 'pdf':
        return <FileText className="h-4 w-4" />;
      case 'url':
      case 'article':
        return <LinkIcon className="h-4 w-4" />;
      default:
        return <File className="h-4 w-4" />;
    }
  };

  const getDocumentTypeColor = (type: string) => {
    switch (type) {
      case 'google_drive': return 'bg-blue-100 text-blue-800';
      case 'article': return 'bg-green-100 text-green-800';
      case 'pdf': return 'bg-red-100 text-red-800';
      case 'image': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Documents & Resources ({documents.length})
            </CardTitle>
            <CardDescription>
              Attach relevant documents, articles, and resources to this idea
            </CardDescription>
            {ideaCode && (
              <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
                <strong>Idea Code:</strong> {ideaCode}
              </div>
            )}
          </div>
          {user && (
            <Dialog open={isAddingDoc} onOpenChange={setIsAddingDoc}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Document
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Document</DialogTitle>
                  <DialogDescription>
                    Link a document or resource to this investment idea
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {/* Google Drive Folder Configuration */}
                  <div className="space-y-2 p-3 bg-muted/50 rounded">
                    <label className="text-sm font-medium">Google Drive Folder ID (Optional)</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={driveFolderId}
                        onChange={(e) => setDriveFolderId(e.target.value)}
                        placeholder="Enter Google Drive folder ID..."
                        className="flex-1 px-2 py-1 text-xs border rounded"
                      />
                      <Button 
                        onClick={updateDriveFolderId}
                        size="sm"
                        variant="outline"
                        disabled={!driveFolderId.trim()}
                      >
                        Save
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Configure to automatically organize documents in Gmail/Drive folder: {ideaCode}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="doc-title">Title</Label>
                    <Input
                      id="doc-title"
                      value={newDocument.title}
                      onChange={(e) => setNewDocument({ ...newDocument, title: e.target.value })}
                      placeholder="Document title..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="doc-type">Document Type</Label>
                    <Select
                      value={newDocument.document_type}
                      onValueChange={(value) => setNewDocument({ ...newDocument, document_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="url">Website / URL</SelectItem>
                        <SelectItem value="google_drive">Google Drive</SelectItem>
                        <SelectItem value="article">Article / Blog Post</SelectItem>
                        <SelectItem value="pdf">PDF Document</SelectItem>
                        <SelectItem value="image">Image / Chart</SelectItem>
                        <SelectItem value="spreadsheet">Spreadsheet</SelectItem>
                        <SelectItem value="presentation">Presentation</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="doc-url">URL / Link</Label>
                    <Input
                      id="doc-url"
                      value={newDocument.url}
                      onChange={(e) => setNewDocument({ ...newDocument, url: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="doc-description">Description (Optional)</Label>
                    <Textarea
                      id="doc-description"
                      value={newDocument.description}
                      onChange={(e) => setNewDocument({ ...newDocument, description: e.target.value })}
                      placeholder="Brief description of the document..."
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      onClick={addDocument}
                      disabled={!newDocument.title.trim()}
                      className="flex-1"
                    >
                      Add Document
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setIsAddingDoc(false)}
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
      <CardContent>
        {documents.length > 0 ? (
          <div className="space-y-3">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex-shrink-0 mt-1">
                  {getDocumentIcon(doc.document_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h4 className="font-medium line-clamp-1">{doc.title}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={getDocumentTypeColor(doc.document_type)} variant="secondary">
                          {doc.document_type.replace('_', ' ')}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Added by {doc.creator_name} • {new Date(doc.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {doc.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {doc.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {doc.url && (
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                        >
                          <a href={doc.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                      {user && user.id === doc.created_by && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteDocument(doc.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground mb-4">No documents attached yet</p>
            {user && (
              <Button variant="outline" onClick={() => setIsAddingDoc(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Document
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DocumentManager;