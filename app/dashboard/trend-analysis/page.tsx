// File location: app/dashboard/trend-analysis/page.tsx
'use client';

import ComingSoonPage from '@/components/ui/ComingSoonPage';
import { Icon } from '@chakra-ui/react';
import { FiTrendingUp, FiBarChart2, FiPieChart } from 'react-icons/fi';
import { RiMedicineBottleLine } from 'react-icons/ri';

export default function TrendAnalysisPage() {
  // Define specific features for Trend Analysis
  const trendAnalysisFeatures = [
    {
      title: 'Drug Mention Trends',
      description: 'Track medications mentioned over time to identify patterns and new medications gaining traction.',
      icon: <Icon as={RiMedicineBottleLine} boxSize={8} color="blue.500" />,
      //estimatedRelease: 'Q2 2024'
    },
    {
      title: 'Sentiment Analysis',
      description: 'Visualize how member sentiment evolves over time, potentially tied to specific events or policy changes.',
      icon: <Icon as={FiTrendingUp} boxSize={8} color="green.500" />,
      //estimatedRelease: 'Q2 2024'
    },
    {
      title: 'Call Volume Patterns',
      description: 'Identify peak times and staffing needs with detailed call volume analytics by day, week, or month.',
      icon: <Icon as={FiBarChart2} boxSize={8} color="purple.500" />,
      //estimatedRelease: 'Q3 2024'
    }
  ];
  
  return (
    <ComingSoonPage 
      featureName="Trend Analysis" 
      features={trendAnalysisFeatures} 
    />
  );
}