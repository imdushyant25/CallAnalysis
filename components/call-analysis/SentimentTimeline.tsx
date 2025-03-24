'use client';

import { useEffect, useRef, useState } from 'react';
import { 
  Box, 
  Heading, 
  Text, 
  Flex, 
  VStack,
  HStack,
  Badge,
  Tooltip,
  useColorModeValue
} from '@chakra-ui/react';
import { SentimentData } from '@/lib/types/analysis';

interface SentimentTimelineProps {
  sentimentData: SentimentData;
  duration: number;
}

const SentimentTimeline = ({ sentimentData, duration }: SentimentTimelineProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  
  // Colors for sentiment levels
  const highColor = useColorModeValue('green.500', 'green.300');
  const mediumColor = useColorModeValue('blue.500', 'blue.300');
  const neutralColor = useColorModeValue('gray.500', 'gray.400');
  const lowColor = useColorModeValue('orange.500', 'orange.300');
  const veryLowColor = useColorModeValue('red.500', 'red.300');
  
  // Get container width on mount and resize
  useEffect(() => {
    if (!containerRef.current) return;
    
    const updateWidth = () => {
      if (containerRef.current) {
        setWidth(containerRef.current.offsetWidth);
      }
    };
    
    // Initial width
    updateWidth();
    
    // Update on resize
    window.addEventListener('resize', updateWidth);
    
    return () => {
      window.removeEventListener('resize', updateWidth);
    };
  }, []);
  
  // Helper to format time
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Helper to get color based on sentiment score
  const getSentimentColor = (score: number): string => {
    if (score >= 80) return highColor;
    if (score >= 60) return mediumColor;
    if (score >= 40) return neutralColor;
    if (score >= 20) return lowColor;
    return veryLowColor;
  };
  
  // If we don't have timeline data, render placeholder
  if (!sentimentData.timeline || sentimentData.timeline.length === 0) {
    return (
      <Box p={4} borderWidth="1px" borderRadius="md">
        <Text>No sentiment timeline data available.</Text>
      </Box>
    );
  }
  
  return (
    <Box ref={containerRef} w="100%">
      {/* Overall score display */}
      <Flex justify="space-between" align="center" mb={4}>
        <Text fontWeight="medium">Overall Sentiment:</Text>
        <Badge 
          colorScheme={getSentimentColor(sentimentData.overallScore) === highColor ? 'green' : 
            getSentimentColor(sentimentData.overallScore) === mediumColor ? 'blue' :
            getSentimentColor(sentimentData.overallScore) === lowColor ? 'orange' :
            getSentimentColor(sentimentData.overallScore) === veryLowColor ? 'red' : 'gray'}
          fontSize="lg"
          px={2}
          py={1}
          borderRadius="md"
        >
          {sentimentData.overallScore}
        </Badge>
      </Flex>
      
      {/* Emotion tags */}
      <Flex mb={4} flexWrap="wrap" gap={2}>
        {sentimentData.emotionTags.map((tag, index) => (
          <Badge key={index} colorScheme="blue" variant="subtle">
            {tag}
          </Badge>
        ))}
      </Flex>
      
      {/* Timeline visualization */}
      <Box
        position="relative"
        h="100px"
        bg={useColorModeValue('gray.100', 'gray.700')}
        borderRadius="md"
        overflow="hidden"
        mb={4}
      >
        {/* Time markers */}
        <Flex 
          position="absolute"
          w="100%"
          h="20px"
          bottom="0"
          bg={useColorModeValue('gray.200', 'gray.600')}
          zIndex="1"
        >
          {[0, 0.25, 0.5, 0.75, 1].map((fraction) => (
            <Text
              key={fraction}
              position="absolute"
              left={`${fraction * 100}%`}
              transform="translateX(-50%)"
              fontSize="xs"
              color={useColorModeValue('gray.500', 'gray.400')}
            >
              {formatTime(duration * fraction)}
            </Text>
          ))}
        </Flex>
        
        {/* Sentiment points */}
        {sentimentData.timeline.map((point, index) => {
          // Calculate position as percentage of total width
          const position = (point.time / duration) * 100;
          
          return (
            <Tooltip 
              key={index} 
              label={`Score: ${point.score} at ${formatTime(point.time)}`}
              placement="top"
              hasArrow
            >
              <Box
                position="absolute"
                left={`${position}%`}
                bottom="20px" // Above time markers
                w="2px"
                h={`${point.score * 0.8}%`} // Scale to fit within container
                bg={getSentimentColor(point.score)}
                zIndex="2"
              />
            </Tooltip>
          );
        })}
      </Box>
      
      {/* Escalation points */}
      <Box>
        <Heading size="xs" mb={2}>Key Moments</Heading>
        <VStack align="stretch" spacing={2}>
          {sentimentData.escalationPoints.map((point, index) => (
            <Box 
              key={index} 
              borderWidth="1px" 
              borderRadius="md"
              p={2}
              borderColor={
                point.reason.toLowerCase().includes('escalation') ? 'red.300' : 
                point.reason.toLowerCase().includes('de-escalation') ? 'green.300' : 
                'gray.300'
              }
            >
              <HStack>
                <Text fontWeight="bold" mr={2}>
                  {typeof point.time === 'number' ? formatTime(point.time) : point.time}:
                </Text>
                <Text>{point.text}</Text>
              </HStack>
              <Text fontSize="sm" color="gray.500" ml={6}>{point.reason}</Text>
            </Box>
          ))}
        </VStack>
      </Box>
    </Box>
  );
};

export default SentimentTimeline;