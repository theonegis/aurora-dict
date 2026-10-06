import { mkdtempSync, readFileSync, writeFileSync, copyFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const root = fileURLToPath(new URL("../", import.meta.url));
const temporary = mkdtempSync(join(tmpdir(), "aurora-macos-icon-"));
const scale = 0.91;
const inset = (1024 * (1 - scale)) / 2;

try {
  const source = readFileSync(join(root, "src-tauri/icons/aurora.svg"), "utf8");
  // Keep the shared artwork intact. On macOS 15 its 940/1024 footprint is too
  // large beside other Dock icons. Scale around the centre to ~84% coverage.
  // Render every ICNS resolution from this vector to keep 1x and 2x consistent.
  const macosSvg = source
    .replace(/(<svg\b[^>]*>)/, `$1\n  <g transform="translate(${inset} ${inset}) scale(${scale})">`)
    .replace(/<\/svg>\s*$/, "  </g>\n</svg>\n");
  const input = join(temporary, "macos.svg");
  writeFileSync(input, macosSvg);
  execFileSync(process.execPath, [
    join(root, "node_modules/@tauri-apps/cli/tauri.js"),
    "icon", input, "--output", join(temporary, "icons"),
  ], { cwd: root, stdio: "inherit" });
  copyFileSync(join(temporary, "icons/icon.icns"), join(root, "src-tauri/icons/icon-macos-legacy.icns"));
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
