/**
 * PCRE2.wasm Comprehensive Benchmarks
 * Performance benchmarks for regex operations with SIMD optimizations
 */

import PCRE2 from "../src/lib/index.ts"

let pcre2: PCRE2

// Setup
await (async () => {
  pcre2 = new PCRE2()
  await pcre2.initialize({ enableMetrics: true })
})()

// Generate test data
const smallText = "The quick brown fox jumps over the lazy dog"
const mediumText = "The quick brown fox jumps over the lazy dog. ".repeat(100) // ~4.3KB
const largeText = "The quick brown fox jumps over the lazy dog. ".repeat(10000) // ~430KB

const emailText = `
Contact us at support@example.com or admin@test.org
For sales inquiries, reach out to sales@company.co.uk
Technical support: tech@support.example.com
General questions: info@website.net
`.repeat(1000)

const phoneText = `
Call us at 555-123-4567 or (555) 987-6543
Alternative numbers: 555.111.2222, 555-999-8888
International: +1-555-777-9999
`.repeat(1000)

// Simple pattern matching benchmarks
Deno.bench("Simple Pattern - Single Character", () => {
  pcre2.test('x', mediumText)
})

Deno.bench("Simple Pattern - Word Boundary", () => {
  pcre2.test('\\bfox\\b', mediumText)
})

Deno.bench("Simple Pattern - Digit Sequence", () => {
  pcre2.test('\\d+', '123 and 456 and 789')
})

// Compiled pattern benchmarks
Deno.bench("Compiled Pattern - Email Validation", () => {
  const pattern = pcre2.compile('[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}')
  pattern.test('user@example.com')
  pattern.destroy()
})

Deno.bench("Compiled Pattern - Phone Validation", () => {
  const pattern = pcre2.compile('\\(?\\d{3}\\)?[-.\\s]?\\d{3}[-.\\s]?\\d{4}')
  pattern.test('555-123-4567')
  pattern.destroy()
})

Deno.bench("Compiled Pattern - Date Validation", () => {
  const pattern = pcre2.compile('\\d{4}-\\d{2}-\\d{2}')
  pattern.test('2023-12-25')
  pattern.destroy()
})

// Character class matching (SIMD optimized)
Deno.bench("SIMD Character Class - Digits", () => {
  const pattern = pcre2.compile('\\d')
  pattern.test(mediumText + ' 123')
  pattern.destroy()
})

Deno.bench("SIMD Character Class - Letters", () => {
  const pattern = pcre2.compile('[a-zA-Z]')
  pattern.test(mediumText)
  pattern.destroy()
})

Deno.bench("SIMD Character Class - Whitespace", () => {
  const pattern = pcre2.compile('\\s+')
  pattern.test(mediumText)
  pattern.destroy()
})

// Large text processing
Deno.bench("Large Text - Single Match", () => {
  pcre2.test('fox', largeText)
})

Deno.bench("Large Text - Multiple Matches", () => {
  const pattern = pcre2.compile('the', { caseless: true })
  pattern.execAll(largeText)
  pattern.destroy()
})

Deno.bench("Large Text - Email Extraction", () => {
  const pattern = pcre2.compile('[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}')
  pattern.execAll(emailText)
  pattern.destroy()
})

Deno.bench("Large Text - Phone Extraction", () => {
  const pattern = pcre2.compile('\\(?\\d{3}\\)?[-.\\s]?\\d{3}[-.\\s]?\\d{4}')
  pattern.execAll(phoneText)
  pattern.destroy()
})

// Advanced features
Deno.bench("Unicode Support - Word Characters", () => {
  const pattern = pcre2.compile('\\p{L}+', { utf: true, ucp: true })
  pattern.test('Hello мир 世界')
  pattern.destroy()
})

Deno.bench("Case-Insensitive Matching", () => {
  const pattern = pcre2.compile('HELLO', { caseless: true })
  pattern.test('hello world Hello HELLO')
  pattern.destroy()
})

Deno.bench("Multiline Pattern Matching", () => {
  const pattern = pcre2.compile('^line', { multiline: true })
  pattern.test('first line\nsecond line\nthird line')
  pattern.destroy()
})

// Substitution benchmarks
Deno.bench("Text Replacement - Single", () => {
  const pattern = pcre2.compile('fox')
  pattern.replace(mediumText, 'wolf')
  pattern.destroy()
})

Deno.bench("Text Replacement - Global", () => {
  const pattern = pcre2.compile('the', { caseless: true })
  pattern.replaceAll(mediumText, 'a')
  pattern.destroy()
})

Deno.bench("Phone Number Formatting", () => {
  const pattern = pcre2.compile('(\\d{3})-(\\d{3})-(\\d{4})')
  pattern.replaceAll('555-123-4567 and 555-987-6543', '($1) $2-$3')
  pattern.destroy()
})

// Memory efficiency benchmarks
Deno.bench("Pattern Compilation Overhead", () => {
  const patterns = []
  for (let i = 0; i < 10; i++) {
    patterns.push(pcre2.compile(`test${i}`))
  }
  patterns.forEach(p => p.destroy())
})

Deno.bench("Pattern Reuse Efficiency", () => {
  const pattern = pcre2.compile('\\b\\w+\\b')
  for (let i = 0; i < 100; i++) {
    pattern.test(smallText)
  }
  pattern.destroy()
})

// SIMD-specific benchmarks
Deno.bench("SIMD Character Search - Optimized", () => {
  // This should trigger SIMD-optimized character search
  const pattern = pcre2.compile('q')
  pattern.test(largeText)
  pattern.destroy()
})

Deno.bench("SIMD Memory Compare", () => {
  // Tests SIMD-optimized memory operations
  const pattern = pcre2.compile('quick brown fox')
  pattern.test(largeText)
  pattern.destroy()
})

Deno.bench("SIMD Newline Detection", () => {
  const textWithNewlines = (smallText + '\n').repeat(1000)
  const pattern = pcre2.compile('^', { multiline: true })
  pattern.execAll(textWithNewlines)
  pattern.destroy()
})

// Report final metrics after all benchmarks
setTimeout(() => {
  console.log('\n📊 Final Performance Metrics:')
  const metrics = pcre2.getMetrics()
  console.log(`  Patterns compiled: ${metrics.patternsCompiled}`)
  console.log(`  Matches performed: ${metrics.matchesPerformed}`)
  console.log(`  Average compile time: ${metrics.averageCompileTime.toFixed(1)}μs`)
  console.log(`  Current memory usage: ${(metrics.memoryUsage.current / 1024).toFixed(1)} KB`)
  console.log(`  Peak memory usage: ${(metrics.memoryUsage.peak / 1024).toFixed(1)} KB`)

  const capabilities = pcre2.getSystemCapabilities()
  console.log(`\n🚀 System Capabilities:`)
  console.log(`  WASM SIMD: ${capabilities.wasmSimd ? '✅ Enabled' : '❌ Disabled'}`)
  console.log(`  Environment: ${capabilities.environment}`)
  console.log(`  CPU Cores: ${capabilities.cpuCores || 'Unknown'}`)
}, 100)