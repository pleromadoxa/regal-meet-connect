import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface SharedFile {
  id: string;
  meeting_id: string;
  uploaded_by: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  uploaded_at: string;
  is_visible: boolean;
}

export const useFileSharing = (meetingId: string) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [files, setFiles] = useState<SharedFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Fetch shared files for the meeting
  const fetchFiles = useCallback(async () => {
    if (!meetingId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('meeting_file_shares')
        .select('*')
        .eq('meeting_id', meetingId)
        .eq('is_visible', true)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setFiles(data || []);
    } catch (error) {
      console.error('Error fetching files:', error);
      toast({
        title: "Error",
        description: "Failed to load shared files",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [meetingId, toast]);

  // Upload file to meeting
  const uploadFile = useCallback(async (file: File) => {
    if (!user || !meetingId) return null;

    // Validate file size (50MB limit)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "Please select a file smaller than 50MB",
        variant: "destructive"
      });
      return null;
    }

    try {
      setUploading(true);

      // Generate unique file path: userId/meetingId/timestamp-filename
      const timestamp = Date.now();
      const fileName = `${timestamp}-${file.name}`;
      const filePath = `${user.id}/${meetingId}/${fileName}`;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('meeting-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Save file metadata to database
      const fileRecord = {
        meeting_id: meetingId,
        uploaded_by: user.id,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        file_type: file.type
      };

      const { data, error: dbError } = await supabase
        .from('meeting_file_shares')
        .insert(fileRecord)
        .select()
        .single();

      if (dbError) throw dbError;

      toast({
        title: "File uploaded",
        description: `${file.name} has been shared with the meeting`
      });

      // Refresh files list
      fetchFiles();
      return data;
    } catch (error: any) {
      console.error('Error uploading file:', error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload file",
        variant: "destructive"
      });
      return null;
    } finally {
      setUploading(false);
    }
  }, [user, meetingId, toast, fetchFiles]);

  // Download file
  const downloadFile = useCallback(async (file: SharedFile) => {
    try {
      const { data, error } = await supabase.storage
        .from('meeting-files')
        .download(file.file_path);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Download started",
        description: `Downloading ${file.file_name}`
      });
    } catch (error: any) {
      console.error('Error downloading file:', error);
      toast({
        title: "Download failed",
        description: error.message || "Failed to download file",
        variant: "destructive"
      });
    }
  }, [toast]);

  // Delete file (only by uploader)
  const deleteFile = useCallback(async (fileId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('meeting_file_shares')
        .delete()
        .eq('id', fileId)
        .eq('uploaded_by', user.id);

      if (error) throw error;

      toast({
        title: "File deleted",
        description: "File has been removed from the meeting"
      });

      // Refresh files list
      fetchFiles();
    } catch (error: any) {
      console.error('Error deleting file:', error);
      toast({
        title: "Delete failed", 
        description: error.message || "Failed to delete file",
        variant: "destructive"
      });
    }
  }, [user, toast, fetchFiles]);

  // Get file URL for preview
  const getFileUrl = useCallback(async (filePath: string) => {
    try {
      const { data } = await supabase.storage
        .from('meeting-files')
        .createSignedUrl(filePath, 3600); // 1 hour expiry

      return data?.signedUrl || null;
    } catch (error) {
      console.error('Error getting file URL:', error);
      return null;
    }
  }, []);

  // Set up real-time subscription for new files
  useEffect(() => {
    if (!meetingId) return;

    const channel = supabase
      .channel(`meeting-files-${meetingId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meeting_file_shares',
          filter: `meeting_id=eq.${meetingId}`
        },
        () => {
          // Refresh files when changes occur
          fetchFiles();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [meetingId, fetchFiles]);

  // Initial fetch
  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  return {
    files,
    loading,
    uploading,
    uploadFile,
    downloadFile,
    deleteFile,
    getFileUrl,
    fetchFiles
  };
};