#!/bin/bash
# build-dual.sh - Dual build system for pcre2.wasm (SIDE_MODULE + MAIN_MODULE)
#
# Copyright (c) 2025 Superstruct Ltd, New Zealand
# Copyright (c) 1997-2024 University of Cambridge
#
# This source code is licensed under the BSD-3-Clause license found in the
# LICENCE.md file in the root directory of this source tree.

set -euo pipefail

# Configuration
BUILD_TYPE="${BUILD_TYPE:-Release}"
INSTALL_PREFIX="${INSTALL_PREFIX:-./install}"
BUILD_DIR="${BUILD_DIR:-./build-dual}"
VARIANT="${1:-all}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check Emscripten availability
check_emscripten() {
    if ! command -v emcc >/dev/null 2>&1; then
        log_error "Emscripten not found. Please install and activate Emscripten:"
        echo "  git clone https://github.com/emscripten-core/emsdk.git"
        echo "  cd emsdk && ./emsdk install latest && ./emsdk activate latest"
        echo "  source ./emsdk_env.sh"
        exit 1
    fi
    
    local emcc_version=$(emcc --version | head -n1 | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' || echo "unknown")
    log_info "Using Emscripten version: $emcc_version"
}

# Ensure required build files exist (generated from templates if missing)
ensure_build_files() {
    # Generate pcre2_chartables.c if missing
    if [ ! -f "src/pcre2_chartables.c" ]; then
        log_info "Generating pcre2_chartables.c from pcre2_chartables.c.dist..."
        cp src/pcre2_chartables.c.dist src/pcre2_chartables.c
        log_success "Generated pcre2_chartables.c"
    fi

    # Generate config.h if missing
    if [ ! -f "src/config.h" ]; then
        log_info "Generating config.h from config.h.generic..."
        cp src/config.h.generic src/config.h
        log_success "Generated config.h"
    fi

    # Generate pcre2.h if missing
    if [ ! -f "src/pcre2.h" ]; then
        log_info "Generating pcre2.h from pcre2.h.generic..."
        cp src/pcre2.h.generic src/pcre2.h
        log_success "Generated pcre2.h"
    fi
}

# Copy config.h to build directory for emcc to find
ensure_config_h() {
    local build_dir="$1"
    if [ ! -f "${build_dir}/config.h" ]; then
        log_info "Copying config.h to build directory..."
        cp src/config.h "${build_dir}/config.h"
        log_success "Copied config.h to ${build_dir}/"
    fi
}

# Build PCRE2 as SIDE_MODULE for dynamic loading
build_pcre2_side_module() {
    log_info "Building pcre2.wasm as SIDE_MODULE for production dynamic loading..."

    ensure_build_files

    mkdir -p "${BUILD_DIR}-side"
    ensure_config_h "${BUILD_DIR}-side"
    cd "${BUILD_DIR}-side"

    # Core PCRE2 sources
    PCRE2_SOURCES="../src/pcre2_auto_possess.c ../src/pcre2_chartables.c ../src/pcre2_chkdint.c ../src/pcre2_compile.c"
    PCRE2_SOURCES="$PCRE2_SOURCES ../src/pcre2_compile_cgroup.c ../src/pcre2_compile_class.c"
    PCRE2_SOURCES="$PCRE2_SOURCES ../src/pcre2_config.c ../src/pcre2_context.c ../src/pcre2_convert.c"
    PCRE2_SOURCES="$PCRE2_SOURCES ../src/pcre2_dfa_match.c ../src/pcre2_error.c ../src/pcre2_extuni.c"
    PCRE2_SOURCES="$PCRE2_SOURCES ../src/pcre2_find_bracket.c ../src/pcre2_maketables.c ../src/pcre2_match.c"
    PCRE2_SOURCES="$PCRE2_SOURCES ../src/pcre2_match_data.c ../src/pcre2_match_next.c ../src/pcre2_newline.c ../src/pcre2_ord2utf.c"
    PCRE2_SOURCES="$PCRE2_SOURCES ../src/pcre2_pattern_info.c ../src/pcre2_script_run.c ../src/pcre2_serialize.c"
    PCRE2_SOURCES="$PCRE2_SOURCES ../src/pcre2_string_utils.c ../src/pcre2_study.c ../src/pcre2_substitute.c"
    PCRE2_SOURCES="$PCRE2_SOURCES ../src/pcre2_substring.c ../src/pcre2_tables.c ../src/pcre2_ucd.c"
    PCRE2_SOURCES="$PCRE2_SOURCES ../src/pcre2_valid_utf.c ../src/pcre2_xclass.c"

    # WASM-specific side module wrapper + SIMD optimizations
    PCRE2_WASM_SIDE="../src/pcre2_wasm_side.c"
    PCRE2_WASM_SIMD="../src/pcre2_wasm_simd.c ../src/pcre2_simd_metrics.c"

    # TRUE SIDE_MODULE build for dynamic loading by host applications
    # Official Emscripten SIDE_MODULE approach - no system libraries included
    # Export essential PCRE2 functions to prevent dead code elimination
    emcc ${PCRE2_SOURCES} ${PCRE2_WASM_SIDE} ${PCRE2_WASM_SIMD} \
        -I../src \
        -I.. \
        -DPCRE2_CODE_UNIT_WIDTH=8 \
        -DHAVE_CONFIG_H \
        -DPCRE2_STATIC \
        -DSUPPORT_UNICODE=1 \
        -DSUPPORT_UTF=1 \
        -DSUPPORT_UCP=1 \
        -DPCRE2_WASM_SIMD=1 \
        -DPCRE2_SIDE_MODULE=1 \
        -O3 \
        -flto \
        -msimd128 \
        -sSIDE_MODULE=2 \
        -sEXPORTED_FUNCTIONS='["_pcre2_wasm_init","_pcre2_wasm_version","_pcre2_wasm_unicode_version","_pcre2_wasm_cleanup","_pcre2_compile_8","_pcre2_match_8","_pcre2_substitute_8","_pcre2_code_free_8","_pcre2_match_data_create_8","_pcre2_match_data_free_8","_pcre2_get_ovector_pointer_8"]' \
        -o pcre2-side.wasm

    log_success "SIDE_MODULE build completed: $(pwd)/pcre2-side.wasm"
    cd ..
}

# Build PCRE2 as MAIN_MODULE for testing
build_pcre2_main_module() {
    log_info "Building pcre2.wasm as MAIN_MODULE for testing..."

    ensure_build_files

    mkdir -p "${BUILD_DIR}-main-release"
    ensure_config_h "${BUILD_DIR}-main-release"
    cd "${BUILD_DIR}-main-release"

    # Core PCRE2 sources (same as SIDE_MODULE)
    PCRE2_SOURCES="../src/pcre2_auto_possess.c ../src/pcre2_chartables.c ../src/pcre2_chkdint.c ../src/pcre2_compile.c"
    PCRE2_SOURCES="$PCRE2_SOURCES ../src/pcre2_compile_cgroup.c ../src/pcre2_compile_class.c"
    PCRE2_SOURCES="$PCRE2_SOURCES ../src/pcre2_config.c ../src/pcre2_context.c ../src/pcre2_convert.c"
    PCRE2_SOURCES="$PCRE2_SOURCES ../src/pcre2_dfa_match.c ../src/pcre2_error.c ../src/pcre2_extuni.c"
    PCRE2_SOURCES="$PCRE2_SOURCES ../src/pcre2_find_bracket.c ../src/pcre2_maketables.c ../src/pcre2_match.c"
    PCRE2_SOURCES="$PCRE2_SOURCES ../src/pcre2_match_data.c ../src/pcre2_match_next.c ../src/pcre2_newline.c ../src/pcre2_ord2utf.c"
    PCRE2_SOURCES="$PCRE2_SOURCES ../src/pcre2_pattern_info.c ../src/pcre2_script_run.c ../src/pcre2_serialize.c"
    PCRE2_SOURCES="$PCRE2_SOURCES ../src/pcre2_string_utils.c ../src/pcre2_study.c ../src/pcre2_substitute.c"
    PCRE2_SOURCES="$PCRE2_SOURCES ../src/pcre2_substring.c ../src/pcre2_tables.c ../src/pcre2_ucd.c"
    PCRE2_SOURCES="$PCRE2_SOURCES ../src/pcre2_valid_utf.c ../src/pcre2_xclass.c"

    # WASM-specific main module wrapper + SIMD optimizations
    PCRE2_WASM_MAIN="../src/pcre2_wasm_module.c"
    PCRE2_WASM_SIMD="../src/pcre2_wasm_simd.c ../src/pcre2_simd_metrics.c"
    PCRE2_WASM_FALLBACK="../src/pcre2_simd_fallbacks.c"

    # MAIN_MODULE build with full optimizations + SIMD (DEFAULT)
    emcc ${PCRE2_SOURCES} ${PCRE2_WASM_MAIN} ${PCRE2_WASM_SIMD} \
        -I../src \
        -I.. \
        -DPCRE2_CODE_UNIT_WIDTH=8 \
        -DHAVE_CONFIG_H \
        -DPCRE2_STATIC \
        -DSUPPORT_UNICODE=1 \
        -DSUPPORT_UTF=1 \
        -DSUPPORT_UCP=1 \
        -DPCRE2_WASM_SIMD=1 \
        -O3 \
        -flto \
        -msimd128 \
        -sWASM=1 \
        -sMODULARIZE=1 \
        -sEXPORT_NAME="PCRE2Module" \
        -sEXPORTED_FUNCTIONS='["_pcre2_compile_8","_pcre2_match_8","_pcre2_code_free_8","_pcre2_match_data_create_from_pattern_8","_pcre2_match_data_free_8","_pcre2_get_ovector_pointer_8","_pcre2_pattern_info_8","_pcre2_substitute_8","_pcre2_get_error_message_8","_pcre2_wasm_compile","_pcre2_wasm_match","_pcre2_wasm_match_data_create","_pcre2_wasm_get_ovector","_pcre2_wasm_substitute","_pcre2_wasm_pattern_info","_pcre2_wasm_get_error_message","_pcre2_wasm_code_free","_pcre2_wasm_match_data_free","_pcre2_wasm_version","_pcre2_wasm_unicode_version","_pcre2_wasm_jit_available","_pcre2_wasm_simple_match","_pcre2_wasm_simd_find_char_8","_pcre2_wasm_simd_find_newline_8","_pcre2_wasm_simd_substring_search_8","_pcre2_wasm_simd_boyer_moore_search","_pcre2_wasm_simd_memchr","_pcre2_wasm_simd_memcmp","_pcre2_wasm_simd_supported","_malloc","_free"]' \
        -sEXPORTED_RUNTIME_METHODS='["cwrap","ccall","UTF8ToString","getValue","setValue","HEAPU8","HEAP8","HEAP32","HEAPU32"]' \
        -sALLOW_MEMORY_GROWTH=1 \
        -sASSERTIONS=0 \
        -sNO_EXIT_RUNTIME=1 \
        -o pcre2-release.js

    # Also build fallback version for compatibility (less optimized, no SIMD)
    emcc ${PCRE2_SOURCES} ${PCRE2_WASM_MAIN} ${PCRE2_WASM_FALLBACK} \
        -I../src \
        -I.. \
        -DPCRE2_CODE_UNIT_WIDTH=8 \
        -DHAVE_CONFIG_H \
        -DPCRE2_STATIC \
        -DSUPPORT_UNICODE=1 \
        -DSUPPORT_UTF=1 \
        -DSUPPORT_UCP=1 \
        -O2 \
        -sWASM=1 \
        -sMODULARIZE=1 \
        -sEXPORT_NAME="PCRE2Module" \
        -sEXPORTED_FUNCTIONS='["_pcre2_compile_8","_pcre2_match_8","_pcre2_code_free_8","_pcre2_match_data_create_from_pattern_8","_pcre2_match_data_free_8","_pcre2_get_ovector_pointer_8","_pcre2_pattern_info_8","_pcre2_substitute_8","_pcre2_get_error_message_8","_malloc","_free"]' \
        -sEXPORTED_RUNTIME_METHODS='["cwrap","ccall","UTF8ToString","getValue","setValue","HEAPU8","HEAP8","HEAP32","HEAPU32"]' \
        -sALLOW_MEMORY_GROWTH=1 \
        -sASSERTIONS=1 \
        -o pcre2-fallback.js

    log_success "MAIN_MODULE release build completed: $(pwd)/pcre2-release.js (optimized default)"
    log_success "MAIN_MODULE fallback build completed: $(pwd)/pcre2-fallback.js (compatibility)"
    cd ..
}

# Copy builds to install directory
copy_builds_to_install() {
    log_info "Copying builds to install directory..."

    mkdir -p "${INSTALL_PREFIX}/wasm"

    # Copy SIDE_MODULE
    if [ -f "${BUILD_DIR}-side/pcre2-side.wasm" ]; then
        cp "${BUILD_DIR}-side/pcre2-side.wasm" "${INSTALL_PREFIX}/wasm/"
        log_success "SIDE_MODULE copied to ${INSTALL_PREFIX}/wasm/pcre2-side.wasm"
    fi

    # Copy MAIN_MODULE builds
    if [ -f "${BUILD_DIR}-main-release/pcre2-release.js" ]; then
        cp "${BUILD_DIR}-main-release/pcre2-release.js" "${INSTALL_PREFIX}/wasm/"
        cp "${BUILD_DIR}-main-release/pcre2-release.wasm" "${INSTALL_PREFIX}/wasm/"
        log_success "MAIN_MODULE release copied to ${INSTALL_PREFIX}/wasm/"
    fi

    if [ -f "${BUILD_DIR}-main-release/pcre2-fallback.js" ]; then
        cp "${BUILD_DIR}-main-release/pcre2-fallback.js" "${INSTALL_PREFIX}/wasm/"
        cp "${BUILD_DIR}-main-release/pcre2-fallback.wasm" "${INSTALL_PREFIX}/wasm/"
        log_success "MAIN_MODULE fallback copied to ${INSTALL_PREFIX}/wasm/"
    fi
}

# Clean build directories
clean_builds() {
    log_info "Cleaning build directories..."
    rm -rf "${BUILD_DIR}-side" "${BUILD_DIR}-main-release" "${INSTALL_PREFIX}"
    log_success "Build directories cleaned"
}

# Print build statistics
print_build_stats() {
    log_info "Build Statistics:"
    echo "=================================="

    if [ -d "${INSTALL_PREFIX}/wasm" ]; then
        for file in "${INSTALL_PREFIX}/wasm"/*; do
            if [ -f "$file" ]; then
                size=$(wc -c < "$file")
                filename=$(basename "$file")
                echo "$filename: $(numfmt --to=iec-i --suffix=B $size)"
            fi
        done
    fi
}

# Main execution
main() {
    log_info "PCRE2.wasm Dual Build System"
    log_info "============================="

    check_emscripten

    case "$VARIANT" in
        "side")
            build_pcre2_side_module
            copy_builds_to_install
            ;;
        "main")
            build_pcre2_main_module
            copy_builds_to_install
            ;;
        "all")
            build_pcre2_side_module
            build_pcre2_main_module
            copy_builds_to_install
            ;;
        "clean")
            clean_builds
            exit 0
            ;;
        *)
            log_error "Invalid variant: $VARIANT"
            echo "Usage: $0 [side|main|all|clean]"
            echo ""
            echo "  side  - Build SIDE_MODULE for dynamic loading"
            echo "  main  - Build MAIN_MODULE for testing"
            echo "  all   - Build both variants (default)"
            echo "  clean - Clean build directories"
            exit 1
            ;;
    esac

    print_build_stats

    log_success "Build completed successfully!"
    echo ""
    log_info "Output files:"
    echo "  SIDE_MODULE: ${INSTALL_PREFIX}/wasm/pcre2-side.wasm"
    echo "  MAIN_MODULE: ${INSTALL_PREFIX}/wasm/pcre2-release.js (optimized default)"
    echo "  FALLBACK:    ${INSTALL_PREFIX}/wasm/pcre2-fallback.js (compatibility)"
}

# Execute main function
main "$@"