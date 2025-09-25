#!/usr/bin/env python3
import os
import sys
import shutil

def main():
    # Try to resolve install dir
    prefix = os.environ.get('MESON_INSTALL_DESTDIR_PREFIX') or (sys.argv[1] if len(sys.argv) > 1 else None)
    if not prefix:
        # Fallback to current working directory if nothing provided
        prefix = os.getcwd()

    wasm_dir = os.path.join(prefix, 'wasm')
    if not os.path.isdir(wasm_dir):
        # Nothing to do
        return 0

    # Normalize SIDE artifact name to pcre2-side.wasm
    candidates = [
        os.path.join(wasm_dir, 'pcre2-side.wasm'),
        os.path.join(wasm_dir, 'libpcre2-side.wasm'),
        os.path.join(wasm_dir, 'libpcre2-side.so'),
        os.path.join(wasm_dir, 'libpcre2_side.wasm'),
        os.path.join(wasm_dir, 'libpcre2_side.so'),
    ]

    target = os.path.join(wasm_dir, 'pcre2-side.wasm')
    if os.path.exists(target):
        # Already correct
        return 0

    for c in candidates:
        if os.path.exists(c):
            shutil.copy2(c, target)
            # Keep original for debugging/publish flexibility
            break

    # Nothing else to normalize for MAIN; canonical names are pcre2-main.*

    return 0

if __name__ == '__main__':
    raise SystemExit(main())
