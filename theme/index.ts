/**
 * Chakra UI Theme Configuration
 * Customized theme for the application
 */
import { extendTheme, type ThemeConfig } from '@chakra-ui/react';

// Color mode config
const config: ThemeConfig = {
  initialColorMode: 'light',
  useSystemColorMode: true,
};

// Custom colors
const colors = {
  brand: {
    50: '#e5f2ff',
    100: '#b8d9ff',
    200: '#8abfff',
    300: '#5ca5ff',
    400: '#2e8bff',
    500: '#0071e6',
    600: '#0058b4',
    700: '#004182',
    800: '#002851',
    900: '#001021',
  },
  // Other custom colors can be added here
};

// Custom fonts
const fonts = {
  heading: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
  body: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
};

// Custom component styles
const components = {
  Button: {
    baseStyle: {
      fontWeight: 'semibold',
      borderRadius: 'md',
    },
    variants: {
      solid: (props: { colorScheme: string }) => ({
        bg: props.colorScheme === 'brand' ? 'brand.500' : `${props.colorScheme}.500`,
        color: 'white',
        _hover: {
          bg: props.colorScheme === 'brand' ? 'brand.600' : `${props.colorScheme}.600`,
        },
      }),
      // Other variants can be added here
    },
  },
  // Other component customizations can be added here
};

// Custom breakpoints
const breakpoints = {
  sm: '30em',
  md: '48em',
  lg: '62em',
  xl: '80em',
  '2xl': '96em',
};

// Extend the theme
const theme = extendTheme({
  config,
  colors,
  fonts,
  components,
  breakpoints,
  styles: {
    global: (props: { colorMode: string }) => ({
      body: {
        bg: props.colorMode === 'dark' ? 'gray.900' : 'gray.50',
      },
    }),
  },
});

export default theme;