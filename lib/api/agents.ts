/**
 * File: lib/api/agents.ts
 * Functions for interacting with agent-related API endpoints
 */

/**
 * Agent information
 */
export interface Agent {
    id: string;
    name: string;
    team?: string;
    email?: string;
    performanceScore?: number;
  }
  
  /**
   * Get a list of all agents
   * Currently returns dummy data, would be replaced with actual API call
   */
  export async function getDummyAgents(): Promise<Agent[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Return dummy data
    return [
      { id: 'agent-1', name: 'John Doe', team: 'Customer Service' },
      { id: 'agent-2', name: 'Jane Smith', team: 'Technical Support' },
      { id: 'agent-3', name: 'Mike Johnson', team: 'Customer Service' },
      { id: 'agent-4', name: 'Sarah Wilson', team: 'Pharmacy Support' },
      { id: 'agent-5', name: 'Alex Brown', team: 'Pharmacy Support' },
    ];
  }
  
  /**
   * Get agent details by ID
   * Would be replaced with API call
   */
  export async function getAgentById(id: string): Promise<Agent | null> {
    const agents = await getDummyAgents();
    return agents.find(agent => agent.id === id) || null;
  }
  
  /**
   * Get agent performance metrics
   * Would be replaced with API call
   */
  export async function getAgentPerformance(id: string): Promise<any> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Return dummy performance data
    return {
      id,
      overall: Math.floor(70 + Math.random() * 30),
      metrics: {
        communication: Math.floor(60 + Math.random() * 40),
        adherenceToProtocol: Math.floor(70 + Math.random() * 30),
        empathy: Math.floor(65 + Math.random() * 35),
        efficiency: Math.floor(75 + Math.random() * 25),
      },
      callsHandled: Math.floor(100 + Math.random() * 200),
      avgCallDuration: Math.floor(120 + Math.random() * 180),
    };
  }