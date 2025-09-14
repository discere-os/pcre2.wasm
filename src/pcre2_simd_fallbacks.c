/*************************************************
*     PCRE2 SIMD Fallback Implementation        *
*************************************************/

/* Fallback mechanisms for PCRE2 WASM SIMD optimizations when SIMD is not
   available or optimal. Provides seamless degradation to scalar implementations.

   Copyright (c) 2025 Superstruct Ltd, New Zealand
   Licensed under BSD-3-Clause - see LICENCE.md
*/

#ifdef HAVE_CONFIG_H
#include "config.h"
#endif

#include "pcre2_internal.h"
#include "pcre2_wasm_simd.h"

/*************************************************
*         Fallback Function Implementations     *
*************************************************/

/* These functions provide scalar implementations for environments where
   SIMD is not available or when SIMD optimizations are not beneficial. */

#ifndef PCRE2_WASM_SIMD

/*************************************************
*          Character Search Fallbacks          *
*************************************************/

PCRE2_SPTR
pcre2_wasm_simd_find_char_8(PCRE2_SPTR start, PCRE2_SPTR end, uint32_t c)
{
#if PCRE2_CODE_UNIT_WIDTH == 8
    /* Optimized scalar search using standard library when available */
    size_t length = end - start;
    if (length > 0) {
        PCRE2_SPTR result = (PCRE2_SPTR)memchr(start, (int)c, length);
        return result;
    }
    return NULL;
#else
    /* Basic scalar search for wide characters */
    PCRE2_SPTR p;
    for (p = start; p < end; p++) {
        if (*p == c) return p;
    }
    return NULL;
#endif
}

PCRE2_SPTR
pcre2_wasm_simd_memchr(const void* s, int c, size_t n)
{
    return (PCRE2_SPTR)memchr(s, c, n);
}

/*************************************************
*           String Search Fallbacks            *
*************************************************/

PCRE2_SPTR
pcre2_wasm_simd_substring_search_8(PCRE2_SPTR haystack, size_t haystack_len,
                                   PCRE2_SPTR needle, size_t needle_len)
{
#if PCRE2_CODE_UNIT_WIDTH == 8
    if (needle_len == 0) return haystack;
    if (needle_len > haystack_len) return NULL;

    /* Use standard library memmem if available, otherwise basic search */
#ifdef HAVE_MEMMEM
    return (PCRE2_SPTR)memmem(haystack, haystack_len, needle, needle_len);
#else
    /* Simple string search algorithm */
    for (size_t i = 0; i <= haystack_len - needle_len; i++) {
        if (memcmp(haystack + i, needle, needle_len) == 0) {
            return haystack + i;
        }
    }
    return NULL;
#endif

#else
    return NULL; /* Not implemented for wide characters */
#endif
}

PCRE2_SPTR
pcre2_wasm_simd_boyer_moore_search(PCRE2_SPTR haystack, PCRE2_SIZE haystack_len,
                                   PCRE2_SPTR needle, PCRE2_SIZE needle_len)
{
    /* Fall back to basic substring search */
    return pcre2_wasm_simd_substring_search_8(haystack, haystack_len, needle, needle_len);
}

/*************************************************
*           Memory Operation Fallbacks         *
*************************************************/

int
pcre2_wasm_simd_memcmp(const void* s1, const void* s2, size_t n)
{
    return memcmp(s1, s2, n);
}

/*************************************************
*         Line Ending Detection Fallbacks      *
*************************************************/

PCRE2_SPTR
pcre2_wasm_simd_find_newline_8(PCRE2_SPTR start, PCRE2_SPTR end, int nltype)
{
#if PCRE2_CODE_UNIT_WIDTH == 8
    PCRE2_SPTR p;

    for (p = start; p < end; p++) {
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

            default:
                /* Handle other newline types */
                if (c == CHAR_LF || c == CHAR_CR) return p;
                break;
        }
    }

    return NULL;
#else
    return NULL; /* Not implemented for wide characters */
#endif
}

/*************************************************
*        Character Class Matching Fallbacks    *
*************************************************/

int
pcre2_wasm_simd_match_ascii_class(PCRE2_SPTR start, PCRE2_SPTR end,
                                  const uint8_t* class_bitmap, PCRE2_SPTR* match_ptr)
{
#if PCRE2_CODE_UNIT_WIDTH == 8
    PCRE2_SPTR p;

    for (p = start; p < end; p++) {
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

int
pcre2_wasm_simd_match_digits(PCRE2_SPTR start, PCRE2_SPTR end, PCRE2_SPTR* match_ptr)
{
    PCRE2_SPTR p;

    for (p = start; p < end; p++) {
        if (*p >= '0' && *p <= '9') {
            *match_ptr = p;
            return 1;
        }
    }
    return 0;
}

int
pcre2_wasm_simd_match_whitespace(PCRE2_SPTR start, PCRE2_SPTR end, PCRE2_SPTR* match_ptr)
{
    PCRE2_SPTR p;

    for (p = start; p < end; p++) {
        uint8_t c = *p;
        if (c == ' ' || c == '\t' || c == '\n' || c == '\r' || c == '\f' || c == '\v') {
            *match_ptr = p;
            return 1;
        }
    }
    return 0;
}

/*************************************************
*         UTF-8 Validation Fallbacks           *
*************************************************/

int
pcre2_wasm_simd_validate_utf8(PCRE2_SPTR start, PCRE2_SIZE length, PCRE2_SIZE* error_offset)
{
#if PCRE2_CODE_UNIT_WIDTH == 8
    const PCRE2_SPTR end = start + length;
    PCRE2_SPTR p;

    for (p = start; p < end; p++) {
        uint8_t c = *p;

        if (c <= 0x7F) {
            /* ASCII - always valid */
            continue;
        }

        /* Multi-byte sequence validation */
        if ((c & 0xE0) == 0xC0) {
            /* 2-byte sequence: 110xxxxx 10xxxxxx */
            if (p + 1 >= end || (p[1] & 0xC0) != 0x80) {
                *error_offset = p - start;
                return 0;
            }
            /* Check for overlong encoding */
            if (c < 0xC2) {
                *error_offset = p - start;
                return 0;
            }
            p += 1;
        }
        else if ((c & 0xF0) == 0xE0) {
            /* 3-byte sequence: 1110xxxx 10xxxxxx 10xxxxxx */
            if (p + 2 >= end || (p[1] & 0xC0) != 0x80 || (p[2] & 0xC0) != 0x80) {
                *error_offset = p - start;
                return 0;
            }
            /* Check for overlong encoding and surrogates */
            if (c == 0xE0 && p[1] < 0xA0) {
                *error_offset = p - start;
                return 0; /* Overlong */
            }
            if (c == 0xED && p[1] >= 0xA0) {
                *error_offset = p - start;
                return 0; /* Surrogate */
            }
            p += 2;
        }
        else if ((c & 0xF8) == 0xF0) {
            /* 4-byte sequence: 11110xxx 10xxxxxx 10xxxxxx 10xxxxxx */
            if (p + 3 >= end || (p[1] & 0xC0) != 0x80 ||
                (p[2] & 0xC0) != 0x80 || (p[3] & 0xC0) != 0x80) {
                *error_offset = p - start;
                return 0;
            }
            /* Check for overlong encoding and out-of-range */
            if (c == 0xF0 && p[1] < 0x90) {
                *error_offset = p - start;
                return 0; /* Overlong */
            }
            if (c > 0xF4 || (c == 0xF4 && p[1] > 0x8F)) {
                *error_offset = p - start;
                return 0; /* Out of range */
            }
            p += 3;
        }
        else {
            /* Invalid start byte */
            *error_offset = p - start;
            return 0;
        }
    }

    return 1; /* Valid UTF-8 */
#else
    return 1; /* Assume valid for wide character builds */
#endif
}

/*************************************************
*         Repetition Matching Fallbacks        *
*************************************************/

PCRE2_SIZE
pcre2_wasm_simd_count_char(PCRE2_SPTR start, PCRE2_SPTR end, uint32_t c)
{
    PCRE2_SIZE count = 0;
    PCRE2_SPTR p;

    for (p = start; p < end && *p == c; p++) {
        count++;
    }
    return count;
}

PCRE2_SIZE
pcre2_wasm_simd_count_whitespace(PCRE2_SPTR start, PCRE2_SPTR end)
{
    PCRE2_SIZE count = 0;
    PCRE2_SPTR p;

    for (p = start; p < end; p++) {
        uint8_t c = *p;
        if (c == ' ' || c == '\t' || c == '\n' || c == '\r' || c == '\f' || c == '\v') {
            count++;
        } else {
            break;
        }
    }
    return count;
}

/*************************************************
*              Capability Detection             *
*************************************************/

int
pcre2_wasm_simd_supported(void)
{
    return 0; /* SIMD not available in fallback build */
}

/*************************************************
*         Metrics Functions (No-op)            *
*************************************************/

const void* pcre2_wasm_simd_get_metrics(void)
{
    return NULL; /* Metrics not available in fallback build */
}

void pcre2_wasm_simd_reset_metrics(void)
{
    /* No-op in fallback build */
}

/*************************************************
*              Initialization                   *
*************************************************/

void
pcre2_wasm_simd_init(void)
{
    /* No initialization needed for fallback implementations */
}

#endif /* !PCRE2_WASM_SIMD */