// File location: backend/utils/logger.ts
/**
 * Simple logger utility
 */

export const logger = {
    info: (message: string, ...args: any[]) => {
      console.info(`[INFO] ${message}`, ...args);
    },
    
    error: (message: string, error?: any) => {
      console.error(`[ERROR] ${message}`, error || '');
    },
    
    warn: (message: string, ...args: any[]) => {
      console.warn(`[WARN] ${message}`, ...args);
    },
    
    debug: (message: string, ...args: any[]) => {
      if (process.env.DEBUG === 'true') {
        console.debug(`[DEBUG] ${message}`, ...args);
      }
    }
  };