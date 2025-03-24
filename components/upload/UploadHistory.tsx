// File location: components/upload/UploadHistory.tsx
import { useState, useEffect } from 'react';
import { 
  Box, 
  Text, 
  Table, 
  Thead, 
  Tbody, 
  Tr, 
  Th, 
  Td, 
  Flex, 
  Button, 
  Spinner, 
  Badge, 
  Icon,
  useColorModeValue,
  IconButton,
  Tooltip,
  Skeleton
} from '@chakra-ui/react';
import { FiChevronLeft, FiChevronRight, FiFile, FiExternalLink } from 'react-icons/fi';

interface Call {
  id: string;
  timestamp: string;
  duration: number;
  agentId: string;
  agentName: string;
  s3AudioKey: string;
  metadata?: any;
}

interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface UploadHistoryProps {
  onViewCall?: (callId: string) => void;
}

export default function UploadHistory({ onViewCall }: UploadHistoryProps) {
  const [calls, setCalls] = useState<Call[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const hoverBg = useColorModeValue('gray.50', 'gray.700');
  
  // Fetch calls from the API
  const fetchCalls = async (page: number = 1, limit: number = 10) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(`/api/calls?page=${page}&limit=${limit}`);
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      setCalls(data.calls);
      setPagination(data.pagination);
    } catch (err) {
      console.error('Error fetching call history:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch call history');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Load calls on component mount
  useEffect(() => {
    fetchCalls();
  }, []);
  
  // Change page
  const changePage = (newPage: number) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    fetchCalls(newPage, pagination.limit);
  };
  
  // Format timestamp to readable date
  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };
  
  // Format duration from seconds to mm:ss
  const formatDuration = (seconds: number) => {
    if (!seconds) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Get call direction badge
  const getDirectionBadge = (direction: string) => {
    if (direction === 'outbound') {
      return <Badge colorScheme="purple">Outbound</Badge>;
    }
    return <Badge colorScheme="blue">Inbound</Badge>;
  };

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={4}>
        <Text fontWeight="medium">Upload History</Text>
        
        {/* Pagination controls - top */}
        {pagination.totalPages > 1 && (
          <Flex align="center">
            <Text fontSize="sm" color="gray.500" mr={2}>
              Page {pagination.page} of {pagination.totalPages}
            </Text>
            <Button
              size="sm"
              variant="ghost"
              isDisabled={pagination.page === 1}
              onClick={() => changePage(pagination.page - 1)}
              aria-label="Previous page"
            >
              <Icon as={FiChevronLeft} />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              isDisabled={pagination.page === pagination.totalPages}
              onClick={() => changePage(pagination.page + 1)}
              aria-label="Next page"
            >
              <Icon as={FiChevronRight} />
            </Button>
          </Flex>
        )}
      </Flex>
      
      {isLoading ? (
        // Loading state
        <Box borderWidth="1px" borderRadius="md" borderColor={borderColor} overflow="hidden">
          {[...Array(5)].map((_, i) => (
            <Box 
              key={i} 
              p={4} 
              borderBottomWidth={i < 4 ? "1px" : "0"}
              borderColor={borderColor}
            >
              <Flex justify="space-between">
                <Skeleton height="20px" width="50%" />
                <Skeleton height="20px" width="20%" />
              </Flex>
              <Flex mt={2}>
                <Skeleton height="16px" width="30%" mr={2} />
                <Skeleton height="16px" width="15%" />
              </Flex>
            </Box>
          ))}
        </Box>
      ) : error ? (
        // Error state
        <Box 
          p={4} 
          borderWidth="1px" 
          borderRadius="md" 
          borderColor="red.300" 
          bg="red.50" 
          color="red.900"
        >
          <Text fontWeight="medium">Error loading call history</Text>
          <Text mt={1}>{error}</Text>
          <Button 
            mt={3} 
            size="sm" 
            colorScheme="red" 
            onClick={() => fetchCalls(pagination.page)}
          >
            Retry
          </Button>
        </Box>
      ) : calls.length === 0 ? (
        // Empty state
        <Box 
          textAlign="center" 
          py={8} 
          borderWidth="1px" 
          borderRadius="md" 
          borderColor={borderColor}
        >
          <Text color="gray.500">No uploaded calls found</Text>
        </Box>
      ) : (
        // Calls list
        <Box borderWidth="1px" borderRadius="md" borderColor={borderColor} overflow="hidden">
          <Table variant="simple" size="sm">
            <Thead bg={useColorModeValue('gray.50', 'gray.800')}>
              <Tr>
                <Th>Call Details</Th>
                <Th>Agent</Th>
                <Th>Duration</Th>
                <Th width="80px">Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {calls.map(call => (
                <Tr 
                  key={call.id} 
                  _hover={{ bg: hoverBg }}
                  cursor={onViewCall ? "pointer" : "default"}
                  onClick={() => onViewCall && onViewCall(call.id)}
                >
                  <Td>
                    <Flex align="flex-start" direction="column">
                      <Flex align="center">
                        <Icon as={FiFile} mr={2} color="blue.500" />
                        <Text fontWeight="medium">{call.s3AudioKey.split('/').pop()}</Text>
                      </Flex>
                      <Flex mt={1} align="center">
                        <Text fontSize="xs" color="gray.500" mr={2}>
                          {formatDate(call.timestamp)}
                        </Text>
                        {call.metadata?.callDirection && 
                          getDirectionBadge(call.metadata.callDirection)}
                      </Flex>
                    </Flex>
                  </Td>
                  <Td>
                    <Text>{call.agentName || 'Unassigned'}</Text>
                    <Text fontSize="xs" color="gray.500">{call.agentId}</Text>
                  </Td>
                  <Td>
                    <Text>{formatDuration(call.duration)}</Text>
                  </Td>
                  <Td>
                    {onViewCall && (
                      <Tooltip label="View call details">
                        <IconButton
                          icon={<FiExternalLink />}
                          aria-label="View call details"
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewCall(call.id);
                          }}
                        />
                      </Tooltip>
                    )}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
          
          {/* Pagination controls - bottom */}
          {pagination.totalPages > 1 && (
            <Flex justify="space-between" align="center" p={4} borderTopWidth="1px" borderColor={borderColor}>
              <Text fontSize="sm" color="gray.500">
                Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} calls
              </Text>
              <Flex align="center">
                <Button
                  size="sm"
                  variant="outline"
                  isDisabled={pagination.page === 1}
                  onClick={() => changePage(pagination.page - 1)}
                  mr={2}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  isDisabled={pagination.page === pagination.totalPages}
                  onClick={() => changePage(pagination.page + 1)}
                >
                  Next
                </Button>
              </Flex>
            </Flex>
          )}
        </Box>
      )}
    </Box>
  );
}