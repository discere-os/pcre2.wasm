# @discere-os/pcre2.wasm - High-Performance Regular Expressions for WebAssembly

[![CI/CD Pipeline](https://github.com/discere-os/pcre2.wasm/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/discere-os/pcre2.wasm/actions/workflows/ci-cd.yml)
[![NPM Version](https://img.shields.io/npm/v/@discere-os/pcre2.wasm)](https://www.npmjs.com/package/@discere-os/pcre2.wasm)
[![License](https://img.shields.io/badge/license-BSD--3--Clause-blue.svg)](https://opensource.org/licenses/BSD-3-Clause)

A WebAssembly fork of the industry-standard PCRE2 regular expression library, featuring SIMD optimizations and a TypeScript API.

## ✨ Features

- 🚀 **Full PCRE2 Functionality** - Complete implementation with Unicode support
- ⚡ **SIMD Optimization** - 1.2-11.3x performance improvements using WebAssembly SIMD
- 📘 **TypeScript Support** - Complete type definitions and modern JavaScript API
- 🌐 **Universal Compatibility** - Works in browsers and Node.js environments
- 🔧 **Dual Build System** - SIDE_MODULE for dynamic linking + MAIN_MODULE for standalone usage
- 📦 **Lightweight** - Optimized bundle sizes with multiple variants

## 🚀 Quick Start

### Installation

```bash
# NPM
npm install @discere-os/pcre2.wasm

# pnpm
pnpm add @discere-os/pcre2.wasm

# Yarn
yarn add @discere-os/pcre2.wasm
```

### Basic Usage

```javascript
import PCRE2 from '@discere-os/pcre2.wasm'

// Initialize the library
const pcre2 = new PCRE2()
await pcre2.initialize()

// Simple pattern matching
const isEmail = pcre2.test(
  '\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b', 
  'user@example.com'
)
console.log(isEmail) // true

// Compile patterns for reuse
const datePattern = pcre2.compile('(\\d{4})-(\\d{2})-(\\d{2})')
const match = datePattern.exec('Today is 2023-12-25')
console.log(match.matches[1]) // '2023'
console.log(match.matches[2]) // '12' 
console.log(match.matches[3]) // '25'

// Pattern replacement
const result = datePattern.replace('Date: 2023-12-25', 'Date: $3/$2/$1')
console.log(result.result) // 'Date: 25/12/2023'

// Clean up
datePattern.destroy()
```

### Advanced Features

```javascript
// Unicode support
const unicodePattern = pcre2.compile('\\p{L}+', { utf: true, ucp: true })
console.log(unicodePattern.test('café')) // true

// Case-insensitive matching
const ciPattern = pcre2.compile('HELLO', { caseless: true })
console.log(ciPattern.test('hello')) // true

// Global replacement
const numbers = pcre2.compile('\\d+')
const result = numbers.replaceAll('I have 123 apples and 456 oranges', 'many')
console.log(result.result) // 'I have many apples and many oranges'

// Performance metrics
const metrics = pcre2.getMetrics()
console.log(`Compiled ${metrics.patternsCompiled} patterns`)

// System capabilities
const capabilities = pcre2.getSystemCapabilities()
console.log(`SIMD support: ${capabilities.wasmSimd}`)
```

## 🔧 API Reference

### PCRE2 Class

#### `initialize(options?: InitializationOptions): Promise<void>`
Initialize the WASM module.

**Options:**
- `modulePath?: string` - Custom path to WASM module
- `enableMetrics?: boolean` - Enable performance metrics collection
- `variant?: 'release' | 'optimized' | 'simd'` - Preferred build variant

#### `compile(pattern: string, options?: CompileOptions): CompiledPattern`
Compile a regular expression pattern.

**Compile Options:**
- `caseless?: boolean` - Case-insensitive matching
- `multiline?: boolean` - Multiline mode (^ and $ match line breaks)
- `dotall?: boolean` - Dot matches all characters including newlines
- `extended?: boolean` - Extended syntax (ignore whitespace)
- `utf?: boolean` - UTF-8 mode
- `ucp?: boolean` - Unicode properties support

#### `test(pattern: string, subject: string): boolean`
Quick pattern test (compile and match in one call).

### CompiledPattern Class

#### `test(subject: string, options?: MatchOptions): boolean`
Test if pattern matches subject.

#### `exec(subject: string, options?: MatchOptions): MatchResult | null`
Execute pattern and return detailed match information.

#### `execAll(subject: string, options?: MatchOptions): MatchResult[]`
Find all matches in subject string.

#### `replace(subject: string, replacement: string, options?: MatchOptions): SubstituteResult`
Replace first match in subject.

#### `replaceAll(subject: string, replacement: string, options?: MatchOptions): SubstituteResult`
Replace all matches in subject.

#### `destroy(): void`
Free compiled pattern memory.

### Result Types

```typescript
interface MatchResult {
  success: boolean
  captures: number
  offsets: [number, number][]
  matches: string[]
  error?: string
}

interface SubstituteResult {
  success: boolean
  result: string
  substitutions: number
  error?: string
}
```

## 📊 Performance

### SIMD Optimization Results

Our WebAssembly SIMD optimizations deliver performance improvements across all regex operations:

#### Real-World Pattern Performance

| Pattern Type | Size | SIMD Speed | Scalar Speed | **Speedup** | Throughput |
|--------------|------|------------|--------------|-------------|------------|
| **Character Search** | 1KB | 6.5ms | 61.1ms | **9.4x** | 0.1 MB/s |
| **Character Search** | 10KB | 7.1ms | 79.6ms | **11.3x** | 1.4 MB/s |
| **Character Search** | 100KB | 13.0ms | 115.7ms | **8.9x** | 7.4 MB/s |
| **Phone Numbers** | 5KB | 6.5ms | 9.0ms | **1.4x** | 0.7 MB/s |
| **Phone Numbers** | 50KB | 6.1ms | 11.3ms | **1.8x** | 7.8 MB/s |
| **Email Validation** | 5KB | 5.8ms | 7.0ms | **1.2x** | 0.8 MB/s |
| **Email Validation** | 50KB | 6.9ms | 11.3ms | **1.6x** | 6.9 MB/s |
| **URL Matching** | 5KB | 9.8ms | 18.4ms | **1.9x** | 0.5 MB/s |
| **URL Matching** | 50KB | 6.2ms | 9.9ms | **1.6x** | 7.7 MB/s |
| **Whitespace Normalization** | 10KB | 10.2ms | 15.7ms | **1.5x** | 0.9 MB/s |
| **Whitespace Normalization** | 100KB | 10.5ms | 16.1ms | **1.5x** | 9.1 MB/s |
| **Hex Color Codes** | 5KB | 5.2ms | 6.1ms | **1.2x** | 0.9 MB/s |
| **Hex Color Codes** | 50KB | 11.6ms | 15.3ms | **1.3x** | 4.1 MB/s |

#### Performance Summary

- 🚀 **Average Speedup**: **3.4x** across all test cases
- ⚡ **Maximum Speedup**: **11.3x** for character search operations
- 🎯 **Minimum Speedup**: **1.2x** for complex patterns on small data
- 📈 **Peak Throughput**: **9.1 MB/s** for text processing operations
- ✅ **100% Accuracy**: Identical results to scalar implementation

#### Benchmark Environment
- **Platform**: Node.js v22.19.0 on Linux x64
- **SIMD Support**: WebAssembly SIMD 128-bit vectors enabled
- **Test Data**: Real-world patterns with varied text sizes (1KB-100KB)
- **Iterations**: 100-1000 per test case for statistical accuracy

#### SIMD Optimization Categories

1. **Character Operations** (8-11x speedup)
   - Single character search: `wasm_i8x16_eq()` with bitmask extraction
   - Character counting: Parallel run-length encoding
   - Memory scanning: 16-byte parallel processing

2. **Pattern Matching** (1.2-1.8x speedup)
   - Substring search: SIMD-enhanced Boyer-Moore algorithm
   - Character classes: Parallel range comparisons for `[0-9]`, `\s`, etc.
   - Complex patterns: Optimized character class evaluation

3. **Text Processing** (1.2-1.7x speedup)
   - UTF-8 validation: Fast ASCII detection with selective validation
   - Line ending detection: Parallel newline scanning
   - Memory operations: Optimized `memchr`/`memcmp` replacements

#### Browser Performance

Benchmarks conducted on **Chrome 113+** with WebAssembly SIMD enabled:
- **CPU**: x64 architecture with SIMD support
- **Environment**: Node.js v22.19.0 on Linux
- **Methodology**: 100-1000 iterations per test, averaged results
- **Memory**: Optimized alignment for 16-byte SIMD operations

## 🏗️ Build Variants

PCRE2.wasm provides three build variants:

### SIMD-Optimized Build (Recommended)
- **Size**: 132KB WASM + 16KB JS = **148KB total**
- **Performance**: **2-11x faster** on SIMD-capable browsers
- **Features**: Full WebAssembly SIMD optimization suite
- **Compatibility**: Chrome 91+, Edge 91+, Firefox 89+ (with flag), Safari 14.1+
- **Use Case**: High-performance applications requiring maximum speed

### Fallback Build (Compatibility)
- **Size**: 118KB WASM + 36KB JS = **154KB total**
- **Performance**: Standard performance with graceful degradation
- **Features**: Complete PCRE2 functionality without SIMD
- **Compatibility**: All WebAssembly-capable browsers (Chrome 57+, Firefox 52+, Safari 11+)
- **Use Case**: Maximum compatibility across all browsers

### Side Module (Dynamic Linking)
- **Size**: **169KB WASM** (standalone)
- **Performance**: SIMD-optimized with dynamic loading capability
- **Features**: Designed for `dlopen()` integration
- **Compatibility**: Requires SIMD-capable browsers + main module host
- **Use Case**: Integration with larger WebAssembly applications

#### Automatic Variant Selection

The library automatically selects the optimal variant:

```javascript
import PCRE2 from '@discere-os/pcre2.wasm'

const pcre2 = new PCRE2()
await pcre2.initialize() // Automatically selects SIMD or fallback

// Check which variant was loaded
const capabilities = pcre2.getSystemCapabilities()
console.log(`Using ${capabilities.wasmSimd ? 'SIMD' : 'fallback'} build`)
console.log(`Expected speedup: ${capabilities.wasmSimd ? '2-11x' : '1x (baseline)'}`)
```

## 🔗 Integration

```javascript
// Dynamic loading as SIDE_MODULE
const pcre2Handle = await dlopen('https://wasm.discere.cloud/pcre2@v10.44.0/side/pcre2-side.wasm')

// Standard NPM import (standalone applications)
import PCRE2 from '@discere-os/pcre2.wasm'

const pcre2 = new PCRE2()
await pcre2.initialize()

// Process log files
const logPattern = pcre2.compile('\\[(\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2})\\] (ERROR|WARN|INFO): (.+)')
const results = logPattern.execAll(logFileContent)

console.log(`Found ${results.length} log entries`)
```

## 🧪 Testing

Run the comprehensive test suite:

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test:coverage

# Run in watch mode
pnpm test:watch

# Run UI mode
pnpm test:ui

# Run SIMD-specific benchmarks
pnpm benchmark:simd   # Comprehensive SIMD performance benchmarks
./test-functionality.cjs  # Core functionality verification
pnpm benchmark   # Production-ready pattern benchmarks
```

### SIMD Testing & Benchmarking

The SIMD optimizations include comprehensive testing infrastructure:

#### Test Categories
- **Unit Tests**: 150+ test cases covering all SIMD functions
- **Integration Tests**: Full PCRE2 regression suite with SIMD enabled
- **Performance Tests**: Cross-platform benchmarking with statistical analysis
- **Edge Case Tests**: Boundary conditions, alignment, large datasets

#### Benchmark Results Verification

All optimizations are validated with rigorous testing:

```bash
# Build all SIMD variants
./build-dual.sh all    # Build SIMD, fallback, and side module

# Run comprehensive validation
./test-functionality.cjs      # Verify API functionality
pnpm benchmark          # Production pattern benchmarks
pnpm benchmark:simd          # Detailed SIMD performance analysis
```

## 📦 Building

Build the library from source:

```bash
# Install dependencies
pnpm install

# Build TypeScript + WASM modules
pnpm build

# Build only WASM modules
pnpm build:wasm

# Clean build artifacts
pnpm clean
```

## 🌐 Browser Compatibility

| Browser | Version | WASM Support | SIMD Support |
|---------|---------|--------------|--------------|
| Chrome | 57+ | ✅ | 91+ |
| Firefox | 52+ | ✅ | 89+ |
| Safari | 11+ | ✅ | 14.1+ |
| Edge | 16+ | ✅ | 91+ |
| Node.js | 16.4+ | ✅ | 16.4+ |

### Development Setup

```bash
# Clone repository
git clone https://github.com/discere-os/pcre2.wasm.git
cd pcre2.wasm

# Install dependencies
pnpm install

# Install Emscripten
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk && ./emsdk install 4.0.14 && ./emsdk activate 4.0.14
source ./emsdk_env.sh

# Build and test
pnpm build
pnpm test
```

## 📄 License

PCRE2.wasm is licensed under the [BSD-3-Clause License](LICENSE), the same license as the original PCRE2 library.

This project includes:
- Original PCRE2 library © 1997-2024 University of Cambridge
- WebAssembly port © 2025 Superstruct Ltd, New Zealand

## 🙏 Acknowledgments

- **PCRE2 Team**: For the excellent regular expression library
- **Emscripten Team**: For the outstanding WebAssembly compiler
- **Contributors**: Everyone who helped improve this library

## 📚 Resources

- [PCRE2 Documentation](https://pcre2project.github.io/pcre2/)
- [Regular Expression Tutorial](https://www.regular-expressions.info/pcre.html)
- [WebAssembly Specification](https://webassembly.github.io/spec/)
