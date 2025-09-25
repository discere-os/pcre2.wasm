/**
 * Comprehensive benchmarking suite for PCRE2.wasm
 * Performance validation and real-world pattern testing
 */

import PCRE2 from './lib/index.js'

interface BenchmarkConfiguration {
  name: string
  pattern: string
  testData: string
  iterations: number
  description: string
}

interface BenchmarkResult {
  name: string
  timeMs: number
  opsPerSec: number
}

class PCRE2Benchmark {
  private pcre2: PCRE2

  constructor() {
    this.pcre2 = new PCRE2()
  }

  async initialize(): Promise<void> {
    console.log('📊 PCRE2.wasm Performance Benchmarks')
    console.log('====================================')

    // Initialize module (SIMD required)
    await this.pcre2.initialize()
    console.log('✅ PCRE2 optimized module loaded')

    const capabilities = this.pcre2.getSystemCapabilities()
    if (!capabilities.wasmSimd) {
      throw new Error('WASM SIMD is required. Use Chrome/Edge 113+ with SIMD enabled.')
    }
    console.log(`⚡ SIMD Support: YES`)
    console.log(`🖥️ Platform: ${capabilities.platform}`)
  }

  /**
   * Generate test data for different scenarios
   */
  private generateTestData(size: number, pattern?: string): string {
    if (pattern) {
      // Generate data with embedded pattern
      const baseData = 'a'.repeat(Math.floor(size * 0.9))
      const patternData = ` ${pattern} `.repeat(Math.floor(size * 0.1 / (pattern.length + 2)))
      return (baseData + patternData).substring(0, size)
    }

    // Generate random-ish text data
    let data = ''
    for (let i = 0; i < size; i++) {
      data += String.fromCharCode(97 + (i % 26)) // a-z pattern
    }
    return data
  }

  /**
   * Run a single benchmark configuration
   */
  private async runBenchmark(config: BenchmarkConfiguration): Promise<BenchmarkResult> {
    const { name, pattern, testData, iterations } = config

    // Warm up
    for (let i = 0; i < 3; i++) {
      this.pcre2.test(pattern, testData)
    }

    const start = performance.now()
    for (let i = 0; i < iterations; i++) {
      this.pcre2.test(pattern, testData)
    }
    const timeMs = performance.now() - start

    return {
      name,
      timeMs,
      opsPerSec: Math.round((iterations * 1000) / timeMs)
    }
  }

  /**
   * Run comprehensive benchmark suite
   */
  async runAll(): Promise<BenchmarkResult[]> {
    console.log('\n🏁 Running Performance Benchmarks...\n')

    const configurations: BenchmarkConfiguration[] = [
      {
        name: 'Email Validation',
        pattern: '\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b',
        testData: this.generateTestData(10000, 'user@example.com'),
        iterations: 25000,
        description: 'Email address pattern matching'
      },
      {
        name: 'Date Extraction',
        pattern: '\\d{4}-\\d{2}-\\d{2}',
        testData: this.generateTestData(10000, '2023-12-25'),
        iterations: 25000,
        description: 'ISO date format extraction'
      },
      {
        name: 'Phone Numbers',
        pattern: '\\d{3}-\\d{3}-\\d{4}',
        testData: this.generateTestData(10000, '555-123-4567'),
        iterations: 25000,
        description: 'US phone number validation'
      },
      {
        name: 'URL Matching',
        pattern: 'https?:\\/\\/[^\\s]+',
        testData: this.generateTestData(10000, 'https://example.com/path'),
        iterations: 15000,
        description: 'URL detection in text'
      },
      {
        name: 'Hex Color Codes',
        pattern: '#[0-9a-fA-F]{6}',
        testData: this.generateTestData(10000, '#FF5733'),
        iterations: 20000,
        description: 'CSS hex color validation'
      },
      {
        name: 'Complex Pattern',
        pattern: '(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)',
        testData: this.generateTestData(10000, '192.168.1.1'),
        iterations: 15000,
        description: 'IPv4 address validation'
      }
    ]

    const results: BenchmarkResult[] = []

    for (const config of configurations) {
      console.log(`📋 ${config.name}:`)
      const result = await this.runBenchmark(config)
      results.push(result)

      console.log(`  Throughput: ${result.opsPerSec.toLocaleString()} ops/sec (${result.timeMs.toFixed(1)}ms)`)
      console.log('')
    }

    return results
  }

  /**
   * Print summary statistics
   */
  printSummary(results: BenchmarkResult[]): void {
    console.log('🎯 Performance Summary:')

    const avgOps = results.reduce((sum, r) => sum + r.opsPerSec, 0) / results.length
    const maxOps = Math.max(...results.map(r => r.opsPerSec))
    const minOps = Math.min(...results.map(r => r.opsPerSec))

    console.log(`  Average throughput: ${avgOps.toLocaleString()} ops/sec`)
    console.log(`  Maximum throughput: ${maxOps.toLocaleString()} ops/sec`)
    console.log(`  Minimum throughput: ${minOps.toLocaleString()} ops/sec`)

    console.log('\n🎉 PCRE2.wasm benchmark verification completed!')
  }

  /**
   * Get system metrics
   */
  getMetrics() {
    return this.pcre2.getMetrics()
  }
}

/**
 * Main benchmark execution
 */
export async function runBenchmark(): Promise<void> {
  const benchmark = new PCRE2Benchmark()

  try {
    await benchmark.initialize()
    const results = await benchmark.runAll()
    benchmark.printSummary(results)

    // Output metrics if available
    const metrics = benchmark.getMetrics()
    if (metrics && metrics.patternsCompiled > 0) {
      console.log('\n📊 Runtime Metrics:')
      console.log(`  Patterns compiled: ${metrics.patternsCompiled}`)
      console.log(`  Matches performed: ${metrics.matchesPerformed}`)
      console.log(`  Average compile time: ${metrics.averageCompileTime.toFixed(2)}μs`)
    }

  } catch (error) {
    console.error('❌ Benchmark failed:', error)
    process.exit(1)
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runBenchmark()
}
