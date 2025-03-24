/**
 * TranscriptionViewer Component
 * Displays call transcription with synchronized audio playback
 */
'use client';

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
  Spinner
} from '@chakra-ui/react';
import { FiPlay, FiPause } from 'react-icons/fi';
import { Transcription } from '@/lib/types/call';
import { getCallAudioUrl } from '@/lib/api/calls';

interface TranscriptionViewerProps {
  callId: string;
  initialTranscription?: Transcription | null;
}

interface TranscriptSegment {
  speaker: string;
  text: string;
  startTime: number;
  endTime: number;
}

export default function TranscriptionViewer({ callId, initialTranscription }: TranscriptionViewerProps) {
  // State for audio playback
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [activeSegment, setActiveSegment] = useState<number | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [transcription, setTranscription] = useState<Transcription | null>(initialTranscription || null);
  
  // Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Styling
  const bgColor = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const agentBadgeColor = 'blue';
  const customerBadgeColor = 'green';
  
  // Fetch audio URL if needed
  useEffect(() => {
    if (!audioUrl && callId) {
      const fetchAudioUrl = async () => {
        try {
          setIsLoading(true);
          const response = await getCallAudioUrl(callId);
          setAudioUrl(response.url);
        } catch (error) {
          console.error('Error fetching audio URL:', error);
        } finally {
          setIsLoading(false);
        }
      };
      
      fetchAudioUrl();
    }
  }, [callId, audioUrl]);
  
  // Process transcription segments
  const segments = transcription?.segments || [];
  
  // Setup audio element when URL is available
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
        const activeIndex = segments.findIndex(
          segment => audio.currentTime >= segment.startTime && audio.currentTime <= segment.endTime
        );
        
        if (activeIndex !== -1 && activeIndex !== activeSegment) {
          setActiveSegment(activeIndex);
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
  }, [audioUrl, segments]);
  
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
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' + secs : secs}`;
  };
  
  if (isLoading) {
    return (
      <Box
        p={6}
        display="flex"
        justifyContent="center"
        alignItems="center"
        borderWidth="1px"
        borderRadius="lg"
        bg={bgColor}
        borderColor={borderColor}
      >
        <Spinner size="md" mr={3} />
        <Text>Loading transcription...</Text>
      </Box>
    );
  }
  
  return (
    <Box
      borderWidth="1px"
      borderRadius="lg"
      overflow="hidden"
      bg={bgColor}
      borderColor={borderColor}
      boxShadow="sm"
      h="100%"
    >
      {/* Audio Controls */}
      {audioUrl && (
        <Flex p={4} alignItems="center" borderBottomWidth="1px" borderColor={borderColor}>
          <IconButton
            aria-label={isPlaying ? 'Pause' : 'Play'}
            icon={isPlaying ? <FiPause /> : <FiPlay />}
            onClick={togglePlayback}
            mr={4}
            isDisabled={!audioUrl}
          />
          
          <Slider
            value={currentTime}
            min={0}
            max={duration || 100}
            onChange={handleSliderChange}
            flex="1"
            mr={4}
            isDisabled={!audioUrl}
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
      
      {/* Transcript Content */}
      <Box p={4} maxHeight="500px" overflowY="auto">
        {segments.length > 0 ? (
          segments.map((segment, index) => (
            <Box
              key={index}
              mb={4}
              p={3}
              borderRadius="md"
              bg={activeSegment === index ? 'blue.50' : 'transparent'}
              _dark={{ bg: activeSegment === index ? 'blue.900' : 'transparent' }}
              borderLeftWidth="4px"
              borderLeftColor={segment.speaker === 'Agent' ? 'blue.400' : 'green.400'}
            >
              <Flex align="center" mb={1}>
                <Badge colorScheme={segment.speaker === 'Agent' ? agentBadgeColor : customerBadgeColor}>
                  {segment.speaker}
                </Badge>
                <Text fontSize="xs" ml={2} color="gray.500">
                  {formatTime(segment.startTime)}
                </Text>
              </Flex>
              <Text>{segment.text}</Text>
            </Box>
          ))
        ) : (
          <Text color="gray.500">No transcription data available</Text>
        )}
      </Box>
    </Box>
  );
}