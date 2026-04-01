import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface RecordingData {
  id: string;
  meeting_id: string;
  file_path: string;
  host_id: string;
  status: 'recording' | 'completed' | 'failed';
  started_at: string;
  ended_at?: string;
  duration_seconds?: number;
}

export const useMeetingRecording = (meetingId: string, isHost: boolean) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingData, setRecordingData] = useState<RecordingData | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();

  const startRecording = useCallback(async () => {
    if (!isHost) {
      toast({
        title: "Access Denied",
        description: "Only the host can start recording",
        variant: "destructive"
      });
      return;
    }

    try {
      // Get the video elements from the page
      const videoElements = document.querySelectorAll('video');
      if (videoElements.length === 0) {
        throw new Error('No video streams found to record');
      }

      // Create a canvas to combine multiple video streams
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }

      canvas.width = 1280;
      canvas.height = 720;

      // Start recording the canvas
      const canvasStream = canvas.captureStream(30);
      
      // Get audio from the first video element that has audio
      let audioStream: MediaStream | null = null;
      for (const video of videoElements) {
        const stream = (video as any).srcObject as MediaStream;
        if (stream && stream.getAudioTracks().length > 0) {
          audioStream = stream;
          break;
        }
      }

      // Combine video and audio streams
      const combinedStream = new MediaStream();
      canvasStream.getVideoTracks().forEach(track => combinedStream.addTrack(track));
      if (audioStream) {
        audioStream.getAudioTracks().forEach(track => combinedStream.addTrack(track));
      }

      // Set up MediaRecorder
      const mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType: 'video/webm;codecs=vp9'
      });

      recordedChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        await handleRecordingStop();
      };

      // Create recording record in database
      const { data: recording, error } = await supabase
        .from('meeting_recordings')
        .insert({
          meeting_id: meetingId,
          host_id: (await supabase.auth.getUser()).data.user?.id,
          file_path: '', // Will be updated after upload
          status: 'recording'
        })
        .select()
        .single();

      if (error) throw error;

      setRecordingData(recording as RecordingData);
      mediaRecorderRef.current = mediaRecorder;
      
      // Start the recording process
      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);

      // Animate the canvas with video streams
      const drawFrame = () => {
        if (!isRecording) return;

        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw video streams in a grid
        const videos = Array.from(videoElements).filter(v => 
          v.srcObject && (v.srcObject as MediaStream).getVideoTracks().length > 0
        );
        
        const cols = Math.ceil(Math.sqrt(videos.length));
        const rows = Math.ceil(videos.length / cols);
        const cellWidth = canvas.width / cols;
        const cellHeight = canvas.height / rows;

        videos.forEach((video, index) => {
          const row = Math.floor(index / cols);
          const col = index % cols;
          const x = col * cellWidth;
          const y = row * cellHeight;

          try {
            ctx.drawImage(video, x, y, cellWidth, cellHeight);
          } catch (e) {
            // Skip if video is not ready
          }
        });

        requestAnimationFrame(drawFrame);
      };

      drawFrame();

      toast({
        title: "Recording Started",
        description: "Meeting recording has begun"
      });

    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Recording Failed",
        description: error instanceof Error ? error.message : "Failed to start recording",
        variant: "destructive"
      });
      setIsRecording(false);
    }
  }, [meetingId, isHost, toast]);

  const stopRecording = useCallback(async () => {
    if (!mediaRecorderRef.current || !isRecording) return;

    mediaRecorderRef.current.stop();
    setIsRecording(false);

    toast({
      title: "Recording Stopped",
      description: "Processing and uploading recording..."
    });
  }, [isRecording, toast]);

  const handleRecordingStop = useCallback(async () => {
    if (!recordingData || recordedChunksRef.current.length === 0) return;

    try {
      // Create blob from recorded chunks
      const blob = new Blob(recordedChunksRef.current, {
        type: 'video/webm'
      });

      // Upload to Supabase storage
      const fileName = `${recordingData.id}_${Date.now()}.webm`;
      const filePath = `${recordingData.host_id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('meeting-recordings')
        .upload(filePath, blob);

      if (uploadError) throw uploadError;

      // Calculate expiration time (36 hours from now)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 36);

      // Update recording record
      const { error: updateError } = await supabase
        .from('meeting_recordings')
        .update({
          file_path: filePath,
          status: 'completed',
          ended_at: new Date().toISOString(),
          file_size: blob.size,
          duration_seconds: Math.floor((Date.now() - new Date(recordingData.started_at).getTime()) / 1000),
          expires_at: expiresAt.toISOString()
        })
        .eq('id', recordingData.id);

      if (updateError) throw updateError;

      // Since it's saved locally, trigger an automatic download for the host
      // so they can retrieve it right away before the server deletes it after 36h
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      document.body.appendChild(a);
      a.style.display = 'none';
      a.href = url;
      a.download = `Meeting_Recording_${meetingId}_${Date.now()}.webm`;
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Recording Complete",
        description: "Recording has been saved and downloaded successfully. It will expire from the server in 36 hours."
      });

      setRecordingData(null);

    } catch (error) {
      console.error('Error processing recording:', error);
      
      if (recordingData) {
        await supabase
          .from('meeting_recordings')
          .update({ status: 'failed' })
          .eq('id', recordingData.id);
      }

      toast({
        title: "Recording Error",
        description: error instanceof Error ? error.message : "Failed to save recording",
        variant: "destructive"
      });
    }
  }, [recordingData, toast]);

  return {
    isRecording,
    recordingData,
    startRecording,
    stopRecording
  };
};