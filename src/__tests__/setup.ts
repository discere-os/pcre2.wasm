/**
 * Vitest Setup Configuration for PCRE2.wasm
 * 
 * Configures test environment for WASM module testing
 */

import { beforeAll } from 'vitest'

// Setup global test configuration
beforeAll(async () => {
  // Ensure test environment is properly configured
  if (typeof globalThis.fetch === 'undefined') {
    // Mock fetch for Node.js environment if needed
    globalThis.fetch = async () => {
      throw new Error('Fetch not available in test environment')
    }
  }

  // Setup performance timing for Node.js
  if (typeof globalThis.performance === 'undefined') {
    const { performance } = await import('perf_hooks')
    globalThis.performance = performance as any
  }

  console.log('🧪 PCRE2.wasm test environment initialized')
})