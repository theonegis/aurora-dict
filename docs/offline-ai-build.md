# 本地 AI 引擎构建

Aurora Dict 的安装包默认携带 `llama-server`。模型本身仍由用户在应用设置页按需下载，因此安装包只增加推理引擎，不会强制所有用户下载数百 MB 的模型文件。

发布工作流会为每个既有平台产物准备匹配的 sidecar，再执行正常的 Tauri 打包流程。

## 本地构建

APP 运行时只需要目标平台对应的、已经编译好的 `llama-server`，不需要携带 llama.cpp 源码。把独立运行的二进制放到 `src-tauri/binaries/` 后执行检查：

```bash
AURORA_LLAMA_SERVER_PREBUILT=/absolute/path/to/llama-server \
  bash scripts/prepare-llama-sidecar.sh aarch64-apple-darwin
```

如果文件已经位于 `src-tauri/binaries/llama-server-aarch64-apple-darwin`，则无需设置环境变量：

```bash
bash scripts/prepare-llama-sidecar.sh aarch64-apple-darwin
```

该操作只复制并验证预编译文件，不会下载源码。它会扫描 `libllama/libggml` 依赖，并在当前平台实际执行 `llama-server --version`；非独立二进制会直接拒绝进入安装包。

然后执行常规构建：

```bash
npm run tauri build -- --target aarch64-apple-darwin --bundles dmg
```

`prepare-llama-sidecar.sh` 的参数必须与 Tauri 实际构建目标一致：

- macOS Apple Silicon：`aarch64-apple-darwin`；
- macOS Intel：`x86_64-apple-darwin`；
- Windows x64：`x86_64-pc-windows-msvc`；
- Linux x64：`x86_64-unknown-linux-gnu`。

例如，在 Apple Silicon Mac 上省略 `--target` 时，Tauri 会构建 `aarch64-apple-darwin`，应先执行：

```bash
bash scripts/prepare-llama-sidecar.sh aarch64-apple-darwin
npm run tauri build -- --bundles dmg
```

`prepare-llama-sidecar.sh` 默认只接受预编译文件。维护者或 CI 确实需要从源码生成新二进制时，必须显式设置 `AURORA_BUILD_LLAMA_FROM_SOURCE=1`；本地已有源码还可以设置 `AURORA_LLAMA_CPP_SOURCE=/absolute/path/to/llama.cpp`，从而不访问网络。源码构建固定使用 llama.cpp `b5401`，使用干净 CMake 目录和 `BUILD_SHARED_LIBS=OFF`，生成后仍执行同样的依赖与运行检查。

脚本输出的二进制位于 `src-tauri/binaries/`，仅作为构建输入，不应提交到仓库。macOS 本地验证可以执行：

```bash
otool -L src-tauri/binaries/llama-server-aarch64-apple-darwin
src-tauri/binaries/llama-server-aarch64-apple-darwin --version
```

第一条命令不应列出 `libllama.dylib` 或 `libggml*.dylib`，第二条命令应能直接输出版本信息。

GitHub Actions 的常规发布工作流会自动构建并打包本地 AI 引擎。发布目标为 macOS ARM64 与 x64、Windows x64，以及 Linux x64 deb 与 rpm。`Build offline AI installers` 工作流保留相同平台的手动验证构建。
