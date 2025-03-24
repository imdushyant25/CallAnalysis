-- File location: database/init-schema.sql
-- Essential tables for Pharmacy Call Analysis Platform with sample agent data

-- Enable UUID extension for generating unique IDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Agents table - Store information about customer service agents
CREATE TABLE IF NOT EXISTS agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id VARCHAR(50) NOT NULL UNIQUE, -- External agent ID
    name VARCHAR(100) NOT NULL,
    team VARCHAR(100),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Calls table - Store information about recorded calls
CREATE TABLE IF NOT EXISTS calls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    s3_audio_key VARCHAR(255) NOT NULL UNIQUE,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    duration INTEGER DEFAULT 0,
    agent_id UUID REFERENCES agents(id),
    metadata JSONB, -- Flexible storage for additional metadata
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_calls_timestamp ON calls(timestamp);
CREATE INDEX IF NOT EXISTS idx_calls_agent_id ON calls(agent_id);

-- Create trigger function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for each table with updated_at column
DROP TRIGGER IF EXISTS update_agents_updated_at ON agents;
CREATE TRIGGER update_agents_updated_at 
BEFORE UPDATE ON agents 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_calls_updated_at ON calls;
CREATE TRIGGER update_calls_updated_at 
BEFORE UPDATE ON calls 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample agent data
INSERT INTO agents (agent_id, name, team) VALUES
    ('unassigned', 'Unassigned', 'Unassigned'),
    ('agent-101', 'John Doe', 'Customer Service'),
    ('agent-102', 'Jane Smith', 'Technical Support'),
    ('agent-103', 'Michael Johnson', 'Customer Service'),
    ('agent-104', 'Emily Brown', 'Pharmacy Support'),
    ('agent-105', 'Robert Wilson', 'Pharmacy Support'),
    ('agent-106', 'Sarah Davis', 'Technical Support'),
    ('agent-107', 'David Miller', 'Customer Service'),
    ('agent-108', 'Jessica Anderson', 'Pharmacy Support'),
    ('agent-109', 'Thomas Taylor', 'Technical Support'),
    ('agent-110', 'Jennifer Martinez', 'Customer Service')
ON CONFLICT (agent_id) DO 
    UPDATE SET name = EXCLUDED.name, team = EXCLUDED.team;