# Pharmacy Call Analysis Platform

A comprehensive solution for analyzing customer service calls in a pharmacy benefits administration context. The platform transcribes recorded calls, analyzes them using AI to extract meaningful insights, and presents these insights through an intuitive dashboard.

## Project Overview

The Pharmacy Call Analysis Platform helps:
- Improve agent performance through data-driven insights
- Flag problematic calls for review
- Identify drug mentions and track trends
- Detect process issues and improvement opportunities
- Provide comprehensive call summarization
- Analyze sentiment throughout calls
- Categorize calls by disposition

## Technology Stack

- **Frontend**: Next.js with App Router, TypeScript, Chakra UI
- **Data Visualization**: D3.js and Recharts
- **Backend**: AWS Lambda with API Gateway
- **Authentication**: AWS Cognito
- **Transcription**: Whisper API
- **Analysis**: Claude API
- **Storage**: AWS S3 (audio files), AWS RDS PostgreSQL (structured data)
- **Infrastructure**: AWS services, Terraform

## Setup Instructions

### Prerequisites

TODO: List prerequisites

### Installation

TODO: Add installation instructions

### Configuration

TODO: Add configuration details

## Features

- Call Upload and Management
- Transcription
- AI Analysis (using Claude)
- Data Storage
- Dashboard & Visualization
- Call Comparison
- Trend Analysis
- Quality Assurance

## Development

TODO: Add development instructions

## Deployment

TODO: Add deployment instructions

## Project Structure

```
pharmacy-call-analysis/
├── app/              # Next.js application routes
├── components/       # Reusable React components
├── lib/              # Frontend utilities, types, and API clients
├── theme/            # Chakra UI theme configuration
├── backend/          # AWS Lambda functions and API
└── infra/            # Infrastructure as code
```

## License

TODO: Add license information