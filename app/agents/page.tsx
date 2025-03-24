// File location: app/agents/page.tsx
'use client';

import ComingSoonPage from '@/components/ui/ComingSoonPage';
import { Icon } from '@chakra-ui/react';
import { FiUsers, FiAward, FiBriefcase } from 'react-icons/fi';

export default function AgentsPage() {
  // Define specific features for Agents
  const agentsFeatures = [
    {
      title: 'Agent Performance Tracking',
      description: 'Track individual agent metrics including call quality, sentiment scores, and protocol adherence.',
      icon: <Icon as={FiAward} boxSize={8} color="blue.500" />,
      //estimatedRelease: 'Q2 2024'
    },
    {
      title: 'Team Management',
      description: 'Organize agents into teams and track team-based performance metrics.',
      icon: <Icon as={FiUsers} boxSize={8} color="green.500" />,
      //estimatedRelease: 'Q3 2024'
    },
    {
      title: 'Training Recommendations',
      description: 'Get AI-powered recommendations for agent training based on call analysis.',
      icon: <Icon as={FiBriefcase} boxSize={8} color="purple.500" />,
      //estimatedRelease: 'Q3 2024'
    }
  ];
  
  return (
    <ComingSoonPage 
      featureName="Agents" 
      features={agentsFeatures} 
    />
  );
}