import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, FileText, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';

interface IdeaData {
  id: string;
  title: string;
  description: string;
  sector: string;
  status: string;
  created_at: string;
  updated_at: string;
  submitter_name: string;
  ai_summary?: string;
  group_name?: string;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  commenter_name: string;
}

interface Evaluation {
  id: string;
  rating: number;
  market_size?: number;
  feasibility?: number;
  strategic_fit?: number;
  novelty?: number;
  investment_required?: number;
  risk_level?: number;
  time_to_market?: number;
  comments?: string;
  created_at: string;
  evaluator_name: string;
}

interface Vote {
  id: string;
  vote: boolean;
  created_at: string;
  voter_name: string;
}

interface Document {
  id: string;
  title: string;
  url: string;
  type: string;
  created_at: string;
}

interface PDFExportProps {
  ideaId: string;
}

const IdeaPDFExport: React.FC<PDFExportProps> = ({ ideaId }) => {
  const { isAdmin } = useAuth();
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  // Don't show the export button if user is not admin
  if (!isAdmin) {
    return null;
  }

  const generatePDF = async () => {
    setIsExporting(true);
    
    try {
      // Fetch all idea data
      const ideaData = await fetchIdeaData();
      
      // Create PDF
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
      pdf.text('IdeaFlow - Idea Export Report', margin, 12);
      
      pdf.setTextColor(0, 0, 0);
      yPosition = 25;

      // Idea Basic Information
      addSectionHeader('📋 IDEA OVERVIEW');
      addText(`Title: ${ideaData.title}`, 12, true);
      addText(`Status: ${ideaData.status.toUpperCase()}`, 10);
      addText(`Sector: ${ideaData.sector}`, 10);
      addText(`Submitted by: ${ideaData.submitter_name}`, 10);
      addText(`Created: ${new Date(ideaData.created_at).toLocaleDateString()}`, 10);
      addText(`Last Updated: ${new Date(ideaData.updated_at).toLocaleDateString()}`, 10);
      if (ideaData.group_name) {
        addText(`Group: ${ideaData.group_name}`, 10);
      }

      // Description
      addSectionHeader('📝 DESCRIPTION');
      addText(ideaData.description, 10);

      // AI Summary (if available)
      if (ideaData.ai_summary) {
        addSectionHeader('🤖 AI SUMMARY');
        addText(ideaData.ai_summary, 10);
      }

      // Evaluations Summary
      if (ideaData.evaluations && ideaData.evaluations.length > 0) {
        addSectionHeader('📊 EVALUATIONS SUMMARY');
        
        // Calculate averages
        const avgRating = ideaData.evaluations.reduce((sum, evaluation) => sum + evaluation.rating, 0) / ideaData.evaluations.length;
        const avgMarketSize = ideaData.evaluations.filter(e => e.market_size).reduce((sum, evaluation) => sum + (evaluation.market_size || 0), 0) / ideaData.evaluations.filter(e => e.market_size).length;
        const avgFeasibility = ideaData.evaluations.filter(e => e.feasibility).reduce((sum, evaluation) => sum + (evaluation.feasibility || 0), 0) / ideaData.evaluations.filter(e => e.feasibility).length;
        
        addText(`Total Evaluations: ${ideaData.evaluations.length}`, 10, true);
        addText(`Average Rating: ${avgRating.toFixed(1)}/5`, 10);
        if (!isNaN(avgMarketSize)) addText(`Average Market Size Score: ${avgMarketSize.toFixed(1)}/5`, 10);
        if (!isNaN(avgFeasibility)) addText(`Average Feasibility Score: ${avgFeasibility.toFixed(1)}/5`, 10);

        // Individual evaluations
        addText('Individual Evaluations:', 10, true);
        ideaData.evaluations.forEach((evaluation, index) => {
          addText(`${index + 1}. ${evaluation.evaluator_name} (${new Date(evaluation.created_at).toLocaleDateString()})`, 9);
          addText(`   Rating: ${evaluation.rating}/5`, 9);
          if (evaluation.market_size) addText(`   Market Size: ${evaluation.market_size}/5`, 9);
          if (evaluation.feasibility) addText(`   Feasibility: ${evaluation.feasibility}/5`, 9);
          if (evaluation.strategic_fit) addText(`   Strategic Fit: ${evaluation.strategic_fit}/5`, 9);
          if (evaluation.novelty) addText(`   Novelty: ${evaluation.novelty}/5`, 9);
          if (evaluation.investment_required) addText(`   Investment Required: $${evaluation.investment_required.toLocaleString()}`, 9);
          if (evaluation.risk_level) addText(`   Risk Level: ${evaluation.risk_level}/5`, 9);
          if (evaluation.time_to_market) addText(`   Time to Market: ${evaluation.time_to_market} months`, 9);
          if (evaluation.comments) addText(`   Comments: ${evaluation.comments}`, 9);
          yPosition += 2;
        });
      }

      // Votes Summary
      if (ideaData.votes && ideaData.votes.length > 0) {
        addSectionHeader('🗳️ VOTES SUMMARY');
        const yesVotes = ideaData.votes.filter(v => v.vote).length;
        const noVotes = ideaData.votes.filter(v => !v.vote).length;
        const totalVotes = ideaData.votes.length;
        
        addText(`Total Votes: ${totalVotes}`, 10, true);
        addText(`Yes: ${yesVotes} (${((yesVotes/totalVotes)*100).toFixed(1)}%)`, 10);
        addText(`No: ${noVotes} (${((noVotes/totalVotes)*100).toFixed(1)}%)`, 10);
        
        addText('Individual Votes:', 10, true);
        ideaData.votes.forEach((vote, index) => {
          addText(`${index + 1}. ${vote.voter_name}: ${vote.vote ? 'YES' : 'NO'} (${new Date(vote.created_at).toLocaleDateString()})`, 9);
        });
      }

      // Comments
      if (ideaData.comments && ideaData.comments.length > 0) {
        addSectionHeader('💬 COMMENTS & DISCUSSIONS');
        ideaData.comments.forEach((comment, index) => {
          addText(`${index + 1}. ${comment.commenter_name} (${new Date(comment.created_at).toLocaleDateString()})`, 10, true);
          addText(comment.content, 9);
          yPosition += 3;
        });
      }

      // Documents
      if (ideaData.documents && ideaData.documents.length > 0) {
        addSectionHeader('📎 ATTACHED DOCUMENTS');
        ideaData.documents.forEach((doc, index) => {
          addText(`${index + 1}. ${doc.title}`, 10, true);
          addText(`   Type: ${doc.type}`, 9);
          addText(`   URL: ${doc.url}`, 9);
          addText(`   Added: ${new Date(doc.created_at).toLocaleDateString()}`, 9);
          yPosition += 2;
        });
      }

      // Footer
      const footerY = pageHeight - 10;
      pdf.setFontSize(8);
      pdf.setTextColor(128, 128, 128);
      pdf.text(`Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, margin, footerY);
      pdf.text('IdeaFlow Platform - Admin Export', pageWidth - margin - 60, footerY);

      // Download the PDF
      const fileName = `idea-export-${ideaData.title.replace(/[^a-zA-Z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);

      toast({
        title: "PDF Export Complete",
        description: `Successfully exported idea data to ${fileName}`,
      });

    } catch (error: any) {
      console.error('PDF export error:', error);
      toast({
        title: "Export Failed",
        description: error.message || "Failed to generate PDF export",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const fetchIdeaData = async () => {
    // Fetch idea details
    const { data: ideaData, error: ideaError } = await supabase
      .from('ideas')
      .select(`
        *,
        profiles!ideas_submitted_by_fkey(name),
        groups(name)
      `)
      .eq('id', ideaId)
      .single();

    if (ideaError) throw ideaError;

    // Fetch comments
    const { data: commentsData } = await supabase
      .from('comments')
      .select(`
        *,
        profiles!comments_user_id_fkey(name)
      `)
      .eq('idea_id', ideaId)
      .order('created_at', { ascending: true });

    // Fetch evaluations
    const { data: evaluationsData } = await supabase
      .from('evaluations')
      .select(`
        *,
        profiles!evaluations_evaluator_id_fkey(name)
      `)
      .eq('idea_id', ideaId);

    // Fetch votes
    const { data: votesData } = await supabase
      .from('votes')
      .select(`
        *,
        profiles!votes_user_id_fkey(name)
      `)
      .eq('idea_id', ideaId);

    // Fetch documents
    const { data: documentsData } = await supabase
      .from('documents')
      .select('*')
      .eq('idea_id', ideaId);

    return {
      ...ideaData,
      submitter_name: ideaData.profiles?.name,
      group_name: ideaData.groups?.name,
      comments: (commentsData || []).map(comment => ({
        ...comment,
        commenter_name: comment.profiles?.name
      })),
      evaluations: (evaluationsData || []).map(evaluation => ({
        ...evaluation,
        evaluator_name: evaluation.profiles?.name
      })),
      votes: (votesData || []).map(vote => ({
        ...vote,
        voter_name: vote.profiles?.name
      })),
      documents: documentsData || []
    };
  };

  return (
    <Button
      onClick={generatePDF}
      disabled={isExporting}
      variant="outline"
      size="sm"
      className="gap-2"
    >
      {isExporting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}
      {isExporting ? 'Generating PDF...' : 'Export PDF'}
    </Button>
  );
};

export default IdeaPDFExport;
