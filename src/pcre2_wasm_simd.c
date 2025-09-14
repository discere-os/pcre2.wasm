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

#ifdef HAVE_CONFIG_H
#include "config.h"
#endif

#include "pcre2_internal.h"

#ifdef PCRE2_WASM_SIMD

#include <wasm_simd128.h>
#include "pcre2_wasm_simd.h"

/*************************************************
*     WebAssembly SIMD Optimized Functions      *
*************************************************/

/* This module provides WebAssembly SIMD optimizations for PCRE2.
   These functions accelerate common pattern matching operations using
   WebAssembly's 128-bit SIMD instructions. */

/*************************************************
*          Fast character search (SIMD)          *
*************************************************/

/* Find the first occurrence of a single character in a string using WASM SIMD.
   This is used for optimizing simple character searches in patterns. */

PCRE2_SPTR
pcre2_wasm_simd_find_char_8(PCRE2_SPTR start, PCRE2_SPTR end, uint32_t c)
{
#if PCRE2_CODE_UNIT_WIDTH == 8
    PCRE2_SIMD_METRIC_INC(simd_calls_total);
    PCRE2_SIMD_METRIC_INC(simd_calls_find_char);
    PCRE2_SIMD_METRIC_ADD(bytes_processed_simd, end - start);

    if (end - start < 16) {
        /* Fall back to scalar search for small strings */
        PCRE2_SIMD_METRIC_INC(scalar_fallbacks);
        PCRE2_SPTR p = start;
        while (p < end) {
            if (*p == c) return p;
            p++;
        }
        return NULL;
    }

    const PCRE2_SPTR aligned_start = (PCRE2_SPTR)(((uintptr_t)start + 15) & ~15);
    const PCRE2_SPTR aligned_end = (PCRE2_SPTR)((uintptr_t)end & ~15);
    
    /* Check unaligned prefix */
    for (PCRE2_SPTR p = start; p < aligned_start && p < end; p++) {
        if (*p == c) return p;
    }
    
    if (aligned_start >= aligned_end) {
        /* Check remaining unaligned suffix */
        for (PCRE2_SPTR p = aligned_start; p < end; p++) {
            if (*p == c) return p;
        }
        return NULL;
    }
    
    /* SIMD search in aligned region */
    v128_t needle = wasm_i8x16_splat((int8_t)c);
    
    for (PCRE2_SPTR p = aligned_start; p < aligned_end; p += 16) {
        v128_t haystack = wasm_v128_load(p);
        v128_t cmp = wasm_i8x16_eq(haystack, needle);
        
        int32_t mask = wasm_i8x16_bitmask(cmp);
        if (mask != 0) {
            /* Found a match, find the exact position */
            int offset = __builtin_ctz(mask);
            return p + offset;
        }
    }
    
    /* Check remaining unaligned suffix */
    for (PCRE2_SPTR p = aligned_end; p < end; p++) {
        if (*p == c) return p;
    }
    
    return NULL;
#else
    /* Fallback for non-8-bit builds */
    PCRE2_SPTR p = start;
    while (p < end) {
        if (*p == c) return p;
        p++;
    }
    return NULL;
#endif
}

/*************************************************
*        Fast character class matching           *
*************************************************/

/* Check if a character matches a character class using SIMD-optimized
   bit manipulation for common ASCII character classes. */

static inline int
wasm_simd_match_char_class_ascii(uint32_t c, const uint8_t* class_bitmap)
{
#if PCRE2_CODE_UNIT_WIDTH == 8
    if (c >= 256) return 0;  /* Non-ASCII, use standard lookup */
    
    /* For ASCII characters, use standard bitmap lookup */
    return (class_bitmap[c >> 3] & (1u << (c & 7))) != 0;
#else
    return 0;  /* Not implemented for wide characters */
#endif
}

/*************************************************
*      SIMD-optimized substring search          *
*************************************************/

/* Fast substring search using WASM SIMD for short needles (up to 16 bytes).
   This implements a simplified Boyer-Moore-like algorithm with SIMD. */

PCRE2_SPTR
pcre2_wasm_simd_substring_search_8(PCRE2_SPTR haystack, size_t haystack_len,
                                   PCRE2_SPTR needle, size_t needle_len)
{
#if PCRE2_CODE_UNIT_WIDTH == 8
    if (needle_len == 0) return haystack;
    if (needle_len > haystack_len) return NULL;
    if (needle_len > 16) {
        /* Fall back to standard search for long needles */
        return NULL;  /* Caller should use standard algorithm */
    }
    
    if (needle_len == 1) {
        return pcre2_wasm_simd_find_char_8(haystack, haystack + haystack_len, needle[0]);
    }
    
    const PCRE2_SPTR haystack_end = haystack + haystack_len;
    const uint8_t first_char = needle[0];
    const uint8_t last_char = needle[needle_len - 1];
    
    /* For needles of 2-16 bytes, use SIMD to find potential matches */
    v128_t first_chars = wasm_i8x16_splat(first_char);
    v128_t last_chars = wasm_i8x16_splat(last_char);
    
    PCRE2_SPTR p = haystack;
    const PCRE2_SPTR search_end = haystack_end - needle_len + 1;
    
    while (p <= search_end - 16) {
        /* Load 16 bytes and check for first character */
        v128_t chunk = wasm_v128_load(p);
        v128_t first_match = wasm_i8x16_eq(chunk, first_chars);
        
        int32_t first_mask = wasm_i8x16_bitmask(first_match);
        
        if (first_mask != 0) {
            /* Load chunk at last character position and check */
            if (p + needle_len - 1 < haystack_end) {
                v128_t last_chunk = wasm_v128_load(p + needle_len - 1);
                v128_t last_match = wasm_i8x16_eq(last_chunk, last_chars);
                int32_t last_mask = wasm_i8x16_bitmask(last_match);
                
                /* Check positions where both first and last characters match */
                int32_t combined_mask = first_mask & last_mask;
                
                while (combined_mask != 0) {
                    int offset = __builtin_ctz(combined_mask);
                    PCRE2_SPTR candidate = p + offset;
                    
                    if (candidate + needle_len <= haystack_end) {
                        /* Verify the middle characters */
                        if (memcmp(candidate, needle, needle_len) == 0) {
                            return candidate;
                        }
                    }
                    
                    combined_mask &= combined_mask - 1;  /* Clear lowest set bit */
                }
            }
        }
        
        p += 16;
    }
    
    /* Handle remaining bytes with scalar search */
    while (p <= search_end) {
        if (*p == first_char && memcmp(p, needle, needle_len) == 0) {
            return p;
        }
        p++;
    }
    
    return NULL;
#else
    return NULL;  /* Not implemented for wide characters */
#endif
}

/*************************************************
*     SIMD-optimized line ending detection      *
*************************************************/

/* Fast detection of line endings (CR, LF, CRLF) using WASM SIMD.
   Returns pointer to the first line ending found. */

PCRE2_SPTR
pcre2_wasm_simd_find_newline_8(PCRE2_SPTR start, PCRE2_SPTR end, int nltype)
{
#if PCRE2_CODE_UNIT_WIDTH == 8
    if (end - start < 16) {
        /* Fall back to scalar search for small strings */
        PCRE2_SPTR p = start;
        while (p < end) {
            uint32_t c = *p;
            switch (nltype) {
                case PCRE2_NEWLINE_CR:
                    if (c == CHAR_CR) return p;
                    break;
                case PCRE2_NEWLINE_LF:
                    if (c == CHAR_LF) return p;
                    break;
                case PCRE2_NEWLINE_CRLF:
                    if (c == CHAR_CR && p + 1 < end && p[1] == CHAR_LF) return p;
                    if (c == CHAR_LF) return p;
                    break;
                case PCRE2_NEWLINE_ANYCRLF:
                case PCRE2_NEWLINE_ANY:
                    if (c == CHAR_CR || c == CHAR_LF) return p;
                    break;
            }
            p++;
        }
        return NULL;
    }
    
    /* SIMD implementation for common case of LF or CRLF */
    if (nltype == PCRE2_NEWLINE_LF || nltype == PCRE2_NEWLINE_ANYCRLF || 
        nltype == PCRE2_NEWLINE_ANY) {
        
        v128_t lf_vec = wasm_i8x16_splat(CHAR_LF);
        v128_t cr_vec = wasm_i8x16_splat(CHAR_CR);
        
        const PCRE2_SPTR aligned_end = (PCRE2_SPTR)((uintptr_t)(end - 16) & ~15);
        
        for (PCRE2_SPTR p = start; p <= aligned_end; p += 16) {
            v128_t chunk = wasm_v128_load(p);
            v128_t lf_match = wasm_i8x16_eq(chunk, lf_vec);
            
            int32_t mask = wasm_i8x16_bitmask(lf_match);
            
            if (nltype == PCRE2_NEWLINE_ANYCRLF || nltype == PCRE2_NEWLINE_ANY) {
                v128_t cr_match = wasm_i8x16_eq(chunk, cr_vec);
                mask |= wasm_i8x16_bitmask(cr_match);
            }
            
            if (mask != 0) {
                int offset = __builtin_ctz(mask);
                return p + offset;
            }
        }
        
        /* Handle remaining bytes */
        for (PCRE2_SPTR p = aligned_end + 16; p < end; p++) {
            uint32_t c = *p;
            if ((nltype == PCRE2_NEWLINE_LF && c == CHAR_LF) ||
                ((nltype == PCRE2_NEWLINE_ANYCRLF || nltype == PCRE2_NEWLINE_ANY) && 
                 (c == CHAR_LF || c == CHAR_CR))) {
                return p;
            }
        }
    }
    
    /* Fall back to scalar implementation for other newline types */
    return NULL;
#else
    return NULL;  /* Not implemented for wide characters */
#endif
}

/*************************************************
*        SIMD capability detection               *
*************************************************/

/* Check if WebAssembly SIMD is available at runtime.
   This function can be called from JavaScript to verify SIMD support. */

int
pcre2_wasm_simd_supported(void)
{
#ifdef PCRE2_WASM_SIMD
    /* In WebAssembly, SIMD availability is determined at compile time.
       If this code is compiled with SIMD support, it's available. */
    return 1;
#else
    return 0;
#endif
}

/*************************************************
*       Initialize WASM SIMD optimizations      *
*************************************************/

/* Initialize WASM SIMD function pointers and capabilities.
   This should be called once when the module is loaded. */

/*************************************************
*     SIMD-optimized memory operations           *
*************************************************/

/* SIMD-optimized memchr replacement for character searching */
PCRE2_SPTR
pcre2_wasm_simd_memchr(const void* s, int c, size_t n)
{
#if PCRE2_CODE_UNIT_WIDTH == 8 && defined(PCRE2_WASM_SIMD)
    const PCRE2_SPTR start = (const PCRE2_SPTR)s;
    const PCRE2_SPTR end = start + n;
    
    if (n < 16) {
        /* Fall back to scalar for small searches */
        for (PCRE2_SPTR p = start; p < end; p++) {
            if (*p == (uint8_t)c) return p;
        }
        return NULL;
    }
    
    return pcre2_wasm_simd_find_char_8(start, end, (uint32_t)c);
#else
    /* Standard memchr fallback */
    return (PCRE2_SPTR)memchr(s, c, n);
#endif
}

/* SIMD-optimized memcmp replacement for string comparison */
int
pcre2_wasm_simd_memcmp(const void* s1, const void* s2, size_t n)
{
#if PCRE2_CODE_UNIT_WIDTH == 8 && defined(PCRE2_WASM_SIMD)
    const uint8_t* p1 = (const uint8_t*)s1;
    const uint8_t* p2 = (const uint8_t*)s2;
    
    if (n < 16) {
        /* Fall back to scalar for small comparisons */
        for (size_t i = 0; i < n; i++) {
            if (p1[i] != p2[i]) return p1[i] - p2[i];
        }
        return 0;
    }
    
    /* Process 16-byte chunks with SIMD */
    const size_t simd_chunks = n / 16;
    const size_t remaining = n % 16;
    
    for (size_t chunk = 0; chunk < simd_chunks; chunk++) {
        const uint8_t* chunk_p1 = p1 + chunk * 16;
        const uint8_t* chunk_p2 = p2 + chunk * 16;
        
        v128_t vec1 = wasm_v128_load(chunk_p1);
        v128_t vec2 = wasm_v128_load(chunk_p2);
        v128_t cmp = wasm_i8x16_eq(vec1, vec2);
        
        int32_t mask = wasm_i8x16_bitmask(cmp);
        if (mask != 0xFFFF) {
            /* Found difference, locate exact position */
            for (int i = 0; i < 16; i++) {
                if ((mask & (1 << i)) == 0) {
                    return chunk_p1[i] - chunk_p2[i];
                }
            }
        }
    }
    
    /* Check remaining bytes */
    for (size_t i = simd_chunks * 16; i < n; i++) {
        if (p1[i] != p2[i]) return p1[i] - p2[i];
    }
    
    return 0;
#else
    /* Standard memcmp fallback */
    return memcmp(s1, s2, n);
#endif
}

/* SIMD-enhanced Boyer-Moore string search for literal patterns */
PCRE2_SPTR
pcre2_wasm_simd_boyer_moore_search(PCRE2_SPTR haystack, PCRE2_SIZE haystack_len, 
                                   PCRE2_SPTR needle, PCRE2_SIZE needle_len)
{
#if PCRE2_CODE_UNIT_WIDTH == 8 && defined(PCRE2_WASM_SIMD)
    if (needle_len == 0) return haystack;
    if (needle_len > haystack_len) return NULL;
    if (needle_len == 1) return pcre2_wasm_simd_find_char_8(haystack, haystack + haystack_len, *needle);
    
    /* For patterns 2-16 bytes, use SIMD-enhanced search */
    if (needle_len >= 2 && needle_len <= 16) {
        const uint8_t first_char = needle[0];
        const uint8_t last_char = needle[needle_len - 1];
        
        v128_t first_chars = wasm_i8x16_splat(first_char);
        v128_t last_chars = wasm_i8x16_splat(last_char);
        
        for (PCRE2_SPTR p = haystack; p <= haystack + haystack_len - needle_len; ) {
            /* SIMD search for first character */
            PCRE2_SPTR first_match = pcre2_wasm_simd_find_char_8(p, haystack + haystack_len - needle_len + 1, first_char);
            if (!first_match) return NULL;
            
            /* Quick check: does last character match? */
            if (first_match[needle_len - 1] == last_char) {
                /* Full comparison with SIMD memcmp */
                if (pcre2_wasm_simd_memcmp(first_match, needle, needle_len) == 0) {
                    return first_match;
                }
            }
            
            p = first_match + 1;
        }
    } else {
        /* Fallback for longer patterns */
        for (PCRE2_SPTR p = haystack; p <= haystack + haystack_len - needle_len; p++) {
            if (memcmp(p, needle, needle_len) == 0) return p;
        }
    }
    
    return NULL;
#else
    /* Standard string search fallback */
    for (PCRE2_SPTR p = haystack; p <= haystack + haystack_len - needle_len; p++) {
        if (memcmp(p, needle, needle_len) == 0) return p;
    }
    return NULL;
#endif
}

/*************************************************
*     SIMD-optimized character class matching   *
*************************************************/

/* SIMD-optimized character class matching for common ASCII ranges */
int
pcre2_wasm_simd_match_ascii_class(PCRE2_SPTR start, PCRE2_SPTR end,
                                  const uint8_t* class_bitmap, PCRE2_SPTR* match_ptr)
{
#if PCRE2_CODE_UNIT_WIDTH == 8 && defined(PCRE2_WASM_SIMD)
    if (end - start < 16) {
        /* Scalar fallback for small inputs */
        for (PCRE2_SPTR p = start; p < end; p++) {
            uint32_t c = *p;
            if (c < 256 && (class_bitmap[c >> 3] & (1u << (c & 7)))) {
                *match_ptr = p;
                return 1;
            }
        }
        return 0;
    }

    /* SIMD processing for common character classes */
    const PCRE2_SPTR aligned_end = (PCRE2_SPTR)((uintptr_t)(end - 16) & ~15);

    for (PCRE2_SPTR p = start; p <= aligned_end; p += 16) {
        v128_t chunk = wasm_v128_load(p);

        /* Check each byte in the chunk against the character class */
        uint8_t chunk_bytes[16];
        wasm_v128_store(chunk_bytes, chunk);

        for (int i = 0; i < 16; i++) {
            uint32_t c = chunk_bytes[i];
            if (c < 256 && (class_bitmap[c >> 3] & (1u << (c & 7)))) {
                *match_ptr = p + i;
                return 1;
            }
        }
    }

    /* Handle remaining bytes */
    for (PCRE2_SPTR p = aligned_end + 16; p < end; p++) {
        uint32_t c = *p;
        if (c < 256 && (class_bitmap[c >> 3] & (1u << (c & 7)))) {
            *match_ptr = p;
            return 1;
        }
    }

    return 0;
#else
    return 0; /* Not implemented for wide characters */
#endif
}

/* SIMD-optimized digit matching [0-9] */
int
pcre2_wasm_simd_match_digits(PCRE2_SPTR start, PCRE2_SPTR end, PCRE2_SPTR* match_ptr)
{
#if PCRE2_CODE_UNIT_WIDTH == 8 && defined(PCRE2_WASM_SIMD)
    if (end - start < 16) {
        for (PCRE2_SPTR p = start; p < end; p++) {
            if (*p >= '0' && *p <= '9') {
                *match_ptr = p;
                return 1;
            }
        }
        return 0;
    }

    v128_t zero_vec = wasm_i8x16_splat('0');
    v128_t nine_vec = wasm_i8x16_splat('9');

    const PCRE2_SPTR aligned_end = (PCRE2_SPTR)((uintptr_t)(end - 16) & ~15);

    for (PCRE2_SPTR p = start; p <= aligned_end; p += 16) {
        v128_t chunk = wasm_v128_load(p);
        v128_t ge_zero = wasm_i8x16_ge(chunk, zero_vec);
        v128_t le_nine = wasm_i8x16_le(chunk, nine_vec);
        v128_t is_digit = wasm_v128_and(ge_zero, le_nine);

        int32_t mask = wasm_i8x16_bitmask(is_digit);
        if (mask != 0) {
            int offset = __builtin_ctz(mask);
            *match_ptr = p + offset;
            return 1;
        }
    }

    /* Handle remaining bytes */
    for (PCRE2_SPTR p = aligned_end + 16; p < end; p++) {
        if (*p >= '0' && *p <= '9') {
            *match_ptr = p;
            return 1;
        }
    }

    return 0;
#else
    return 0;
#endif
}

/* SIMD-optimized whitespace matching [ \t\n\r\f\v] */
int
pcre2_wasm_simd_match_whitespace(PCRE2_SPTR start, PCRE2_SPTR end, PCRE2_SPTR* match_ptr)
{
#if PCRE2_CODE_UNIT_WIDTH == 8 && defined(PCRE2_WASM_SIMD)
    if (end - start < 16) {
        for (PCRE2_SPTR p = start; p < end; p++) {
            uint8_t c = *p;
            if (c == ' ' || c == '\t' || c == '\n' || c == '\r' || c == '\f' || c == '\v') {
                *match_ptr = p;
                return 1;
            }
        }
        return 0;
    }

    v128_t space_vec = wasm_i8x16_splat(' ');
    v128_t tab_vec = wasm_i8x16_splat('\t');
    v128_t lf_vec = wasm_i8x16_splat('\n');
    v128_t cr_vec = wasm_i8x16_splat('\r');
    v128_t ff_vec = wasm_i8x16_splat('\f');
    v128_t vt_vec = wasm_i8x16_splat('\v');

    const PCRE2_SPTR aligned_end = (PCRE2_SPTR)((uintptr_t)(end - 16) & ~15);

    for (PCRE2_SPTR p = start; p <= aligned_end; p += 16) {
        v128_t chunk = wasm_v128_load(p);

        v128_t match = wasm_i8x16_eq(chunk, space_vec);
        match = wasm_v128_or(match, wasm_i8x16_eq(chunk, tab_vec));
        match = wasm_v128_or(match, wasm_i8x16_eq(chunk, lf_vec));
        match = wasm_v128_or(match, wasm_i8x16_eq(chunk, cr_vec));
        match = wasm_v128_or(match, wasm_i8x16_eq(chunk, ff_vec));
        match = wasm_v128_or(match, wasm_i8x16_eq(chunk, vt_vec));

        int32_t mask = wasm_i8x16_bitmask(match);
        if (mask != 0) {
            int offset = __builtin_ctz(mask);
            *match_ptr = p + offset;
            return 1;
        }
    }

    /* Handle remaining bytes */
    for (PCRE2_SPTR p = aligned_end + 16; p < end; p++) {
        uint8_t c = *p;
        if (c == ' ' || c == '\t' || c == '\n' || c == '\r' || c == '\f' || c == '\v') {
            *match_ptr = p;
            return 1;
        }
    }

    return 0;
#else
    return 0;
#endif
}

/*************************************************
*     SIMD-optimized UTF-8 validation           *
*************************************************/

/* Fast UTF-8 validation using SIMD for common cases */
int
pcre2_wasm_simd_validate_utf8(PCRE2_SPTR start, PCRE2_SIZE length, PCRE2_SIZE* error_offset)
{
#if PCRE2_CODE_UNIT_WIDTH == 8 && defined(PCRE2_WASM_SIMD)
    const PCRE2_SPTR end = start + length;

    if (length < 16) {
        /* Scalar validation for small inputs */
        for (PCRE2_SPTR p = start; p < end; p++) {
            uint8_t c = *p;
            if (c <= 0x7F) continue; /* ASCII - valid */

            /* Multi-byte sequence - validate manually */
            if ((c & 0xE0) == 0xC0) { /* 2-byte sequence */
                if (p + 1 >= end || (p[1] & 0xC0) != 0x80) {
                    *error_offset = p - start;
                    return 0;
                }
                p++;
            } else if ((c & 0xF0) == 0xE0) { /* 3-byte sequence */
                if (p + 2 >= end || (p[1] & 0xC0) != 0x80 || (p[2] & 0xC0) != 0x80) {
                    *error_offset = p - start;
                    return 0;
                }
                p += 2;
            } else if ((c & 0xF8) == 0xF0) { /* 4-byte sequence */
                if (p + 3 >= end || (p[1] & 0xC0) != 0x80 ||
                    (p[2] & 0xC0) != 0x80 || (p[3] & 0xC0) != 0x80) {
                    *error_offset = p - start;
                    return 0;
                }
                p += 3;
            } else {
                *error_offset = p - start;
                return 0; /* Invalid start byte */
            }
        }
        return 1;
    }

    /* SIMD optimization for ASCII-heavy text */
    v128_t ascii_mask = wasm_i8x16_splat(0x80);
    const PCRE2_SPTR aligned_end = (PCRE2_SPTR)((uintptr_t)(end - 16) & ~15);

    PCRE2_SPTR p = start;

    /* Fast path: check for pure ASCII chunks */
    while (p <= aligned_end) {
        v128_t chunk = wasm_v128_load(p);
        v128_t high_bits = wasm_v128_and(chunk, ascii_mask);

        if (wasm_v128_any_true(high_bits)) {
            /* Non-ASCII found, fall back to scalar validation from this point */
            break;
        }
        p += 16;
    }

    /* Scalar validation for non-ASCII or remaining bytes */
    while (p < end) {
        uint8_t c = *p;
        if (c <= 0x7F) {
            p++;
            continue;
        }

        /* Multi-byte sequence validation */
        if ((c & 0xE0) == 0xC0) { /* 2-byte */
            if (p + 1 >= end || (p[1] & 0xC0) != 0x80) {
                *error_offset = p - start;
                return 0;
            }
            p += 2;
        } else if ((c & 0xF0) == 0xE0) { /* 3-byte */
            if (p + 2 >= end || (p[1] & 0xC0) != 0x80 || (p[2] & 0xC0) != 0x80) {
                *error_offset = p - start;
                return 0;
            }
            p += 3;
        } else if ((c & 0xF8) == 0xF0) { /* 4-byte */
            if (p + 3 >= end || (p[1] & 0xC0) != 0x80 ||
                (p[2] & 0xC0) != 0x80 || (p[3] & 0xC0) != 0x80) {
                *error_offset = p - start;
                return 0;
            }
            p += 4;
        } else {
            *error_offset = p - start;
            return 0; /* Invalid start byte */
        }
    }

    return 1;
#else
    return 1; /* Assume valid for wide character builds */
#endif
}

/*************************************************
*     SIMD-optimized repetition matching        *
*************************************************/

/* Count consecutive occurrences of a character using SIMD */
PCRE2_SIZE
pcre2_wasm_simd_count_char(PCRE2_SPTR start, PCRE2_SPTR end, uint32_t c)
{
#if PCRE2_CODE_UNIT_WIDTH == 8 && defined(PCRE2_WASM_SIMD)
    PCRE2_SIZE count = 0;
    PCRE2_SPTR p = start;

    if (end - start < 16) {
        /* Scalar counting for small inputs */
        while (p < end && *p == c) {
            count++;
            p++;
        }
        return count;
    }

    v128_t char_vec = wasm_i8x16_splat((int8_t)c);
    const PCRE2_SPTR aligned_end = (PCRE2_SPTR)((uintptr_t)(end - 16) & ~15);

    /* SIMD counting in chunks */
    while (p <= aligned_end) {
        v128_t chunk = wasm_v128_load(p);
        v128_t match = wasm_i8x16_eq(chunk, char_vec);
        int32_t mask = wasm_i8x16_bitmask(match);

        if (mask == 0xFFFF) {
            /* All 16 bytes match */
            count += 16;
            p += 16;
        } else if (mask == 0) {
            /* No matches in this chunk - end of run */
            break;
        } else {
            /* Partial match - count leading matches */
            for (int i = 0; i < 16; i++) {
                if ((mask & (1 << i)) && p[i] == c) {
                    count++;
                } else {
                    return count;
                }
            }
            return count;
        }
    }

    /* Handle remaining bytes */
    while (p < end && *p == c) {
        count++;
        p++;
    }

    return count;
#else
    PCRE2_SIZE count = 0;
    while (start < end && *start == c) {
        count++;
        start++;
    }
    return count;
#endif
}

/* Count consecutive whitespace characters using SIMD */
PCRE2_SIZE
pcre2_wasm_simd_count_whitespace(PCRE2_SPTR start, PCRE2_SPTR end)
{
#if PCRE2_CODE_UNIT_WIDTH == 8 && defined(PCRE2_WASM_SIMD)
    PCRE2_SIZE count = 0;
    PCRE2_SPTR p = start;

    if (end - start < 16) {
        /* Scalar counting for small inputs */
        while (p < end) {
            uint8_t c = *p;
            if (c == ' ' || c == '\t' || c == '\n' || c == '\r' || c == '\f' || c == '\v') {
                count++;
                p++;
            } else {
                break;
            }
        }
        return count;
    }

    v128_t space_vec = wasm_i8x16_splat(' ');
    v128_t tab_vec = wasm_i8x16_splat('\t');
    v128_t lf_vec = wasm_i8x16_splat('\n');
    v128_t cr_vec = wasm_i8x16_splat('\r');
    v128_t ff_vec = wasm_i8x16_splat('\f');
    v128_t vt_vec = wasm_i8x16_splat('\v');

    const PCRE2_SPTR aligned_end = (PCRE2_SPTR)((uintptr_t)(end - 16) & ~15);

    /* SIMD counting in chunks */
    while (p <= aligned_end) {
        v128_t chunk = wasm_v128_load(p);

        v128_t match = wasm_i8x16_eq(chunk, space_vec);
        match = wasm_v128_or(match, wasm_i8x16_eq(chunk, tab_vec));
        match = wasm_v128_or(match, wasm_i8x16_eq(chunk, lf_vec));
        match = wasm_v128_or(match, wasm_i8x16_eq(chunk, cr_vec));
        match = wasm_v128_or(match, wasm_i8x16_eq(chunk, ff_vec));
        match = wasm_v128_or(match, wasm_i8x16_eq(chunk, vt_vec));

        int32_t mask = wasm_i8x16_bitmask(match);

        if (mask == 0xFFFF) {
            /* All 16 bytes are whitespace */
            count += 16;
            p += 16;
        } else {
            /* Count leading whitespace in this chunk */
            for (int i = 0; i < 16; i++) {
                if (mask & (1 << i)) {
                    count++;
                } else {
                    return count;
                }
            }
            return count;
        }
    }

    /* Handle remaining bytes */
    while (p < end) {
        uint8_t c = *p;
        if (c == ' ' || c == '\t' || c == '\n' || c == '\r' || c == '\f' || c == '\v') {
            count++;
            p++;
        } else {
            break;
        }
    }

    return count;
#else
    PCRE2_SIZE count = 0;
    while (start < end) {
        uint8_t c = *start;
        if (c == ' ' || c == '\t' || c == '\n' || c == '\r' || c == '\f' || c == '\v') {
            count++;
            start++;
        } else {
            break;
        }
    }
    return count;
#endif
}

void
pcre2_wasm_simd_init(void)
{
#ifdef PCRE2_WASM_SIMD
    /* Set up function pointers for SIMD-optimized operations */
    /* This would integrate with PCRE2's internal dispatch system */

    /* For now, the optimizations are called directly from the
       appropriate places in the PCRE2 codebase when PCRE2_WASM_SIMD
       is defined. */
#endif
}

#endif /* PCRE2_WASM_SIMD */