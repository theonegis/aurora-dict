# 发布到 Arch User Repository

Aurora Dict 的 AUR 包名是 `aurora-dict-bin`。它使用 GitHub Release 中的 Linux x64 deb，因此符合 AUR 对预编译软件包使用 `-bin` 后缀的要求。发布后，Arch Linux 用户可以运行：

```bash
paru -S aurora-dict-bin
```

## 首次创建 AUR 包

先注册 AUR 账号并添加 SSH 公钥，然后创建并克隆空包仓库：

```bash
git clone ssh://aur@aur.archlinux.org/aurora-dict-bin.git
```

必须先确认对应版本的 GitHub Release 已成功上传 Linux x64 deb。例如，版本 `0.1.2` 对应的资产名是：

```text
aurora-dict_0.1.2_linux_amd64_deb.deb
```

在 Aurora Dict 源码仓库中生成 `PKGBUILD` 和 `.SRCINFO`，将输出目录指向刚才克隆的 AUR 仓库：

```bash
scripts/generate-aur-package.sh \
  --repo theonegis/aurora-dict \
  --version 0.1.2 \
  --output /path/to/aurora-dict-bin
```

## 本地验证

进入 AUR 仓库，构建并安装：

```bash
cd /path/to/aurora-dict-bin
makepkg -si
```

如已安装 `namcap`，还应检查源文件和生成的 Arch 包：

```bash
namcap PKGBUILD
namcap aurora-dict-bin-*.pkg.tar.zst
```

确认应用可以启动：

```bash
aurora-dict
```

## 推送到 AUR

AUR 仓库只提交打包元数据，不提交 deb 或生成的 `*.pkg.tar.zst`：

```bash
git add PKGBUILD .SRCINFO .gitignore AURORA-DICT-LICENSE.txt
git commit -m "Initial release: 0.1.2"
git push origin master
```

后续版本重复运行生成脚本，重新验证，然后提交更新后的 `PKGBUILD` 与 `.SRCINFO`。AUR 要求每次修改 `pkgver`、`pkgrel` 或其他元数据时同步重新生成 `.SRCINFO`。

## 许可证注意事项

Aurora Dict 使用 PolyForm Noncommercial 1.0.0，ECDICT 词库使用 MIT。生成的 `PKGBUILD` 会声明：

```bash
license=('PolyForm-Noncommercial-1.0.0' 'MIT')
```

打包时，Aurora Dict 与 ECDICT 的许可证都会安装到 `/usr/share/licenses/aurora-dict-bin/`。商业使用 Aurora Dict 前仍须按照仓库中的商业授权说明取得书面许可。
