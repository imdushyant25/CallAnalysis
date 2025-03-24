// File location: app/dashboard/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { 
  Box, 
  Grid, 
  GridItem, 
  Heading, 
  Text, 
  SimpleGrid, 
  useColorModeValue,
  Flex,
  Spinner,
  Alert,
  AlertIcon,
  Card,
  CardHeader,
  CardBody,
  Stack,
  Button,
  useToast
} from '@chakra-ui/react';
import Navbar from '@/components/ui/Navbar';
import Sidebar from '@/components/ui/Sidebar';
import PageContainer from '@/components/ui/PageContainer';
import OverviewCard from '@/components/dashboard/OverviewCard';
import SentimentChart from '@/components/dashboard/SentimentChart';
import CallVolumeChart from '@/components/dashboard/CallVolumeChart';
import DrugMentionsChart from '@/components/dashboard/DrugMentionsChart';
import RecentCallsList from '@/components/dashboard/RecentCallsList';
import { getCalls, getCallsTrend, getDrugMentions } from '@/lib/api/calls';
import { useApi } from '@/lib/hooks/useApi';

// Define the data structure for dashboard metrics
interface DashboardMetrics {
  totalCalls: string;
  avgSentiment: string;
  flaggedCalls: string;
  drugMentions: string;
}

// Define the data structure for a call
interface Call {
  id: string;
  timestamp: string;
  agentId: string;
  agentName?: string;
  duration: number;
  sentiment?: number;
}

// Define the data structure for sentiment trends
interface SentimentTrend {
  date: string;
  sentiment: number;
}

// Define the data structure for call volume
interface CallVolume {
  date: string;
  calls: number;
}

// Define the data structure for drug mentions
interface DrugMention {
  drug: string;
  count: number;
}

export default function DashboardPage() {
  const toast = useToast();
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');
  
  // Use our custom useApi hook for each data type
  const { 
    data: dashboardMetrics, 
    isLoading: isLoadingMetrics, 
    error: metricsError,
    refetch: refetchMetrics 
  } = useApi<DashboardMetrics>('/api/dashboard/metrics');
  
  const { 
    data: callsResponse, 
    isLoading: isLoadingCalls, 
    error: callsError,
    refetch: refetchCalls
  } = useApi<{ calls: Call[], pagination: any }>('/api/calls?limit=5');
  
  // Extract the calls array from the response
  const recentCalls = callsResponse?.calls || [];
  
  const { 
    data: sentimentTrend, 
    isLoading: isLoadingSentiment, 
    error: sentimentError,
    refetch: refetchSentiment
  } = useApi<SentimentTrend[]>('/api/dashboard/sentiment-trend');
  
  const { 
    data: callVolumeTrend, 
    isLoading: isLoadingVolume, 
    error: volumeError,
    refetch: refetchVolume
  } = useApi<CallVolume[]>('/api/dashboard/call-volume');
  
  const { 
    data: drugMentions, 
    isLoading: isLoadingDrugs, 
    error: drugsError,
    refetch: refetchDrugs
  } = useApi<DrugMention[]>('/api/dashboard/drug-mentions');
  
  // Determine if there's any loading happening
  const isLoading = isLoadingMetrics || isLoadingCalls || 
                    isLoadingSentiment || isLoadingVolume || isLoadingDrugs;
  
  // Combine all potential errors
  const anyError = metricsError || callsError || sentimentError || volumeError || drugsError;
  
  // Default metrics if data is not loaded yet
  const initialDashboardData = {
    totalCalls: '0',
    avgSentiment: '0',
    flaggedCalls: '0',
    drugMentions: '0',
  };
  
  // Function to handle refreshing all data
  const refreshData = () => {
    refetchMetrics();
    refetchCalls();
    refetchSentiment();
    refetchVolume();
    refetchDrugs();
    
    toast({
      title: "Dashboard refreshed",
      status: "success",
      duration: 3000,
      isClosable: true,
    });
  };
  
  return (
    <Box minH="100vh" bg={bgColor}>
      <Navbar />
      <Flex>
        <Sidebar />
        <PageContainer>
          <Flex justify="space-between" align="center" mb={6}>
            <Box>
              <Heading size="lg" mb={1}>Dashboard</Heading>
              <Text color="gray.500">Overview of pharmacy call metrics and insights</Text>
            </Box>
            
            <Button 
              colorScheme="blue" 
              size="sm" 
              onClick={refreshData}
              isLoading={isLoading}
              loadingText="Refreshing..."
            >
              Refresh Data
            </Button>
          </Flex>
          
          {anyError && (
            <Alert status="error" mb={6} borderRadius="md">
              <AlertIcon />
              There was an error loading some dashboard data. Please try refreshing.
            </Alert>
          )}
          
          {isLoading && !dashboardMetrics && !recentCalls ? (
            <Flex justify="center" align="center" h="60vh">
              <Spinner size="xl" thickness="4px" speed="0.65s" color="blue.500" />
            </Flex>
          ) : (
            <Stack spacing={6}>
              {/* Overview Cards */}
              <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6}>
                <OverviewCard 
                  title="Total Calls" 
                  value={dashboardMetrics?.totalCalls || initialDashboardData.totalCalls} 
                  icon="phone"
                  color="blue" 
                />
                <OverviewCard 
                  title="Avg. Sentiment" 
                  value={dashboardMetrics?.avgSentiment || initialDashboardData.avgSentiment} 
                  icon="sentiment"
                  color="green" 
                  suffix="%" 
                />
                <OverviewCard 
                  title="Flagged Calls" 
                  value={dashboardMetrics?.flaggedCalls || initialDashboardData.flaggedCalls} 
                  icon="flag"
                  color="red" 
                />
                <OverviewCard 
                  title="Drug Mentions" 
                  value={dashboardMetrics?.drugMentions || initialDashboardData.drugMentions} 
                  icon="medicine"
                  color="purple" 
                />
              </SimpleGrid>
              
              {/* Charts Row */}
              <SimpleGrid columns={{ base: 1, lg: 3 }} spacing={6}>
                <SentimentChart 
                  data={sentimentTrend || []}
                  isLoading={isLoadingSentiment}
                  error={sentimentError}
                />
                <CallVolumeChart 
                  data={callVolumeTrend || []}
                  isLoading={isLoadingVolume}
                  error={volumeError}
                />
                <DrugMentionsChart 
                  data={drugMentions || []}
                  isLoading={isLoadingDrugs}
                  error={drugsError}
                />
              </SimpleGrid>
              
              {/* Recent Activity */}
              <Card bg={cardBg} shadow="sm" borderRadius="lg">
                <CardHeader>
                  <Heading size="md">Recent Calls</Heading>
                </CardHeader>
                <CardBody>
                  <RecentCallsList 
                    calls={recentCalls}
                    isLoading={isLoadingCalls}
                    error={callsError}
                  />
                </CardBody>
              </Card>
            </Stack>
          )}
        </PageContainer>
      </Flex>
    </Box>
  );
}