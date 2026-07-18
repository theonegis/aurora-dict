# Aurora Dict

Aurora Dict 是一款为 Linux 用户而做、也同样适用于 macOS 与 Windows 的中英桌面词典。

许多 Linux 上可用的词典要么界面陈旧，要么必须依赖网页或复杂的导入流程。这个项目希望提供另一种体验：打开即可使用的离线词库、清晰可靠的中英查询，以及一个安静、精致、不打扰阅读的桌面界面。它使用 Tauri 2 构建，前端采用 React、TypeScript 与 Vite；在保持轻量的同时，将 iOS 的卡片层次与 Windows Mica 的半透明质感带到桌面端。

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

界面文案与本地 AI 默认提示词已从代码中分离：

- `config/locales.json`：简体中文和英文界面文案；两种语言使用相同的键名。
- `config/prompts.json`：词典查询和中英翻译的默认 System Prompt。前端默认值与 Rust 后端兜底值读取同一文件。

修改这些配置后需要重新构建应用。用户在设置中自行编辑并保存的提示词仍会优先于内置默认值。

## 许可证

自 v0.1.2 起，Aurora Dict 的代码采用 [PolyForm Noncommercial License 1.0.0](LICENSE)：允许许可证所定义的非商业使用，但传播代码或衍生作品时必须保留许可证和其中的 `Required Notice` 署名声明。商业使用必须事先取得版权所有者的书面授权，详情见 [商业授权说明](COMMERCIAL-LICENSE.md)。此前已经依照 GPL-3.0 发布的版本仍受其原许可证约束。

Aurora Dict 是源代码可用（source-available）软件，并非 OSI 定义的开源软件。

## 离线词库许可证

`src-tauri/resources/ecdict-sqlite-28.zip` 是随安装包分发的 ECDICT SQLite 资源。应用首次启动会将它解压到系统应用数据目录并建立全文索引。完整的 ECDICT 许可证位于 [src-tauri/resources/ECDICT-LICENSE.txt](src-tauri/resources/ECDICT-LICENSE.txt)。

## 打包与发布

```Shell
bash scripts/prepare-llama-sidecar.sh aarch64-apple-darwin
npm run tauri build
```

推送  Git tag（或手动运行 Actions）会触发 [发布工作流](.github/workflows/release.yml)，构建：

```Shell
git tag -f -a v0.x.x -m "Aurora Dict v0.x.x"
git push --force origin v0.x.x
```

- macOS ARM64 与 x64 `.dmg`；
- Windows x64 NSIS `.exe`；
- Linux x64 `.deb` 与 `.rpm`。

所有安装包默认包含 llama.cpp 本地推理引擎；Qwen 模型会由用户在设置页按需下载，因此不会增大初始安装包数百 MB。具体构建方式见 [本地 AI 引擎构建说明](docs/offline-ai-build.md)。

Arch Linux 用户包使用 `aurora-dict-bin`，AUR 发布与维护步骤见 [AUR 发布说明](docs/aur-publishing.md)。发布后可通过 `paru -S aurora-dict-bin` 安装。

工作流默认产生未签名的产物。

macOS下提示：“Aurora Dict”已损坏，无法打开。 你应该将它移到废纸篓，可在终端执行如下命令解决：

```Shell
xattr -rd com.apple.quarantine "/Applications/Aurora Dict.app"
```

## 支持作者

创作不易，如果您觉得该软件对您的工作学习有所帮助，请考虑打赏作者支持他继续完善该工具。您可以使用微信或支付宝扫码支持：

<p>
  <img src="src-tauri/resources/IMG_2816.JPG" alt="微信付款码" width="260">
  <img src="src-tauri/resources/IMG_2817.JPG" alt="支付宝付款码" width="260">
</p>

## 在线来源说明

有道内容会在 Rust 后端完成结构化提取；其免 Key 发音端点为：

```text
http://dict.youdao.com/dictvoice?type=0&audio=<word>  # 美式
http://dict.youdao.com/dictvoice?type=1&audio=<word>  # 英式
```

在线页面结构、访问策略或限流发生变化时，应用会明确显示错误，且不会影响本地查询。
