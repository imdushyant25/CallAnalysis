// File location: components/dashboard/SentimentChart.tsx
/**
 * SentimentChart Component
 * Displays sentiment trends over time with loading and error states
 */
'use client';

import { useState, useEffect } from 'react';
import { 
  Box, 
  Heading, 
  useColorModeValue, 
  Flex, 
  Text, 
  Spinner, 
  Alert, 
  AlertIcon,
  Select,
  ButtonGroup,
  Button
} from '@chakra-ui/react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface SentimentChartProps {
  data: Array<{
    date: string;
    sentiment: number;
  }>;
  isLoading?: boolean;
  error?: Error | null;
}

const TIMEFRAME_OPTIONS = [
  { value: 'day', label: 'Daily' },
  { value: 'week', label: 'Weekly' },
  { value: 'month', label: 'Monthly' },
];

export default function SentimentChart({ data, isLoading = false, error = null }: SentimentChartProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState<'day' | 'week' | 'month'>('week');
  const lineColor = useColorModeValue('green.500', 'green.300');
  const bgColor = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  
  // Format dates for better readability
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    
    // Different format based on timeframe
    if (selectedTimeframe === 'day') {
      return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
    } else if (selectedTimeframe === 'week') {
      return `Week ${date.getDate() <= 7 ? '1' : date.getDate() <= 14 ? '2' : date.getDate() <= 21 ? '3' : '4'} ${new Intl.DateTimeFormat('en-US', { month: 'short' }).format(date)}`;
    } else {
      return new Intl.DateTimeFormat('en-US', { month: 'short', year: '2-digit' }).format(date);
    }
  };
  
  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <Box
          bg="gray.700"
          p={2}
          borderRadius="md"
          boxShadow="md"
          border="1px solid"
          borderColor="gray.600"
        >
          <Text fontWeight="bold" color="white">{label}</Text>
          <Text color="green.300">
            Sentiment: {payload[0].value}%
          </Text>
        </Box>
      );
    }
    
    return null;
  };
  
  // Handle timeframe change
  const handleTimeframeChange = (timeframe: 'day' | 'week' | 'month') => {
    setSelectedTimeframe(timeframe);
    // In a real implementation, you would fetch new data here
  };
  
  return (
    <Box
      borderWidth="1px"
      borderRadius="lg"
      overflow="hidden"
      p={5}
      bg={bgColor}
      borderColor={borderColor}
      boxShadow="sm"
      height="300px"
      position="relative"
    >
      <Flex justify="space-between" align="center" mb={4}>
        <Heading size="md">Average Sentiment</Heading>
        
        <ButtonGroup size="xs" isAttached variant="outline">
          {TIMEFRAME_OPTIONS.map((option) => (
            <Button
              key={option.value}
              isActive={selectedTimeframe === option.value}
              onClick={() => handleTimeframeChange(option.value as 'day' | 'week' | 'month')}
              fontWeight={selectedTimeframe === option.value ? 'bold' : 'normal'}
            >
              {option.label}
            </Button>
          ))}
        </ButtonGroup>
      </Flex>
      
      {isLoading ? (
        <Flex h="80%" justify="center" align="center">
          <Spinner size="xl" color="blue.500" />
        </Flex>
      ) : error ? (
        <Flex h="80%" justify="center" align="center">
          <Alert status="error" borderRadius="md" maxW="90%">
            <AlertIcon />
            Failed to load sentiment data
          </Alert>
        </Flex>
      ) : data.length === 0 ? (
        <Flex h="80%" justify="center" align="center">
          <Text color="gray.500">No sentiment data available</Text>
        </Flex>
      ) : (
        <ResponsiveContainer width="100%" height="85%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis 
              dataKey="date" 
              tickFormatter={formatDate}
              axisLine={false}
              tickLine={false}
            />
            <YAxis 
              domain={[0, 100]} 
              axisLine={false}
              tickLine={false}
              width={30}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line 
              type="monotone" 
              dataKey="sentiment" 
              stroke={lineColor} 
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </Box>
  );
}