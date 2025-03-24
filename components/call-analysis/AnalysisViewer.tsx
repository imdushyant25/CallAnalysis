// File location: components/analysis/AnalysisViewer.tsx
'use client';

import { useState, useEffect } from 'react';
import { 
  Box, 
  Heading, 
  Text, 
  Flex, 
  SimpleGrid, 
  Progress, 
  Badge, 
  List, 
  ListItem, 
  ListIcon, 
  Skeleton, 
  Alert, 
  AlertIcon,
  Button,
  Divider,
  Card,
  CardHeader,
  CardBody,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Tag,
  VStack,
  HStack,
  Icon,
  useColorModeValue,
  AlertTitle,
  AlertDescription
} from '@chakra-ui/react';
import { 
  FiCheckCircle, 
  FiAlertTriangle, 
  FiArrowUp, 
  FiArrowDown, 
  FiPlusCircle, 
  FiMinusCircle,
  FiInfo,
  FiActivity
} from 'react-icons/fi';
import { Analysis } from '@/lib/types/analysis';

interface AnalysisViewerProps {
  callId: string;
  onAnalyze?: () => void;
}

interface DrugMention {
    name: string;
    count: number;
    context: string;
  }

/**
 * Improved function for extracting drug mentions from clinical context
 * This uses NLP-inspired approaches rather than hardcoding drug names
 */
const extractDrugMentionsFromContext = (context: string): DrugMention[] => {
  if (!context) return [];
  
  const drugMentions: DrugMention[] = [];
  const sentences = context.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  // Common drug name indicators and patterns
  const drugIndicators = [
    'medication', 'drug', 'prescription', 'med', 'dose', 'pill', 'tablet', 'injection',
    'prescribed', 'taking', 'started', 'switching to', 'transitioned from', 'switching from',
    'mg', 'mcg', 'approved for', 'authorization for', 'denied for'
  ];
  
  // Capitalized words can indicate brand names (but avoid sentence starters)
  const capitalizationRegex = /\b[A-Z][a-z]{2,}\b/g;
  const potentialDrugNames = new Set<string>();
  
  // Step 1: Extract potential drug names based on capitalization
  let match;
  while ((match = capitalizationRegex.exec(context)) !== null) {
    // Avoid common non-drug capitalized words
    const word = match[0];
    if (!['The', 'I', 'A', 'An', 'And', 'But', 'Or', 'Patient', 'Doctor', 'Agent', 'Customer', 'However'].includes(word)) {
      potentialDrugNames.add(word);
    }
  }
  
  // Step 2: Extract potential drug names from context with indicators
  sentences.forEach(sentence => {
    const sentenceLower = sentence.toLowerCase().trim();
    
    drugIndicators.forEach(indicator => {
      if (sentenceLower.includes(indicator)) {
        // Look for words around the indicator that might be drug names
        const words = sentence.split(/\s+/);
        const indicatorIndex = words.findIndex(w => w.toLowerCase().includes(indicator));
        
        if (indicatorIndex >= 0) {
          // Check words before and after the indicator
          const potentialDrug1 = indicatorIndex > 0 ? words[indicatorIndex - 1].replace(/[,.;:]/, '') : null;
          const potentialDrug2 = indicatorIndex < words.length - 1 ? words[indicatorIndex + 1].replace(/[,.;:]/, '') : null;
          
          if (potentialDrug1 && potentialDrug1.length > 3 && /^[A-Za-z]+$/.test(potentialDrug1)) {
            potentialDrugNames.add(potentialDrug1);
          }
          
          if (potentialDrug2 && potentialDrug2.length > 3 && /^[A-Za-z]+$/.test(potentialDrug2)) {
            potentialDrugNames.add(potentialDrug2);
          }
        }
      }
    });
  });
  
  // Step 3: Process each potential drug name
  potentialDrugNames.forEach(drugName => {
    // Count occurrences
    const drugRegex = new RegExp(`\\b${drugName}\\b`, 'gi');
    const matches = context.match(drugRegex);
    const count = matches ? matches.length : 0;
    
    if (count > 0) {
      // Find a good context snippet
      let drugContext = '';
      const index = context.search(new RegExp(`\\b${drugName}\\b`, 'i'));
      
      if (index >= 0) {
        const start = Math.max(0, index - 30);
        const end = Math.min(context.length, index + drugName.length + 70);
        drugContext = context.substring(start, end).trim();
        if (start > 0) drugContext = '...' + drugContext;
        if (end < context.length) drugContext = drugContext + '...';
      } else {
        drugContext = "Mentioned in clinical context";
      }
      
      drugMentions.push({
        name: drugName,
        count: count,
        context: drugContext
      });
    }
  });
  
  return drugMentions;
};

// Function to parse the call summary if it's in JSON format
const parseCallSummary = (summary: string) => {
  try {
    // Check if the summary is in JSON format
    if (summary.startsWith('{') && summary.endsWith('}')) {
      const parsedSummary = JSON.parse(summary);
      return parsedSummary;
    }
    return { text: summary };
  } catch (e) {
    // If JSON parsing fails, return the original string as text
    return { text: summary };
  }
};
const AnalysisViewer: React.FC<AnalysisViewerProps> = ({ callId, onAnalyze }) => {
    const [analysis, setAnalysis] = useState<Analysis | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const bgColor = useColorModeValue('white', 'gray.700');
    const borderColor = useColorModeValue('gray.200', 'gray.600');
  
    // Fetch analysis
    const fetchAnalysis = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch(`/api/calls/${callId}/analyze`);
        
        // Handle 404 (not found)
        if (response.status === 404) {
          setAnalysis(null);
          setIsLoading(false);
          return;
        }
        
        if (!response.ok) {
          throw new Error(`Error fetching analysis: ${response.statusText}`);
        }
        
        const data = await response.json();
        setAnalysis(data);
      } catch (err) {
        console.error('Error fetching analysis:', err);
        setError(err instanceof Error ? err.message : 'Failed to load analysis');
      } finally {
        setIsLoading(false);
      }
    };
    
    // Run analysis
    const runAnalysis = async () => {
      try {
        setIsProcessing(true);
        setError(null);
        
        const response = await fetch(`/api/calls/${callId}/analyze`, {
          method: 'POST'
        });
        
        if (!response.ok) {
          throw new Error(`Error running analysis: ${response.statusText}`);
        }
        
        const data = await response.json();
        setAnalysis(data.analysis);
        
        // Notify parent if callback provided
        if (onAnalyze) {
          onAnalyze();
        }
      } catch (err) {
        console.error('Error running analysis:', err);
        setError(err instanceof Error ? err.message : 'Failed to run analysis');
      } finally {
        setIsProcessing(false);
      }
    };
    
    // Initialize on mount
    useEffect(() => {
      fetchAnalysis();
    }, [callId]);
    
    // Helper function to get color based on score
    const getScoreColor = (score: number) => {
      if (score >= 80) return 'green';
      if (score >= 60) return 'blue';
      if (score >= 40) return 'yellow';
      return 'red';
    };
    
    // Helper to get severity color
    const getSeverityColor = (severity: string) => {
      switch (severity) {
        case 'low': return 'yellow';
        case 'medium': return 'orange';
        case 'high': return 'red';
        default: return 'gray';
      }
    };
    
    // Render loading state
    if (isLoading) {
      return (
        <Box
          borderWidth="1px"
          borderRadius="lg"
          overflow="hidden"
          bg={bgColor}
          borderColor={borderColor}
          boxShadow="sm"
          mb={6}
        >
          <Box p={4} borderBottomWidth="1px" borderColor={borderColor}>
            <Skeleton height="20px" width="200px" />
          </Box>
          <Box p={6}>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
              <Skeleton height="100px" />
              <Skeleton height="100px" />
              <Skeleton height="100px" />
              <Skeleton height="100px" />
            </SimpleGrid>
            <Skeleton height="200px" mt={6} />
          </Box>
        </Box>
      );
    }
    
    // Render error state
    if (error) {
      return (
        <Box
          borderWidth="1px"
          borderRadius="lg"
          overflow="hidden"
          bg={bgColor}
          borderColor={borderColor}
          boxShadow="sm"
          mb={6}
        >
          <Box p={4} borderBottomWidth="1px" borderColor={borderColor}>
            <Heading size="md">Call Analysis</Heading>
          </Box>
          <Box p={6}>
            <Alert status="error" borderRadius="md" mb={4}>
              <AlertIcon />
              {error}
            </Alert>
            <Button onClick={fetchAnalysis} size="sm">
              Retry
            </Button>
          </Box>
        </Box>
      );
    }
    
    // Render no analysis state with option to analyze
    if (!analysis && !isProcessing) {
      return (
        <Box
          borderWidth="1px"
          borderRadius="lg"
          overflow="hidden"
          bg={bgColor}
          borderColor={borderColor}
          boxShadow="sm"
          mb={6}
        >
          <Box p={4} borderBottomWidth="1px" borderColor={borderColor}>
            <Heading size="md">Call Analysis</Heading>
          </Box>
          <Box p={6} textAlign="center">
            <Text mb={4}>No analysis available for this call.</Text>
            <Button 
              colorScheme="blue" 
              onClick={runAnalysis}
              isLoading={isProcessing}
              loadingText="Analyzing..."
            >
              Analyze Call
            </Button>
          </Box>
        </Box>
      );
    }
    
    // Render processing state
    if (isProcessing) {
      return (
        <Box
          borderWidth="1px"
          borderRadius="lg"
          overflow="hidden"
          bg={bgColor}
          borderColor={borderColor}
          boxShadow="sm"
          mb={6}
        >
          <Box p={4} borderBottomWidth="1px" borderColor={borderColor}>
            <Heading size="md">Call Analysis</Heading>
          </Box>
          <Box p={6} textAlign="center">
            <Progress isIndeterminate colorScheme="blue" mb={6} />
            <Text fontWeight="medium">
              Analyzing call transcription...
            </Text>
            <Text fontSize="sm" color="gray.500" mt={2}>
              This may take a few minutes depending on the call length and complexity.
            </Text>
          </Box>
        </Box>
      );
    }

    // Type guard for new format point
    const isNewFormatPoint = (point: any): boolean => {
      return typeof point === 'object' && point !== null && 
             (('point' in point && typeof point.point === 'string') ||
              ('moment' in point && typeof point.moment === 'string'));
    };

    // Type guard for old format point
    const isOldFormatPoint = (point: any): point is { time: number; text: string; reason: string } => {
    return typeof point === 'object' && point !== null && ('time' in point || 'text' in point || 'reason' in point);
    };

    // Render analysis results
  return (
    <Box
      borderWidth="1px"
      borderRadius="lg"
      overflow="hidden"
      bg={bgColor}
      borderColor={borderColor}
      boxShadow="sm"
      mb={6}
    >
      <Box p={4} borderBottomWidth="1px" borderColor={borderColor}>
        <Heading size="md">Call Analysis</Heading>
        {analysis?.metadata && (
          <Text fontSize="sm" color="gray.500" mt={1}>
            Analyzed using {analysis.metadata.analysisModel} {analysis.metadata.version}
            {analysis.metadata.processingTime && ` in ${(analysis.metadata.processingTime / 1000).toFixed(1)}s`}
          </Text>
        )}
      </Box>
      
      <Box p={6}>
        {/* Call Summary */}
        <Box mb={6}>
  <Heading size="sm" mb={3}>Call Summary</Heading>
  {(() => {
    // Safely handle and parse the call summary
    const summary = analysis?.callSummary;
    
    // Handle cases where summary might be undefined or null
    if (!summary) {
      return <Text>No summary available</Text>;
    }
    
    // Handle cases where summary is a string
    if (typeof summary === 'string') {
      try {
        // Try to parse it as JSON if it looks like JSON
        if (summary.trim().startsWith('{') && summary.trim().endsWith('}')) {
          const parsedSummary = JSON.parse(summary);
          
          return (
            <VStack align="stretch" spacing={3}>
              {parsedSummary.purpose && (
                <Box>
                  <Text fontWeight="medium">Purpose:</Text>
                  <Text>{parsedSummary.purpose}</Text>
                </Box>
              )}
              
              {parsedSummary.mainIssues && (
                <Box>
                  <Text fontWeight="medium">Main Issues:</Text>
                  <Text>{parsedSummary.mainIssues}</Text>
                </Box>
              )}
              
              {parsedSummary.outcome && (
                <Box>
                  <Text fontWeight="medium">Outcome:</Text>
                  <Text>{parsedSummary.outcome}</Text>
                </Box>
              )}
              
              {parsedSummary.resolutionStatus && (
                <Box>
                  <Text fontWeight="medium">Resolution Status:</Text>
                  <Text>{parsedSummary.resolutionStatus}</Text>
                </Box>
              )}
            </VStack>
          );
        } else {
          // Not JSON, render as a simple string
          return <Text>{summary}</Text>;
        }
      } catch (e) {
        // If JSON parsing fails, render as a simple string
        return <Text>{summary}</Text>;
      }
    }
    
    // Handle cases where summary is already an object
    // This happens when the API returns pre-parsed JSON
    if (typeof summary === 'object' && summary !== null) {
      const summaryObj = summary as Record<string, any>;
      
      return (
        <VStack align="stretch" spacing={3}>
          {summaryObj.purpose && (
            <Box>
              <Text fontWeight="medium">Purpose:</Text>
              <Text>{String(summaryObj.purpose)}</Text>
            </Box>
          )}
          
          {summaryObj.mainIssues && (
            <Box>
              <Text fontWeight="medium">Main Issues:</Text>
              <Text>{String(summaryObj.mainIssues)}</Text>
            </Box>
          )}
          
          {summaryObj.outcome && (
            <Box>
              <Text fontWeight="medium">Outcome:</Text>
              <Text>{String(summaryObj.outcome)}</Text>
            </Box>
          )}
          
          {summaryObj.resolutionStatus && (
            <Box>
              <Text fontWeight="medium">Resolution Status:</Text>
              <Text>{String(summaryObj.resolutionStatus)}</Text>
            </Box>
          )}
        </VStack>
      );
    }
    
    // Fallback for any other unexpected type
    return <Text>{String(summary)}</Text>;
  })()}
  
  <Flex mt={4} wrap="wrap" gap={2}>
    <Badge colorScheme="blue">{analysis?.disposition}</Badge>
    {analysis?.followUpRequired && (
      <Badge colorScheme="orange">Follow-up Required</Badge>
    )}
    {analysis?.tags && Array.isArray(analysis.tags) && analysis.tags.map((tag, index) => (
      <Tag key={index} size="md" variant="subtle" colorScheme="gray">
        {typeof tag === 'string' ? tag : String(tag)}
      </Tag>
    ))}
  </Flex>
</Box>        
        <Divider my={6} />
        
{/* Performance Metrics */}
{analysis?.agentPerformance && 
 Object.values([
   analysis.agentPerformance.communicationScore,
   analysis.agentPerformance.adherenceToProtocol,
   analysis.agentPerformance.empathyScore,
   analysis.agentPerformance.efficiencyScore
 ]).every(score => score === 0) ? (
  <Box mb={6}>
    <Alert status="info" borderRadius="md">
      <AlertIcon />
      <Box>
        <AlertTitle>No Performance Scores Available</AlertTitle>
        <AlertDescription>
          Quantitative agent performance scores are not available for this analysis.
          Please see the qualitative assessment below.
        </AlertDescription>
      </Box>
    </Alert>
    
    {analysis.agentPerformance.effectiveTechniques?.length > 0 && (
      <Box mt={4} p={4} bg={useColorModeValue('blue.50', 'blue.900')} borderRadius="md">
        <Text fontWeight="medium" mb={2}>Effective Techniques Identified:</Text>
        <List spacing={2}>
          {analysis.agentPerformance.effectiveTechniques.map((technique, idx) => (
            <ListItem key={idx}>
              <ListIcon as={FiCheckCircle} color="green.500" />
              {technique}
            </ListItem>
          ))}
        </List>
      </Box>
    )}
  </Box>
) : (
  <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4} mb={6}>
    <Stat
      bg={useColorModeValue('blue.50', 'blue.900')}
      p={3}
      borderRadius="md"
    >
      <StatLabel>Communication</StatLabel>
      <StatNumber>{analysis?.agentPerformance.communicationScore || 0}</StatNumber>
      <Progress 
        value={analysis?.agentPerformance.communicationScore || 0} 
        colorScheme={getScoreColor(analysis?.agentPerformance.communicationScore || 0)}
        size="sm"
        mt={2}
      />
    </Stat>
    
    <Stat
      bg={useColorModeValue('green.50', 'green.900')}
      p={3}
      borderRadius="md"
    >
      <StatLabel>Protocol Adherence</StatLabel>
      <StatNumber>{analysis?.agentPerformance.adherenceToProtocol || 0}</StatNumber>
      <Progress 
        value={analysis?.agentPerformance.adherenceToProtocol || 0} 
        colorScheme={getScoreColor(analysis?.agentPerformance.adherenceToProtocol || 0)}
        size="sm"
        mt={2}
      />
    </Stat>
    
    <Stat
      bg={useColorModeValue('purple.50', 'purple.900')}
      p={3}
      borderRadius="md"
    >
      <StatLabel>Empathy</StatLabel>
      <StatNumber>{analysis?.agentPerformance.empathyScore || 0}</StatNumber>
      <Progress 
        value={analysis?.agentPerformance.empathyScore || 0} 
        colorScheme={getScoreColor(analysis?.agentPerformance.empathyScore || 0)}
        size="sm"
        mt={2}
      />
    </Stat>
    
    <Stat
      bg={useColorModeValue('orange.50', 'orange.900')}
      p={3}
      borderRadius="md"
    >
      <StatLabel>Efficiency</StatLabel>
      <StatNumber>{analysis?.agentPerformance.efficiencyScore || 0}</StatNumber>
      <Progress 
        value={analysis?.agentPerformance.efficiencyScore || 0} 
        colorScheme={getScoreColor(analysis?.agentPerformance.efficiencyScore || 0)}
        size="sm"
        mt={2}
      />
    </Stat>
  </SimpleGrid>
)}
        
        {/* Sentiment Overview */}
        <Card mb={6}>
          <CardHeader>
            <Heading size="sm">Sentiment Analysis</Heading>
          </CardHeader>
          <CardBody>
            <Flex direction={{ base: 'column', md: 'row' }} align="center" justifyContent="space-between">
              <Box textAlign="center" mb={{ base: 4, md: 0 }} flex="1">
                <Heading size="md" mb={2}>Overall Sentiment</Heading>
                <Box 
                  position="relative" 
                  height="120px" 
                  width="120px" 
                  borderRadius="full" 
                  mx="auto"
                  bgGradient={`conic-gradient(${getScoreColor(analysis?.sentiment.overallScore || 0)}.500 ${analysis?.sentiment.overallScore || 0}%, gray.200 0%)`}
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Box 
                    height="100px" 
                    width="100px" 
                    borderRadius="full" 
                    bg={bgColor}
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Text fontSize="2xl" fontWeight="bold">
                      {analysis?.sentiment.overallScore}
                    </Text>
                  </Box>
                </Box>
              </Box>
              
              <Box flex="2">
                <Heading size="sm" mb={3}>Emotion Tags</Heading>
                <Flex flexWrap="wrap" gap={2} mb={4}>
                  {analysis?.sentiment.emotionTags.map((tag, index) => (
                    <Tag key={index} colorScheme="blue" size="md">
                      {tag}
                    </Tag>
                  ))}
                  {analysis?.sentiment.emotionTags.length === 0 && (
                    <Text fontSize="sm" color="gray.500">No emotion tags identified</Text>
                  )}
                </Flex>

                
                
                {!analysis?.sentiment?.escalationPoints || analysis.sentiment.escalationPoints.length === 0 ? (
  <Text fontSize="sm" color="gray.500">No significant escalation points detected</Text>
) : (
  <List spacing={2}>
    {analysis.sentiment.escalationPoints.map((point, index) => (
      <ListItem key={index}>
        <ListIcon as={FiAlertTriangle} color="orange.500" />
        <Box>
          <Flex align="baseline">
            <Text as="span" fontWeight="medium" mr={2}>
              {typeof point.time === 'number' 
                ? `${point.time.toFixed(2)}s:` 
                : point.time !== 'unknown' 
                  ? `${point.time}:` 
                  : ''}
            </Text>
            <Text as="span" fontWeight="medium">
              {point.text}
            </Text>
          </Flex>
          {point.reason && (
            <Text fontSize="sm" color={point.reason.toLowerCase().includes('de-escalation') ? 'green.500' : 'gray.600'} ml={6}>
              {point.reason}
            </Text>
          )}
        </Box>
      </ListItem>
    ))}
  </List>
)}
              </Box>
            </Flex>
          </CardBody>
        </Card>
        
        {/* Clinical Information */}
        <Card mb={6}>
          <CardHeader>
            <Heading size="sm">Clinical Information</Heading>
          </CardHeader>
          <CardBody>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
            <Box>
  <Heading size="xs" mb={3}>Medical Conditions</Heading>
  {(!analysis?.clinicalSummary?.medicalConditions || 
    !Array.isArray(analysis.clinicalSummary.medicalConditions) ||
    analysis.clinicalSummary.medicalConditions.length === 0) ? (
    <Text fontSize="sm" color="gray.500">No medical conditions mentioned</Text>
  ) : (
    <List spacing={1}>
      {analysis.clinicalSummary.medicalConditions.map((condition, index) => {
        // Handle different possible formats of condition data
        let conditionText = '';
        
        if (typeof condition === 'string') {
          conditionText = condition;
        } 
        else if (condition && typeof condition === 'object') {
          // If it's an object, try to extract the condition name using type assertion
          const condObj = condition as Record<string, any>;
          if (condObj.condition) {
            conditionText = String(condObj.condition);
          } 
          else if (condObj.name) {
            conditionText = String(condObj.name);
          }
          else if (condObj.text) {
            conditionText = String(condObj.text);
          }
          else {
            // Fallback: just use a placeholder
            conditionText = "Medical condition";
          }
        }
        else {
          conditionText = String(condition);
        }
        
        return (
          <ListItem key={index}>
            <ListIcon as={FiInfo} color="blue.500" />
            {conditionText}
          </ListItem>
        );
      })}
    </List>
  )}
</Box>
              
              <Box>
                <Heading size="xs" mb={3}>Drug Mentions</Heading>
                {(() => {
                    
                  // Get drug mentions from the analysis, or extract them if empty
                  let drugMentions: DrugMention[] = (analysis?.clinicalSummary?.drugMentions || []) as DrugMention[];
                  
                  // If no drug mentions were found in the analysis but we have clinical context
                  if ((drugMentions.length === 0) && analysis?.clinicalSummary?.clinicalContext) {
                    drugMentions = extractDrugMentionsFromContext(analysis.clinicalSummary.clinicalContext);
                  }
                  
                  if (!drugMentions || drugMentions.length === 0) {
                    return <Text fontSize="sm" color="gray.500">No drugs mentioned</Text>;
                  }
                  
                  return (
                    <List spacing={3}>
                      {drugMentions.map((drug, index) => (
                        <ListItem key={index} pb={2} borderBottomWidth={index < drugMentions.length - 1 ? "1px" : "0"} borderColor="gray.200">
                          <Flex justify="space-between" align="center" mb={1}>
                            <Text fontWeight="medium">{drug.name}</Text>
                            <Badge colorScheme="purple">{drug.count} {drug.count === 1 ? 'mention' : 'mentions'}</Badge>
                          </Flex>
                          <Text fontSize="sm">{drug.context}</Text>
                        </ListItem>
                      ))}
                    </List>
                  );
                })()}
              </Box>
            </SimpleGrid>
          </CardBody>
        </Card>
        
        {/* Agent Performance Details */}
        <Card mb={6}>
          <CardHeader>
            <Heading size="sm">Agent Performance</Heading>
          </CardHeader>
          <CardBody>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
              <Box>
                <Heading size="xs" mb={3} color="green.500">
                  <Flex align="center">
                    <Icon as={FiPlusCircle} mr={2} />
                    Effective Techniques
                  </Flex>
                </Heading>
                {analysis?.agentPerformance.effectiveTechniques.length === 0 ? (
                  <Text fontSize="sm" color="gray.500">No notable effective techniques identified</Text>
                ) : (
                  <List spacing={2}>
                    {analysis?.agentPerformance.effectiveTechniques.map((technique, index) => (
                      <ListItem key={index}>
                        <ListIcon as={FiCheckCircle} color="green.500" />
                        {technique}
                      </ListItem>
                    ))}
                  </List>
                )}
              </Box>
              
              <Box>
                <Heading size="xs" mb={3} color="red.500">
                  <Flex align="center">
                    <Icon as={FiMinusCircle} mr={2} />
                    Areas for Improvement
                  </Flex>
                </Heading>
                {analysis?.agentPerformance.improvementAreas.length === 0 ? (
                  <Text fontSize="sm" color="gray.500">No significant areas for improvement identified</Text>
                ) : (
                  <List spacing={2}>
                    {analysis?.agentPerformance.improvementAreas.map((area, index) => (
                      <ListItem key={index}>
                        <ListIcon as={FiAlertTriangle} color="red.500" />
                        {area}
                      </ListItem>
                    ))}
                  </List>
                )}
              </Box>
            </SimpleGrid>
          </CardBody>
        </Card>
        
        {/* Flags */}
        {analysis?.flags && analysis.flags.length > 0 && (
          <Card mb={6}>
            <CardHeader bg="red.50" _dark={{ bg: 'red.900' }}>
              <Heading size="sm" color="red.600" _dark={{ color: 'red.200' }}>
                <Flex align="center">
                  <Icon as={FiAlertTriangle} mr={2} />
                  Call Flags
                </Flex>
              </Heading>
            </CardHeader>
            <CardBody>
              <List spacing={3}>
                {analysis.flags.map((flag, index) => (
                  <ListItem key={index} pb={2} borderBottomWidth={index < analysis.flags.length - 1 ? "1px" : "0"} borderColor="gray.200">
                    <Flex justify="space-between" align="center" mb={1}>
                      <Text fontWeight="medium">{flag.type}</Text>
                      <Badge colorScheme={getSeverityColor(flag.severity)}>
                        {flag.severity.charAt(0).toUpperCase() + flag.severity.slice(1)} Severity
                      </Badge>
                    </Flex>
                    <Text fontSize="sm">{flag.description}</Text>
                  </ListItem>
                ))}
              </List>
            </CardBody>
          </Card>
        )}
        
        {/* Action Buttons */}
        <Flex justify="flex-end" mt={6}>
          <Button 
            leftIcon={<FiActivity />}
            colorScheme="blue"
            onClick={runAnalysis}
            isLoading={isProcessing}
            loadingText="Analyzing..."
            size="sm"
          >
            Re-analyze Call
          </Button>
        </Flex>
      </Box>
    </Box>
  );
};

export default AnalysisViewer;