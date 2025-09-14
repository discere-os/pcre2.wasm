/**
 * PCRE2.wasm TypeScript Definitions
 * 
 * Type-safe, high-performance regular expression library with SIMD optimizations
 * Copyright (c) 2025 Superstruct Ltd, New Zealand
 * Copyright (c) 1997-2024 University of Cambridge
 * 
 * Licensed under the BSD-3-Clause license.
 */

export interface PCRE2Module {
  // Core PCRE2 functions
  _pcre2_compile_8(pattern: number, length: number, options: number, errorcode: number, erroroffset: number, ccontext: number): number;
  _pcre2_match_8(code: number, subject: number, length: number, startoffset: number, options: number, match_data: number, mcontext: number): number;
  _pcre2_code_free_8(code: number): void;
  _pcre2_match_data_create_from_pattern_8(code: number, gcontext: number): number;
  _pcre2_match_data_free_8(match_data: number): void;
  _pcre2_get_ovector_pointer_8(match_data: number): number;
  _pcre2_pattern_info_8(code: number, what: number, where: number): number;
  _pcre2_substitute_8(code: number, subject: number, length: number, startoffset: number, options: number, match_data: number, mcontext: number, replacement: number, rlength: number, outputbuffer: number, outlengthptr: number): number;
  _pcre2_get_error_message_8(errorcode: number, buffer: number, bufflen: number): number;
  
  // High-level WASM wrapper functions
  _pcre2_wasm_compile(pattern: number, options: number, errorcode: number, erroroffset: number): number;
  _pcre2_wasm_match(code: number, subject: number, length: number, startoffset: number, options: number, match_data: number): number;
  _pcre2_wasm_match_data_create(code: number): number;
  _pcre2_wasm_get_ovector(match_data: number): number;
  _pcre2_wasm_substitute(code: number, subject: number, length: number, startoffset: number, options: number, match_data: number, replacement: number, rlength: number, output: number, outlen: number): number;
  _pcre2_wasm_pattern_info(code: number, what: number, where: number): number;
  _pcre2_wasm_get_error_message(errorcode: number, buffer: number, bufflen: number): number;
  _pcre2_wasm_code_free(code: number): void;
  _pcre2_wasm_match_data_free(match_data: number): void;
  _pcre2_wasm_version(): number;
  _pcre2_wasm_unicode_version(): number;
  _pcre2_wasm_jit_available(): number;
  _pcre2_wasm_simple_match(pattern: number, subject: number): number;
  
  // Memory management
  _malloc(size: number): number;
  _free(ptr: number): void;
  
  // Emscripten runtime methods
  cwrap(name: string, returnType: string | null, argTypes: string[]): Function;
  ccall(name: string, returnType: string | null, argTypes: string[], args: any[]): any;
  UTF8ToString(ptr: number, maxBytesToRead?: number): string;
  getValue(ptr: number, type: string): number;
  setValue(ptr: number, value: number, type: string): void;
  HEAPU8: Uint8Array;
  HEAP8: Int8Array;
  HEAP32: Int32Array;
  HEAPU32: Uint32Array;
}

export interface CompileOptions {
  /** Case-insensitive matching */
  caseless?: boolean;
  /** Multiline mode (^ and $ match line breaks) */
  multiline?: boolean;
  /** Dot matches all characters including newlines */
  dotall?: boolean;
  /** Extended syntax (ignore whitespace and allow comments) */
  extended?: boolean;
  /** Anchored pattern (match only at start) */
  anchored?: boolean;
  /** Dollar matches only at end of string */
  endanchored?: boolean;
  /** Ungreedy quantifiers */
  ungreedy?: boolean;
  /** UTF-8 mode */
  utf?: boolean;
  /** Unicode properties */
  ucp?: boolean;
  /** No auto-capture */
  noAutoCapture?: boolean;
}

export interface MatchOptions {
  /** Starting offset in subject string */
  startOffset?: number;
  /** Not at start of line */
  notbol?: boolean;
  /** Not at end of line */
  noteol?: boolean;
  /** Empty string not a valid match */
  notempty?: boolean;
  /** Empty string at start not a valid match */
  notemptyAtstart?: boolean;
}

export interface MatchResult {
  /** Whether a match was found */
  success: boolean;
  /** Number of capture groups found */
  captures: number;
  /** Array of [start, end] offsets for matches */
  offsets: [number, number][];
  /** Matched strings */
  matches: string[];
  /** Error message if match failed */
  error?: string;
}

export interface SubstituteResult {
  /** Whether substitution was successful */
  success: boolean;
  /** Resulting string after substitution */
  result: string;
  /** Number of substitutions made */
  substitutions: number;
  /** Error message if substitution failed */
  error?: string;
}

export interface PatternInfo {
  /** Number of capture groups */
  captureCount: number;
  /** Whether pattern uses backtracking */
  backtrackingUsed: boolean;
  /** Whether pattern can match empty string */
  matchEmpty: boolean;
  /** First code unit if fixed */
  firstCodeUnit?: number;
  /** Last code unit if fixed */
  lastCodeUnit?: number;
  /** Minimum subject length */
  minLength: number;
  /** Pattern name count */
  nameCount: number;
  /** Name table entry size */
  nameEntrySize: number;
}

export interface InitializationOptions {
  /** Path to WASM module (auto-detected if not provided) */
  modulePath?: string;
  /** Enable performance metrics collection */
  enableMetrics?: boolean;
  /** Preferred variant (release/optimized/simd) */
  variant?: 'release' | 'optimized' | 'simd';
}

export interface PerformanceMetrics {
  /** Total patterns compiled */
  patternsCompiled: number;
  /** Total matches performed */
  matchesPerformed: number;
  /** Total substitutions performed */
  substitutionsPerformed: number;
  /** Average compile time (microseconds) */
  averageCompileTime: number;
  /** Average match time (microseconds) */
  averageMatchTime: number;
  /** Memory usage statistics */
  memoryUsage: {
    allocated: number;
    peak: number;
    current: number;
  };
}

export interface SystemCapabilities {
  /** Browser or Node.js environment */
  environment: 'browser' | 'node';
  /** WebAssembly SIMD support */
  wasmSimd: boolean;
  /** Available memory (approximate) */
  availableMemory?: number;
  /** CPU core count */
  cpuCores?: number;
  /** Platform details */
  platform: string;
}

export interface BenchmarkResult {
  /** Test name */
  name: string;
  /** Operations per second */
  opsPerSecond: number;
  /** Time per operation (nanoseconds) */
  timePerOp: number;
  /** Memory usage during test */
  memoryUsage: number;
  /** Number of iterations */
  iterations: number;
}

export interface CompiledPattern {
  /** Compiled pattern pointer */
  readonly ptr: number;
  /** Original pattern string */
  readonly pattern: string;
  /** Compilation options used */
  readonly options: CompileOptions;
  /** Pattern information */
  readonly info: PatternInfo;
  
  /** Test if pattern matches subject */
  test(subject: string, options?: MatchOptions): boolean;
  /** Execute pattern against subject and return match details */
  exec(subject: string, options?: MatchOptions): MatchResult | null;
  /** Find all matches in subject */
  execAll(subject: string, options?: MatchOptions): MatchResult[];
  /** Replace matches in subject */
  replace(subject: string, replacement: string, options?: MatchOptions): SubstituteResult;
  /** Replace all matches in subject */
  replaceAll(subject: string, replacement: string, options?: MatchOptions): SubstituteResult;
  /** Free compiled pattern memory */
  destroy(): void;
}

// Navigation API extension for memory detection
declare global {
  interface Navigator {
    deviceMemory?: number;
    hardwareConcurrency?: number;
  }
}

export type NavigatorWithMemory = Navigator & {
  deviceMemory?: number;
  hardwareConcurrency?: number;
}