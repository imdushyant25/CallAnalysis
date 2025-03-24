/** @type {import('next').NextConfig} */
const nextConfig = {
    // Enable React strict mode for highlighting potential problems
    reactStrictMode: true,
    
    // Configure image domains if needed for remote images
    images: {
      domains: ['pharmacy-call-analysis-storage.s3.amazonaws.com'],
    },
    
    // Add any environment variables that should be exposed to the browser
    env: {
      API_BASE_URL: process.env.API_BASE_URL,
      COGNITO_REGION: process.env.COGNITO_REGION,
      COGNITO_USER_POOL_ID: process.env.COGNITO_USER_POOL_ID,
      COGNITO_USER_POOL_CLIENT_ID: process.env.COGNITO_USER_POOL_CLIENT_ID,
    },
  };
  
  module.exports = nextConfig;