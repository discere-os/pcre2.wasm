/**
 * PCRE2 WebAssembly MAIN_MODULE Interface
 * 
 * Complete high-level interface for NPM distribution and testing
 * Copyright (c) 2025 Superstruct Ltd, New Zealand
 * Copyright (c) 1997-2024 University of Cambridge
 * 
 * Licensed under the BSD-3-Clause license.
 */

#define PCRE2_CODE_UNIT_WIDTH 8
#include <pcre2.h>
#include <stdlib.h>
#include <string.h>
#include <emscripten.h>

// High-level convenience functions for JavaScript interface

/**
 * Compile a pattern and return pointer to compiled code
 * Returns pointer on success, NULL on failure
 */
EMSCRIPTEN_KEEPALIVE
pcre2_code* pcre2_wasm_compile(const char* pattern, int options, int* error_code, size_t* error_offset) {
    return pcre2_compile((PCRE2_SPTR)pattern, PCRE2_ZERO_TERMINATED, options, error_code, error_offset, NULL);
}

/**
 * Match a pattern against subject string
 * Returns number of matches, or negative error code
 */
EMSCRIPTEN_KEEPALIVE
int pcre2_wasm_match(pcre2_code* code, const char* subject, size_t subject_length, size_t start_offset, int options, pcre2_match_data* match_data) {
    return pcre2_match(code, (PCRE2_SPTR)subject, subject_length, start_offset, options, match_data, NULL);
}

/**
 * Create match data from compiled pattern
 */
EMSCRIPTEN_KEEPALIVE
pcre2_match_data* pcre2_wasm_match_data_create(pcre2_code* code) {
    return pcre2_match_data_create_from_pattern(code, NULL);
}

/**
 * Get match offset vector from match data
 */
EMSCRIPTEN_KEEPALIVE
PCRE2_SIZE* pcre2_wasm_get_ovector(pcre2_match_data* match_data) {
    return pcre2_get_ovector_pointer(match_data);
}

/**
 * Substitute matches in subject string
 * Returns length of output, or negative error code
 */
EMSCRIPTEN_KEEPALIVE
int pcre2_wasm_substitute(pcre2_code* code, const char* subject, size_t subject_length, size_t start_offset, int options, pcre2_match_data* match_data, const char* replacement, size_t replacement_length, char* output_buffer, size_t* output_length) {
    return pcre2_substitute(code, (PCRE2_SPTR)subject, subject_length, start_offset, options, match_data, NULL, (PCRE2_SPTR)replacement, replacement_length, (PCRE2_UCHAR*)output_buffer, output_length);
}

/**
 * Get pattern information
 */
EMSCRIPTEN_KEEPALIVE
int pcre2_wasm_pattern_info(pcre2_code* code, uint32_t what, void* where) {
    return pcre2_pattern_info(code, what, where);
}

/**
 * Get error message for error code
 */
EMSCRIPTEN_KEEPALIVE
int pcre2_wasm_get_error_message(int errorcode, char* buffer, size_t bufflen) {
    return pcre2_get_error_message(errorcode, (PCRE2_UCHAR*)buffer, bufflen);
}

/**
 * Free compiled pattern
 */
EMSCRIPTEN_KEEPALIVE
void pcre2_wasm_code_free(pcre2_code* code) {
    if (code) pcre2_code_free(code);
}

/**
 * Free match data
 */
EMSCRIPTEN_KEEPALIVE
void pcre2_wasm_match_data_free(pcre2_match_data* match_data) {
    if (match_data) pcre2_match_data_free(match_data);
}

/**
 * Get PCRE2 version string
 */
EMSCRIPTEN_KEEPALIVE
const char* pcre2_wasm_version(void) {
    static char version_buffer[64];
    pcre2_config(PCRE2_CONFIG_VERSION, version_buffer);
    return version_buffer;
}

/**
 * Get Unicode version string
 */
EMSCRIPTEN_KEEPALIVE
const char* pcre2_wasm_unicode_version(void) {
    static char unicode_buffer[64];
    pcre2_config(PCRE2_CONFIG_UNICODE_VERSION, unicode_buffer);
    return unicode_buffer;
}

/**
 * Check if JIT is available
 */
EMSCRIPTEN_KEEPALIVE
int pcre2_wasm_jit_available(void) {
    uint32_t jit_support;
    int result = pcre2_config(PCRE2_CONFIG_JIT, &jit_support);
    return (result == 0) ? jit_support : 0;
}

/**
 * Test helper function - compile and match in one call
 * For simple testing and demonstration purposes
 */
EMSCRIPTEN_KEEPALIVE
int pcre2_wasm_simple_match(const char* pattern, const char* subject) {
    int error_code;
    PCRE2_SIZE error_offset;
    
    pcre2_code* re = pcre2_compile((PCRE2_SPTR)pattern, PCRE2_ZERO_TERMINATED, 0, &error_code, &error_offset, NULL);
    if (!re) return -1;
    
    pcre2_match_data* match_data = pcre2_match_data_create_from_pattern(re, NULL);
    if (!match_data) {
        pcre2_code_free(re);
        return -1;
    }
    
    int rc = pcre2_match(re, (PCRE2_SPTR)subject, strlen(subject), 0, 0, match_data, NULL);
    
    pcre2_match_data_free(match_data);
    pcre2_code_free(re);
    
    return rc;
}