/**
 * Root layout component that wraps all pages
 * Provides Chakra UI provider and other global context
 */
import { Metadata } from 'next';
import Providers from './providers';
import { Inter } from 'next/font/google';

// Font configuration
const inter = Inter({ subsets: ['latin'] });

// Metadata for the application
export const metadata: Metadata = {
  title: 'Pharmacy Call Analysis Platform',
  description: 'A platform for analyzing customer service calls in pharmacy benefits administration',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}