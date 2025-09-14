/*************************************************
*        PCRE2 SIMD Performance Metrics        *
*************************************************/

/* Performance metrics collection for PCRE2 WASM SIMD optimizations.
   Tracks usage patterns and performance characteristics.

   Copyright (c) 2025 Superstruct Ltd, New Zealand
   Licensed under BSD-3-Clause - see LICENCE.md
*/

#ifdef HAVE_CONFIG_H
#include "config.h"
#endif

#include "pcre2_wasm_simd.h"

#ifdef PCRE2_WASM_SIMD

/*************************************************
*            Global Metrics Storage             *
*************************************************/

pcre2_simd_metrics_t pcre2_simd_metrics = {0};

/*************************************************
*          Metrics Access Functions            *
*************************************************/

const pcre2_simd_metrics_t* pcre2_wasm_simd_get_metrics(void)
{
    return &pcre2_simd_metrics;
}

void pcre2_wasm_simd_reset_metrics(void)
{
    pcre2_simd_metrics.simd_calls_total = 0;
    pcre2_simd_metrics.simd_calls_find_char = 0;
    pcre2_simd_metrics.simd_calls_substring_search = 0;
    pcre2_simd_metrics.simd_calls_memchr = 0;
    pcre2_simd_metrics.simd_calls_memcmp = 0;
    pcre2_simd_metrics.simd_calls_newline = 0;
    pcre2_simd_metrics.simd_calls_class_match = 0;
    pcre2_simd_metrics.simd_calls_utf8_validate = 0;
    pcre2_simd_metrics.simd_calls_repetition = 0;
    pcre2_simd_metrics.bytes_processed_simd = 0;
    pcre2_simd_metrics.scalar_fallbacks = 0;
}

#endif /* PCRE2_WASM_SIMD */