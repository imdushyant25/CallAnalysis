// File location: components/transcription/TranscriptionViewer.tsx
import { useState, useRef, useEffect } from 'react';
import { 
  Box, 
  Heading, 
  Text, 
  Flex, 
  Button,
  IconButton,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  useColorModeValue,
  Badge,
  Skeleton,
  Alert,
  AlertIcon,
  HStack,
  Tabs, 
  TabList, 
  Tab, 
  TabPanels, 
  TabPanel,
  Switch,
  FormControl,
  FormLabel,
  Tooltip,
  Icon,
  Collapse
} from '@chakra-ui/react';
import { FiPlay, FiPause, FiLoader, FiClock, FiAlignLeft, FiList, FiEye, FiEyeOff, FiShield } from 'react-icons/fi';

// Update your interfaces to include new fields
export interface TranscriptionSegment {
  speaker: string;
  text: string;
  startTime: number;
  endTime: number;
  confidence?: number;
}

export interface Transcription {
  id: string;
  callId: string;
  fullText: string;
  maskedFullText?: string;
  segments: TranscriptionSegment[];
  maskedSegments?: TranscriptionSegment[];
  metadata?: {
    transcriptionModel: string;
    language: string;
    processingTime: number;
    piiMaskingApplied?: boolean;
    piiMaskingMetadata?: any;
  };
}

interface TranscriptionViewerProps {
  callId: string;
  audioUrl?: string;
  canViewPii?: boolean;
}

export default function TranscriptionViewer({ callId, audioUrl, canViewPii = false }: TranscriptionViewerProps) {
  // State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [activeSegment, setActiveSegment] = useState<number | null>(null);
  const [transcription, setTranscription] = useState<Transcription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPii, setShowPii] = useState(false);
  
  // Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const segmentsRef = useRef<HTMLDivElement[]>([]);
  
  // Styling
  const bgColor = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const agentBadgeColor = 'blue';
  const customerBadgeColor = 'green';
  const highlightBg = useColorModeValue('blue.50', 'blue.900');
  const piiInfoBg = useColorModeValue('yellow.50', 'yellow.900');
  
  // Fetch transcription
  const fetchTranscription = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(`/api/calls/${callId}/transcribe`);
      
      if (response.status === 404) {
        // No transcription found, will need to process it
        setTranscription(null);
        setIsLoading(false);
        return;
      }
      
      if (!response.ok) {
        throw new Error(`Error fetching transcription: ${response.statusText}`);
      }
      
      const data = await response.json();
      setTranscription(data);
      
      // Set audio duration if available
      if (data.segments && data.segments.length > 0) {
        const lastSegment = data.segments[data.segments.length - 1];
        setDuration(lastSegment.endTime);
      }
      
    } catch (err) {
      console.error('Error fetching transcription:', err);
      setError(err instanceof Error ? err.message : 'Failed to load transcription');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Process transcription
  const processTranscription = async () => {
    try {
      setIsProcessing(true);
      setError(null);
      
      const response = await fetch(`/api/calls/${callId}/transcribe`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error(`Error processing transcription: ${response.statusText}`);
      }
      
      const data = await response.json();
      setTranscription(data.transcription);
      
      // Set audio duration if available
      if (data.transcription.segments && data.transcription.segments.length > 0) {
        const lastSegment = data.transcription.segments[data.transcription.segments.length - 1];
        setDuration(lastSegment.endTime);
      }
      
    } catch (err) {
      console.error('Error processing transcription:', err);
      setError(err instanceof Error ? err.message : 'Failed to process transcription');
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Initialize
  useEffect(() => {
    fetchTranscription();
  }, [callId]);
  
  // Set up audio element if URL provided
  useEffect(() => {
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      audio.addEventListener('loadedmetadata', () => {
        setDuration(audio.duration);
      });
      
      audio.addEventListener('timeupdate', () => {
        setCurrentTime(audio.currentTime);
        
        // Update active segment based on current time
        if (transcription && transcription.segments) {
          const activeIndex = transcription.segments.findIndex(
            segment => currentTime >= segment.startTime && currentTime <= segment.endTime
          );
          
          if (activeIndex !== -1 && activeIndex !== activeSegment) {
            setActiveSegment(activeIndex);
            
            // Scroll the active segment into view
            if (segmentsRef.current[activeIndex]) {
              segmentsRef.current[activeIndex].scrollIntoView({
                behavior: 'smooth',
                block: 'nearest'
              });
            }
          }
        }
      });
      
      audio.addEventListener('ended', () => {
        setIsPlaying(false);
      });
      
      return () => {
        audio.pause();
        audio.src = '';
      };
    }
  }, [audioUrl, transcription]);
  
  // Playback controls
  const togglePlayback = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    
    setIsPlaying(!isPlaying);
  };
  
  const handleSliderChange = (value: number) => {
    if (!audioRef.current) return;
    
    audioRef.current.currentTime = value;
    setCurrentTime(value);
  };
  
  const handleSegmentClick = (index: number) => {
    if (!audioRef.current || !transcription) return;
    
    const segment = transcription.segments[index];
    audioRef.current.currentTime = segment.startTime;
    setCurrentTime(segment.startTime);
    setActiveSegment(index);
    
    // Start playback
    if (!isPlaying) {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' + secs : secs}`;
  };
  
  // Save refs for automatic scrolling
  const setSegmentRef = (el: HTMLDivElement | null, index: number) => {
    if (el) {
      segmentsRef.current[index] = el;
    }
  };

  // Helper to determine if PII masking is available for this transcription
  const hasPiiMasking = transcription?.metadata?.piiMaskingApplied && 
                      (transcription?.maskedFullText || transcription?.maskedSegments);
  
  // Helper to get the appropriate segments and text based on masking settings
  const getDisplaySegments = () => {
    if (!transcription) return [];
    
    // If showing PII and user has permission, or if no masking exists, show original
    if ((showPii && canViewPii) || !hasPiiMasking) {
      return transcription.segments;
    }
    
    // Otherwise, show masked segments if available
    return transcription.maskedSegments || transcription.segments;
  };
  
  const getDisplayFullText = () => {
    if (!transcription) return '';
    
    // If showing PII and user has permission, or if no masking exists, show original
    if ((showPii && canViewPii) || !hasPiiMasking) {
      return transcription.fullText;
    }
    
    // Otherwise, show masked text if available
    return transcription.maskedFullText || transcription.fullText;
  };
  
  return (
    <Box
      borderWidth="1px"
      borderRadius="lg"
      overflow="hidden"
      bg={bgColor}
      borderColor={borderColor}
      boxShadow="sm"
      mb={6}
    >
      <Box p={4} borderBottomWidth="1px" borderColor={borderColor}>
        <Flex justifyContent="space-between" alignItems="center">
          <Box>
            <Heading size="md">Call Transcription</Heading>
            
            {transcription && (
              <Text fontSize="sm" color="gray.500" mt={1}>
                {transcription.segments.length} segments, {formatTime(duration)} duration
              </Text>
            )}
          </Box>
          
          {/* PII visibility toggle */}
          {hasPiiMasking && (
            <HStack spacing={2}>
              <Tooltip label={canViewPii ? "Toggle PII visibility" : "You don't have permission to view PII"}>
                <FormControl display="flex" alignItems="center" width="auto">
                  <FormLabel htmlFor="show-pii" mb="0" fontSize="sm" mr={2}>
                    <Flex alignItems="center">
                      <Icon as={showPii && canViewPii ? FiEye : FiEyeOff} mr={1} />
                      {showPii && canViewPii ? "Showing PII" : "PII Masked"}
                    </Flex>
                  </FormLabel>
                  <Switch 
                    id="show-pii" 
                    isChecked={showPii} 
                    onChange={() => setShowPii(!showPii)}
                    isDisabled={!canViewPii}
                    colorScheme="red"
                  />
                </FormControl>
              </Tooltip>
            </HStack>
          )}
        </Flex>
      </Box>
      
      {/* Audio Controls */}
      {audioUrl && !isLoading && transcription && (
        <Flex p={4} alignItems="center" borderBottomWidth="1px" borderColor={borderColor}>
          <IconButton
            aria-label={isPlaying ? 'Pause' : 'Play'}
            icon={isPlaying ? <FiPause /> : <FiPlay />}
            onClick={togglePlayback}
            mr={4}
            isDisabled={isLoading || isProcessing}
          />
          
          <Slider
            value={currentTime}
            min={0}
            max={duration || 100}
            onChange={handleSliderChange}
            flex="1"
            mr={4}
            isDisabled={isLoading || isProcessing}
          >
            <SliderTrack>
              <SliderFilledTrack />
            </SliderTrack>
            <SliderThumb />
          </Slider>
          
          <Text fontSize="sm" fontFamily="mono">
            {formatTime(currentTime)} / {formatTime(duration)}
          </Text>
        </Flex>
      )}

      {/* PII Masking Information Banner */}
      {hasPiiMasking && !isLoading && !error && (
        <Box p={3} bg={piiInfoBg} borderBottomWidth="1px" borderColor={borderColor}>
          <Flex alignItems="center">
            <Icon as={FiShield} mr={2} />
            <Text fontSize="sm" fontWeight="medium">
              {transcription?.metadata?.piiMaskingMetadata?.itemsMasked && 
               Object.keys(transcription.metadata.piiMaskingMetadata.itemsMasked).length > 0 ? (
                <>
                  PII has been masked in this transcript. 
                  {Object.entries(transcription.metadata.piiMaskingMetadata.itemsMasked)
                    .map(([type, count]) => `${count} ${type.replace('_', ' ').toLowerCase()}${Number(count) !== 1 ? 's' : ''}`)
                    .join(', ')} detected.
                </>
              ) : (
                'PII masking has been applied to this transcript.'
              )}
            </Text>
          </Flex>
        </Box>
      )}
      
      {/* Loading State */}
      {isLoading && (
        <Box p={6}>
          <Skeleton height="20px" width="70%" mb={4} />
          <Skeleton height="20px" width="90%" mb={4} />
          <Skeleton height="20px" width="80%" mb={4} />
          <Skeleton height="20px" width="85%" mb={4} />
          <Skeleton height="20px" width="75%" />
        </Box>
      )}
      
      {/* Error State */}
      {error && (
        <Box p={6}>
          <Alert status="error" borderRadius="md">
            <AlertIcon />
            {error}
          </Alert>
          <Button mt={4} size="sm" onClick={fetchTranscription}>
            Retry
          </Button>
        </Box>
      )}
      
      {/* Processing State */}
      {isProcessing && (
        <Box p={6} textAlign="center">
          <FiLoader size={40} className="animate-spin" />
          <Text mt={4} fontWeight="medium">
            Processing Transcription...
          </Text>
          <Text fontSize="sm" color="gray.500" mt={2}>
            This may take a few minutes depending on the length of the call.
          </Text>
        </Box>
      )}
      
      {/* No Transcription State */}
      {!isLoading && !error && !isProcessing && !transcription && (
        <Box p={6} textAlign="center">
          <Text mb={4}>No transcription available for this call.</Text>
          <Button 
            colorScheme="blue" 
            leftIcon={<FiClock />}
            onClick={processTranscription}
            isLoading={isProcessing}
            loadingText="Processing..."
          >
            Process Transcription
          </Button>
        </Box>
      )}
      
      {/* Transcript Content */}
      {!isLoading && !error && transcription && (
        <Box>
          {/* View Mode Tabs */}
          <Tabs colorScheme="blue" isFitted size="sm" mt={2}>
            <TabList>
              <Tab><Flex align="center"><FiAlignLeft style={{marginRight: '8px'}} /> Full Text</Flex></Tab>
              <Tab><Flex align="center"><FiList style={{marginRight: '8px'}} /> Segments</Flex></Tab>
            </TabList>
            <TabPanels>
              {/* Full Text View */}
              <TabPanel>
                <Box 
                  p={6} 
                  maxHeight="500px" 
                  overflowY="auto"
                  whiteSpace="pre-wrap"
                  fontFamily="body"
                  fontSize="md"
                  lineHeight="tall"
                >
                  {getDisplayFullText()}
                </Box>
              </TabPanel>
              
              {/* Segmented View */}
              <TabPanel p={0}>
                <Box p={0} maxHeight="500px" overflowY="auto">
                  {getDisplaySegments().map((segment: TranscriptionSegment, index: number) => (
                    <Box
                      key={index}
                      ref={(el) => setSegmentRef(el, index)}
                      mb={2}
                      p={4}
                      bg={activeSegment === index ? highlightBg : 'transparent'}
                      borderLeftWidth="4px"
                      borderLeftColor={segment.speaker === 'Agent' ? 'blue.400' : 'green.400'}
                      cursor="pointer"
                      onClick={() => handleSegmentClick(index)}
                      transition="background-color 0.2s"
                      _hover={{ bg: useColorModeValue('gray.50', 'gray.600') }}
                    >
                      <Flex align="center" mb={1}>
                        <Badge colorScheme={segment.speaker === 'Agent' ? agentBadgeColor : customerBadgeColor}>
                          {segment.speaker}
                        </Badge>
                        <Text fontSize="xs" ml={2} color="gray.500">
                          {formatTime(segment.startTime)} - {formatTime(segment.endTime)}
                        </Text>
                        {segment.confidence && (
                          <Badge ml={2} colorScheme={segment.confidence > 0.8 ? 'green' : 'yellow'} variant="outline">
                            {Math.round(segment.confidence * 100)}%
                          </Badge>
                        )}
                      </Flex>
                      <Text>{segment.text}</Text>
                    </Box>
                  ))}
                </Box>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </Box>
      )}
    </Box>
  );
}