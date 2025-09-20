/**
 * PCRE2.wasm - Professional regular expression library
 * Type-safe, high-performance implementation with SIMD optimizations
 * Copyright (c) 2025 Superstruct Ltd, New Zealand
 * Copyright (c) 1997-2024 University of Cambridge
 *
 * Licensed under the BSD-3-Clause license.
 */

// Global type declarations for Deno environment
declare const process: {
  platform?: string;
  versions?: { node?: string };
} | undefined;

import type {
  PCRE2Module,
  CompileOptions,
  MatchOptions,
  MatchResult,
  SubstituteResult,
  PatternInfo,
  InitializationOptions,
  PerformanceMetrics,
  SystemCapabilities,
  BenchmarkResult,
  CompiledPattern,
  NavigatorWithMemory
} from './types.ts'

// PCRE2 compile options constants
const PCRE2_CASELESS = 0x00000008;
const PCRE2_MULTILINE = 0x00000400;
const PCRE2_DOTALL = 0x00000020;
const PCRE2_EXTENDED = 0x00000080;
const PCRE2_ANCHORED = 0x80000000;
const PCRE2_ENDANCHORED = 0x20000000;
const PCRE2_UNGREEDY = 0x00200000;
const PCRE2_UTF = 0x00080000;
const PCRE2_UCP = 0x00020000;
const PCRE2_NO_AUTO_CAPTURE = 0x00001000;

// PCRE2 match options constants
const PCRE2_NOTBOL = 0x00000001;
const PCRE2_NOTEOL = 0x00000002;
const PCRE2_NOTEMPTY = 0x00000004;
const PCRE2_NOTEMPTY_ATSTART = 0x00000008;

// Pattern info constants
const PCRE2_INFO_CAPTURECOUNT = 4;
const PCRE2_INFO_BACKREFMAX = 2;
const PCRE2_INFO_FIRSTCODETYPE = 6;
const PCRE2_INFO_FIRSTCODEUNIT = 5;
const PCRE2_INFO_LASTCODETYPE = 12;
const PCRE2_INFO_LASTCODEUNIT = 11;
const PCRE2_INFO_MINLENGTH = 16;
const PCRE2_INFO_NAMECOUNT = 17;
const PCRE2_INFO_NAMEENTRYSIZE = 18;
const PCRE2_INFO_MATCHEMPTY = 13;

/**
 * High-performance PCRE2 regular expression library with SIMD acceleration
 */
export class PCRE2 {
  private module: PCRE2Module | null = null;
  private initialized = false;
  private metrics: PerformanceMetrics = this.createInitialMetrics();

  /**
   * Initialize the WASM module
   */
  async initialize(options: InitializationOptions = {}): Promise<void> {
    if (this.initialized) return;

    try {
      // Detect optimal module for environment
      const modulePath = this.selectOptimalModule(options);

      // For Deno environment, use dynamic import with file paths
      if (typeof globalThis.Deno !== 'undefined') {
        // Read the file and evaluate it to get the PCRE2Module function
        const moduleCode = await Deno.readTextFile(modulePath);

        // Create polyfills for Node.js globals
        const mockGlobals = {
          require: (id: string) => {
            if (id === 'fs') {
              return {
                readFileSync: () => { throw new Error('fs not supported'); }
              };
            }
            throw new Error(`Module ${id} not found`);
          },
          process: {
            versions: {},
            type: 'browser',
            argv: [],
            exitCode: 0
          },
          __filename: modulePath,
          __dirname: modulePath.split('/').slice(0, -1).join('/'),
          exports: {},
          module: { exports: {} }
        };

        // Create a function that evaluates the module code with polyfills
        const evalModule = new Function(
          'require', 'process', '__filename', '__dirname', 'exports', 'module', 'define',
          moduleCode + '; return PCRE2Module;'
        );

        const PCRE2Module = evalModule(
          mockGlobals.require,
          mockGlobals.process,
          mockGlobals.__filename,
          mockGlobals.__dirname,
          mockGlobals.exports,
          mockGlobals.module,
          undefined
        );

        if (typeof PCRE2Module !== 'function') {
          throw new Error('Failed to extract PCRE2Module factory function');
        }

        // Load the WASM binary manually for Deno
        const wasmPath = modulePath.replace(/\.js$/, '.wasm');
        let wasmBinary: ArrayBuffer | undefined;

        try {
          const wasmBuffer = await Deno.readFile(wasmPath);
          wasmBinary = wasmBuffer.buffer;
        } catch {
          // WASM binary not found, let module handle it
        }

        this.module = await PCRE2Module({
          wasmBinary,
          locateFile: (path: string) => {
            if (path.endsWith('.wasm')) {
              return wasmPath;
            }
            return path;
          }
        });
      }
      // For Node.js, use a different approach for Emscripten modules
      else if (typeof process !== 'undefined' && process.versions?.node) {
        // Use dynamic require and evaluate in proper context
        const { createRequire } = await import('module');
        const fs = await import('fs');
        const require = createRequire(import.meta.url);

        // Convert relative path to absolute path based on this module's location
        const path = await import('path');
        const url = await import('url');
        const thisModuleDir = path.dirname(url.fileURLToPath(import.meta.url));

        const absoluteModulePath = path.isAbsolute(modulePath) ?
          modulePath :
          path.resolve(thisModuleDir, modulePath);

        // Read the module file and evaluate it in a context where we can capture PCRE2Module
        const moduleCode = fs.readFileSync(absoluteModulePath, 'utf8');
        let PCRE2Module: any;

        // Use Function constructor to evaluate in controlled scope
        const moduleFactory = new Function('require', 'module', 'exports', '__dirname', '__filename', moduleCode + '; return PCRE2Module;');
        PCRE2Module = moduleFactory(require, {exports: {}}, {}, path.dirname(absoluteModulePath), absoluteModulePath);

        if (typeof PCRE2Module !== 'function') {
          throw new Error('Failed to extract PCRE2Module factory function');
        }

        this.module = await PCRE2Module();
      } else {
        // For browser, use dynamic import with special handling
        const moduleFactory = await import(/* @vite-ignore */ modulePath);
        // Emscripten modules expose the factory function directly
        this.module = await (moduleFactory.default || moduleFactory)();
      }
      
      this.initialized = true;

      if (options.enableMetrics && this.module) {
        this.startMetricsCollection();
      }

    } catch (error) {
      throw new Error(`Failed to initialize PCRE2.wasm: ${error}`);
    }
  }

  /**
   * Compile a regular expression pattern
   */
  compile(pattern: string, options: CompileOptions = {}): CompiledPattern {
    this.ensureInitialized();

    const startTime = performance.now();
    
    // Convert options to PCRE2 flags
    let flags = 0;
    if (options.caseless) flags |= PCRE2_CASELESS;
    if (options.multiline) flags |= PCRE2_MULTILINE;
    if (options.dotall) flags |= PCRE2_DOTALL;
    if (options.extended) flags |= PCRE2_EXTENDED;
    if (options.anchored) flags |= PCRE2_ANCHORED;
    if (options.endanchored) flags |= PCRE2_ENDANCHORED;
    if (options.ungreedy) flags |= PCRE2_UNGREEDY;
    if (options.utf) flags |= PCRE2_UTF;
    if (options.ucp) flags |= PCRE2_UCP;
    if (options.noAutoCapture) flags |= PCRE2_NO_AUTO_CAPTURE;

    // Allocate pattern string
    const patternPtr = this.allocateString(pattern);
    const errorCodePtr = this.module!._malloc(4);
    const errorOffsetPtr = this.module!._malloc(8);

    try {
      // Compile pattern
      const codePtr = this.module!._pcre2_wasm_compile(patternPtr, flags, errorCodePtr, errorOffsetPtr);
      
      if (!codePtr) {
        const errorCode = this.module!.getValue(errorCodePtr, 'i32');
        const errorMessage = this.getErrorMessage(errorCode);
        throw new Error(`Pattern compilation failed: ${errorMessage}`);
      }

      // Get pattern info
      const info = this.getPatternInfo(codePtr);

      // Update metrics
      const compileTime = (performance.now() - startTime) * 1000; // Convert to microseconds
      this.updateCompileMetrics(compileTime);

      return new CompiledPatternImpl(this.module!, codePtr, pattern, options, info);

    } finally {
      this.module!._free(patternPtr);
      this.module!._free(errorCodePtr);
      this.module!._free(errorOffsetPtr);
    }
  }

  /**
   * Simple pattern test (compile and match in one call)
   */
  test(pattern: string, subject: string): boolean {
    this.ensureInitialized();

    const patternPtr = this.allocateString(pattern);
    const subjectPtr = this.allocateString(subject);

    try {
      const result = this.module!._pcre2_wasm_simple_match(patternPtr, subjectPtr);
      return result > 0;
    } finally {
      this.module!._free(patternPtr);
      this.module!._free(subjectPtr);
    }
  }

  /**
   * Get PCRE2 version information
   */
  getVersion(): { pcre2: string; unicode: string; jit: boolean } {
    this.ensureInitialized();

    const pcre2VersionPtr = this.module!._pcre2_wasm_version();
    const unicodeVersionPtr = this.module!._pcre2_wasm_unicode_version();
    const jitAvailable = this.module!._pcre2_wasm_jit_available();

    return {
      pcre2: this.module!.UTF8ToString(pcre2VersionPtr),
      unicode: this.module!.UTF8ToString(unicodeVersionPtr),
      jit: jitAvailable !== 0
    };
  }

  /**
   * Get performance metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Get system capabilities
   */
  getSystemCapabilities(): SystemCapabilities {
    const nav = navigator as NavigatorWithMemory;
    
    return {
      environment: typeof window !== 'undefined' ? 'browser' : 'node',
      wasmSimd: this.detectSimdSupport(),
      availableMemory: nav.deviceMemory ? nav.deviceMemory * 1024 * 1024 * 1024 : undefined,
      cpuCores: nav.hardwareConcurrency,
      platform: typeof navigator !== 'undefined' ? navigator.platform : process.platform
    };
  }

  /**
   * Run performance benchmarks
   */
  async runBenchmarks(): Promise<BenchmarkResult[]> {
    this.ensureInitialized();

    const results: BenchmarkResult[] = [];

    // Simple match benchmark
    results.push(await this.benchmarkOperation('Simple Match', () => {
      this.test('\\d{4}-\\d{2}-\\d{2}', '2023-12-25');
    }));

    // Complex pattern benchmark
    results.push(await this.benchmarkOperation('Complex Pattern', () => {
      const pattern = this.compile('(?i)\\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}\\b');
      pattern.test('user@example.com');
      pattern.destroy();
    }));

    return results;
  }

  // Private helper methods

  private ensureInitialized(): void {
    if (!this.initialized || !this.module) {
      throw new Error('PCRE2.wasm not initialized. Call initialize() first.');
    }
  }

  private selectOptimalModule(options: InitializationOptions): string {
    if (options.modulePath) {
      return options.modulePath;
    }

    const capabilities = this.getSystemCapabilities();
    const variant = options.variant || 'release';

    // For Deno environment, use file URLs
    if (typeof globalThis.Deno !== 'undefined') {
      const basePath = new URL('../../install/wasm/', import.meta.url).pathname;
      if (capabilities.wasmSimd) {
        return basePath + 'pcre2-release.js'; // SIMD-optimized release build
      } else {
        return basePath + 'pcre2-fallback.js'; // Compatibility fallback
      }
    }

    // For Node.js environment, use relative paths for require()
    const isNode = typeof process !== 'undefined' && process.versions?.node;

    if (isNode) {
      const basePath = '../../install/wasm/'; // Go up from dist/lib/ to root
      // Select based on capabilities and preferences
      if (capabilities.wasmSimd) {
        return basePath + 'pcre2-release.js'; // SIMD-optimized release build
      } else {
        return basePath + 'pcre2-fallback.js'; // Compatibility fallback
      }
    } else {
      // For browser environments, use URL resolution
      const basePath = new URL('../../install/wasm/', import.meta.url).href;
      if (capabilities.wasmSimd) {
        return basePath + 'pcre2-release.js'; // SIMD-optimized release build
      } else {
        return basePath + 'pcre2-fallback.js'; // Compatibility fallback
      }
    }
  }

  private detectSimdSupport(): boolean {
    try {
      return typeof WebAssembly !== 'undefined' && 
             WebAssembly.validate(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11]));
    } catch {
      return false;
    }
  }

  private allocateString(str: string): number {
    const bytes = new TextEncoder().encode(str + '\0');
    const ptr = this.module!._malloc(bytes.length);
    this.module!.HEAPU8.set(bytes, ptr);
    return ptr;
  }

  private getErrorMessage(errorCode: number): string {
    const bufferSize = 256;
    const bufferPtr = this.module!._malloc(bufferSize);
    
    try {
      this.module!._pcre2_wasm_get_error_message(errorCode, bufferPtr, bufferSize);
      return this.module!.UTF8ToString(bufferPtr);
    } finally {
      this.module!._free(bufferPtr);
    }
  }

  private getPatternInfo(codePtr: number): PatternInfo {
    const getInfoValue = (what: number): number => {
      const valuePtr = this.module!._malloc(4);
      try {
        const result = this.module!._pcre2_wasm_pattern_info(codePtr, what, valuePtr);
        if (result !== 0) {
          // Pattern info call failed, return safe default
          return 0;
        }
        return this.module!.getValue(valuePtr, 'i32');
      } finally {
        this.module!._free(valuePtr);
      }
    };

    return {
      captureCount: getInfoValue(PCRE2_INFO_CAPTURECOUNT),
      backtrackingUsed: getInfoValue(PCRE2_INFO_BACKREFMAX) > 0,
      matchEmpty: getInfoValue(PCRE2_INFO_MATCHEMPTY) !== 0,
      minLength: getInfoValue(PCRE2_INFO_MINLENGTH),
      nameCount: getInfoValue(PCRE2_INFO_NAMECOUNT),
      nameEntrySize: getInfoValue(PCRE2_INFO_NAMEENTRYSIZE),
    };
  }

  private createInitialMetrics(): PerformanceMetrics {
    return {
      patternsCompiled: 0,
      matchesPerformed: 0,
      substitutionsPerformed: 0,
      averageCompileTime: 0,
      averageMatchTime: 0,
      memoryUsage: {
        allocated: 0,
        peak: 0,
        current: 0
      }
    };
  }

  private updateCompileMetrics(compileTime: number): void {
    this.metrics.patternsCompiled++;
    this.metrics.averageCompileTime = 
      (this.metrics.averageCompileTime * (this.metrics.patternsCompiled - 1) + compileTime) / 
      this.metrics.patternsCompiled;
  }

  private startMetricsCollection(): void {
    // Start periodic memory usage tracking
    if (typeof window !== 'undefined') {
      setInterval(() => {
        if ((performance as any).memory) {
          const memory = (performance as any).memory;
          this.metrics.memoryUsage.current = memory.usedJSHeapSize;
          this.metrics.memoryUsage.peak = Math.max(this.metrics.memoryUsage.peak, memory.usedJSHeapSize);
        }
      }, 1000);
    }
  }

  private async benchmarkOperation(name: string, operation: () => void): Promise<BenchmarkResult> {
    const iterations = 10000;
    const startMemory = (performance as any).memory?.usedJSHeapSize || 0;
    
    // Warm up
    for (let i = 0; i < 100; i++) {
      operation();
    }
    
    // Measure
    const startTime = performance.now();
    for (let i = 0; i < iterations; i++) {
      operation();
    }
    const endTime = performance.now();
    
    const totalTime = endTime - startTime;
    const timePerOp = (totalTime * 1000000) / iterations; // nanoseconds
    const opsPerSecond = iterations / (totalTime / 1000);
    
    const endMemory = (performance as any).memory?.usedJSHeapSize || 0;
    
    return {
      name,
      opsPerSecond,
      timePerOp,
      memoryUsage: endMemory - startMemory,
      iterations
    };
  }
}

/**
 * Implementation of CompiledPattern interface
 */
class CompiledPatternImpl implements CompiledPattern {
  constructor(
    private module: PCRE2Module,
    public readonly ptr: number,
    public readonly pattern: string,
    public readonly options: CompileOptions,
    public readonly info: PatternInfo
  ) {}

  test(subject: string, options: MatchOptions = {}): boolean {
    const result = this.exec(subject, options);
    return result !== null && result.success;
  }

  exec(subject: string, options: MatchOptions = {}): MatchResult | null {
    const subjectPtr = this.allocateString(subject);
    const matchDataPtr = this.module._pcre2_wasm_match_data_create(this.ptr);

    if (!matchDataPtr) {
      this.module._free(subjectPtr);
      return null;
    }

    try {
      let flags = 0;
      if (options.notbol) flags |= PCRE2_NOTBOL;
      if (options.noteol) flags |= PCRE2_NOTEOL;
      if (options.notempty) flags |= PCRE2_NOTEMPTY;
      if (options.notemptyAtstart) flags |= PCRE2_NOTEMPTY_ATSTART;

      const result = this.module._pcre2_wasm_match(
        this.ptr,
        subjectPtr,
        subject.length,
        options.startOffset || 0,
        flags,
        matchDataPtr
      );

      if (result < 0) {
        return {
          success: false,
          captures: 0,
          offsets: [],
          matches: [],
          error: result === -1 ? 'No match' : 'Match error'
        };
      }

      // Get match data
      const ovectorPtr = this.module._pcre2_wasm_get_ovector(matchDataPtr);
      const offsets: [number, number][] = [];
      const matches: string[] = [];

      for (let i = 0; i < result; i++) {
        const start = this.module.getValue(ovectorPtr + i * 8, 'i32');
        const end = this.module.getValue(ovectorPtr + i * 8 + 4, 'i32');
        offsets.push([start, end]);
        matches.push(subject.substring(start, end));
      }

      return {
        success: true,
        captures: result,
        offsets,
        matches
      };

    } finally {
      this.module._pcre2_wasm_match_data_free(matchDataPtr);
      this.module._free(subjectPtr);
    }
  }

  execAll(subject: string, options: MatchOptions = {}): MatchResult[] {
    const results: MatchResult[] = [];
    let offset = options.startOffset || 0;

    while (offset < subject.length) {
      const result = this.exec(subject, { ...options, startOffset: offset });
      if (!result || !result.success) break;
      
      results.push(result);
      offset = result.offsets[0][1];
      
      // Prevent infinite loop on zero-length matches
      if (result.offsets[0][0] === result.offsets[0][1]) {
        offset++;
      }
    }

    return results;
  }

  replace(subject: string, replacement: string, options: MatchOptions = {}): SubstituteResult {
    // Implementation for single replacement
    const result = this.performSubstitution(subject, replacement, options, false);
    return result;
  }

  replaceAll(subject: string, replacement: string, options: MatchOptions = {}): SubstituteResult {
    // Implementation for global replacement
    const result = this.performSubstitution(subject, replacement, options, true);
    return result;
  }

  private performSubstitution(subject: string, replacement: string, options: MatchOptions, global: boolean): SubstituteResult {
    const subjectPtr = this.allocateString(subject);
    const replacementPtr = this.allocateString(replacement);
    const matchDataPtr = this.module._pcre2_wasm_match_data_create(this.ptr);
    
    // Allocate output buffer (estimate 2x input size)
    const outputSize = subject.length * 2 + 1024;
    const outputPtr = this.module._malloc(outputSize);
    const outputLengthPtr = this.module._malloc(8);
    this.module.setValue(outputLengthPtr, outputSize, 'i64');

    try {
      let flags = 0;
      if (options.notbol) flags |= PCRE2_NOTBOL;
      if (options.noteol) flags |= PCRE2_NOTEOL;
      if (options.notempty) flags |= PCRE2_NOTEMPTY;
      if (options.notemptyAtstart) flags |= PCRE2_NOTEMPTY_ATSTART;
      if (global) flags |= 0x00000100; // PCRE2_SUBSTITUTE_GLOBAL

      const result = this.module._pcre2_wasm_substitute(
        this.ptr,
        subjectPtr,
        subject.length,
        options.startOffset || 0,
        flags,
        matchDataPtr,
        replacementPtr,
        replacement.length,
        outputPtr,
        outputLengthPtr
      );

      if (result < 0) {
        return {
          success: false,
          result: subject,
          substitutions: 0,
          error: 'Substitution failed'
        };
      }

      const outputLength = this.module.getValue(outputLengthPtr, 'i64');
      const resultString = this.module.UTF8ToString(outputPtr, Number(outputLength));

      return {
        success: true,
        result: resultString,
        substitutions: result,
      };

    } finally {
      this.module._pcre2_wasm_match_data_free(matchDataPtr);
      this.module._free(subjectPtr);
      this.module._free(replacementPtr);
      this.module._free(outputPtr);
      this.module._free(outputLengthPtr);
    }
  }

  private allocateString(str: string): number {
    const bytes = new TextEncoder().encode(str + '\0');
    const ptr = this.module._malloc(bytes.length);
    this.module.HEAPU8.set(bytes, ptr);
    return ptr;
  }

  destroy(): void {
    if (this.ptr) {
      this.module._pcre2_wasm_code_free(this.ptr);
    }
  }
}

// Export the main class and types
export default PCRE2;
export * from './types.ts';