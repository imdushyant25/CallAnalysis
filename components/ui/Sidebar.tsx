/**
 * File location: components/ui/Sidebar.tsx
 * Main navigation sidebar for the application
 */
'use client';

import { Box, VStack, Text, Icon, Flex, Divider, useColorModeValue } from '@chakra-ui/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  FiHome, 
  FiBarChart2, 
  FiPhone, 
  FiUpload, 
  FiUsers, 
  FiFileText, 
  FiSettings,
  FiTrendingUp,
  FiGitBranch // Using FiGitBranch instead of FiGitCompare which isn't available
} from 'react-icons/fi';

interface NavItemProps {
  icon: React.ElementType;
  href: string;
  children: React.ReactNode;
  isActive?: boolean;
}

const NavItem = ({ icon, href, children, isActive }: NavItemProps) => {
  const activeBg = useColorModeValue('blue.50', 'blue.900');
  const activeColor = useColorModeValue('blue.700', 'blue.200');
  const hoverBg = useColorModeValue('gray.100', 'gray.700');
  
  return (
    <Link href={href} passHref style={{ width: '100%' }}>
      <Flex
        align="center"
        p="4"
        mx="4"
        borderRadius="lg"
        role="group"
        cursor="pointer"
        bg={isActive ? activeBg : 'transparent'}
        color={isActive ? activeColor : undefined}
        _hover={{
          bg: hoverBg,
        }}
      >
        <Icon
          mr="4"
          fontSize="16"
          as={icon}
        />
        <Text fontWeight={isActive ? 'medium' : 'normal'}>{children}</Text>
      </Flex>
    </Link>
  );
};

export default function Sidebar() {
  const pathname = usePathname();
  const bg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  
  const isActive = (path: string) => pathname?.startsWith(path);
  
  return (
    <Box
      as="aside"
      w="64"
      h="calc(100vh - 4rem)"
      bg={bg}
      borderRight="1px"
      borderColor={borderColor}
      position="sticky"
      top="4rem"
      overflowY="auto"
    >
      <VStack spacing={0} align="stretch" py={4}>
        <NavItem icon={FiHome} href="/dashboard" isActive={isActive('/dashboard')}>
          Overview
        </NavItem>
        
        <NavItem icon={FiPhone} href="/dashboard/call-analysis" isActive={isActive('/dashboard/call-analysis')}>
          Call Analysis
        </NavItem>
        
        <NavItem icon={FiTrendingUp} href="/dashboard/trend-analysis" isActive={isActive('/dashboard/trend-analysis')}>
          Trend Analysis
        </NavItem>
        
        <NavItem icon={FiGitBranch} href="/dashboard/call-comparison" isActive={isActive('/dashboard/call-comparison')}>
          Call Comparison
        </NavItem>
        
        <NavItem icon={FiBarChart2} href="/dashboard/reports" isActive={isActive('/dashboard/reports')}>
          Reports
        </NavItem>
        
        <NavItem icon={FiUpload} href="/upload" isActive={isActive('/upload')}>
          Upload Calls
        </NavItem>
        
        <Divider my={4} />
        
        <NavItem icon={FiUsers} href="/agents" isActive={isActive('/agents')}>
          Agents
        </NavItem>
        
      </VStack>
    </Box>
  );
}