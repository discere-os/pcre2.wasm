/**
 * PCRE2 WebAssembly SIDE_MODULE Interface
 * 
 * Minimal interface for dynamic loading into host MAIN_MODULE
 * Copyright (c) 2025 Superstruct Ltd, New Zealand
 * Copyright (c) 1997-2024 University of Cambridge
 * 
 * Licensed under the BSD-3-Clause license.
 */

#define PCRE2_CODE_UNIT_WIDTH 8
#include <pcre2.h>

// True SIDE_MODULE: Remove system library includes
// These will be provided by host MAIN_MODULE
#ifdef PCRE2_SIDE_MODULE
// Forward declarations for functions provided by MAIN_MODULE
extern void* malloc(size_t size);
extern void free(void* ptr);
extern void* memset(void* ptr, int value, size_t num);
extern void* memcpy(void* dest, const void* src, size_t num);
extern size_t strlen(const char* str);
#else
#include <stdlib.h>
#include <string.h>
#endif

// SIDE_MODULE exports are minimal - full API is available via direct function calls
// These are just the essential functions needed for the interface

/**
 * Initialize PCRE2 library for SIDE_MODULE usage
 * Returns 1 on success, 0 on failure
 */
int pcre2_wasm_init(void) {
    // No specific initialization needed for PCRE2
    return 1;
}

/**
 * Get PCRE2 version string
 */
const char* pcre2_wasm_version(void) {
    static char version_buffer[64];
    pcre2_config(PCRE2_CONFIG_VERSION, version_buffer);
    return version_buffer;
}

/**
 * Get Unicode version string
 */
const char* pcre2_wasm_unicode_version(void) {
    static char unicode_buffer[64];
    pcre2_config(PCRE2_CONFIG_UNICODE_VERSION, unicode_buffer);
    return unicode_buffer;
}

/**
 * Cleanup function for SIDE_MODULE
 */
void pcre2_wasm_cleanup(void) {
    // No specific cleanup needed for PCRE2 SIDE_MODULE
}