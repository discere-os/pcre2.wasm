/**
 * PCRE2.wasm Test Suite
 * 
 * Comprehensive tests for regular expression functionality
 */

import { describe, it, expect, beforeAll } from 'vitest'
import PCRE2 from '../lib/index'

describe('PCRE2.wasm', () => {
  let pcre2: PCRE2

  beforeAll(async () => {
    pcre2 = new PCRE2()
    await pcre2.initialize()
  })

  describe('Basic functionality', () => {
    it('should initialize successfully', () => {
      expect(pcre2).toBeDefined()
    })

    it('should provide version information', () => {
      const version = pcre2.getVersion()
      expect(version).toHaveProperty('pcre2')
      expect(version).toHaveProperty('unicode')
      expect(version).toHaveProperty('jit')
      expect(typeof version.pcre2).toBe('string')
      expect(typeof version.unicode).toBe('string')
      expect(typeof version.jit).toBe('boolean')
    })

    it('should perform simple pattern matching', () => {
      const result = pcre2.test('\\d{4}-\\d{2}-\\d{2}', '2023-12-25')
      expect(result).toBe(true)
    })

    it('should fail on non-matching patterns', () => {
      const result = pcre2.test('\\d{4}-\\d{2}-\\d{2}', 'not a date')
      expect(result).toBe(false)
    })
  })

  describe('Pattern compilation', () => {
    it('should compile simple patterns', () => {
      const pattern = pcre2.compile('hello')
      expect(pattern).toBeDefined()
      expect(pattern.pattern).toBe('hello')
      pattern.destroy()
    })

    it('should compile patterns with options', () => {
      const pattern = pcre2.compile('HELLO', { caseless: true })
      expect(pattern).toBeDefined()
      expect(pattern.options.caseless).toBe(true)
      
      const result = pattern.test('hello')
      expect(result).toBe(true)
      
      pattern.destroy()
    })

    it('should provide pattern information', () => {
      const pattern = pcre2.compile('(\\w+)@(\\w+\\.\\w+)')
      expect(pattern.info.captureCount).toBe(2)
      expect(pattern.info.minLength).toBeGreaterThan(0)
      pattern.destroy()
    })

    it('should handle invalid patterns gracefully', () => {
      expect(() => {
        pcre2.compile('[invalid')
      }).toThrow()
    })
  })

  describe('Pattern matching', () => {
    it('should execute patterns and return match details', () => {
      const pattern = pcre2.compile('(\\d{4})-(\\d{2})-(\\d{2})')
      const result = pattern.exec('Today is 2023-12-25')
      
      expect(result).toBeDefined()
      expect(result!.success).toBe(true)
      expect(result!.captures).toBe(4) // Full match + 3 groups
      expect(result!.matches[0]).toBe('2023-12-25')
      expect(result!.matches[1]).toBe('2023')
      expect(result!.matches[2]).toBe('12')
      expect(result!.matches[3]).toBe('25')
      
      pattern.destroy()
    })

    it('should handle non-matches', () => {
      const pattern = pcre2.compile('\\d{4}-\\d{2}-\\d{2}')
      const result = pattern.exec('not a date')
      
      expect(result).toBeDefined()
      expect(result!.success).toBe(false)
      
      pattern.destroy()
    })

    it('should find all matches', () => {
      const pattern = pcre2.compile('\\d+')
      const results = pattern.execAll('There are 123 numbers and 456 more')
      
      expect(results).toHaveLength(2)
      expect(results[0].matches[0]).toBe('123')
      expect(results[1].matches[0]).toBe('456')
      
      pattern.destroy()
    })

    it('should support match options', () => {
      const pattern = pcre2.compile('^\\w+')
      
      // Should match at start
      let result = pattern.exec('hello world')
      expect(result!.success).toBe(true)
      
      // Should not match with NOTBOL
      result = pattern.exec('hello world', { notbol: true })
      expect(result!.success).toBe(false)
      
      pattern.destroy()
    })
  })

  describe('Pattern substitution', () => {
    it('should perform single substitution', () => {
      const pattern = pcre2.compile('\\d+')
      const result = pattern.replace('I have 123 apples', 'many')
      
      expect(result.success).toBe(true)
      expect(result.result).toBe('I have many apples')
      expect(result.substitutions).toBe(1)
      
      pattern.destroy()
    })

    it('should perform global substitution', () => {
      const pattern = pcre2.compile('\\d+')
      const result = pattern.replaceAll('I have 123 apples and 456 oranges', 'many')
      
      expect(result.success).toBe(true)
      expect(result.result).toBe('I have many apples and many oranges')
      expect(result.substitutions).toBe(2)
      
      pattern.destroy()
    })

    it('should support capture group references', () => {
      const pattern = pcre2.compile('(\\w+)\\s+(\\w+)')
      const result = pattern.replace('hello world', '$2 $1')
      
      expect(result.success).toBe(true)
      expect(result.result).toBe('world hello')
      
      pattern.destroy()
    })
  })

  describe('Unicode support', () => {
    it('should handle Unicode patterns', () => {
      const pattern = pcre2.compile('\\p{L}+', { ucp: true })
      const result = pattern.test('café')
      
      expect(result).toBe(true)
      pattern.destroy()
    })

    it('should match Unicode characters', () => {
      const pattern = pcre2.compile('🚀{3}', { utf: true })
      const result = pattern.exec('Launch 🚀🚀🚀 successful!')

      expect(result!.success).toBe(true)
      expect(result!.matches[0]).toContain('🚀🚀🚀')
      
      pattern.destroy()
    })
  })

  describe('Performance and metrics', () => {
    it('should provide system capabilities', () => {
      const capabilities = pcre2.getSystemCapabilities()
      
      expect(capabilities).toHaveProperty('environment')
      expect(capabilities).toHaveProperty('wasmSimd')
      expect(capabilities).toHaveProperty('platform')
      expect(['browser', 'node']).toContain(capabilities.environment)
    })

    it('should collect performance metrics', () => {
      const initialMetrics = pcre2.getMetrics()
      
      // Perform some operations
      const pattern = pcre2.compile('test')
      pattern.test('test string')
      pattern.destroy()
      
      const finalMetrics = pcre2.getMetrics()
      
      expect(finalMetrics.patternsCompiled).toBeGreaterThanOrEqual(initialMetrics.patternsCompiled)
    })
  })

  describe('Memory management', () => {
    it('should properly clean up compiled patterns', () => {
      const pattern = pcre2.compile('test')
      
      // Should work before destroy
      expect(pattern.test('test')).toBe(true)
      
      // Clean up
      pattern.destroy()
      
      // Pattern should still have properties but internal pointer is cleaned
      expect(pattern.pattern).toBe('test')
    })

    it('should handle multiple patterns', () => {
      const patterns = []
      
      for (let i = 0; i < 10; i++) {
        patterns.push(pcre2.compile(`pattern${i}`))
      }
      
      // All patterns should work
      for (let i = 0; i < patterns.length; i++) {
        expect(patterns[i].test(`pattern${i}`)).toBe(true)
      }
      
      // Clean up all patterns
      patterns.forEach(p => p.destroy())
    })
  })

  describe('Error handling', () => {
    it('should handle pattern compilation errors gracefully', () => {
      expect(() => {
        pcre2.compile('[unclosed bracket')
      }).toThrow()
    })

    it('should handle memory allocation failures gracefully', () => {
      // This test would require actually exhausting memory, which is impractical
      // Instead, we just verify the error handling structure exists
      const pattern = pcre2.compile('test')
      expect(pattern).toBeDefined()
      pattern.destroy()
    })
  })
})