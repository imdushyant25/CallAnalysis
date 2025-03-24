// File location: components/dashboard/DrugMentionsChart.tsx
/**
 * DrugMentionsChart Component
 * Displays most frequently mentioned drugs with loading and error states
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
  Select,
  HStack,
  NumberInput,
  NumberInputField, 
  NumberInputStepper, 
  NumberIncrementStepper, 
  NumberDecrementStepper
} from '@chakra-ui/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DrugMentionsChartProps {
  data: Array<{
    drug: string;
    count: number;
  }>;
  isLoading?: boolean;
  error?: Error | null;
}

export default function DrugMentionsChart({ data, isLoading = false, error = null }: DrugMentionsChartProps) {
  const [limit, setLimit] = useState<number>(7);
  const barColor = useColorModeValue('purple.500', 'purple.300');
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  
  // Truncate drug names that are too long
  const formatDrugName = (name: string) => {
    if (name.length > 15) {
      return name.substring(0, 12) + '...';
    }
    return name;
  };
  
  // Handle limit change
  const handleLimitChange = (value: number) => {
    setLimit(value);
    // In a real implementation, you would fetch new data here
  };
  
  // Sort data by count in descending order and limit to specified number
  const sortedData = [...data]
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
  
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
        <Heading size="md">Top Drug Mentions</Heading>
        
        <HStack spacing={2}>
          <Text fontSize="xs" color="gray.500">Show:</Text>
          <NumberInput 
            size="xs" 
            maxW="70px" 
            value={limit} 
            min={3} 
            max={20}
            onChange={(_, value) => handleLimitChange(value)}
          >
            <NumberInputField />
            <NumberInputStepper>
              <NumberIncrementStepper />
              <NumberDecrementStepper />
            </NumberInputStepper>
          </NumberInput>
        </HStack>
      </Flex>
      
      {isLoading ? (
        <Flex h="80%" justify="center" align="center">
          <Spinner size="xl" color="purple.500" />
        </Flex>
      ) : error ? (
        <Flex h="80%" justify="center" align="center">
          <Alert status="error" borderRadius="md" maxW="90%">
            <AlertIcon />
            Failed to load drug mentions data
          </Alert>
        </Flex>
      ) : data.length === 0 ? (
        <Flex h="80%" justify="center" align="center">
          <Text color="gray.500">No drug mentions data available</Text>
        </Flex>
      ) : (
        <ResponsiveContainer width="100%" height="85%">
          <BarChart 
            data={sortedData} 
            layout="vertical"
            margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
            <XAxis 
              type="number" 
              axisLine={false} 
              tickLine={false} 
            />
            <YAxis 
              type="category" 
              dataKey="drug" 
              axisLine={false} 
              tickLine={false}
              width={80}
              tick={{ fontSize: 12 }}
              tickFormatter={formatDrugName}
            />
            <Tooltip 
              formatter={(value) => [`${value} mentions`, 'Count']}
              labelFormatter={(label) => `Drug: ${label}`}
            />
            <Bar 
              dataKey="count" 
              fill={barColor} 
              radius={[0, 4, 4, 0]}
              barSize={14}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </Box>
  );
}