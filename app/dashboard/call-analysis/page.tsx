// File location: app/dashboard/call-analysis/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { 
  Box, 
  Heading, 
  Text, 
  SimpleGrid, 
  Skeleton, 
  Alert, 
  AlertIcon, 
  Badge, 
  Button,
  useColorModeValue,
  Flex
} from '@chakra-ui/react';
import Navbar from '@/components/ui/Navbar';
import Sidebar from '@/components/ui/Sidebar';
import PageContainer from '@/components/ui/PageContainer';

// Define a more complete Call interface that includes agentName
interface Call {
  id: string;
  s3AudioKey: string;
  timestamp: string;
  duration: number;
  agentId: string;
  agentName?: string; // Make it optional with ?
  metadata?: {
    callDirection?: 'inbound' | 'outbound';
    callStartTime?: string;
    callEndTime?: string;
    [key: string]: any;
  };
}

export default function CallAnalysisPage() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  
  // Fetch calls on component mount
  useEffect(() => {
    async function fetchCalls() {
      try {
        setIsLoading(true);
        const response = await fetch('/api/calls');
        
        if (!response.ok) {
          throw new Error(`Failed to fetch calls: ${response.statusText}`);
        }
        
        const data = await response.json();
        setCalls(data.calls || []);
      } catch (err) {
        console.error('Error fetching calls:', err);
        setError(err instanceof Error ? err.message : 'Failed to load calls');
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchCalls();
  }, []);
  
  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };
  
  // Format duration
  const formatDuration = (seconds: number) => {
    if (!seconds) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  return (
    <Box minH="100vh" bg={bgColor}>
      <Navbar />
      <Flex>
        <Sidebar />
        <PageContainer>
          <Box mb={6}>
            <Heading size="lg" mb={1}>Call Analysis</Heading>
            <Text color="gray.500">Review and analyze customer service calls</Text>
          </Box>
          
          {/* Loading State */}
          {isLoading && (
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} height="100px" borderRadius="md" />
              ))}
            </SimpleGrid>
          )}
          
          {/* Error State */}
          {error && (
            <Alert status="error" borderRadius="md" mb={6}>
              <AlertIcon />
              {error}
            </Alert>
          )}
          
          {/* No Calls State */}
          {!isLoading && !error && calls.length === 0 && (
            <Box textAlign="center" py={10}>
              <Text mb={4}>No calls found. Upload some calls to get started.</Text>
              <Button colorScheme="blue" as="a" href="/upload">
                Upload Calls
              </Button>
            </Box>
          )}
          
          {/* Call List */}
          {!isLoading && !error && calls.length > 0 && (
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
              {calls.map((call) => (
                <Box
                  key={call.id}
                  borderWidth="1px"
                  borderRadius="lg"
                  overflow="hidden"
                  bg={useColorModeValue('white', 'gray.800')}
                  boxShadow="sm"
                  _hover={{ 
                    transform: 'translateY(-2px)', 
                    boxShadow: 'md',
                    borderColor: 'blue.400'
                  }}
                  transition="all 0.2s"
                  as="a"
                  href={`/dashboard/call-analysis/${call.id}`}
                >
                  <Box p={5}>
                    <Text fontWeight="semibold" isTruncated>
                      {call.s3AudioKey.split('/').pop() || 'Call Recording'}
                    </Text>
                    
                    <Text fontSize="sm" color="gray.500" mb={3}>
                      {formatDate(call.timestamp)}
                    </Text>
                    
                    <Flex gap={2} wrap="wrap">
                      <Badge colorScheme="blue">
                        {formatDuration(call.duration)}
                      </Badge>
                      
                      {call.metadata?.callDirection && (
                        <Badge colorScheme={call.metadata.callDirection === 'inbound' ? 'green' : 'purple'}>
                          {call.metadata.callDirection}
                        </Badge>
                      )}
                      
                      {/* Only show agent name if it exists */}
                      {call.agentName && (
                        <Badge colorScheme="gray">
                          {call.agentName}
                        </Badge>
                      )}
                    </Flex>
                  </Box>
                </Box>
              ))}
            </SimpleGrid>
          )}
        </PageContainer>
      </Flex>
    </Box>
  );
}