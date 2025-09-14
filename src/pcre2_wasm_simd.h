/*************************************************
*      Perl-Compatible Regular Expressions       *
*************************************************/

/* PCRE2 is a library of functions to support regular expressions whose syntax
and semantics are as close as possible to those of the Perl 5 language.

                       Written by Philip Hazel
             WASM SIMD implementation by Superstruct Ltd
     Original API code Copyright (c) 1997-2012 University of Cambridge
          New API code Copyright (c) 2016-2025 University of Cambridge
              WASM SIMD code Copyright (c) 2025 Superstruct Ltd

-----------------------------------------------------------------------------
Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright notice,
      this list of conditions and the following disclaimer.

    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.

    * Neither the name of the University of Cambridge nor the names of its
      contributors may be used to endorse or promote products derived from
      this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
POSSIBILITY OF SUCH DAMAGE.
-----------------------------------------------------------------------------
*/

#ifndef PCRE2_WASM_SIMD_H
#define PCRE2_WASM_SIMD_H

#include "pcre2_internal.h"

#ifdef __cplusplus
extern "C" {
#endif

/*************************************************
*     WebAssembly SIMD Function Declarations    *
*************************************************/

/* Character search optimizations */
PCRE2_SPTR pcre2_wasm_simd_find_char_8(PCRE2_SPTR start, PCRE2_SPTR end, uint32_t c);
PCRE2_SPTR pcre2_wasm_simd_memchr(const void* s, int c, size_t n);

/* String search optimizations */
PCRE2_SPTR pcre2_wasm_simd_substring_search_8(PCRE2_SPTR haystack, size_t haystack_len,
                                               PCRE2_SPTR needle, size_t needle_len);
PCRE2_SPTR pcre2_wasm_simd_boyer_moore_search(PCRE2_SPTR haystack, PCRE2_SIZE haystack_len,
                                               PCRE2_SPTR needle, PCRE2_SIZE needle_len);

/* Memory comparison optimizations */
int pcre2_wasm_simd_memcmp(const void* s1, const void* s2, size_t n);

/* Line ending detection */
PCRE2_SPTR pcre2_wasm_simd_find_newline_8(PCRE2_SPTR start, PCRE2_SPTR end, int nltype);

/* Character class matching optimizations */
int pcre2_wasm_simd_match_ascii_class(PCRE2_SPTR start, PCRE2_SPTR end,
                                       const uint8_t* class_bitmap, PCRE2_SPTR* match_ptr);
int pcre2_wasm_simd_match_digits(PCRE2_SPTR start, PCRE2_SPTR end, PCRE2_SPTR* match_ptr);
int pcre2_wasm_simd_match_whitespace(PCRE2_SPTR start, PCRE2_SPTR end, PCRE2_SPTR* match_ptr);

/* UTF-8 validation optimizations */
int pcre2_wasm_simd_validate_utf8(PCRE2_SPTR start, PCRE2_SIZE length, PCRE2_SIZE* error_offset);

/* Repetition matching optimizations */
PCRE2_SIZE pcre2_wasm_simd_count_char(PCRE2_SPTR start, PCRE2_SPTR end, uint32_t c);
PCRE2_SIZE pcre2_wasm_simd_count_whitespace(PCRE2_SPTR start, PCRE2_SPTR end);

/* Capability detection */
int pcre2_wasm_simd_supported(void);

/* Initialization */
void pcre2_wasm_simd_init(void);

/*************************************************
*      SIMD Optimization Integration Macros     *
*************************************************/

#ifdef PCRE2_WASM_SIMD

/* Use SIMD-optimized functions when available */
#define PCRE2_FIND_CHAR_SIMD(start, end, c) \
    pcre2_wasm_simd_find_char_8((start), (end), (c))

#define PCRE2_MEMCHR_SIMD(s, c, n) \
    pcre2_wasm_simd_memchr((s), (c), (n))

#define PCRE2_MEMCMP_SIMD(s1, s2, n) \
    pcre2_wasm_simd_memcmp((s1), (s2), (n))

#define PCRE2_SUBSTRING_SEARCH_SIMD(haystack, hlen, needle, nlen) \
    pcre2_wasm_simd_substring_search_8((haystack), (hlen), (needle), (nlen))

#define PCRE2_FIND_NEWLINE_SIMD(start, end, nltype) \
    pcre2_wasm_simd_find_newline_8((start), (end), (nltype))

#define PCRE2_MATCH_DIGITS_SIMD(start, end, match_ptr) \
    pcre2_wasm_simd_match_digits((start), (end), (match_ptr))

#define PCRE2_MATCH_WHITESPACE_SIMD(start, end, match_ptr) \
    pcre2_wasm_simd_match_whitespace((start), (end), (match_ptr))

#define PCRE2_COUNT_CHAR_SIMD(start, end, c) \
    pcre2_wasm_simd_count_char((start), (end), (c))

#define PCRE2_VALIDATE_UTF8_SIMD(start, length, error_offset) \
    pcre2_wasm_simd_validate_utf8((start), (length), (error_offset))

#else

/* Fallback to standard functions when SIMD is not available */
#define PCRE2_FIND_CHAR_SIMD(start, end, c) NULL
#define PCRE2_MEMCHR_SIMD(s, c, n) memchr((s), (c), (n))
#define PCRE2_MEMCMP_SIMD(s1, s2, n) memcmp((s1), (s2), (n))
#define PCRE2_SUBSTRING_SEARCH_SIMD(haystack, hlen, needle, nlen) NULL
#define PCRE2_FIND_NEWLINE_SIMD(start, end, nltype) NULL
#define PCRE2_MATCH_DIGITS_SIMD(start, end, match_ptr) 0
#define PCRE2_MATCH_WHITESPACE_SIMD(start, end, match_ptr) 0
#define PCRE2_COUNT_CHAR_SIMD(start, end, c) 0
#define PCRE2_VALIDATE_UTF8_SIMD(start, length, error_offset) 1

#endif /* PCRE2_WASM_SIMD */

/*************************************************
*         SIMD Performance Metrics              *
*************************************************/

#ifdef PCRE2_WASM_SIMD
typedef struct {
    uint64_t simd_calls_total;
    uint64_t simd_calls_find_char;
    uint64_t simd_calls_substring_search;
    uint64_t simd_calls_memchr;
    uint64_t simd_calls_memcmp;
    uint64_t simd_calls_newline;
    uint64_t simd_calls_class_match;
    uint64_t simd_calls_utf8_validate;
    uint64_t simd_calls_repetition;
    uint64_t bytes_processed_simd;
    uint64_t scalar_fallbacks;
} pcre2_simd_metrics_t;

extern pcre2_simd_metrics_t pcre2_simd_metrics;

#define PCRE2_SIMD_METRIC_INC(metric) (pcre2_simd_metrics.metric++)
#define PCRE2_SIMD_METRIC_ADD(metric, value) (pcre2_simd_metrics.metric += (value))

/* Get SIMD performance metrics */
const pcre2_simd_metrics_t* pcre2_wasm_simd_get_metrics(void);
void pcre2_wasm_simd_reset_metrics(void);

#else

#define PCRE2_SIMD_METRIC_INC(metric)
#define PCRE2_SIMD_METRIC_ADD(metric, value)

#endif /* PCRE2_WASM_SIMD */

#ifdef __cplusplus
}
#endif

#endif /* PCRE2_WASM_SIMD_H */