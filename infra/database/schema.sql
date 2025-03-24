-- File location: database/schema.sql
-- Core database schema for Pharmacy Call Analysis Platform

-- Enable UUID extension for generating unique IDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Agents table - Store information about customer service agents
CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id VARCHAR(50) NOT NULL UNIQUE, -- External agent ID (for integration with other systems)
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    team VARCHAR(100),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create index for frequently queried fields
CREATE INDEX idx_agents_name ON agents(name);
CREATE INDEX idx_agents_team ON agents(team);

-- Calls table - Store information about recorded calls
CREATE TABLE calls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    s3_audio_key VARCHAR(255) NOT NULL UNIQUE, -- S3 path to the audio file
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), -- When the call occurred
    duration INTEGER DEFAULT 0, -- Duration in seconds
    agent_id UUID REFERENCES agents(id),
    metadata JSONB, -- Flexible storage for additional metadata
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for frequently queried fields
CREATE INDEX idx_calls_timestamp ON calls(timestamp);
CREATE INDEX idx_calls_agent_id ON calls(agent_id);
CREATE INDEX idx_calls_duration ON calls(duration);
CREATE INDEX idx_calls_metadata ON calls USING gin(metadata);

-- Processing status table - Track the processing status of calls
CREATE TABLE processing_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL, -- 'pending', 'transcribing', 'analyzing', 'completed', 'failed'
    transcription_status VARCHAR(50), -- 'pending', 'in_progress', 'completed', 'failed'
    analysis_status VARCHAR(50), -- 'pending', 'in_progress', 'completed', 'failed'
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(call_id) -- One status entry per call
);

CREATE INDEX idx_processing_status_status ON processing_status(status);

-- Transcriptions table - Store transcribed text from calls
CREATE TABLE transcriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
    full_text TEXT NOT NULL, -- Complete transcription text
    metadata JSONB, -- Store model info, language, processing time, etc.
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(call_id) -- One transcription per call
);

CREATE INDEX idx_transcriptions_call_id ON transcriptions(call_id);
CREATE INDEX idx_transcriptions_text_search ON transcriptions USING gin(to_tsvector('english', full_text));

-- Transcription segments - Store individual segments of transcriptions with timestamps
CREATE TABLE transcription_segments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transcription_id UUID NOT NULL REFERENCES transcriptions(id) ON DELETE CASCADE,
    speaker VARCHAR(50) NOT NULL, -- 'Agent', 'Customer', etc.
    text TEXT NOT NULL,
    start_time NUMERIC(10, 3) NOT NULL, -- Start time in seconds
    end_time NUMERIC(10, 3) NOT NULL, -- End time in seconds 
    confidence NUMERIC(5, 4), -- Confidence score from transcription API
    segment_index INTEGER NOT NULL, -- Order in the original transcription
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_transcription_segments_transcription_id ON transcription_segments(transcription_id);
CREATE INDEX idx_transcription_segments_speaker ON transcription_segments(speaker);
CREATE INDEX idx_transcription_segments_start_time ON transcription_segments(start_time);

-- Analyses table - Store call analysis results
CREATE TABLE analyses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
    sentiment_score INTEGER, -- Overall sentiment score (0-100)
    call_summary TEXT, -- Summary of the call
    disposition VARCHAR(100), -- Call category/disposition
    follow_up_required BOOLEAN DEFAULT FALSE,
    metadata JSONB, -- Store model info, version, processing time, etc.
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(call_id) -- One analysis per call
);

CREATE INDEX idx_analyses_call_id ON analyses(call_id);
CREATE INDEX idx_analyses_sentiment_score ON analyses(sentiment_score);
CREATE INDEX idx_analyses_disposition ON analyses(disposition);
CREATE INDEX idx_analyses_follow_up_required ON analyses(follow_up_required);

-- Analysis details tables - Store detailed components of the analysis

-- Sentiment timeline - Track sentiment changes throughout the call
CREATE TABLE sentiment_timeline (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    analysis_id UUID NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
    time_point NUMERIC(10, 3) NOT NULL, -- Time in seconds from start of call
    score INTEGER NOT NULL, -- Sentiment score (0-100)
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sentiment_timeline_analysis_id ON sentiment_timeline(analysis_id);
CREATE INDEX idx_sentiment_timeline_time_point ON sentiment_timeline(time_point);

-- Agent performance metrics
CREATE TABLE agent_performance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    analysis_id UUID NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
    communication_score INTEGER, -- 0-100
    adherence_to_protocol INTEGER, -- 0-100
    empathy_score INTEGER, -- 0-100
    efficiency_score INTEGER, -- 0-100
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(analysis_id) -- One set of metrics per analysis
);

CREATE INDEX idx_agent_performance_analysis_id ON agent_performance(analysis_id);

-- Agent improvement areas and effective techniques
CREATE TABLE agent_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    analysis_id UUID NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'improvement' or 'effective'
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_agent_feedback_analysis_id ON agent_feedback(analysis_id);
CREATE INDEX idx_agent_feedback_type ON agent_feedback(type);

-- Clinical information
CREATE TABLE clinical_summary (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    analysis_id UUID NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
    clinical_context TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(analysis_id) -- One clinical summary per analysis
);

CREATE INDEX idx_clinical_summary_analysis_id ON clinical_summary(analysis_id);

-- Medical conditions mentioned in calls
CREATE TABLE medical_conditions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinical_summary_id UUID NOT NULL REFERENCES clinical_summary(id) ON DELETE CASCADE,
    condition_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_medical_conditions_clinical_summary_id ON medical_conditions(clinical_summary_id);
CREATE INDEX idx_medical_conditions_name ON medical_conditions(condition_name);

-- Drug mentions in calls
CREATE TABLE drug_mentions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinical_summary_id UUID NOT NULL REFERENCES clinical_summary(id) ON DELETE CASCADE,
    drug_name VARCHAR(255) NOT NULL,
    count INTEGER DEFAULT 1,
    context TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_drug_mentions_clinical_summary_id ON drug_mentions(clinical_summary_id);
CREATE INDEX idx_drug_mentions_drug_name ON drug_mentions(drug_name);
CREATE INDEX idx_drug_mentions_count ON drug_mentions(count);

-- Call flags - Issues or concerns identified in calls
CREATE TABLE call_flags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'compliance', 'escalation', 'manual', etc.
    description TEXT NOT NULL,
    severity VARCHAR(20) NOT NULL, -- 'low', 'medium', 'high'
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_call_flags_call_id ON call_flags(call_id);
CREATE INDEX idx_call_flags_type ON call_flags(type);
CREATE INDEX idx_call_flags_severity ON call_flags(severity);

-- Call tags - Keywords or categories for calls
CREATE TABLE call_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
    tag VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(call_id, tag) -- Prevent duplicate tags for the same call
);

CREATE INDEX idx_call_tags_call_id ON call_tags(call_id);
CREATE INDEX idx_call_tags_tag ON call_tags(tag);

-- Create trigger functions to automatically update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for each table with updated_at column
CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_calls_updated_at BEFORE UPDATE ON calls FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_processing_status_updated_at BEFORE UPDATE ON processing_status FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transcriptions_updated_at BEFORE UPDATE ON transcriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transcription_segments_updated_at BEFORE UPDATE ON transcription_segments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_analyses_updated_at BEFORE UPDATE ON analyses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_agent_performance_updated_at BEFORE UPDATE ON agent_performance FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clinical_summary_updated_at BEFORE UPDATE ON clinical_summary FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add default agent for uploads without specified agent
INSERT INTO agents (agent_id, name, team) 
VALUES ('unassigned', 'Unassigned', 'Unassigned')
ON CONFLICT (agent_id) DO NOTHING;

-- Add function to search transcription text
CREATE OR REPLACE FUNCTION search_transcriptions(search_query TEXT)
RETURNS TABLE (
    call_id UUID,
    timestamp TIMESTAMP WITH TIME ZONE,
    agent_name VARCHAR(100),
    duration INTEGER,
    sentiment_score INTEGER,
    text_snippet TEXT,
    relevance FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id AS call_id,
        c.timestamp,
        a.name AS agent_name,
        c.duration,
        an.sentiment_score,
        ts_headline('english', t.full_text, to_tsquery('english', search_query)) AS text_snippet,
        ts_rank_cd(to_tsvector('english', t.full_text), to_tsquery('english', search_query)) AS relevance
    FROM transcriptions t
    JOIN calls c ON t.call_id = c.id
    LEFT JOIN agents a ON c.agent_id = a.id
    LEFT JOIN analyses an ON c.id = an.call_id
    WHERE to_tsvector('english', t.full_text) @@ to_tsquery('english', search_query)
    ORDER BY relevance DESC;
END;
$$ LANGUAGE plpgsql;