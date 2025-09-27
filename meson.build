project(
  'pcre2.wasm', 'c',
  version: '10.44.0',
  meson_version: '>=1.3.0',
  default_options: ['c_std=c11']
)

simd_opt = get_option('simd')

incs = include_directories('.', 'src')

common_c_args = [
  '-DPCRE2_CODE_UNIT_WIDTH=8',
  '-DHAVE_CONFIG_H',
  '-DPCRE2_STATIC',
  '-DSUPPORT_UNICODE=1',
  '-DSUPPORT_UTF=1',
  '-DSUPPORT_UCP=1',
]

if simd_opt
  common_c_args += ['-msimd128', '-DPCRE2_WASM_SIMD=1']
endif

# Core PCRE2 sources
sources_core = files(
  'src/pcre2_auto_possess.c',
  'src/pcre2_chartables.c',
  'src/pcre2_chkdint.c',
  'src/pcre2_compile.c',
  'src/pcre2_compile_cgroup.c',
  'src/pcre2_compile_class.c',
  'src/pcre2_config.c',
  'src/pcre2_context.c',
  'src/pcre2_convert.c',
  'src/pcre2_dfa_match.c',
  'src/pcre2_error.c',
  'src/pcre2_extuni.c',
  'src/pcre2_find_bracket.c',
  'src/pcre2_maketables.c',
  'src/pcre2_match.c',
  'src/pcre2_match_data.c',
  'src/pcre2_match_next.c',
  'src/pcre2_newline.c',
  'src/pcre2_ord2utf.c',
  'src/pcre2_pattern_info.c',
  'src/pcre2_script_run.c',
  'src/pcre2_serialize.c',
  'src/pcre2_string_utils.c',
  'src/pcre2_study.c',
  'src/pcre2_substitute.c',
  'src/pcre2_substring.c',
  'src/pcre2_tables.c',
  'src/pcre2_ucd.c',
  'src/pcre2_valid_utf.c',
  'src/pcre2_xclass.c',
)

core = static_library(
  'pcre2core',
  sources_core,
  include_directories: incs,
  c_args: common_c_args,
)

if get_option('main_module')
  # MAIN module (JS + WASM) for demos/tests/npm/jsr
  main_sources = files('src/pcre2_wasm_module.c')
  # SIMD helpers
  if simd_opt
    main_sources += files('src/pcre2_wasm_simd.c', 'src/pcre2_simd_metrics.c')
  endif

  exports_path = join_paths(meson.project_source_root(), get_option('exports'))

  main_link_args = [
    '-sWASM=1',
    '-sMODULARIZE=1',
    '-sEXPORT_ES6=1',
    '-sEXPORT_NAME=PCRE2Module',
    '-sALLOW_MEMORY_GROWTH=1',
    '-sENVIRONMENT=web,webview,worker',
    '-sNO_FILESYSTEM=1',
    '-sEXPORTED_RUNTIME_METHODS=["cwrap","ccall","UTF8ToString","getValue","setValue","HEAPU8","HEAP8","HEAP32","HEAPU32"]',
    '-sEXPORTED_FUNCTIONS=@' + exports_path,
    '-O3',
    '-flto',
  ]

  main = executable(
    'pcre2-main',
    main_sources,
    link_with: core,
    include_directories: incs,
    install: true,
    install_dir: get_option('bindir'),
    c_args: common_c_args,
    link_args: main_link_args,
    override_options: ['b_lto=true']
  )
endif

if get_option('side_module')
  # SIDE module (.wasm) for dlopen by parent MAIN_MODULE
  side_sources = files('src/pcre2_wasm_side.c')
  # SIMD helpers
  if simd_opt
    side_sources += files('src/pcre2_wasm_simd.c', 'src/pcre2_simd_metrics.c')
  endif

  side_link_args = [
    '-sSIDE_MODULE=2',
    '-fPIC',
    '-sEXPORTED_FUNCTIONS=["_pcre2_wasm_init","_pcre2_wasm_version","_pcre2_wasm_unicode_version","_pcre2_wasm_cleanup","_pcre2_compile_8","_pcre2_match_8","_pcre2_substitute_8","_pcre2_code_free_8","_pcre2_match_data_create_8","_pcre2_match_data_free_8","_pcre2_get_ovector_pointer_8"]',
    '-O3',
    '-flto',
  ]

  side = shared_module(
    'pcre2-side',
    side_sources,
    link_with: core,
    include_directories: incs,
    install: true,
    install_dir: get_option('libdir'),
    name_prefix: '',
    c_args: common_c_args,
    link_args: side_link_args,
    override_options: ['b_lto=true']
  )
endif

# Optional post-install normalization (names/locations)
meson.add_install_script('scripts/postinstall.py', get_option('prefix'))
