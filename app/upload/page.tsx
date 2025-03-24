/**
 * File location: app/upload/page.tsx
 * Fixed Upload Page with proper error handling and metadata management
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Box, 
  Heading, 
  Text, 
  Divider, 
  useToast, 
  Tab, 
  TabList, 
  TabPanel, 
  TabPanels, 
  Tabs,
  Alert,
  AlertIcon,
  useDisclosure,
  Button,
  Stack,
  Flex
} from '@chakra-ui/react';
import { useRouter } from 'next/navigation';


// Import components
import Navbar from '@/components/ui/Navbar';
import Sidebar from '@/components/ui/Sidebar';
import PageContainer from '@/components/ui/PageContainer';
import UploadForm from '@/components/upload/UploadForm';
import UploadStatus, { UploadItem } from '@/components/upload/UploadStatus';
import UploadHistory from '@/components/upload/UploadHistory';

// Import services and types
import { uploadService, CallMetadata } from '@/lib/services/uploadService';
import { getDummyAgents } from '@/lib/api/agents';

export default function UploadPage() {
  // State for tracking uploads and UI
  const [uploadQueue, setUploadQueue] = useState<UploadItem[]>([]);
  const [history, setHistory] = useState<UploadItem[]>([]);
  const [agents, setAgents] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const toast = useToast();
  const router = useRouter();
  
  // Get agent list when component mounts
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        // This would be replaced with a real API call
        const agentsList = await getDummyAgents();
        setAgents(agentsList);
      } catch (error) {
        console.error('Failed to fetch agents:', error);
        // Fallback dummy data
        setAgents([
          { id: 'agent-101', name: 'John Doe' },
          { id: 'agent-2', name: 'Jane Smith' },
          { id: 'agent-3', name: 'Mike Johnson' },
        ]);
      }
    };

    fetchAgents();
    
    // Load any saved history from localStorage
    const savedHistory = localStorage.getItem('uploadHistory');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error('Failed to parse upload history:', e);
      }
    }
  }, []);
  
  // Save history to localStorage when it changes
  useEffect(() => {
    if (history.length > 0) {
      localStorage.setItem('uploadHistory', JSON.stringify(history));
    }
  }, [history]);

  // Handle file upload with safeguards against undefined metadata
  const handleFileUpload = useCallback(async (files: File[], metadataList: CallMetadata[]) => {
    if (files.length === 0) return;
    
    setIsLoading(true);
    
    // Ensure metadataList is valid and has one entry per file
    const validatedMetadataList = files.map((_, index) => {
      // Use the provided metadata if available, otherwise create default metadata
      const metadata = (metadataList && metadataList[index]) || {
        agentId: agents.length > 0 ? agents[0].id : 'unassigned',
        callDirection: 'inbound' as 'inbound' | 'outbound',
        callerId: '',
        callStartTime: new Date().toISOString()
      };
      
      return metadata;
    });
    
    // Create initial status entries for each file
    const newUploads: UploadItem[] = files.map((file, index) => ({
      id: `upload-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      filename: file.name,
      status: 'pending',
      progress: 0,
      metadata: validatedMetadataList[index]
    }));
    
    setUploadQueue(prev => [...prev, ...newUploads]);
    
    try {
      // Start upload process for each file
      await Promise.all(
        files.map(async (file, fileIndex) => {
          const uploadId = newUploads[fileIndex].id;
          
          try {
            // Update status callbacks
            const updateProgress = (progress: number) => {
              setUploadQueue(prev => 
                prev.map(item => 
                  item.id === uploadId 
                    ? { ...item, progress } 
                    : item
                )
              );
            };
            
            const updateStatus = (status: 'pending' | 'uploading' | 'processing' | 'completed' | 'failed') => {
              setUploadQueue(prev => 
                prev.map(item => 
                  item.id === uploadId 
                    ? { ...item, status } 
                    : item
                )
              );
            };
            
            // Upload the file with the validated metadata
            const result = await uploadService.uploadFile(
              file, 
              validatedMetadataList[fileIndex],
              updateProgress,
              updateStatus
            );
            
            // Update queue with success result
            setUploadQueue(prev => 
              prev.map(item => 
                item.id === uploadId 
                  ? { 
                      ...item, 
                      status: 'completed', 
                      progress: 100,
                      callId: result.callId
                    } 
                  : item
              )
            );
            
            // Add to history
            setHistory(prev => [
              { 
                id: uploadId, 
                filename: file.name, 
                status: 'completed', 
                progress: 100,
                callId: result.callId,
                metadata: validatedMetadataList[fileIndex]
              },
              ...prev.slice(0, 19) // Keep only the last 20 items
            ]);
            
          } catch (error) {
            console.error(`Error uploading file ${file.name}:`, error);
            
            // Update queue with error status
            setUploadQueue(prev => 
              prev.map(item => 
                item.id === uploadId 
                  ? { 
                      ...item, 
                      status: 'failed', 
                      error: error instanceof Error ? error.message : 'Unknown error occurred' 
                    } 
                  : item
              )
            );
            
            // Add to history
            setHistory(prev => [
              { 
                id: uploadId, 
                filename: file.name, 
                status: 'failed', 
                progress: 0,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
                metadata: validatedMetadataList[fileIndex]
              },
              ...prev.slice(0, 19) // Keep only the last 20 items
            ]);
          }
        })
      );
      
      toast({
        title: 'Upload Completed',
        description: `${files.length} file(s) have been processed.`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
    } catch (error) {
      console.error('Error in upload process:', error);
      
      toast({
        title: 'Upload Error',
        description: 'There was a problem uploading your files. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast, agents]);
  
  // Handle retry for failed uploads
  const handleRetry = useCallback((id: string) => {
    const failedUpload = uploadQueue.find(item => item.id === id);
    if (!failedUpload) return;
    
    // This is a placeholder - in a real app, you would need to have the original file
    // For simplicity in this example, we'll just show a toast
    toast({
      title: 'Retry not implemented',
      description: 'In a production app, this would retry the failed upload.',
      status: 'info',
      duration: 3000,
      isClosable: true,
    });
  }, [uploadQueue, toast]);
  
  // Handle removing an item from the queue
  const handleRemove = useCallback((id: string) => {
    setUploadQueue(prev => prev.filter(item => item.id !== id));
  }, []);
  
  // Handle removing an item from history
  const handleRemoveFromHistory = useCallback((id: string) => {
    setHistory(prev => prev.filter(item => item.id !== id));
  }, []);
  
  // Navigate to call details page
  const handleViewCall = useCallback((callId: string) => {
    router.push(`/dashboard/call-analysis/${callId}`);
  }, [router]);
  
  // Clear all completed or failed uploads from queue
  const handleClearCompleted = useCallback(() => {
    setUploadQueue(prev => 
      prev.filter(item => !['completed', 'failed'].includes(item.status))
    );
  }, []);
  
  // Clear all history
  const handleClearHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem('uploadHistory');
  }, []);
  
  return (
    <Box>
      <Navbar />
      <Flex>
        <Sidebar />
        <PageContainer>
          <Heading size="lg" mb={6}>Upload Call Recordings</Heading>
          
          <Tabs colorScheme="blue" isLazy>
            <TabList>
              <Tab>Upload</Tab>
              <Tab>Queue {uploadQueue.length > 0 && `(${uploadQueue.length})`}</Tab>
              <Tab>History {history.length > 0 && `(${history.length})`}</Tab>
            </TabList>
            
            <TabPanels>
              {/* Upload Tab */}
              <TabPanel px={0}>
                <Box mb={6}>
                  <Text mb={4}>
                    Upload audio recordings of customer service calls for transcription and analysis.
                    Accepted formats include WAV, MP3, and M4A files.
                  </Text>
                  
                  <Alert status="info" mb={4}>
                    <AlertIcon />
                    Files will be automatically assigned to the first available agent.
                    You can view and manage uploads in the Queue tab.
                  </Alert>
                </Box>
                
                <UploadForm 
                  onUpload={handleFileUpload} 
                  agents={agents}
                />
              </TabPanel>
              
              {/* Queue Tab */}
              <TabPanel px={0}>
                {uploadQueue.length > 0 ? (
                  <>
                    <Flex justify="space-between" align="center" mb={4}>
                      <Text fontWeight="medium">Current Upload Queue</Text>
                      {uploadQueue.some(item => ['completed', 'failed'].includes(item.status)) && (
                        <Button size="sm" variant="outline" onClick={handleClearCompleted}>
                          Clear Completed
                        </Button>
                      )}
                    </Flex>
                    
                    {uploadQueue.map((upload) => (
                      <UploadStatus 
                        key={upload.id} 
                        upload={upload}
                        onRetry={upload.status === 'failed' ? handleRetry : undefined}
                        onRemove={['completed', 'failed'].includes(upload.status) ? handleRemove : undefined}
                        onView={upload.callId ? handleViewCall : undefined}
                      />
                    ))}
                  </>
                ) : (
                  <Box textAlign="center" py={10}>
                    <Text color="gray.500">No files in the upload queue</Text>
                  </Box>
                )}
              </TabPanel>
              
              {/* History Tab */}
              <TabPanel px={0}>
                <UploadHistory 
                  onViewCall={(callId) => router.push(`/dashboard/call-analysis/${callId}`)}
                />
              </TabPanel>
            </TabPanels>
          </Tabs>
        </PageContainer>
      </Flex>
    </Box>
  );
}