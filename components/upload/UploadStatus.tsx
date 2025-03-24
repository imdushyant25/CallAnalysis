/**
 * File: components/upload/UploadStatus.tsx
 * Simplified component for displaying upload status with progress tracking
 */
'use client';

import { 
  Box, 
  Flex, 
  Text, 
  Progress, 
  Icon, 
  Badge, 
  IconButton,
  Tooltip,
  useColorModeValue,
  Collapse,
  Button
} from '@chakra-ui/react';
import { 
  FiFile, 
  FiCheck, 
  FiX, 
  FiAlertTriangle, 
  FiRotateCw,
  FiInfo,
  FiChevronDown,
  FiChevronUp
} from 'react-icons/fi';
import { useState } from 'react';

// Define prop types for the component
export interface UploadItem {
  id: string;
  filename: string;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'failed';
  progress: number;
  error?: string;
  callId?: string;
  metadata?: {
    agentId?: string;
    callerId?: string;
    callDirection?: string;
    callStartTime?: string;
  };
}

interface UploadStatusProps {
  upload: UploadItem;
  onRetry?: (id: string) => void;
  onRemove?: (id: string) => void;
  onView?: (callId: string) => void;
}

export default function UploadStatus({ 
  upload, 
  onRetry, 
  onRemove, 
  onView 
}: UploadStatusProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // UI colors based on theme
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const bgColor = useColorModeValue('white', 'gray.800');
  const progressTrackColor = useColorModeValue('gray.100', 'gray.600');

  // Get status color and icon
  const getStatusInfo = (status: UploadItem['status']) => {
    switch (status) {
      case 'pending':
        return { color: 'gray', icon: FiInfo, text: 'Pending' };
      case 'uploading':
        return { color: 'blue', icon: FiInfo, text: 'Uploading' };
      case 'processing':
        return { color: 'orange', icon: FiInfo, text: 'Processing' };
      case 'completed':
        return { color: 'green', icon: FiCheck, text: 'Completed' };
      case 'failed':
        return { color: 'red', icon: FiAlertTriangle, text: 'Failed' };
    }
  };

  const statusInfo = getStatusInfo(upload.status);

  return (
    <Box 
      borderWidth="1px" 
      borderRadius="md" 
      borderColor={borderColor}
      bg={bgColor}
      mb={4}
      overflow="hidden"
    >
      {/* Main status row */}
      <Flex 
        p={4} 
        justifyContent="space-between" 
        alignItems="center"
        onClick={() => setIsExpanded(prev => !prev)}
        cursor="pointer"
      >
        <Flex alignItems="center" flex={1}>
          <Icon as={FiFile} mr={2} color="blue.500" />
          <Box>
            <Text fontWeight="medium" isTruncated maxWidth={{ base: "180px", md: "300px" }}>
              {upload.filename}
            </Text>
            <Flex alignItems="center" mt={1}>
              <Badge colorScheme={statusInfo.color as any} mr={2}>
                {statusInfo.text}
              </Badge>
              {upload.status === 'uploading' && (
                <Text fontSize="xs" color="gray.500">
                  {upload.progress}%
                </Text>
              )}
            </Flex>
          </Box>
        </Flex>

        <Flex alignItems="center">
          {/* Action buttons */}
          {upload.status === 'completed' && upload.callId && onView && (
            <Tooltip label="View call details">
              <IconButton
                size="sm"
                aria-label="View call"
                icon={<FiInfo />}
                variant="ghost"
                mr={2}
                onClick={(e) => {
                  e.stopPropagation();
                  onView(upload.callId!);
                }}
              />
            </Tooltip>
          )}
          
          {upload.status === 'failed' && onRetry && (
            <Tooltip label="Retry upload">
              <IconButton
                size="sm"
                aria-label="Retry upload"
                icon={<FiRotateCw />}
                variant="ghost"
                mr={2}
                onClick={(e) => {
                  e.stopPropagation();
                  onRetry(upload.id);
                }}
              />
            </Tooltip>
          )}
          
          {['failed', 'completed'].includes(upload.status) && onRemove && (
            <Tooltip label="Remove from list">
              <IconButton
                size="sm"
                aria-label="Remove upload"
                icon={<FiX />}
                variant="ghost"
                mr={2}
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(upload.id);
                }}
              />
            </Tooltip>
          )}
          
          <Icon
            as={isExpanded ? FiChevronUp : FiChevronDown}
            color="gray.500"
          />
        </Flex>
      </Flex>

      {/* Progress bar for uploading or processing status */}
      {['uploading', 'processing'].includes(upload.status) && (
        <Progress
          value={upload.progress}
          size="xs"
          colorScheme={upload.status === 'uploading' ? 'blue' : 'orange'}
          bgColor={progressTrackColor}
          isAnimated
        />
      )}

      {/* Expanded details */}
      <Collapse in={isExpanded} animateOpacity>
        <Box p={4} pt={2} borderTopWidth="1px" borderColor={borderColor}>
          {/* Error message if failed */}
          {upload.status === 'failed' && upload.error && (
            <Box 
              p={3} 
              bg="red.50" 
              color="red.800" 
              borderRadius="md"
              mb={3}
            >
              <Flex alignItems="center" mb={1}>
                <Icon as={FiAlertTriangle} mr={2} />
                <Text fontWeight="medium">Error</Text>
              </Flex>
              <Text fontSize="sm">{upload.error}</Text>
            </Box>
          )}

          {/* Simplified details */}
          <Box fontSize="sm">
            <Flex mb={2}>
              <Text fontWeight="medium" width="120px">Call ID:</Text>
              <Text>{upload.callId || 'Not assigned yet'}</Text>
            </Flex>
            
            <Flex mb={2}>
              <Text fontWeight="medium" width="120px">Status:</Text>
              <Text>{statusInfo.text}</Text>
            </Flex>
          </Box>

          {/* Action buttons when expanded */}
          <Flex justifyContent="flex-end" mt={3}>
            {upload.status === 'completed' && upload.callId && onView && (
              <Button 
                size="sm" 
                colorScheme="blue" 
                variant="outline"
                leftIcon={<FiInfo />}
                onClick={() => onView(upload.callId!)}
              >
                View Details
              </Button>
            )}
            
            {upload.status === 'failed' && onRetry && (
              <Button 
                size="sm" 
                colorScheme="orange" 
                variant="outline"
                leftIcon={<FiRotateCw />}
                mr={2}
                onClick={() => onRetry(upload.id)}
              >
                Retry Upload
              </Button>
            )}
          </Flex>
        </Box>
      </Collapse>
    </Box>
  );
}