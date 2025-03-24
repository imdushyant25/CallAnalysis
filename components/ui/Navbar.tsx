/**
 * Navbar Component
 * Top navigation bar for the application
 */
'use client';

import { useState } from 'react';
import { 
  Box, 
  Flex, 
  Heading, 
  IconButton, 
  Avatar, 
  Menu, 
  MenuButton, 
  MenuList, 
  MenuItem, 
  Input, 
  InputGroup, 
  InputLeftElement,
  HStack,
  Text,
  useColorMode
} from '@chakra-ui/react';
import { 
  HamburgerIcon, 
  SearchIcon, 
  BellIcon, 
  MoonIcon, 
  SunIcon 
} from '@chakra-ui/icons';
import Link from 'next/link';

interface NavbarProps {
  onMenuToggle?: () => void;
}

export default function Navbar({ onMenuToggle }: NavbarProps) {
  const { colorMode, toggleColorMode } = useColorMode();
  const [searchQuery, setSearchQuery] = useState('');
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement search functionality
    console.log('Search query:', searchQuery);
  };
  
  return (
    <Box as="nav" bg="blue.600" color="white" px={4} py={2}>
      <Flex justify="space-between" align="center">
        {/* Left side - Logo and menu toggle */}
        <Flex align="center">
          <IconButton
            aria-label="Toggle menu"
            icon={<HamburgerIcon />}
            variant="ghost"
            color="white"
            _hover={{ bg: 'blue.500' }}
            onClick={onMenuToggle}
            mr={2}
          />
          <Link href="/dashboard">
            <Heading size="md" cursor="pointer">Pharmacy Call Analysis</Heading>
          </Link>
        </Flex>
        
        {/* Center - Search bar */}
        <Box flex="1" mx={6} display={{ base: 'none', md: 'block' }}>
          <form onSubmit={handleSearch}>
            <InputGroup>
              <InputLeftElement pointerEvents="none">
                <SearchIcon color="gray.300" />
              </InputLeftElement>
              <Input
                placeholder="Search calls, agents, or drug mentions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                bg="white"
                color="gray.800"
                _placeholder={{ color: 'gray.400' }}
              />
            </InputGroup>
          </form>
        </Box>
        
        {/* Right side - User menu and actions */}
        <HStack spacing={3}>
          <IconButton
            aria-label="Toggle color mode"
            icon={colorMode === 'light' ? <MoonIcon /> : <SunIcon />}
            variant="ghost"
            color="white"
            _hover={{ bg: 'blue.500' }}
            onClick={toggleColorMode}
          />
          
          <IconButton
            aria-label="Notifications"
            icon={<BellIcon />}
            variant="ghost"
            color="white"
            _hover={{ bg: 'blue.500' }}
          />
          
          <Menu>
            <MenuButton>
              <Avatar size="sm" name="User Name" src="" />
            </MenuButton>
            <MenuList color="gray.800">
              <MenuItem>Profile</MenuItem>
              <MenuItem>Settings</MenuItem>
              <MenuItem>Help</MenuItem>
              <MenuItem>Sign Out</MenuItem>
            </MenuList>
          </Menu>
        </HStack>
      </Flex>
    </Box>
  );
}