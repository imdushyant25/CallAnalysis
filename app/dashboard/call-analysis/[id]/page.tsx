// File location: app/dashboard/call-analysis/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { 
  Box, 
  Heading, 
  Text, 
  Flex, 
  Skeleton, 
  Alert, 
  AlertIcon, 
  Badge, 
  Tab, 
  TabList, 
  TabPanel, 
  TabPanels, 
  Tabs,
  useColorModeValue,
  Button,
  Icon,
  HStack
} from '@chakra-ui/react';
import { FiArrowLeft, FiFile, FiUser, FiClock } from 'react-icons/fi';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/ui/Navbar';
import Sidebar from '@/components/ui/Sidebar';
import PageContainer from '@/components/ui/PageContainer';
import TranscriptionViewer from '@/components/transcription/TranscriptionViewer';
import AnalysisViewer from '@/components/call-analysis/AnalysisViewer';


export default function CallAnalysisPage({ params }: { params: { id: string } }) {
  const [call, setCall] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  
  const router = useRouter();
  const callId = params.id;
  
  // Fetch call data
  useEffect(() => {
    const fetchCall = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Fetch call details
        const response = await fetch(`/api/calls/${callId}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch call: ${response.statusText}`);
        }
        
        const data = await response.json();
        setCall(data);
        
        // Fetch audio URL if available
        try {
          const audioResponse = await fetch(`/api/calls/${callId}/audio`);
          if (audioResponse.ok) {
            const audioData = await audioResponse.json();
            setAudioUrl(audioData.url);
          }
        } catch (audioError) {
          console.error('Failed to fetch audio URL:', audioError);
          // Don't set an error, just continue without audio
        }
        
      } catch (err) {
        console.error('Error fetching call data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load call data');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (callId) {
      fetchCall();
    }
  }, [callId]);
  
  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const checkUserPiiPermission = () => {
    // In a real app, this would check the user's role or permissions
    // For this example, we'll return false to show masked content by default
    return false;
  };
  
  // Format duration
  const formatDuration = (seconds: number) => {
    if (!seconds) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  return (
    <Box minH="100vh" bg={useColorModeValue('gray.50', 'gray.900')}>
      <Navbar />
      <Flex>
        <Sidebar />
        <PageContainer>
          {/* Back Button */}
          <Button
            leftIcon={<FiArrowLeft />}
            variant="outline"
            mb={6}
            onClick={() => router.push('/dashboard')}
          >
            Back to Dashboard
          </Button>
          
          {/* Loading State */}
          {isLoading && (
            <>
              <Skeleton height="40px" width="50%" mb={4} />
              <Skeleton height="20px" width="30%" mb={8} />
              <Skeleton height="200px" width="100%" mb={6} />
              <Skeleton height="300px" width="100%" />
            </>
          )}
          
          {/* Error State */}
          {error && (
            <Alert status="error" borderRadius="md" mb={6}>
              <AlertIcon />
              {error}
            </Alert>
          )}
          
          {/* Call Content */}
          {!isLoading && !error && call && (
            <>
              {/* Call Header */}
              <Box mb={6}>
                <Heading size="lg" mb={1}>{call.s3AudioKey.split('/').pop()}</Heading>
                <Flex wrap="wrap" gap={2} mt={3}>
                  <Badge colorScheme="blue">ID: {call.id.slice(0, 8)}</Badge>
                  <Badge colorScheme="purple">
                    {call.metadata?.callDirection === 'outbound' ? 'Outbound' : 'Inbound'}
                  </Badge>
                  {call.duration > 0 && (
                    <Badge colorScheme="green">{formatDuration(call.duration)}</Badge>
                  )}
                </Flex>
                
                {/* Call Details */}
                <HStack spacing={6} mt={4}>
                  <Flex align="center">
                    <Icon as={FiClock} mr={2} color="gray.500" />
                    <Text color="gray.600">{formatDate(call.timestamp)}</Text>
                  </Flex>
                  <Flex align="center">
                    <Icon as={FiUser} mr={2} color="gray.500" />
                    <Text color="gray.600">{call.agentName || 'Unassigned'}</Text>
                  </Flex>
                  <Flex align="center">
                    <Icon as={FiFile} mr={2} color="gray.500" />
                    <Text color="gray.600">{call.s3AudioKey}</Text>
                  </Flex>
                </HStack>
              </Box>
              
              {/* Tabs for different views */}
              <Tabs colorScheme="blue">
                <TabList>
                  <Tab>Analysis</Tab>
                  <Tab>Transcription</Tab>
                </TabList>
                
                <TabPanels>
                  {/* Analysis Tab */}
                  <TabPanel px={0}>
                    <AnalysisViewer callId={callId} />
                  </TabPanel>

                  {/* Transcription Tab */}
                  <TabPanel px={0}>
                    <TranscriptionViewer callId={callId} audioUrl={audioUrl || undefined} canViewPii={checkUserPiiPermission()} />
                  </TabPanel>
                  
                </TabPanels>
              </Tabs>
            </>
          )}
        </PageContainer>
      </Flex>
    </Box>
  );
}