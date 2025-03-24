// File location: app/dashboard/reports/page.tsx
'use client';

import ComingSoonPage from '@/components/ui/ComingSoonPage';
import { Icon } from '@chakra-ui/react';
import { FiFileText, FiMail, FiCalendar } from 'react-icons/fi';

export default function ReportsPage() {
  // Define specific features for Reports
  const reportsFeatures = [
    {
      title: 'Scheduled Reports',
      description: 'Set up automated reports to be delivered on your preferred schedule via email.',
      icon: <Icon as={FiCalendar} boxSize={8} color="orange.500" />,
      //estimatedRelease: 'Q3 2024'
    },
    {
      title: 'Customizable Exports',
      description: 'Create and export reports in multiple formats including PDF, CSV, and Excel.',
      icon: <Icon as={FiFileText} boxSize={8} color="blue.500" />,
      //estimatedRelease: 'Q2 2024'
    },
    {
      title: 'Shareable Insights',
      description: 'Easily share reports with team members through email or dashboard notifications.',
      icon: <Icon as={FiMail} boxSize={8} color="green.500" />,
      //estimatedRelease: 'Q3 2024'
    }
  ];
  
  return (
    <ComingSoonPage 
      featureName="Reports" 
      features={reportsFeatures} 
    />
  );
}