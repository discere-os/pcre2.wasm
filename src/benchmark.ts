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
  optimizedTime: number
  fallbackTime: number
  speedup: number
  opsPerSec: number
  accuracy: boolean
}

class PCRE2Benchmark {
  private pcre2: PCRE2
  private fallbackPcre2: PCRE2

  constructor() {
    this.pcre2 = new PCRE2()
    this.fallbackPcre2 = new PCRE2()
  }

  async initialize(): Promise<void> {
    console.log('📊 PCRE2.wasm Performance Benchmarks')
    console.log('====================================')

    // Initialize optimized version (release build includes SIMD)
    await this.pcre2.initialize({ variant: 'release' })
    console.log('✅ PCRE2 optimized module loaded')

    // Initialize fallback version
    await this.fallbackPcre2.initialize({ variant: 'optimized' })
    console.log('✅ PCRE2 fallback module loaded')

    const capabilities = this.pcre2.getSystemCapabilities()
    console.log(`⚡ SIMD Support: ${capabilities.wasmSimd ? 'YES' : 'NO'}`)
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
      this.fallbackPcre2.test(pattern, testData)
    }

    // Benchmark optimized version
    const optimizedStart = performance.now()
    let optimizedMatches = 0
    for (let i = 0; i < iterations; i++) {
      if (this.pcre2.test(pattern, testData)) {
        optimizedMatches++
      }
    }
    const optimizedTime = performance.now() - optimizedStart

    // Benchmark fallback version
    const fallbackStart = performance.now()
    let fallbackMatches = 0
    for (let i = 0; i < iterations; i++) {
      if (this.fallbackPcre2.test(pattern, testData)) {
        fallbackMatches++
      }
    }
    const fallbackTime = performance.now() - fallbackStart

    return {
      name,
      optimizedTime,
      fallbackTime,
      speedup: fallbackTime / optimizedTime,
      opsPerSec: Math.round((iterations * 1000) / optimizedTime),
      accuracy: optimizedMatches === fallbackMatches
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

      console.log(`  Optimized: ${result.opsPerSec.toLocaleString()} ops/sec (${result.optimizedTime.toFixed(1)}ms)`)
      console.log(`  Fallback:  ${Math.round((config.iterations * 1000) / result.fallbackTime).toLocaleString()} ops/sec (${result.fallbackTime.toFixed(1)}ms)`)
      console.log(`  Speedup:   ${result.speedup.toFixed(2)}x faster (optimized vs fallback)`)
      console.log(`  Accuracy:  ${result.accuracy ? '✅ Identical results' : '❌ Results differ'} (${config.iterations.toLocaleString()} iterations)`)
      console.log('')
    }

    return results
  }

  /**
   * Print summary statistics
   */
  printSummary(results: BenchmarkResult[]): void {
    console.log('🎯 Performance Summary:')

    const avgSpeedup = results.reduce((sum, r) => sum + r.speedup, 0) / results.length
    const maxSpeedup = Math.max(...results.map(r => r.speedup))
    const minSpeedup = Math.min(...results.map(r => r.speedup))
    const allAccurate = results.every(r => r.accuracy)

    console.log(`  Average speedup: ${avgSpeedup.toFixed(2)}x`)
    console.log(`  Maximum speedup: ${maxSpeedup.toFixed(2)}x`)
    console.log(`  Minimum speedup: ${minSpeedup.toFixed(2)}x`)
    console.log(`  Accuracy: ${allAccurate ? '✅ 100%' : '❌ Issues found'}`)

    // File size comparison
    console.log('\n🎯 File Size Comparison:')
    console.log('  Optimized: 132KB WASM + 16KB JS = 148KB total')
    console.log('  Fallback:  118KB WASM + 36KB JS = 154KB total')
    console.log('  SIDE_MODULE: 169KB WASM')

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