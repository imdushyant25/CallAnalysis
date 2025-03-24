/**
 * File: components/upload/UploadForm.tsx
 * Updated Upload Form with audio metadata extraction
 */
'use client';

import { useState, useRef, useCallback } from 'react';
import { 
  Box, 
  Button, 
  Text, 
  Flex, 
  Icon, 
  Input, 
  useColorModeValue, 
  FormControl, 
  FormLabel,
  FormHelperText,
  useToast,
  HStack,
  Badge,
  IconButton,
  Spinner,
  Collapse,
  Table,
  Tbody,
  Tr,
  Td
} from '@chakra-ui/react';
import { FiUploadCloud, FiFile, FiX, FiInfo, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { audioMetadataService } from '@/lib/services/audioMetadataService';

interface UploadFormProps {
  onUpload: (files: File[], metadataList: any[]) => Promise<void>;
  agents?: { id: string; name: string }[];
}

interface EnhancedFile {
  file: File;           
  id: string;
  isProcessing: boolean;
  error?: string;
  metadata?: any;
}

export default function UploadForm({ onUpload, agents = [] }: UploadFormProps) {
  // State for tracking selected files
  const [selectedFiles, setSelectedFiles] = useState<EnhancedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [expandedFile, setExpandedFile] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();
  
  // UI styling values
  const bgColor = useColorModeValue('gray.50', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const activeBorderColor = useColorModeValue('blue.500', 'blue.300');
  
  // Process files to extract metadata
  const processFiles = useCallback(async (files: File[]): Promise<EnhancedFile[]> => {
    if (!files || files.length === 0) {
      console.warn('No files to process');
      return [];
    }
    
    console.log(`Processing ${files.length} files:`, files);
    
    // Create enhanced file objects that preserve the original File object
    const enhancedFiles: EnhancedFile[] = files.map(file => ({
      file: file,          // Store the original File object
      id: `file-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      isProcessing: true
    }));
    
    // Add the files to state immediately to show loading state
    setSelectedFiles(prev => [...prev, ...enhancedFiles]);
    
    // Process each file to extract metadata
    const processedFiles = await Promise.all(
      enhancedFiles.map(async (enhancedFile) => {
        try {
          // Use the original File object for metadata extraction
          const metadata = await audioMetadataService.extractMetadata(enhancedFile.file);
          return {
            ...enhancedFile,
            metadata,
            isProcessing: false
          };
        } catch (error) {
          console.error(`Error processing file ${enhancedFile.file.name}:`, error);
          return {
            ...enhancedFile,
            isProcessing: false,
            error: error instanceof Error ? error.message : 'Failed to extract metadata'
          };
        }
      })
    );
    
    // Update the state with processed files
    setSelectedFiles(prev => {
      // Replace the processing files with the processed ones
      const newFiles = [...prev];
      processedFiles.forEach(processedFile => {
        const index = newFiles.findIndex(f => f.id === processedFile.id);
        if (index !== -1) {
          newFiles[index] = processedFile;
        }
      });
      return newFiles;
    });
    
    return processedFiles;
  }, []);
  
  // Handle file selection via input
  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) {
      console.log('No files selected');
      return;
    }
    
    // Create a proper array of File objects
    const filesArray = Array.from(e.target.files);
    console.log('Files selected:', filesArray);
    
    // Validate file types
    const audioFiles = filesArray.filter(file => {
      const isAudioFile = file.type && file.type.startsWith('audio/');
      if (!isAudioFile) {
        console.warn(`File ${file.name} is not an audio file (type: ${file.type})`);
      }
      return isAudioFile;
    });
    
    if (audioFiles.length !== filesArray.length) {
      toast({
        title: 'Invalid file type',
        description: 'Only audio files are allowed.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
    }
    
    if (audioFiles.length > 0) {
      // Process the valid audio files
      console.log('Processing audio files:', audioFiles);
      await processFiles(audioFiles);
    }
  }, [toast, processFiles]);
  
  
  // Handle drag and drop events
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);
  
  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);
  
  const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (!e.dataTransfer.files || e.dataTransfer.files.length === 0) {
      console.log('No files dropped');
      return;
    }
    
    // Create a proper array of File objects
    const filesArray = Array.from(e.dataTransfer.files);
    console.log('Files dropped:', filesArray);
    
    // Validate file types
    const audioFiles = filesArray.filter(file => {
      const isAudioFile = file.type && file.type.startsWith('audio/');
      if (!isAudioFile) {
        console.warn(`File ${file.name} is not an audio file (type: ${file.type})`);
      }
      return isAudioFile;
    });
    
    if (audioFiles.length === 0) {
      toast({
        title: 'Invalid file type',
        description: 'Only audio files are allowed.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    // Process the valid audio files
    console.log('Processing dropped audio files:', audioFiles);
    await processFiles(audioFiles);
  }, [toast, processFiles, setIsDragging]);
  
  // Remove a file from the list
  const removeFile = useCallback((id: string) => {
    setSelectedFiles(prev => prev.filter(file => file.id !== id));
    // Clear expanded state if this file was expanded
    if (expandedFile === id) {
      setExpandedFile(null);
    }
  }, [expandedFile]);
  
  // Toggle file details expanded state
  const toggleFileDetails = useCallback((id: string) => {
    setExpandedFile(prev => prev === id ? null : id);
  }, []);
  
  // Handle the upload process
  const handleUpload = useCallback(async () => {
    if (selectedFiles.length === 0) {
      toast({
        title: 'No files selected',
        description: 'Please select at least one file to upload.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    try {
      setIsUploading(true);
      
      // Create metadata for each file
      const metadataList = selectedFiles.map(enhancedFile => {
        // Generate call duration from audio metadata if available
        const callDuration = enhancedFile.metadata?.duration ? 
          Math.round(enhancedFile.metadata.duration) : undefined;
        
        // Generate call start time from metadata if available
        const callStartTime = enhancedFile.metadata?.recordingDate || new Date().toISOString();
        
        return {
          agentId: agents.length > 0 ? agents[0].id : 'unassigned',
          callDirection: 'inbound' as const,
          callerId: '',
          callStartTime,
          // Add audio metadata as part of the call metadata
          audioMetadata: enhancedFile.metadata,
          callDuration
        };
      });
      
      // Extract the original File objects
      const fileObjects = selectedFiles.map(enhancedFile => enhancedFile.file);
      
      // Start the upload process with files and metadata
      await onUpload(fileObjects, metadataList);
      
      // Reset state after successful upload
      setSelectedFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      toast({
        title: 'Upload successful',
        description: `${selectedFiles.length} file${selectedFiles.length > 1 ? 's' : ''} uploaded successfully.`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: 'There was an error uploading your files. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsUploading(false);
    }
  }, [selectedFiles, onUpload, toast, agents]);
  
  // Open file picker dialog
  const openFilePicker = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, []);
  
  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  // Format duration in seconds to mm:ss format
  const formatDuration = (seconds?: number): string => {
    if (!seconds) return 'Unknown';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  return (
    <Box mb={6}>
      <FormControl>
        <FormLabel>Upload Audio Files</FormLabel>
        <Input
          type="file"
          accept="audio/*"
          multiple
          onChange={handleFileChange}
          ref={fileInputRef}
          display="none"
        />
        
        <Box
          border="2px dashed"
          borderColor={isDragging ? activeBorderColor : borderColor}
          borderRadius="md"
          p={10}
          bg={bgColor}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          textAlign="center"
          cursor="pointer"
          onClick={openFilePicker}
          transition="all 0.2s"
          _hover={{ borderColor: activeBorderColor }}
        >
          <Icon as={FiUploadCloud} boxSize={12} color="blue.500" mb={4} />
          <Text fontWeight="medium" mb={2}>
            Drag & drop audio files here or click to browse
          </Text>
          <Text fontSize="sm" color="gray.500">
            Supported formats: WAV, MP3, M4A (Max: 50MB per file)
          </Text>
        </Box>
        
        <FormHelperText>
          Files will be processed for transcription and analysis after upload.
          We'll automatically extract metadata like duration from audio files.
        </FormHelperText>
      </FormControl>
      
      {selectedFiles.length > 0 && (
        <Box mt={6}>
          <Text fontWeight="medium" mb={4}>
            Selected Files ({selectedFiles.length})
          </Text>
          
          {selectedFiles.map((enhancedFile) => (
  <Box 
    key={enhancedFile.id} 
    borderWidth="1px" 
    borderRadius="md" 
    mb={4}
    bg={useColorModeValue('white', 'gray.800')}
    overflow="hidden"
  >
    <Flex 
      p={4} 
      justify="space-between" 
      align="center"
      cursor="pointer"
      onClick={() => toggleFileDetails(enhancedFile.id)}
    >
      <HStack spacing={3}>
        <Icon as={FiFile} color="blue.500" />
        <Box>
          <Text fontWeight="medium" isTruncated maxWidth="300px">{enhancedFile.file.name}</Text>
          <HStack mt={1}>
            <Badge colorScheme="blue">{formatFileSize(enhancedFile.file.size)}</Badge>
            {enhancedFile.isProcessing ? (
              <HStack spacing={1}>
                <Spinner size="xs" />
                <Text fontSize="xs">Processing...</Text>
              </HStack>
            ) : enhancedFile.metadata ? (
              <Badge colorScheme="green">
                {formatDuration(enhancedFile.metadata.duration)}
              </Badge>
            ) : null}
          </HStack>
        </Box>
      </HStack>
      <HStack>
        {enhancedFile.metadata && (
          <Icon 
            as={expandedFile === enhancedFile.id ? FiChevronUp : FiChevronDown} 
            color="gray.500"
          />
        )}
        <IconButton
          icon={<FiX />}
          aria-label="Remove file"
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            removeFile(enhancedFile.id);
          }}
        />
      </HStack>
    </Flex>
    
    {/* Expanded file details */}
    <Collapse in={expandedFile === enhancedFile.id}>
      {enhancedFile.metadata && (
        <Box 
          p={4} 
          borderTopWidth="1px" 
          borderColor={borderColor}
          bg={useColorModeValue('gray.50', 'gray.700')}
        >
          <Text fontWeight="medium" mb={2}>Audio Details</Text>
          <Table size="sm" variant="simple">
            <Tbody>
              <Tr>
                <Td fontWeight="medium" pl={0}>Format</Td>
                <Td>{enhancedFile.metadata.format}</Td>
              </Tr>
              <Tr>
                <Td fontWeight="medium" pl={0}>Duration</Td>
                <Td>{formatDuration(enhancedFile.metadata.duration)}</Td>
              </Tr>
              {enhancedFile.metadata.sampleRate && (
                <Tr>
                  <Td fontWeight="medium" pl={0}>Sample Rate</Td>
                  <Td>{enhancedFile.metadata.sampleRate} Hz</Td>
                </Tr>
              )}
              {enhancedFile.metadata.channels && (
                <Tr>
                  <Td fontWeight="medium" pl={0}>Channels</Td>
                  <Td>{enhancedFile.metadata.channels}</Td>
                </Tr>
              )}
            </Tbody>
          </Table>
        </Box>
      )}
    </Collapse>
  </Box>
))}
          
          <Button
            colorScheme="blue"
            mt={6}
            leftIcon={<FiUploadCloud />}
            onClick={handleUpload}
            isLoading={isUploading}
            loadingText="Uploading..."
            width={{ base: 'full', md: 'auto' }}
            isDisabled={selectedFiles.some(file => file.isProcessing)}
          >
            Upload {selectedFiles.length} File{selectedFiles.length > 1 ? 's' : ''}
          </Button>
        </Box>
      )}
    </Box>
  );
}