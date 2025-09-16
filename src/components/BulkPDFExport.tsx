import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';

interface Idea {
  id: string;
  title: string;
  status: string;
  created_at: string;
}

interface BulkPDFExportProps {
  ideas: Idea[];
  selectedGroupName?: string;
}

const BulkPDFExport: React.FC<BulkPDFExportProps> = ({ ideas, selectedGroupName }) => {
  const { isAdmin } = useAuth();
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  // Don't show the export button if user is not admin
  if (!isAdmin) {
    return null;
  }

  const generateBulkPDF = async () => {
    if (ideas.length === 0) {
      toast({
        title: "No Ideas to Export",
        description: "There are no ideas to export.",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);
    
    try {
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      let yPosition = 20;
      const margin = 20;
      const lineHeight = 7;
      const maxWidth = pageWidth - (margin * 2);

      // Helper function to add text with word wrapping
      const addText = (text: string, fontSize: number = 10, isBold: boolean = false) => {
        pdf.setFontSize(fontSize);
        if (isBold) {
          pdf.setFont('helvetica', 'bold');
        } else {
          pdf.setFont('helvetica', 'normal');
        }
        
        const lines = pdf.splitTextToSize(text, maxWidth);
        
        for (const line of lines) {
          if (yPosition > pageHeight - 20) {
            pdf.addPage();
            yPosition = 20;
          }
          pdf.text(line, margin, yPosition);
          yPosition += lineHeight;
        }
        yPosition += 3; // Add some spacing
      };

      // Helper function to add a section header
      const addSectionHeader = (title: string) => {
        yPosition += 5;
        addText(title, 14, true);
        yPosition += 2;
      };

      // Header
      pdf.setFillColor(41, 128, 185);
      pdf.rect(0, 0, pageWidth, 15, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('IdeaFlow - Bulk Ideas Export Report', margin, 12);
      
      pdf.setTextColor(0, 0, 0);
      yPosition = 25;

      // Export Summary
      addSectionHeader('📊 EXPORT SUMMARY');
      addText(`Total Ideas: ${ideas.length}`, 12, true);
      if (selectedGroupName) {
        addText(`Group: ${selectedGroupName}`, 10);
      }
      addText(`Export Date: ${new Date().toLocaleDateString()}`, 10);
      addText(`Export Time: ${new Date().toLocaleTimeString()}`, 10);

      // Status Summary
      const statusCounts = ideas.reduce((acc, idea) => {
        acc[idea.status] = (acc[idea.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      addSectionHeader('📈 STATUS BREAKDOWN');
      Object.entries(statusCounts).forEach(([status, count]) => {
        const percentage = ((count / ideas.length) * 100).toFixed(1);
        addText(`${status.toUpperCase()}: ${count} ideas (${percentage}%)`, 10);
      });

      // Ideas List
      addSectionHeader('📋 IDEAS LIST');
      
      for (let i = 0; i < ideas.length; i++) {
        const idea = ideas[i];
        
        // Fetch detailed data for each idea
        const ideaData = await fetchIdeaData(idea.id);
        
        addText(`${i + 1}. ${idea.title}`, 12, true);
        addText(`   Status: ${idea.status.toUpperCase()}`, 10);
        addText(`   Created: ${new Date(idea.created_at).toLocaleDateString()}`, 10);
        addText(`   Submitted by: ${ideaData.submitter_name}`, 10);
        
        if (ideaData.evaluations && ideaData.evaluations.length > 0) {
          const avgRating = ideaData.evaluations.reduce((sum, evaluation) => sum + evaluation.rating, 0) / ideaData.evaluations.length;
          addText(`   Average Rating: ${avgRating.toFixed(1)}/5 (${ideaData.evaluations.length} evaluations)`, 10);
        }
        
        if (ideaData.votes && ideaData.votes.length > 0) {
          const yesVotes = ideaData.votes.filter(v => v.vote).length;
          const totalVotes = ideaData.votes.length;
          addText(`   Votes: ${yesVotes}/${totalVotes} YES (${((yesVotes/totalVotes)*100).toFixed(1)}%)`, 10);
        }
        
        if (ideaData.comments && ideaData.comments.length > 0) {
          addText(`   Comments: ${ideaData.comments.length}`, 10);
        }
        
        if (ideaData.documents && ideaData.documents.length > 0) {
          addText(`   Documents: ${ideaData.documents.length}`, 10);
        }
        
        yPosition += 5;
        
        // Add description (truncated)
        if (ideaData.description) {
          const truncatedDesc = ideaData.description.length > 200 
            ? ideaData.description.substring(0, 200) + '...' 
            : ideaData.description;
          addText(`   Description: ${truncatedDesc}`, 9);
        }
        
        yPosition += 8;
      }

      // Footer
      const footerY = pageHeight - 10;
      pdf.setFontSize(8);
      pdf.setTextColor(128, 128, 128);
      pdf.text(`Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, margin, footerY);
      pdf.text('IdeaFlow Platform - Admin Bulk Export', pageWidth - margin - 80, footerY);

      // Download the PDF
      const fileName = `ideas-bulk-export-${selectedGroupName ? selectedGroupName.replace(/[^a-zA-Z0-9]/g, '-') : 'all'}-${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);

      toast({
        title: "Bulk PDF Export Complete",
        description: `Successfully exported ${ideas.length} ideas to ${fileName}`,
      });

    } catch (error: any) {
      console.error('Bulk PDF export error:', error);
      toast({
        title: "Export Failed",
        description: error.message || "Failed to generate bulk PDF export",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const fetchIdeaData = async (ideaId: string) => {
    // Fetch idea details
    const { data: ideaData, error: ideaError } = await supabase
      .from('ideas')
      .select(`
        *,
        profiles!ideas_submitted_by_fkey(name)
      `)
      .eq('id', ideaId)
      .single();

    if (ideaError) throw ideaError;

    // Fetch evaluations count
    const { count: evaluationsCount } = await supabase
      .from('evaluations')
      .select('*', { count: 'exact', head: true })
      .eq('idea_id', ideaId);

    // Fetch votes count
    const { count: votesCount } = await supabase
      .from('votes')
      .select('*', { count: 'exact', head: true })
      .eq('idea_id', ideaId);

    // Fetch comments count
    const { count: commentsCount } = await supabase
      .from('comments')
      .select('*', { count: 'exact', head: true })
      .eq('idea_id', ideaId);

    // Fetch documents count
    const { count: documentsCount } = await supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .eq('idea_id', ideaId);

    // Fetch evaluations for rating calculation
    const { data: evaluationsData } = await supabase
      .from('evaluations')
      .select('rating')
      .eq('idea_id', ideaId);

    // Fetch votes for vote calculation
    const { data: votesData } = await supabase
      .from('votes')
      .select('vote')
      .eq('idea_id', ideaId);

    return {
      ...ideaData,
      submitter_name: ideaData.profiles?.name,
      evaluations: evaluationsData || [],
      votes: votesData || [],
      comments: Array(commentsCount || 0),
      documents: Array(documentsCount || 0)
    };
  };

  return (
    <Button
      onClick={generateBulkPDF}
      disabled={isExporting || ideas.length === 0}
      variant="outline"
      size="sm"
      className="gap-2"
    >
      {isExporting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}
      {isExporting ? 'Generating PDF...' : `Export All (${ideas.length})`}
    </Button>
  );
};

export default BulkPDFExport;
