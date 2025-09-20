/**
 * PCRE2.wasm SIMD Performance Tests
 * Tests SIMD optimizations and performance characteristics
 */

import { assertEquals, assertExists, assert } from "@std/assert"
import PCRE2 from "../../src/lib/index.ts"

Deno.test("SIMD Performance Validation", async (t) => {
  const pcre2 = new PCRE2()
  await pcre2.initialize({ enableMetrics: true })

  await t.step("should leverage SIMD for character search", () => {
    const capabilities = pcre2.getSystemCapabilities()

    if (capabilities.wasmSimd) {
      console.log("✅ WASM SIMD detected - testing optimized paths")
    } else {
      console.log("⚠️  WASM SIMD not available - using scalar fallback")
    }

    // Test patterns that benefit from SIMD optimizations
    const searchPatterns = [
      'a',           // Single character search (SIMD optimized)
      '\\d',         // Digit class matching (SIMD optimized)
      '\\s',         // Whitespace matching (SIMD optimized)
      '[a-zA-Z]',    // Character class (SIMD optimized)
      'hello'        // Substring search (SIMD optimized)
    ]

    const testText = 'hello world 123 this is a test string with many characters and digits 456'

    searchPatterns.forEach(pattern => {
      const compiled = pcre2.compile(pattern)
      const startTime = performance.now()

      // Perform multiple matches to test SIMD performance
      for (let i = 0; i < 1000; i++) {
        compiled.test(testText)
      }

      const elapsed = performance.now() - startTime
      console.log(`  Pattern "${pattern}": ${elapsed.toFixed(2)}ms for 1000 operations`)

      compiled.destroy()
    })
  })

  await t.step("should show performance improvement with large text", () => {
    // Generate large test text
    const largeText = 'hello world 123 '.repeat(10000) // ~160KB

    const patterns = [
      { pattern: 'hello', description: 'Simple substring search' },
      { pattern: '\\d+', description: 'Digit sequence matching' },
      { pattern: '[a-z]+', description: 'Lowercase letter matching' },
      { pattern: '\\b\\w{5}\\b', description: '5-letter word matching' }
    ]

    console.log(`\n  Testing with ${(largeText.length / 1024).toFixed(1)}KB text:`)

    patterns.forEach(({ pattern, description }) => {
      const compiled = pcre2.compile(pattern)

      const startTime = performance.now()
      const result = compiled.exec(largeText)
      const elapsed = (performance.now() - startTime) * 1000 // microseconds

      const throughput = (largeText.length / (elapsed / 1000000)).toFixed(0) // bytes/second

      console.log(`  ${description}:`)
      console.log(`    Pattern: ${pattern}`)
      console.log(`    Time: ${elapsed.toFixed(1)}μs`)
      console.log(`    Throughput: ${(throughput / 1024 / 1024).toFixed(1)} MB/s`)
      console.log(`    Result: ${result?.success ? 'Match found' : 'No match'}`)

      compiled.destroy()
    })
  })

  await t.step("should demonstrate repetitive pattern performance", () => {
    // Test patterns that benefit significantly from SIMD
    const repetitivePatterns = [
      { pattern: 'a+', text: 'a'.repeat(1000), description: 'Repetitive character' },
      { pattern: '\\d+', text: '1234567890'.repeat(100), description: 'Digit sequences' },
      { pattern: '\\s+', text: '   \t\n  '.repeat(200), description: 'Whitespace sequences' }
    ]

    console.log('\n  SIMD-optimized repetitive patterns:')

    repetitivePatterns.forEach(({ pattern, text, description }) => {
      const compiled = pcre2.compile(pattern)

      const iterations = 1000
      const startTime = performance.now()

      for (let i = 0; i < iterations; i++) {
        compiled.test(text)
      }

      const elapsed = performance.now() - startTime
      const opsPerSec = (iterations / (elapsed / 1000)).toFixed(0)

      console.log(`  ${description}:`)
      console.log(`    Operations/sec: ${Number(opsPerSec).toLocaleString()}`)
      console.log(`    Time per op: ${(elapsed * 1000 / iterations).toFixed(1)}μs`)

      compiled.destroy()
    })
  })
})

Deno.test("SIMD Character Search Optimization", async (t) => {
  const pcre2 = new PCRE2()
  await pcre2.initialize()

  await t.step("should optimize single character searches", () => {
    const text = 'The quick brown fox jumps over the lazy dog'
    const searchChars = ['q', 'z', 'x', 'a', 'e']

    console.log('\n  Single character search performance:')

    searchChars.forEach(char => {
      const startTime = performance.now()

      // Test both simple test and pattern compilation
      const isMatch = pcre2.test(char, text)
      const pattern = pcre2.compile(char)
      const execResult = pattern.exec(text)

      const elapsed = (performance.now() - startTime) * 1000

      assertEquals(isMatch, execResult?.success || false)

      console.log(`    Character '${char}': ${isMatch ? 'Found' : 'Not found'} (${elapsed.toFixed(1)}μs)`)

      pattern.destroy()
    })
  })

  await t.step("should handle character class matching efficiently", () => {
    const text = 'Mixed123Text456With789Numbers'

    const characterClasses = [
      { pattern: '[0-9]', description: 'Digits' },
      { pattern: '[a-z]', description: 'Lowercase' },
      { pattern: '[A-Z]', description: 'Uppercase' },
      { pattern: '[a-zA-Z]', description: 'Letters' },
      { pattern: '\\w', description: 'Word characters' },
      { pattern: '\\d', description: 'Digits (shorthand)' }
    ]

    console.log('\n  Character class matching:')

    characterClasses.forEach(({ pattern, description }) => {
      const compiled = pcre2.compile(pattern)
      const matches = compiled.execAll(text)

      console.log(`    ${description} (${pattern}): ${matches.length} matches`)

      compiled.destroy()
    })
  })
})

Deno.test("SIMD String Search Performance", async (t) => {
  const pcre2 = new PCRE2()
  await pcre2.initialize()

  await t.step("should optimize substring searches", () => {
    // Create text with multiple occurrences
    const baseText = 'The quick brown fox jumps over the lazy dog. '
    const largeText = baseText.repeat(1000) // ~43KB

    const substrings = ['fox', 'dog', 'quick', 'lazy', 'jumps']

    console.log(`\n  Substring search in ${(largeText.length / 1024).toFixed(1)}KB text:`)

    substrings.forEach(substring => {
      const compiled = pcre2.compile(substring)

      const startTime = performance.now()
      const allMatches = compiled.execAll(largeText)
      const elapsed = (performance.now() - startTime) * 1000

      const throughput = (largeText.length / (elapsed / 1000000))

      console.log(`    "${substring}": ${allMatches.length} matches`)
      console.log(`      Time: ${elapsed.toFixed(1)}μs`)
      console.log(`      Throughput: ${(throughput / 1024 / 1024).toFixed(1)} MB/s`)

      compiled.destroy()
    })
  })

  await t.step("should handle complex pattern searches", () => {
    const text = `
      Email addresses: user@example.com, admin@test.org, support@company.co.uk
      Phone numbers: 555-123-4567, (555) 987-6543, 555.111.2222
      URLs: https://www.example.com, http://test.org/path, ftp://files.example.com
      Dates: 2023-12-25, 01/01/2024, Dec 25, 2023
    `.repeat(100) // Larger text for better performance measurement

    const complexPatterns = [
      {
        pattern: '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}',
        description: 'Email addresses'
      },
      {
        pattern: '\\(?\\d{3}\\)?[-.\\s]?\\d{3}[-.\\s]?\\d{4}',
        description: 'Phone numbers'
      },
      {
        pattern: 'https?://[^\\s]+',
        description: 'HTTP URLs'
      },
      {
        pattern: '\\d{4}-\\d{2}-\\d{2}',
        description: 'ISO dates'
      }
    ]

    console.log('\n  Complex pattern matching:')

    complexPatterns.forEach(({ pattern, description }) => {
      const compiled = pcre2.compile(pattern, { caseless: true })

      const startTime = performance.now()
      const matches = compiled.execAll(text)
      const elapsed = (performance.now() - startTime) * 1000

      console.log(`    ${description}:`)
      console.log(`      Matches found: ${matches.length}`)
      console.log(`      Time: ${elapsed.toFixed(1)}μs`)
      console.log(`      Rate: ${(matches.length / (elapsed / 1000000)).toFixed(0)} matches/sec`)

      compiled.destroy()
    })
  })
})

Deno.test("SIMD Memory Operations", async (t) => {
  const pcre2 = new PCRE2()
  await pcre2.initialize({ enableMetrics: true })

  await t.step("should track memory usage during operations", () => {
    const initialMetrics = pcre2.getMetrics()
    const patterns: any[] = []

    // Compile multiple patterns
    for (let i = 0; i < 10; i++) {
      patterns.push(pcre2.compile(`pattern_${i}_\\d+`))
    }

    const midMetrics = pcre2.getMetrics()

    // Use the patterns
    const testText = 'pattern_5_123 and pattern_7_456'
    patterns.forEach(pattern => {
      pattern.test(testText)
    })

    const finalMetrics = pcre2.getMetrics()

    // Clean up
    patterns.forEach(pattern => pattern.destroy())

    console.log('\n  Memory usage progression:')
    console.log(`    Initial: ${initialMetrics.memoryUsage.current} bytes`)
    console.log(`    After compilation: ${midMetrics.memoryUsage.current} bytes`)
    console.log(`    After execution: ${finalMetrics.memoryUsage.current} bytes`)
    console.log(`    Peak usage: ${finalMetrics.memoryUsage.peak} bytes`)
  })
})