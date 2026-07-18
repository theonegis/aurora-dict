#!/usr/bin/env bash
# Build a pinned llama.cpp server for Aurora Dict's offline-AI installer.
# The result is intentionally not committed: Tauri picks it up via
# src-tauri/tauri.offline.conf.json as an external sidecar binary.

set -euo pipefail

target="${1:-}"
case "$target" in
  universal-apple-darwin|aarch64-apple-darwin|x86_64-apple-darwin|x86_64-pc-windows-msvc|aarch64-pc-windows-msvc|x86_64-unknown-linux-gnu) ;;
  *)
    echo "Usage: $0 {universal-apple-darwin|aarch64-apple-darwin|x86_64-apple-darwin|x86_64-pc-windows-msvc|aarch64-pc-windows-msvc|x86_64-unknown-linux-gnu}" >&2
    exit 2
    ;;
esac

root_dir="$(cd "$(dirname "$0")/.." && pwd)"
cache_dir="${TMPDIR:-/tmp}/aurora-dict-llama.cpp"
source_dir="$cache_dir/source"
build_dir="$cache_dir/build-$target"
output_dir="$root_dir/src-tauri/binaries"

command -v cmake >/dev/null 2>&1 || { echo "cmake is required" >&2; exit 2; }
command -v git >/dev/null 2>&1 || { echo "git is required" >&2; exit 2; }

mkdir -p "$cache_dir" "$output_dir"
if [[ ! -d "$source_dir/.git" ]]; then
  git clone --depth 1 --branch b5401 https://github.com/ggml-org/llama.cpp.git "$source_dir"
fi

cmake_args=( -S "$source_dir" -B "$build_dir" -DCMAKE_BUILD_TYPE=Release )
case "$target" in
  universal-apple-darwin)
    cmake_args+=( -DCMAKE_OSX_ARCHITECTURES=x86_64\;arm64 -DGGML_METAL=ON )
    output_name="llama-server-universal-apple-darwin"
    ;;
  aarch64-apple-darwin)
    cmake_args+=( -DCMAKE_OSX_ARCHITECTURES=arm64 -DGGML_METAL=ON )
    output_name="llama-server-aarch64-apple-darwin"
    ;;
  x86_64-apple-darwin)
    cmake_args+=( -DCMAKE_OSX_ARCHITECTURES=x86_64 -DGGML_METAL=ON )
    output_name="llama-server-x86_64-apple-darwin"
    ;;
  x86_64-pc-windows-msvc)
    output_name="llama-server-x86_64-pc-windows-msvc.exe"
    ;;
  aarch64-pc-windows-msvc)
    output_name="llama-server-aarch64-pc-windows-msvc.exe"
    ;;
  x86_64-unknown-linux-gnu)
    output_name="llama-server-x86_64-unknown-linux-gnu"
    ;;
esac

cmake "${cmake_args[@]}"
cmake --build "$build_dir" --config Release --target llama-server --parallel

binary="$build_dir/bin/llama-server"
if [[ "$target" == *-pc-windows-msvc ]]; then
  binary="$build_dir/bin/Release/llama-server.exe"
  [[ -f "$binary" ]] || binary="$build_dir/bin/llama-server.exe"
fi
[[ -f "$binary" ]] || { echo "llama-server was not produced at $binary" >&2; exit 1; }
cp "$binary" "$output_dir/$output_name"
chmod +x "$output_dir/$output_name" 2>/dev/null || true
echo "Prepared $output_dir/$output_name"
