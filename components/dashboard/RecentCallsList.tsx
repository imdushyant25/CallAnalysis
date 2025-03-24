// File location: components/dashboard/RecentCallsList.tsx
/**
 * RecentCallsList Component
 * Displays a list of recent calls with loading and error states
 */
'use client';

import { 
  Box, 
  Table, 
  Thead, 
  Tbody, 
  Tr, 
  Th, 
  Td, 
  Badge, 
  Text, 
  Flex, 
  Icon,
  useColorModeValue,
  Spinner,
  Alert,
  AlertIcon,
  Skeleton,
  Button
} from '@chakra-ui/react';
import { FiPhone, FiUser, FiClock, FiExternalLink } from 'react-icons/fi';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Call {
  id: string;
  timestamp: string;
  agentId: string;
  agentName?: string;
  duration: number;
  sentiment?: number;
}

interface RecentCallsListProps {
  calls: Call[];
  isLoading?: boolean;
  error?: Error | null;
  onViewMore?: () => void;
}

export default function RecentCallsList({ 
  calls, 
  isLoading = false, 
  error = null, 
  onViewMore 
}: RecentCallsListProps) {
  const router = useRouter();
  const hoverBg = useColorModeValue('gray.50', 'gray.700');
  
  // Format date to human-readable format
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    });
  };
  
  // Format duration from seconds to mm:ss
  const formatDuration = (seconds: number) => {
    if (!seconds) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Get sentiment badge color
  const getSentimentColor = (sentiment: number) => {
    if (sentiment >= 85) return 'green';
    if (sentiment >= 70) return 'blue';
    if (sentiment >= 50) return 'yellow';
    return 'red';
  };
  
  // Handle click to view call details
  const handleViewCall = (callId: string) => {
    router.push(`/dashboard/call-analysis/${callId}`);
  };

  // Render loading skeleton
  if (isLoading) {
    return (
      <Box>
        <Table variant="simple" size="sm">
          <Thead>
            <Tr>
              <Th>Call ID</Th>
              <Th>Date & Time</Th>
              <Th>Agent</Th>
              <Th>Duration</Th>
              <Th>Sentiment</Th>
            </Tr>
          </Thead>
          <Tbody>
            {[...Array(5)].map((_, i) => (
              <Tr key={i}>
                <Td><Skeleton height="20px" width="100px" /></Td>
                <Td><Skeleton height="20px" width="120px" /></Td>
                <Td><Skeleton height="20px" width="80px" /></Td>
                <Td><Skeleton height="20px" width="60px" /></Td>
                <Td><Skeleton height="20px" width="50px" /></Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>
    );
  }
  
  // Render error state
  if (error) {
    return (
      <Alert status="error" borderRadius="md">
        <AlertIcon />
        Failed to load recent calls. Please try again later.
      </Alert>
    );
  }
  
  // Render empty state
  if (!calls || !Array.isArray(calls) || calls.length === 0) {
    return (
      <Box textAlign="center" py={6}>
        <Text color="gray.500">No recent calls found</Text>
      </Box>
    );
  }

  return (
    <Box>
      <Table variant="simple" size="sm">
        <Thead>
          <Tr>
            <Th>Call ID</Th>
            <Th>Date & Time</Th>
            <Th>Agent</Th>
            <Th>Duration</Th>
            <Th>Sentiment</Th>
          </Tr>
        </Thead>
        <Tbody>
          {Array.isArray(calls) && calls.map((call) => (
            <Tr 
              key={call.id}
              _hover={{ bg: hoverBg, cursor: 'pointer' }}
              transition="background-color 0.2s"
              onClick={() => handleViewCall(call.id)}
            >
              <Td>
                <Flex align="center">
                  <Icon as={FiPhone} mr={2} color="blue.500" />
                  <Text fontWeight="medium">{call.id.substring(0, 8)}...</Text>
                </Flex>
              </Td>
              <Td>{formatDate(call.timestamp)}</Td>
              <Td>
                <Flex align="center">
                  <Icon as={FiUser} mr={2} color="gray.500" />
                  <Text>{call.agentName || call.agentId}</Text>
                </Flex>
              </Td>
              <Td>
                <Flex align="center">
                  <Icon as={FiClock} mr={2} color="gray.500" />
                  <Text>{formatDuration(call.duration)}</Text>
                </Flex>
              </Td>
              <Td>
                {call.sentiment ? (
                  <Badge colorScheme={getSentimentColor(call.sentiment)} borderRadius="full" px={2}>
                    {call.sentiment}%
                  </Badge>
                ) : (
                  <Badge colorScheme="gray" borderRadius="full" px={2}>
                    N/A
                  </Badge>
                )}
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
      
      {onViewMore && (
        <Flex justify="center" mt={4}>
          <Button 
            size="sm" 
            variant="outline" 
            rightIcon={<FiExternalLink />}
            onClick={onViewMore}
          >
            View All Calls
          </Button>
        </Flex>
      )}
    </Box>
  );
}