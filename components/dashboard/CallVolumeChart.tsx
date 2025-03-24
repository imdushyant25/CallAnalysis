// File location: components/dashboard/CallVolumeChart.tsx
/**
 * CallVolumeChart Component
 * Displays call volume trends over time with loading and error states
 */
'use client';

import { useState } from 'react';
import { 
  Box, 
  Heading, 
  useColorModeValue, 
  Flex, 
  Text, 
  Spinner, 
  Alert, 
  AlertIcon,
  ButtonGroup,
  Button
} from '@chakra-ui/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface CallVolumeChartProps {
  data: Array<{
    date: string;
    calls: number;
  }>;
  isLoading?: boolean;
  error?: Error | null;
}

const TIMEFRAME_OPTIONS = [
  { value: 'day', label: 'Daily' },
  { value: 'week', label: 'Weekly' },
  { value: 'month', label: 'Monthly' },
];

export default function CallVolumeChart({ data, isLoading = false, error = null }: CallVolumeChartProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState<'day' | 'week' | 'month'>('week');
  const barColor = useColorModeValue('blue.500', 'blue.300');
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  
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
          <Text color="blue.300">
            {payload[0].value} calls
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
    >
      <Flex justify="space-between" align="center" mb={4}>
        <Heading size="md">Call Volume</Heading>
        
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
            Failed to load call volume data
          </Alert>
        </Flex>
      ) : data.length === 0 ? (
        <Flex h="80%" justify="center" align="center">
          <Text color="gray.500">No call volume data available</Text>
        </Flex>
      ) : (
        <ResponsiveContainer width="100%" height="85%">
          <BarChart data={data} barSize={20}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis 
              dataKey="date" 
              tickFormatter={formatDate}
              axisLine={false}
              tickLine={false}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              width={30}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar 
              dataKey="calls" 
              fill={barColor} 
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </Box>
  );
}