#!/usr/bin/env bash
# Generate an AUR-ready aurora-dict-bin package from the x64 Debian asset of a GitHub Release.
# Publishing remains intentionally manual: it requires the maintainer's AUR SSH credentials.

set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  scripts/generate-aur-package.sh --repo OWNER/REPOSITORY --version VERSION [options]

Options:
  --asset NAME   Release asset name. Defaults to the name emitted by release.yml.
  --output DIR   Destination directory. Default: aur/aurora-dict-bin
  -h, --help     Show this help.

Example:
  scripts/generate-aur-package.sh --repo example/aurora-dict --version 0.1.0
EOF
}

repository=""
version=""
asset_name=""
output_dir="aur/aurora-dict-bin"

while (($#)); do
  case "$1" in
    --repo) repository="${2:-}"; shift 2 ;;
    --version) version="${2:-}"; shift 2 ;;
    --asset) asset_name="${2:-}"; shift 2 ;;
    --output) output_dir="${2:-}"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage >&2; exit 2 ;;
  esac
done

[[ "$repository" =~ ^[[:alnum:]_.-]+/[[:alnum:]_.-]+$ ]] || {
  echo "--repo must be in OWNER/REPOSITORY form." >&2
  exit 2
}
[[ "$version" =~ ^[0-9]+([.][0-9]+){1,3}([+._-][[:alnum:]._-]+)?$ ]] || {
  echo "--version must be a package version such as 0.1.0." >&2
  exit 2
}

asset_name="${asset_name:-aurora-dict_${version}_linux_amd64_deb.deb}"
release_url="https://github.com/${repository}/releases/download/v${version}/${asset_name}"
package_file="${output_dir}/${asset_name}"

mkdir -p "$output_dir"
trap 'rm -f "$package_file"' EXIT

echo "Downloading $release_url"
curl --fail --location --retry 3 --output "$package_file" "$release_url"
if command -v sha256sum >/dev/null 2>&1; then
  checksum="$(sha256sum "$package_file" | awk '{print $1}')"
else
  checksum="$(shasum -a 256 "$package_file" | awk '{print $1}')"
fi

cat >"${output_dir}/PKGBUILD" <<EOF
# Maintainer: ${repository}
pkgname=aurora-dict-bin
pkgver=${version}
pkgrel=1
pkgdesc='A calm, fast Chinese-English desktop dictionary'
arch=('x86_64')
url='https://github.com/${repository}'
license=('custom')
depends=('gtk3' 'libappindicator-gtk3' 'webkit2gtk-4.1')
provides=('aurora-dict')
conflicts=('aurora-dict')
_deb_asset='${asset_name}'
source=("\${_deb_asset}::${release_url}")
sha256sums=('${checksum}')

package() {
  local deb_contents="\$srcdir/deb-contents"
  local data_archive

  rm -rf "\$deb_contents"
  mkdir -p "\$deb_contents"
  bsdtar -xf "\$srcdir/\${_deb_asset}" -C "\$deb_contents"
  data_archive=\$(find "\$deb_contents" -maxdepth 1 -type f -name 'data.tar.*' -print -quit)
  [[ -n "\$data_archive" ]] || {
    echo 'Could not find data.tar.* inside the Debian package.' >&2
    return 1
  }
  bsdtar -xf "\$data_archive" -C "\$pkgdir"
}
EOF

rm -f "$package_file"
trap - EXIT

if command -v makepkg >/dev/null 2>&1; then
  (
    cd "$output_dir"
    makepkg --printsrcinfo > .SRCINFO
  )
else
  echo "makepkg was not found; on Arch Linux run:"
  echo "  (cd $output_dir && makepkg --printsrcinfo > .SRCINFO)"
fi

echo "Generated $output_dir/PKGBUILD"
