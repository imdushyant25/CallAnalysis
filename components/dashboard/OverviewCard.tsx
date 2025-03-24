// File location: components/dashboard/OverviewCard.tsx
/**
 * OverviewCard Component
 * Displays a key metric with a title, icon, and value
 */
'use client';

import { 
  Box, 
  Stat, 
  StatLabel, 
  StatNumber, 
  StatHelpText, 
  Flex, 
  Icon, 
  useColorModeValue 
} from '@chakra-ui/react';
import { FiPhone, FiFlag, FiTrendingUp, FiActivity } from 'react-icons/fi';
import { RiMedicineBottleLine } from 'react-icons/ri';
import { MdSentimentSatisfied } from 'react-icons/md';

interface OverviewCardProps {
  title: string;
  value: string;
  icon?: 'phone' | 'flag' | 'sentiment' | 'medicine' | 'trend' | 'activity';
  change?: string;
  suffix?: string;
  color?: 'blue' | 'green' | 'red' | 'purple' | 'orange' | 'teal';
}

export default function OverviewCard({ 
  title, 
  value, 
  icon = 'trend', 
  change, 
  suffix = '', 
  color = 'blue' 
}: OverviewCardProps) {
  const bg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  
  // Define color schemes for different card types
  const colorScheme = {
    blue: {
      light: 'blue.100',
      dark: 'blue.500',
    },
    green: {
      light: 'green.100',
      dark: 'green.500',
    },
    red: {
      light: 'red.100',
      dark: 'red.500',
    },
    purple: {
      light: 'purple.100',
      dark: 'purple.500',
    },
    orange: {
      light: 'orange.100',
      dark: 'orange.500',
    },
    teal: {
      light: 'teal.100',
      dark: 'teal.500',
    },
  };
  
  // Get the correct icon
  const getIcon = () => {
    switch (icon) {
      case 'phone':
        return FiPhone;
      case 'flag':
        return FiFlag;
      case 'sentiment':
        return MdSentimentSatisfied;
      case 'medicine':
        return RiMedicineBottleLine;
      case 'activity':
        return FiActivity;
      case 'trend':
      default:
        return FiTrendingUp;
    }
  };
  
  const CardIcon = getIcon();
  
  return (
    <Box
      bg={bg}
      borderRadius="lg"
      borderWidth="1px"
      borderColor={borderColor}
      overflow="hidden"
      boxShadow="sm"
      p={4}
      transition="all 0.3s"
      _hover={{ transform: 'translateY(-2px)', boxShadow: 'md' }}
    >
      <Flex align="center" justify="space-between">
        <Stat>
          <StatLabel fontWeight="medium" isTruncated>
            {title}
          </StatLabel>
          <StatNumber fontSize="2xl" fontWeight="bold">
            {value}{suffix}
          </StatNumber>
          {change && (
            <StatHelpText>
              {change}
            </StatHelpText>
          )}
        </Stat>
        
        <Flex
          w="3rem"
          h="3rem"
          align="center"
          justify="center"
          borderRadius="full"
          bg={colorScheme[color].light}
          color={colorScheme[color].dark}
        >
          <Icon as={CardIcon} boxSize="1.5rem" />
        </Flex>
      </Flex>
    </Box>
  );
}