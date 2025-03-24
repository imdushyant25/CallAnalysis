'use client';

import { useState, useEffect } from 'react';
import { 
  Box, 
  Heading, 
  Text, 
  Flex, 
  Button, 
  Select, 
  SimpleGrid,
  Card, 
  CardHeader, 
  CardBody,
  Tabs, 
  TabList, 
  TabPanels, 
  Tab, 
  TabPanel,
  Alert,
  AlertIcon,
  Badge,
  Progress,
  Spinner,
  UnorderedList,
  ListItem,
  useColorModeValue
} from '@chakra-ui/react';
import { FiRefreshCw, FiSearch } from 'react-icons/fi';
import Navbar from '@/components/ui/Navbar';
import Sidebar from '@/components/ui/Sidebar';
import PageContainer from '@/components/ui/PageContainer';
import AnalysisViewer from '@/components/call-analysis/AnalysisViewer';
import TranscriptionViewer from '@/components/call-analysis/TranscriptionViewer';
import SentimentTimeline from '@/components/call-analysis/SentimentTimeline';
import { getCalls, CallFilters, getCallData, CompleteCallData } from '@/lib/api/calls';

export default function CallComparisonPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [availableCalls, setAvailableCalls] = useState<Array<{id: string, label: string}>>([]);
  const [selectedCall1, setSelectedCall1] = useState<string>('');
  const [selectedCall2, setSelectedCall2] = useState<string>('');
  const [call1Data, setCall1Data] = useState<CompleteCallData | null>(null);
  const [call2Data, setCall2Data] = useState<CompleteCallData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  
  const bgColor = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  // Fetch available calls for comparison
  useEffect(() => {
    const fetchCalls = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Only fetch calls that have both transcription and analysis
        const filters: CallFilters = {
          limit: 50,
          sortBy: 'timestamp',
          sortDirection: 'desc'
        };
        
        const response = await getCalls(filters);
        
        // Transform the call data for the select dropdown
        const callOptions = response.calls.map(call => ({
          id: call.id,
          label: `Call ${call.id.substring(0, 8)} - ${new Date(call.timestamp).toLocaleString()} - ${Math.floor(call.duration / 60)}m ${call.duration % 60}s`,
        }));
        
        setAvailableCalls(callOptions);
      } catch (err) {
        console.error('Error fetching calls:', err);
        setError('Failed to load available calls. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchCalls();
  }, []);

  // Fetch call data when selections change
  useEffect(() => {
    const fetchCallData = async () => {
      if (!selectedCall1 && !selectedCall2) return;
      
      try {
        setIsLoading(true);
        setError(null);
        
        // Fetch first call if selected
        if (selectedCall1) {
          const data1 = await getCallData(selectedCall1);
          setCall1Data(data1);
        }
        
        // Fetch second call if selected
        if (selectedCall2) {
          const data2 = await getCallData(selectedCall2);
          setCall2Data(data2);
        }
      } catch (err) {
        console.error('Error fetching call data:', err);
        setError('Failed to load call data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchCallData();
  }, [selectedCall1, selectedCall2]);

  // Helper function to get color based on score
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'green';
    if (score >= 60) return 'blue';
    if (score >= 40) return 'yellow';
    return 'red';
  };

  // Compare metrics between calls
  const compareMetrics = () => {
    if (!call1Data?.analysis || !call2Data?.analysis) return null;
    
    const analysis1 = call1Data.analysis;
    const analysis2 = call2Data.analysis;
    
    return (
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6} mb={6}>
        {/* Sentiment Comparison */}
        <Card>
          <CardHeader bg={useColorModeValue('blue.50', 'blue.900')}>
            <Heading size="sm">Sentiment Comparison</Heading>
          </CardHeader>
          <CardBody>
            <Flex direction="column" gap={4}>
              <Flex justify="space-between" align="center">
                <Text fontWeight="medium">Call 1</Text>
                <Box w="60%">
                  <Progress
                    value={analysis1.sentiment.overallScore}
                    colorScheme={getScoreColor(analysis1.sentiment.overallScore)}
                    borderRadius="md"
                    size="sm"
                  />
                </Box>
                <Badge colorScheme={getScoreColor(analysis1.sentiment.overallScore)}>
                  {analysis1.sentiment.overallScore}
                </Badge>
              </Flex>
              
              <Flex justify="space-between" align="center">
                <Text fontWeight="medium">Call 2</Text>
                <Box w="60%">
                  <Progress
                    value={analysis2.sentiment.overallScore}
                    colorScheme={getScoreColor(analysis2.sentiment.overallScore)}
                    borderRadius="md"
                    size="sm"
                  />
                </Box>
                <Badge colorScheme={getScoreColor(analysis2.sentiment.overallScore)}>
                  {analysis2.sentiment.overallScore}
                </Badge>
              </Flex>
              
              <Flex justify="space-between" align="center" mt={2}>
                <Text fontWeight="medium">Difference</Text>
                <Badge colorScheme={analysis1.sentiment.overallScore >= analysis2.sentiment.overallScore ? 'green' : 'red'}>
                  {Math.abs(analysis1.sentiment.overallScore - analysis2.sentiment.overallScore).toFixed(1)}
                </Badge>
              </Flex>
            </Flex>
          </CardBody>
        </Card>
        
        {/* Agent Performance Comparison */}
        <Card>
          <CardHeader bg={useColorModeValue('green.50', 'green.900')}>
            <Heading size="sm">Agent Performance Comparison</Heading>
          </CardHeader>
          <CardBody>
            <Box mb={6}>
              <SimpleGrid columns={4} mb={4} textAlign="center">
                <Box></Box>
                <Text fontWeight="bold" color={useColorModeValue('blue.600', 'blue.300')}>
                  Call 1
                </Text>
                <Text fontWeight="bold" color={useColorModeValue('green.600', 'green.300')}>
                  Call 2
                </Text>
                <Text fontWeight="bold" color="gray.500">
                  Difference
                </Text>
              </SimpleGrid>
              
              {/* Communication Score */}
              <Box 
                mb={4} 
                p={3} 
                borderRadius="md" 
                bg={useColorModeValue('gray.50', 'gray.700')}
              >
                <SimpleGrid columns={4} gap={2} alignItems="center">
                  <Text fontWeight="medium">Communication</Text>
                  
                  <Box>
                    <Progress 
                      value={analysis1.agentPerformance.communicationScore} 
                      size="sm" 
                      colorScheme="blue" 
                      borderRadius="full"
                      mb={1}
                    />
                    <Text 
                      textAlign="center" 
                      fontWeight="medium"
                      color="blue.500"
                    >
                      {analysis1.agentPerformance.communicationScore}
                    </Text>
                  </Box>
                  
                  <Box>
                    <Progress 
                      value={analysis2.agentPerformance.communicationScore} 
                      size="sm" 
                      colorScheme="green" 
                      borderRadius="full"
                      mb={1}
                    />
                    <Text 
                      textAlign="center" 
                      fontWeight="medium"
                      color="green.500"
                    >
                      {analysis2.agentPerformance.communicationScore}
                    </Text>
                  </Box>
                  
                  <Box textAlign="center">
                    {Math.abs(analysis1.agentPerformance.communicationScore - analysis2.agentPerformance.communicationScore) > 0 ? (
                      <Badge 
                        colorScheme={analysis1.agentPerformance.communicationScore > analysis2.agentPerformance.communicationScore ? "blue" : "green"}
                        fontSize="sm"
                        p={1}
                      >
                        {Math.abs(analysis1.agentPerformance.communicationScore - analysis2.agentPerformance.communicationScore)} pts
                      </Badge>
                    ) : (
                      <Badge colorScheme="gray">Equal</Badge>
                    )}
                  </Box>
                </SimpleGrid>
              </Box>
              
              {/* Protocol Adherence */}
              <Box 
                mb={4} 
                p={3} 
                borderRadius="md" 
                bg={useColorModeValue('gray.50', 'gray.700')}
              >
                <SimpleGrid columns={4} gap={2} alignItems="center">
                  <Text fontWeight="medium">Protocol</Text>
                  
                  <Box>
                    <Progress 
                      value={analysis1.agentPerformance.adherenceToProtocol} 
                      size="sm" 
                      colorScheme="blue" 
                      borderRadius="full"
                      mb={1}
                    />
                    <Text 
                      textAlign="center" 
                      fontWeight="medium"
                      color="blue.500"
                    >
                      {analysis1.agentPerformance.adherenceToProtocol}
                    </Text>
                  </Box>
                  
                  <Box>
                    <Progress 
                      value={analysis2.agentPerformance.adherenceToProtocol} 
                      size="sm" 
                      colorScheme="green" 
                      borderRadius="full"
                      mb={1}
                    />
                    <Text 
                      textAlign="center" 
                      fontWeight="medium"
                      color="green.500"
                    >
                      {analysis2.agentPerformance.adherenceToProtocol}
                    </Text>
                  </Box>
                  
                  <Box textAlign="center">
                    {Math.abs(analysis1.agentPerformance.adherenceToProtocol - analysis2.agentPerformance.adherenceToProtocol) > 0 ? (
                      <Badge 
                        colorScheme={analysis1.agentPerformance.adherenceToProtocol > analysis2.agentPerformance.adherenceToProtocol ? "blue" : "green"}
                        fontSize="sm"
                        p={1}
                      >
                        {Math.abs(analysis1.agentPerformance.adherenceToProtocol - analysis2.agentPerformance.adherenceToProtocol)} pts
                      </Badge>
                    ) : (
                      <Badge colorScheme="gray">Equal</Badge>
                    )}
                  </Box>
                </SimpleGrid>
              </Box>
              
              {/* Empathy Score */}
              <Box 
                mb={4} 
                p={3} 
                borderRadius="md" 
                bg={useColorModeValue('gray.50', 'gray.700')}
              >
                <SimpleGrid columns={4} gap={2} alignItems="center">
                  <Text fontWeight="medium">Empathy</Text>
                  
                  <Box>
                    <Progress 
                      value={analysis1.agentPerformance.empathyScore} 
                      size="sm" 
                      colorScheme="blue" 
                      borderRadius="full"
                      mb={1}
                    />
                    <Text 
                      textAlign="center" 
                      fontWeight="medium"
                      color="blue.500"
                    >
                      {analysis1.agentPerformance.empathyScore}
                    </Text>
                  </Box>
                  
                  <Box>
                    <Progress 
                      value={analysis2.agentPerformance.empathyScore} 
                      size="sm" 
                      colorScheme="green" 
                      borderRadius="full"
                      mb={1}
                    />
                    <Text 
                      textAlign="center" 
                      fontWeight="medium"
                      color="green.500"
                    >
                      {analysis2.agentPerformance.empathyScore}
                    </Text>
                  </Box>
                  
                  <Box textAlign="center">
                    {Math.abs(analysis1.agentPerformance.empathyScore - analysis2.agentPerformance.empathyScore) > 0 ? (
                      <Badge 
                        colorScheme={analysis1.agentPerformance.empathyScore > analysis2.agentPerformance.empathyScore ? "blue" : "green"}
                        fontSize="sm"
                        p={1}
                      >
                        {Math.abs(analysis1.agentPerformance.empathyScore - analysis2.agentPerformance.empathyScore)} pts
                      </Badge>
                    ) : (
                      <Badge colorScheme="gray">Equal</Badge>
                    )}
                  </Box>
                </SimpleGrid>
              </Box>
              
              {/* Efficiency Score */}
              <Box 
                mb={4} 
                p={3} 
                borderRadius="md" 
                bg={useColorModeValue('gray.50', 'gray.700')}
              >
                <SimpleGrid columns={4} gap={2} alignItems="center">
                  <Text fontWeight="medium">Efficiency</Text>
                  
                  <Box>
                    <Progress 
                      value={analysis1.agentPerformance.efficiencyScore} 
                      size="sm" 
                      colorScheme="blue" 
                      borderRadius="full"
                      mb={1}
                    />
                    <Text 
                      textAlign="center" 
                      fontWeight="medium"
                      color="blue.500"
                    >
                      {analysis1.agentPerformance.efficiencyScore}
                    </Text>
                  </Box>
                  
                  <Box>
                    <Progress 
                      value={analysis2.agentPerformance.efficiencyScore} 
                      size="sm" 
                      colorScheme="green" 
                      borderRadius="full"
                      mb={1}
                    />
                    <Text 
                      textAlign="center" 
                      fontWeight="medium"
                      color="green.500"
                    >
                      {analysis2.agentPerformance.efficiencyScore}
                    </Text>
                  </Box>
                  
                  <Box textAlign="center">
                    {Math.abs(analysis1.agentPerformance.efficiencyScore - analysis2.agentPerformance.efficiencyScore) > 0 ? (
                      <Badge 
                        colorScheme={analysis1.agentPerformance.efficiencyScore > analysis2.agentPerformance.efficiencyScore ? "blue" : "green"}
                        fontSize="sm"
                        p={1}
                      >
                        {Math.abs(analysis1.agentPerformance.efficiencyScore - analysis2.agentPerformance.efficiencyScore)} pts
                      </Badge>
                    ) : (
                      <Badge colorScheme="gray">Equal</Badge>
                    )}
                  </Box>
                </SimpleGrid>
              </Box>
            </Box>
            
            {/* Effective Techniques Comparison */}
            <SimpleGrid columns={2} gap={4}>
              <Box>
                <Text fontWeight="bold" mb={2} color="blue.500">Call 1 Effective Techniques</Text>
                {analysis1.agentPerformance.effectiveTechniques.length > 0 ? (
                  <Box borderLeft="3px solid" borderColor="blue.500" pl={3}>
                    <UnorderedList spacing={1}>
                      {analysis1.agentPerformance.effectiveTechniques.map((technique, idx) => (
                        <ListItem key={idx} fontSize="sm">{technique}</ListItem>
                      ))}
                    </UnorderedList>
                  </Box>
                ) : (
                  <Text fontSize="sm" color="gray.500">No specific techniques highlighted</Text>
                )}
              </Box>
              
              <Box>
                <Text fontWeight="bold" mb={2} color="green.500">Call 2 Effective Techniques</Text>
                {analysis2.agentPerformance.effectiveTechniques.length > 0 ? (
                  <Box borderLeft="3px solid" borderColor="green.500" pl={3}>
                    <UnorderedList spacing={1}>
                      {analysis2.agentPerformance.effectiveTechniques.map((technique, idx) => (
                        <ListItem key={idx} fontSize="sm">{technique}</ListItem>
                      ))}
                    </UnorderedList>
                  </Box>
                ) : (
                  <Text fontSize="sm" color="gray.500">No specific techniques highlighted</Text>
                )}
              </Box>
            </SimpleGrid>
          </CardBody>
        </Card>
      </SimpleGrid>
    );
  };

  // Compare drug mentions between calls
  const compareDrugMentions = () => {
    if (!call1Data?.analysis?.clinicalSummary || !call2Data?.analysis?.clinicalSummary) return null;
    
    const drugs1 = call1Data.analysis.clinicalSummary.drugMentions || [];
    const drugs2 = call2Data.analysis.clinicalSummary.drugMentions || [];
    
    // Combine all unique drug names
    const allDrugNames = new Set([
      ...drugs1.map(d => d.name),
      ...drugs2.map(d => d.name)
    ]);
    
    return (
      <Card mb={6}>
        <CardHeader bg={useColorModeValue('purple.50', 'purple.900')}>
          <Heading size="sm">Drug Mentions Comparison</Heading>
        </CardHeader>
        <CardBody>
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
            {/* Call 1 Drug Mentions */}
            <Box>
              <Heading size="xs" mb={3}>Call 1 Drugs</Heading>
              {drugs1.length === 0 ? (
                <Text fontSize="sm" color="gray.500">No drugs mentioned</Text>
              ) : (
                <Flex direction="column" gap={2}>
                  {drugs1.map((drug, index) => (
                    <Flex key={index} justify="space-between">
                      <Text>{drug.name}</Text>
                      <Badge colorScheme="purple">{drug.count}</Badge>
                    </Flex>
                  ))}
                </Flex>
              )}
            </Box>
            
            {/* Call 2 Drug Mentions */}
            <Box>
              <Heading size="xs" mb={3}>Call 2 Drugs</Heading>
              {drugs2.length === 0 ? (
                <Text fontSize="sm" color="gray.500">No drugs mentioned</Text>
              ) : (
                <Flex direction="column" gap={2}>
                  {drugs2.map((drug, index) => (
                    <Flex key={index} justify="space-between">
                      <Text>{drug.name}</Text>
                      <Badge colorScheme="purple">{drug.count}</Badge>
                    </Flex>
                  ))}
                </Flex>
              )}
            </Box>
            
            {/* Common Drugs */}
            <Box>
              <Heading size="xs" mb={3}>Common Drugs</Heading>
              {(() => {
                const drugMap1 = new Map(drugs1.map(d => [d.name, d.count]));
                const drugMap2 = new Map(drugs2.map(d => [d.name, d.count]));
                
                const commonDrugs = [...drugMap1.keys()].filter(name => drugMap2.has(name));
                
                if (commonDrugs.length === 0) {
                  return <Text fontSize="sm" color="gray.500">No common drugs</Text>;
                }
                
                return (
                  <Flex direction="column" gap={2}>
                    {commonDrugs.map((drugName, index) => (
                      <Flex key={index} justify="space-between">
                        <Text>{drugName}</Text>
                        <Flex gap={2}>
                          <Badge colorScheme="blue">{drugMap1.get(drugName) || 0}</Badge>
                          <Badge colorScheme="green">{drugMap2.get(drugName) || 0}</Badge>
                        </Flex>
                      </Flex>
                    ))}
                  </Flex>
                );
              })()}
            </Box>
          </SimpleGrid>
        </CardBody>
      </Card>
    );
  };

  return (
    <Box minH="100vh">
      <Navbar />
      <Flex>
        <Sidebar />
        <PageContainer>
          <Heading size="lg" mb={6}>Call Comparison</Heading>
          
          {/* Call Selection */}
          <Card mb={6}>
            <CardHeader bg={bgColor} borderBottom="1px" borderColor={borderColor}>
              <Heading size="md">Select Calls to Compare</Heading>
            </CardHeader>
            <CardBody>
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                <Box>
                  <Text mb={2} fontWeight="medium">Call 1</Text>
                  <Select
                    placeholder="Select a call"
                    value={selectedCall1}
                    onChange={(e) => setSelectedCall1(e.target.value)}
                    isDisabled={isLoading}
                  >
                    {availableCalls.map((call) => (
                      <option key={call.id} value={call.id}>
                        {call.label}
                      </option>
                    ))}
                  </Select>
                </Box>
                
                <Box>
                  <Text mb={2} fontWeight="medium">Call 2</Text>
                  <Select
                    placeholder="Select a call"
                    value={selectedCall2}
                    onChange={(e) => setSelectedCall2(e.target.value)}
                    isDisabled={isLoading}
                  >
                    {availableCalls.map((call) => (
                      <option key={call.id} value={call.id}>
                        {call.label}
                      </option>
                    ))}
                  </Select>
                </Box>
              </SimpleGrid>
              
              <Flex justify="flex-end" mt={4}>
                <Button
                  leftIcon={<FiRefreshCw />}
                  onClick={() => {
                    setCall1Data(null);
                    setCall2Data(null);
                    // Re-trigger the effect to fetch call data
                    const call1 = selectedCall1;
                    const call2 = selectedCall2;
                    setSelectedCall1('');
                    setSelectedCall2('');
                    setTimeout(() => {
                      setSelectedCall1(call1);
                      setSelectedCall2(call2);
                    }, 100);
                  }}
                  isDisabled={isLoading || (!selectedCall1 && !selectedCall2)}
                  colorScheme="blue"
                >
                  Refresh Data
                </Button>
              </Flex>
            </CardBody>
          </Card>
          
          {/* Error Message */}
          {error && (
            <Alert status="error" mb={6} borderRadius="md">
              <AlertIcon />
              {error}
            </Alert>
          )}
          
          {/* Loading State */}
          {isLoading && (
            <Flex justify="center" align="center" my={10} direction="column">
              <Spinner size="xl" mb={4} color="blue.500" />
              <Text>Loading call data...</Text>
            </Flex>
          )}
          
          {/* Comparison Content */}
          {selectedCall1 && selectedCall2 && call1Data && call2Data && !isLoading && (
            <>
              {/* Call Information */}
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6} mb={6}>
                <Card>
                  <CardHeader bg={useColorModeValue('blue.50', 'blue.900')}>
                    <Heading size="sm">Call 1 Information</Heading>
                  </CardHeader>
                  <CardBody>
                    <Flex direction="column" gap={2}>
                      <Flex justify="space-between">
                        <Text fontWeight="medium">Date:</Text>
                        <Text>{new Date(call1Data.call.timestamp).toLocaleString()}</Text>
                      </Flex>
                      <Flex justify="space-between">
                        <Text fontWeight="medium">Duration:</Text>
                        <Text>{Math.floor(call1Data.call.duration / 60)}m {call1Data.call.duration % 60}s</Text>
                      </Flex>
                      <Flex justify="space-between">
                        <Text fontWeight="medium">Agent:</Text>
                        <Text>{call1Data.call.agentId}</Text>
                      </Flex>
                      <Flex justify="space-between">
                        <Text fontWeight="medium">Disposition:</Text>
                        <Badge>{call1Data.analysis.disposition}</Badge>
                      </Flex>
                    </Flex>
                  </CardBody>
                </Card>
                
                <Card>
                  <CardHeader bg={useColorModeValue('green.50', 'green.900')}>
                    <Heading size="sm">Call 2 Information</Heading>
                  </CardHeader>
                  <CardBody>
                    <Flex direction="column" gap={2}>
                      <Flex justify="space-between">
                        <Text fontWeight="medium">Date:</Text>
                        <Text>{new Date(call2Data.call.timestamp).toLocaleString()}</Text>
                      </Flex>
                      <Flex justify="space-between">
                        <Text fontWeight="medium">Duration:</Text>
                        <Text>{Math.floor(call2Data.call.duration / 60)}m {call2Data.call.duration % 60}s</Text>
                      </Flex>
                      <Flex justify="space-between">
                        <Text fontWeight="medium">Agent:</Text>
                        <Text>{call2Data.call.agentId}</Text>
                      </Flex>
                      <Flex justify="space-between">
                        <Text fontWeight="medium">Disposition:</Text>
                        <Badge>{call2Data.analysis.disposition}</Badge>
                      </Flex>
                    </Flex>
                  </CardBody>
                </Card>
              </SimpleGrid>
              
              {/* Metrics Comparison */}
              {compareMetrics()}
              
              {/* Drug Mentions Comparison */}
              {compareDrugMentions()}
              
              {/* Tabs for different comparison views */}
              <Tabs isFitted variant="enclosed" onChange={(index) => setActiveTab(index)} colorScheme="blue">
                <TabList mb="1em">
                  <Tab>Side-by-Side Sentiment</Tab>
                  <Tab>Side-by-Side Transcripts</Tab>
                  <Tab>Side-by-Side Analysis</Tab>
                </TabList>
                <TabPanels>
                  {/* Sentiment Timeline Comparison */}
                  <TabPanel p={0}>
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                      <Card>
                        <CardHeader bg={useColorModeValue('blue.50', 'blue.900')}>
                          <Heading size="sm">Call 1 Sentiment Timeline</Heading>
                        </CardHeader>
                        <CardBody>
                          <SentimentTimeline 
                            sentimentData={call1Data.analysis.sentiment}
                            duration={call1Data.call.duration}
                          />
                        </CardBody>
                      </Card>
                      
                      <Card>
                        <CardHeader bg={useColorModeValue('green.50', 'green.900')}>
                          <Heading size="sm">Call 2 Sentiment Timeline</Heading>
                        </CardHeader>
                        <CardBody>
                          <SentimentTimeline 
                            sentimentData={call2Data.analysis.sentiment}
                            duration={call2Data.call.duration}
                          />
                        </CardBody>
                      </Card>
                    </SimpleGrid>
                  </TabPanel>
                  
                  {/* Transcription Comparison */}
                  <TabPanel p={0}>
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                      <Card>
                        <CardHeader bg={useColorModeValue('blue.50', 'blue.900')}>
                          <Heading size="sm">Call 1 Transcription</Heading>
                        </CardHeader>
                        <CardBody>
                          <TranscriptionViewer 
                            callId={call1Data.call.id}
                            initialTranscription={call1Data.transcription}
                          />
                        </CardBody>
                      </Card>
                      
                      <Card>
                        <CardHeader bg={useColorModeValue('green.50', 'green.900')}>
                          <Heading size="sm">Call 2 Transcription</Heading>
                        </CardHeader>
                        <CardBody>
                          <TranscriptionViewer 
                            callId={call2Data.call.id}
                            initialTranscription={call2Data.transcription}
                          />
                        </CardBody>
                      </Card>
                    </SimpleGrid>
                  </TabPanel>
                  
                  {/* Full Analysis Comparison */}
                  <TabPanel p={0}>
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                      <Box>
                        <AnalysisViewer 
                          callId={call1Data.call.id}
                        />
                      </Box>
                      
                      <Box>
                        <AnalysisViewer 
                          callId={call2Data.call.id}
                        />
                      </Box>
                    </SimpleGrid>
                  </TabPanel>
                </TabPanels>
              </Tabs>
            </>
          )}
        </PageContainer>
      </Flex>
    </Box>
  );
}