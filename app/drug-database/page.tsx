// File location: app/drug-database/page.tsx
'use client';

import ComingSoonPage from '@/components/ui/ComingSoonPage';
import { Icon } from '@chakra-ui/react';
import { FiSearch, FiDatabase, FiActivity } from 'react-icons/fi';
import { RiMedicineBottleLine } from 'react-icons/ri';

export default function DrugDatabasePage() {
  // Define specific features for Drug Database
  const drugDatabaseFeatures = [
    {
      title: 'Comprehensive Medication Library',
      description: 'Access detailed information on thousands of medications including generics and brand names.',
      icon: <Icon as={RiMedicineBottleLine} boxSize={8} color="blue.500" />,
      estimatedRelease: 'Q3 2024'
    },
    {
      title: 'Advanced Search',
      description: 'Find medications by name, class, indication, or formulary status with intelligent search capabilities.',
      icon: <Icon as={FiSearch} boxSize={8} color="green.500" />,
      estimatedRelease: 'Q3 2024'
    },
    {
      title: 'Formulary Integration',
      description: 'View formulary status, prior authorization requirements, and coverage details for each medication.',
      icon: <Icon as={FiDatabase} boxSize={8} color="purple.500" />,
      estimatedRelease: 'Q4 2024'
    }
  ];
  
  return (
    <ComingSoonPage 
      featureName="Drug Database" 
      features={drugDatabaseFeatures} 
    />
  );
}