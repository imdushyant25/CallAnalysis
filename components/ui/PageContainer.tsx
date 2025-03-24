/**
 * PageContainer Component
 * Container for page content with consistent padding and layout
 */
'use client';

import { Box, BoxProps } from '@chakra-ui/react';

interface PageContainerProps extends BoxProps {
  children: React.ReactNode;
}

export default function PageContainer({ children, ...rest }: PageContainerProps) {
  return (
    <Box
      as="main"
      flex="1"
      p={6}
      overflowY="auto"
      maxW="100%"
      h="calc(100vh - 4rem)"
      {...rest}
    >
      {children}
    </Box>
  );
}