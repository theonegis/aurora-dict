# Aurora Dict

Aurora Dict 是一款为 Linux 用户而做、也同样适用于 macOS 与 Windows 的中英桌面词典。

许多 Linux 上可用的词典要么界面陈旧，要么必须依赖网页或复杂的导入流程。这个项目希望提供另一种体验：打开即可使用的离线词库、清晰可靠的中英查询，以及一个安静、精致、不打扰阅读的桌面界面。它使用 Tauri 2 构建，在保持轻量的同时，将 iOS 的卡片层次与 Windows Mica 的半透明质感带到桌面端。

![Aurora Dict 本地词典查询界面](docs/images/aurora-dict.png)

## 特性

- Windows、macOS 与 Linux 的原生桌面窗口，自定义标题栏和统一的窗体圆角。
- 安装包内置 ECDICT SQLite 离线词库；首次启动自动准备完成，无需用户导入。
- 中文查英文、英文查中文、英文拼写建议，以及英式/美式音标与发音。
- 四个可配置来源：本地 ECDICT、有道词典、[Free Dictionary API](https://dictionaryapi.dev/) 与 Vocabulary.com。
- 每次查询会并行获取并缓存启用来源的结果；默认保存最近 100 个单词，可在设置中调整。
- 可调中英文界面、主题色、字体、缩放、透明度与材质模糊度。

在线来源不需要 API Key。网络不可用时，本地词典仍可独立工作。

## 开发

前提：Node.js 20+、Rust（MSRV 1.77.2），以及目标平台所需的 [Tauri 依赖](https://v2.tauri.app/start/prerequisites/)。

```bash
npm install
npm run tauri dev
```

仅预览前端：

```bash
npm run dev
```

浏览器预览没有 Tauri 后端，因此会以 `serendipity` 的静态体验数据演示本地卡片；真正的 SQLite 查询、系统窗口控制、字体枚举和在线请求均在桌面应用中运行。

## 离线词库与许可证

`src-tauri/resources/ecdict-sqlite-28.zip` 是随安装包分发的 ECDICT SQLite 资源。应用首次启动会将它解压到系统应用数据目录并建立全文索引。完整的 ECDICT 许可证位于 [src-tauri/resources/ECDICT-LICENSE.txt](src-tauri/resources/ECDICT-LICENSE.txt)。

## 打包与发布

```Shell
npm run tauri build
```

推送 `v0.1.0` 形式的 Git tag（或手动运行 Actions）会触发 [发布工作流](.github/workflows/release.yml)，构建：

- macOS ARM64 与 Universal `.dmg`；
- Windows x64 与 ARM64 NSIS `.exe`；
- Linux x64 `.deb` 与 `.rpm`。

工作流默认产生未签名的产物。

macOS下提示：“Aurora Dict”已损坏，无法打开。 你应该将它移到废纸篓，可在终端执行如下命令解决：

```Shell
xattr -rd com.apple.quarantine "/Applications/Aurora Dict.app"
```

## 在线来源说明

有道内容会在 Rust 后端完成结构化提取；其免 Key 发音端点为：

```text
http://dict.youdao.com/dictvoice?type=0&audio=<word>  # 美式
http://dict.youdao.com/dictvoice?type=1&audio=<word>  # 英式
```

在线页面结构、访问策略或限流发生变化时，应用会明确显示错误，且不会影响本地查询。
