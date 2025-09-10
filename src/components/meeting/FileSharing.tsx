import React, { useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  FileText, 
  Image, 
  Download, 
  Trash2, 
  File,
  FileSpreadsheet,
  FileImage,
  Clock
} from 'lucide-react';
import { useFileSharing } from '@/hooks/useFileSharing';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';

interface FileSharingProps {
  meetingId: string;
  isHost?: boolean;
}

export const FileSharing = ({ meetingId, isHost = false }: FileSharingProps) => {
  const { user } = useAuth();
  const { files, loading, uploading, uploadFile, downloadFile, deleteFile } = useFileSharing(meetingId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      Array.from(selectedFiles).forEach(file => {
        uploadFile(file);
      });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      Array.from(droppedFiles).forEach(file => {
        uploadFile(file);
      });
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <FileImage className="h-4 w-4 text-blue-400" />;
    if (fileType.includes('pdf')) return <FileText className="h-4 w-4 text-red-400" />;
    if (fileType.includes('spreadsheet') || fileType.includes('excel')) return <FileSpreadsheet className="h-4 w-4 text-green-400" />;
    return <File className="h-4 w-4 text-slate-400" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const canDelete = (file: any) => {
    return user && (file.uploaded_by === user.id || isHost);
  };

  return (
    <Card className="h-full bg-white/5 border-white/10 backdrop-blur-lg">
      <CardHeader className="pb-3">
        <CardTitle className="text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Upload className="h-5 w-5 text-green-400" />
            <span>Shared Files</span>
          </div>
          <Badge variant="secondary" className="bg-green-500/20 text-green-300">
            {files.length}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* File Upload Area */}
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200 cursor-pointer ${
            dragOver
              ? 'border-green-400 bg-green-400/10'
              : 'border-white/20 hover:border-white/40 hover:bg-white/5'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-8 w-8 text-green-400 mx-auto mb-2" />
          <p className="text-white text-sm font-medium mb-1">
            {uploading ? 'Uploading...' : 'Drop files here or click to browse'}
          </p>
          <p className="text-slate-400 text-xs">
            Supports images, documents, and spreadsheets (max 50MB)
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
          />
        </div>

        {/* Files List */}
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {loading && files.length === 0 ? (
            <div className="text-center py-4">
              <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-slate-400 text-sm">Loading files...</p>
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-slate-400 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">No files shared yet</p>
              <p className="text-slate-500 text-xs mt-1">
                Upload files to share with all participants
              </p>
            </div>
          ) : (
            files.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-200"
              >
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  {getFileIcon(file.file_type)}
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-sm font-medium truncate">
                      {file.file_name}
                    </p>
                    <div className="flex items-center space-x-2 text-xs text-slate-400">
                      <span>{formatFileSize(file.file_size)}</span>
                      <span>•</span>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>
                          {formatDistanceToNow(new Date(file.uploaded_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Button
                    onClick={() => downloadFile(file)}
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                  >
                    <Download className="h-3 w-3" />
                  </Button>
                  {canDelete(file) && (
                    <Button
                      onClick={() => deleteFile(file.id)}
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};