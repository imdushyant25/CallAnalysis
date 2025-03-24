// File location: components/ui/ComingSoonPage.tsx
'use client';

import { 
  Box, 
  Heading, 
  Text, 
  Flex, 
  Icon, 
  Button, 
  useColorModeValue,
  VStack,
  Container,
  SimpleGrid,
  Card,
  CardBody
} from '@chakra-ui/react';
import { FiClock, FiCalendar, FiStar, FiArrowLeft } from 'react-icons/fi';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/ui/Navbar';
import Sidebar from '@/components/ui/Sidebar';
import PageContainer from '@/components/ui/PageContainer';

interface FeatureInfo {
  title: string;
  description: string;
  icon: React.ReactElement;
  estimatedRelease?: string;
}

interface ComingSoonPageProps {
  featureName: string;
  features?: FeatureInfo[];
}

export default function ComingSoonPage({ 
  featureName,
  features
}: ComingSoonPageProps) {
  const router = useRouter();
  const bgColor = useColorModeValue('blue.50', 'blue.900');
  const cardBg = useColorModeValue('white', 'gray.800');
  
  // Default features if none provided
  const defaultFeatures: FeatureInfo[] = [
    {
      title: 'Interactive Visualizations',
      description: 'Powerful charts and graphs to help you spot trends and patterns at a glance.',
      icon: <Icon as={FiStar} boxSize={8} color="blue.500" />,
      estimatedRelease: 'Q2 2024'
    },
    {
      title: 'Advanced Filtering',
      description: 'Drill down into specific data points with comprehensive filtering options.',
      icon: <Icon as={FiCalendar} boxSize={8} color="blue.500" />,
      estimatedRelease: 'Q2 2024'
    },
    {
      title: 'Export Capabilities',
      description: 'Save and share your insights with PDF and CSV export functionality.',
      icon: <Icon as={FiClock} boxSize={8} color="blue.500" />,
      estimatedRelease: 'Q3 2024'
    }
  ];
  
  // Use provided features or default ones
  const displayFeatures = features || defaultFeatures;
  
  return (
    <Box minH="100vh">
      <Navbar />
      <Flex>
        <Sidebar />
        <PageContainer>
          <Button
            leftIcon={<FiArrowLeft />}
            variant="outline"
            mb={6}
            onClick={() => router.push('/dashboard')}
          >
            Back to Dashboard
          </Button>
          
          <Box textAlign="center" py={10} px={6}>
            <Box
              display="inline-block"
              p={2}
              bg={bgColor}
              borderRadius="full"
              mb={6}
            >
              <Icon as={FiClock} boxSize={12} color="blue.500" />
            </Box>
            
            <Heading as="h2" size="xl" mb={2}>
              {featureName} Coming Soon
            </Heading>
            
            <Container maxW="container.lg" mt={16}>
              <SimpleGrid columns={{ base: 1, md: 3 }} spacing={10}>
                {displayFeatures.map((feature, index) => (
                  <Card 
                    key={index}
                    bg={cardBg}
                    borderRadius="lg"
                    boxShadow="md"
                    transition="transform 0.3s"
                    _hover={{ transform: 'translateY(-5px)' }}
                  >
                    <CardBody>
                      <VStack spacing={4}>
                        <Box>
                          {feature.icon}
                        </Box>
                        <Heading as="h3" size="md">
                          {feature.title}
                        </Heading>
                        <Text textAlign="center" color="gray.500" _dark={{ color: 'gray.400' }}>
                          {feature.description}
                        </Text>
                        {feature.estimatedRelease && (
                          <Text fontSize="sm" fontWeight="bold" color="blue.500">
                            Target: {feature.estimatedRelease}
                          </Text>
                        )}
                      </VStack>
                    </CardBody>
                  </Card>
                ))}
              </SimpleGrid>
            </Container>
            
            <Button
              colorScheme="blue"
              size="lg"
              mt={12}
              onClick={() => router.push('/dashboard')}
            >
              Return to Dashboard
            </Button>
          </Box>
        </PageContainer>
      </Flex>
    </Box>
  );
}