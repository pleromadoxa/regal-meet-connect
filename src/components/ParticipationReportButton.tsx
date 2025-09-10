import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, FileText } from 'lucide-react';
import { useParticipationReports } from '@/hooks/useParticipationReports';

interface ParticipationReportButtonProps {
  meetingId: string;
  meetingTitle?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
  className?: string;
}

export const ParticipationReportButton = ({
  meetingId,
  meetingTitle,
  variant = "outline",
  size = "sm",
  className = ""
}: ParticipationReportButtonProps) => {
  const { generateParticipationReport, isGenerating } = useParticipationReports();

  const handleDownload = () => {
    generateParticipationReport(meetingId, meetingTitle);
  };

  return (
    <Button
      onClick={handleDownload}
      disabled={isGenerating}
      variant={variant}
      size={size}
      className={`flex items-center gap-2 ${className}`}
    >
      {isGenerating ? (
        <>
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <FileText className="w-4 h-4" />
          <Download className="w-4 h-4" />
          PDF Report
        </>
      )}
    </Button>
  );
};