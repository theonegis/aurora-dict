# 本地 AI 引擎构建

Aurora Dict 的安装包默认携带 `llama-server`。模型本身仍由用户在应用设置页按需下载，因此安装包只增加推理引擎，不会强制所有用户下载数百 MB 的模型文件。

发布工作流会为每个既有平台产物准备匹配的 sidecar，再执行正常的 Tauri 打包流程。

## 本地构建

先构建与目标平台匹配的 llama.cpp `llama-server`：

```bash
bash scripts/prepare-llama-sidecar.sh universal-apple-darwin
```

然后执行常规构建：

```bash
npm run tauri build -- --target universal-apple-darwin --bundles dmg
```

`prepare-llama-sidecar.sh` 的参数必须与 Tauri 实际构建目标一致：

- macOS Universal 安装包：`universal-apple-darwin`；
- 当前 Apple Silicon 本机调试或打包：`aarch64-apple-darwin`；
- 当前 Intel Mac 本机调试或打包：`x86_64-apple-darwin`；
- Windows x64：`x86_64-pc-windows-msvc`；
- Linux x64：`x86_64-unknown-linux-gnu`。

例如，在 Apple Silicon Mac 上省略 `--target` 时，Tauri 会构建 `aarch64-apple-darwin`，应先执行：

```bash
bash scripts/prepare-llama-sidecar.sh aarch64-apple-darwin
npm run tauri build -- --bundles dmg
```

`prepare-llama-sidecar.sh` 固定使用 llama.cpp `b5401`，这是 Qwen 官方建议用于完整 Qwen3 支持的最低版本。脚本输出的二进制位于 `src-tauri/binaries/`，仅作为构建输入，不应提交到仓库。

GitHub Actions 的常规发布工作流会自动构建并打包本地 AI 引擎。`Build offline AI installers` 工作流保留为 macOS Universal、Windows x64 与 Linux x64 deb 的手动验证构建。
