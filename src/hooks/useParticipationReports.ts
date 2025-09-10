import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ParticipationData {
  user_name: string;
  joined_at: string;
  left_at: string | null;
  duration: string;
  is_host: boolean;
}

export const useParticipationReports = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const formatDuration = (intervalString: string) => {
    // Parse PostgreSQL interval format (e.g., "01:23:45" or "2 days 01:23:45")
    const match = intervalString.match(/(?:(\d+) days?\s+)?(\d{2}):(\d{2}):(\d{2})/);
    if (!match) return intervalString;
    
    const [, days, hours, minutes, seconds] = match;
    const totalHours = (parseInt(days || '0') * 24) + parseInt(hours);
    
    if (totalHours > 0) {
      return `${totalHours}h ${minutes}m ${seconds}s`;
    } else {
      return `${minutes}m ${seconds}s`;
    }
  };

  const generateParticipationReport = async (meetingId: string, meetingTitle?: string) => {
    try {
      setIsGenerating(true);

      // Fetch participation data using the duration calculation function
      const { data: participationData, error } = await supabase
        .from('meeting_participants')
        .select(`
          user_name,
          joined_at,
          left_at,
          is_host,
          calculate_participation_duration(joined_at, left_at) as duration
        `)
        .eq('meeting_id', meetingId)
        .order('joined_at', { ascending: true });

      if (error) {
        throw error;
      }

      if (!participationData || participationData.length === 0) {
        toast({
          title: "No Data",
          description: "No participation data found for this meeting.",
          variant: "destructive"
        });
        return;
      }

      // Create PDF
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(20);
      doc.text('Meeting Participation Report', 20, 20);
      
      // Add meeting info
      doc.setFontSize(12);
      doc.text(`Meeting: ${meetingTitle || meetingId}`, 20, 35);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 45);
      doc.text(`Total Participants: ${participationData.length}`, 20, 55);

      // Prepare table data
      const tableData = participationData.map((participant: any) => [
        participant.user_name,
        participant.is_host ? 'Host' : 'Participant',
        new Date(participant.joined_at).toLocaleString(),
        participant.left_at ? new Date(participant.left_at).toLocaleString() : 'Still in meeting',
        formatDuration(participant.duration || '00:00:00')
      ]);

      // Add table
      autoTable(doc, {
        head: [['Name', 'Role', 'Joined At', 'Left At', 'Duration']],
        body: tableData,
        startY: 70,
        styles: {
          fontSize: 10,
          cellPadding: 3,
        },
        headStyles: {
          fillColor: [59, 130, 246], // blue-500
          textColor: 255,
        },
        alternateRowStyles: {
          fillColor: [249, 250, 251], // gray-50
        },
      });

      // Add summary statistics
      const totalDurations = participationData.map((p: any) => {
        const match = (p.duration || '00:00:00').match(/(?:(\d+) days?\s+)?(\d{2}):(\d{2}):(\d{2})/);
        if (!match) return 0;
        const [, days, hours, minutes, seconds] = match;
        return (parseInt(days || '0') * 24 * 60 * 60) + 
               (parseInt(hours) * 60 * 60) + 
               (parseInt(minutes) * 60) + 
               parseInt(seconds);
      });

      const avgDuration = totalDurations.reduce((a, b) => a + b, 0) / totalDurations.length;
      const maxDuration = Math.max(...totalDurations);
      const minDuration = Math.min(...totalDurations);

      const formatSeconds = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return hours > 0 ? `${hours}h ${mins}m ${secs}s` : `${mins}m ${secs}s`;
      };

      // Add summary at the bottom
      const finalY = (doc as any).lastAutoTable.finalY + 20;
      doc.setFontSize(12);
      doc.text('Summary Statistics:', 20, finalY);
      doc.setFontSize(10);
      doc.text(`Average Duration: ${formatSeconds(Math.round(avgDuration))}`, 20, finalY + 10);
      doc.text(`Longest Duration: ${formatSeconds(maxDuration)}`, 20, finalY + 20);
      doc.text(`Shortest Duration: ${formatSeconds(minDuration)}`, 20, finalY + 30);

      // Generate filename
      const fileName = `meeting-report-${meetingId}-${new Date().toISOString().split('T')[0]}.pdf`;
      
      // Download the PDF
      doc.save(fileName);

      toast({
        title: "Report Generated",
        description: `Participation report downloaded as ${fileName}`,
      });

    } catch (error) {
      console.error('Error generating participation report:', error);
      toast({
        title: "Error",
        description: "Failed to generate participation report. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    generateParticipationReport,
    isGenerating
  };
};