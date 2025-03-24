/**
 * Application providers component
 * Sets up Chakra UI provider and other context providers
 */
'use client';

import { CacheProvider } from '@chakra-ui/next-js';
import { ChakraProvider } from '@chakra-ui/react';
import theme from '@/theme';
import { SWRConfig } from 'swr';

// API fetcher function for SWR
const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <CacheProvider>
      <ChakraProvider theme={theme}>
        <SWRConfig 
          value={{
            fetcher,
            onError: (error) => {
              console.error('SWR Error:', error);
            },
          }}
        >
          {children}
        </SWRConfig>
      </ChakraProvider>
    </CacheProvider>
  );
}