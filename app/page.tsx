// File location: app/page.tsx
/**
 * Main Application Entry Point
 * Serves as the landing page and redirects to the dashboard
 */
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Box, 
  Container, 
  Heading, 
  Text, 
  Button, 
  Flex, 
  Image, 
  Stack,
  SimpleGrid,
  Icon,
  useColorModeValue
} from '@chakra-ui/react';
import { FiPhone, FiBarChart2, FiTrendingUp, FiUploadCloud } from 'react-icons/fi';
import Link from 'next/link';

// Feature card component for the landing page
function FeatureCard({ title, description, icon }: { title: string; description: string; icon: React.ElementType }) {
  return (
    <Box
      p={6}
      borderWidth="1px"
      borderRadius="lg"
      borderColor={useColorModeValue('gray.200', 'gray.700')}
      bg={useColorModeValue('white', 'gray.800')}
      boxShadow="sm"
      transition="all 0.3s"
      _hover={{
        transform: 'translateY(-5px)',
        boxShadow: 'md',
      }}
    >
      <Flex
        w="60px"
        h="60px"
        align="center"
        justify="center"
        borderRadius="md"
        bg={useColorModeValue('blue.50', 'blue.900')}
        color={useColorModeValue('blue.600', 'blue.300')}
        mb={4}
      >
        <Icon as={icon} boxSize={6} />
      </Flex>
      <Heading size="md" mb={2}>
        {title}
      </Heading>
      <Text color={useColorModeValue('gray.600', 'gray.400')}>
        {description}
      </Text>
    </Box>
  );
}

export default function HomePage() {
  const router = useRouter();
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const textColor = useColorModeValue('gray.800', 'gray.100');
  const buttonBg = useColorModeValue('blue.500', 'blue.400');
  
  // Uncomment to automatically redirect to dashboard
  // Useful for production when landing page is not needed
  /*
  useEffect(() => {
    router.push('/dashboard');
  }, [router]);
  */
  
  return (
    <Box bg={bgColor} minH="100vh">
      {/* Hero Section */}
      <Box bg="blue.600" color="white" py={20} px={4}>
        <Container maxW="container.xl">
          <Flex direction={{ base: 'column', lg: 'row' }} align="center" justify="space-between">
            <Box maxW={{ base: '100%', lg: '50%' }} mb={{ base: 10, lg: 0 }}>
              <Heading as="h1" size="2xl" fontWeight="bold" mb={4}>
                Pharmacy Call Analysis Platform
              </Heading>
              <Text fontSize="xl" mb={6} opacity={0.9}>
                A comprehensive solution for analyzing customer service calls in pharmacy benefits administration.
              </Text>
              <Stack direction={{ base: 'column', sm: 'row' }} spacing={4}>
                <Link href="/dashboard" passHref>
                  <Button size="lg" bg={buttonBg} _hover={{ bg: 'blue.600' }}>
                    Go to Dashboard
                  </Button>
                </Link>
                <Link href="/upload" passHref>
                  <Button size="lg" variant="outline" _hover={{ bg: 'whiteAlpha.200' }}>
                    Upload Calls
                  </Button>
                </Link>
              </Stack>
            </Box>
            <Box
              maxW={{ base: '100%', lg: '45%' }}
              borderRadius="lg"
              overflow="hidden"
              boxShadow="xl"
              bg="whiteAlpha.100"
              p={1}
            >
              {/* Placeholder for dashboard preview image */}
              <Box
                h="300px"
                bg="blue.700"
                borderRadius="md"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <Text fontSize="lg" fontWeight="medium">Dashboard Preview</Text>
              </Box>
            </Box>
          </Flex>
        </Container>
      </Box>
      
      {/* Features Section */}
      <Container maxW="container.xl" py={16}>
        <Heading as="h2" size="xl" textAlign="center" mb={12} color={textColor}>
          Key Features
        </Heading>
        <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={8}>
          <FeatureCard
            title="Call Analysis"
            description="AI-powered analysis of call transcripts to extract insights and identify trends."
            icon={FiPhone}
          />
          <FeatureCard
            title="Performance Metrics"
            description="Track agent performance and customer satisfaction with detailed metrics."
            icon={FiBarChart2}
          />
          <FeatureCard
            title="Trend Analysis"
            description="Identify trends in call topics, sentiment, and drug mentions over time."
            icon={FiTrendingUp}
          />
          <FeatureCard
            title="Easy Uploads"
            description="Simple interface for uploading and processing call recordings."
            icon={FiUploadCloud}
          />
        </SimpleGrid>
      </Container>
      
      {/* Footer */}
      <Box bg={useColorModeValue('gray.100', 'gray.800')} py={8}>
        <Container maxW="container.xl">
          <Flex direction={{ base: 'column', md: 'row' }} justify="space-between" align="center">
            <Text>&copy; 2024 Pharmacy Call Analysis Platform</Text>
            <Flex mt={{ base: 4, md: 0 }}>
              <Link href="/about" passHref>
                <Text mx={3} cursor="pointer" _hover={{ color: 'blue.500' }}>About</Text>
              </Link>
              <Link href="/contact" passHref>
                <Text mx={3} cursor="pointer" _hover={{ color: 'blue.500' }}>Contact</Text>
              </Link>
              <Link href="/privacy" passHref>
                <Text mx={3} cursor="pointer" _hover={{ color: 'blue.500' }}>Privacy</Text>
              </Link>
            </Flex>
          </Flex>
        </Container>
      </Box>
    </Box>
  );
}