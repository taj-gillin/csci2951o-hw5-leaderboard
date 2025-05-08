import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { parseLogEntries } from '@/utils/logParser';
import { parseLeaderboardHtmlToUnifiedData } from '@/utils/leaderboardParser';
import { UnifiedDataItem } from '@/types/unified';
import { toast } from 'sonner';
import { FaUpload, FaFileAlt, FaFileCode, FaTimes, FaCheck, FaSpinner } from 'react-icons/fa';

interface UploadedSource {
  file: File;
  status: 'pending' | 'parsing' | 'success' | 'error';
  type: 'log' | 'html' | 'unknown';
  data: UnifiedDataItem[];
  errorMessage?: string;
}

interface CombinedFileUploaderProps {
  onDataUpdate: (data: UnifiedDataItem[]) => void;
  onDataCleared: (sourceNameToClear?: string) => void;
}

export default function CombinedFileUploader({ onDataUpdate, onDataCleared }: CombinedFileUploaderProps) {
  const [sources, setSources] = useState<Map<string, UploadedSource>>(new Map());
  
  const processFile = async (file: File): Promise<UploadedSource> => {
    const sourceName = file.name;
    let type: 'log' | 'html' | 'unknown' = 'unknown';
    let data: UnifiedDataItem[] = [];
    let errorMessage: string | undefined = undefined;

    if (sourceName.endsWith('.log')) {
      type = 'log';
      try {
        const content = await file.text();
        data = parseLogEntries(content, sourceName);
        if (data.length === 0) {
          errorMessage = "No valid entries found";
        }
      } catch (error) {
        errorMessage = `Failed to parse: ${error instanceof Error ? error.message : String(error)}`;
      }
    } else if (sourceName.endsWith('.html') || sourceName.endsWith('.htm')) {
      type = 'html';
      try {
        const content = await file.text();
        data = parseLeaderboardHtmlToUnifiedData(content, sourceName);
        if (data.length === 0) {
          errorMessage = "No valid leaderboard data found";
        }
      } catch (error) {
        errorMessage = `Failed to parse: ${error instanceof Error ? error.message : String(error)}`;
      }
    } else {
      errorMessage = "Unsupported file type";
    }

    return {
      file,
      type,
      status: errorMessage ? 'error' : 'success',
      data,
      errorMessage
    };
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const newSources = new Map(sources);
    let newDataItems: UnifiedDataItem[] = [];
    let filesProcessed = 0;
    let filesErrored = 0;

    const processingPromises = acceptedFiles.map(async file => {
      if (newSources.has(file.name)) {
        toast.info(`File "${file.name}" is already uploaded. Remove it first to re-upload.`);
        return;
      }

      // Set status to parsing immediately
      newSources.set(file.name, {
        file: file,
        status: 'parsing',
        type: 'unknown',
        data: []
      });
      setSources(new Map(newSources)); // Update UI to show parsing status

      const processedSource = await processFile(file);
      newSources.set(file.name, processedSource);

      if (processedSource.status === 'success') {
        newDataItems = [...newDataItems, ...processedSource.data];
        filesProcessed++;
      } else {
        filesErrored++;
        toast.error(`Error processing "${file.name}": ${processedSource.errorMessage}`);
      }
    });

    await Promise.all(processingPromises);

    setSources(new Map(newSources)); // Final update with success/error status
    if (newDataItems.length > 0) {
      onDataUpdate(newDataItems); // Pass only the newly added data
      toast.success(`Successfully processed ${filesProcessed} file(s).`);
    }
    if (filesErrored > 0) {
      toast.warning(`${filesErrored} file(s) could not be processed.`);
    }
    if (filesProcessed === 0 && filesErrored === 0 && acceptedFiles.length > 0) {
       toast.info("No new valid files selected or files already uploaded.");
    }

  }, [sources, onDataUpdate]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/plain': ['.log'],
      'text/html': ['.html', '.htm'],
    }
  });

  const removeFile = (fileName: string) => {
    const newSources = new Map(sources);
    if (newSources.delete(fileName)) {
      setSources(newSources);
      onDataCleared(fileName); // Notify parent to remove data associated with this source
      toast.info(`Removed "${fileName}"`);
    }
  };

  const clearAllFiles = () => {
    setSources(new Map());
    onDataCleared(); // Notify parent to clear all data
    toast.info('All uploaded files cleared');
  };

  const sortedSources = Array.from(sources.values()).sort((a, b) => a.file.name.localeCompare(b.file.name));

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive ? 'border-primary bg-primary/10' : 'border-muted-foreground/20 hover:border-primary/50'
            }`}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center space-y-4">
              <FaUpload className="h-10 w-10 text-muted-foreground" />
              <div>
                <p className="font-medium">
                  {isDragActive ? 'Drop files here' : 'Drag & drop .log or .html files here'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  or click to select files
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {sources.size > 0 && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Uploaded Data Sources ({sources.size})</h3>
            <Button variant="outline" size="sm" onClick={clearAllFiles}>
              Clear All
            </Button>
          </div>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {sortedSources.map((source) => (
              <Card key={source.file.name} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-3">
                       {source.type === 'log' ? <FaFileAlt className="h-5 w-5 text-blue-500 flex-shrink-0" /> : 
                        source.type === 'html' ? <FaFileCode className="h-5 w-5 text-orange-500 flex-shrink-0" /> : 
                        <FaFileAlt className="h-5 w-5 text-muted-foreground flex-shrink-0" />}
                      <div className="flex-grow min-w-0">
                        <p className="font-medium truncate" title={source.file.name}>
                          {source.file.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {source.status === 'success' ? `${source.data.length} entries` : 
                           source.status === 'parsing' ? 'Parsing...' : 
                           source.status === 'error' ? 'Error' : 'Pending' }
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 flex-shrink-0">
                      {source.status === 'parsing' && <FaSpinner className="h-4 w-4 animate-spin text-muted-foreground" />}
                      {source.status === 'success' && <FaCheck className="h-4 w-4 text-green-500" />}
                      {source.status === 'error' && <FaTimes className="h-4 w-4 text-destructive" title={source.errorMessage} />}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-full"
                        onClick={() => removeFile(source.file.name)}
                        title="Remove file"
                      >
                        <FaTimes className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  {source.status === 'error' && (
                    <p className="text-xs text-destructive mt-2 truncate" title={source.errorMessage}>{source.errorMessage}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 