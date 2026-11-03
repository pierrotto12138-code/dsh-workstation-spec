# dsh-workstation-spec

把「**Chrome 工作站 UI 规范**」做成 DSH 工具：给某个网站做「工作站版」扩展时，先读规范，再抄起步模板，不用从零写外壳。

这是一个 **Host-only 的 DSH 组合包（bundle）**，不注入任何网页、不改 DSH 界面，只注册两个模型工具。

| 工具 | 作用 |
| --- | --- |
| `workbench_spec` | 读规范：不带参数返回目录，带 `section` 返回对应章节 |
| `workbench_starter` | 取起步模板中的单个文件：`manifest` / `station` / `css` / `background` |

规范覆盖：三条铁律、形态选择、布局系统、Design tokens、组件规范、交互、可访问性、工程结构、站点适配流程、评审规则清单、验收清单，以及一章**默认风格**（同一作者复用到每个站点时的固定选择：白底单蓝、扁平侧栏、单一主视图、等宽控件、显式禁用态、按对象重置的进度条）。

## 安装

需要 DSH `0.2.1-rc.5` 或同系列 `0.2.x`，Node.js `>= 20`。

### 从 GitHub 安装

```bash
dsh plugin --profile <profile> add github:pierrotto12138-code/dsh-workstation-spec
```

> 把 `<profile>` 换成你的 profile 名（例如 `web`、`desktop`、`tui`）。
> 本包没有 `prepare` / `build` 脚本，不需要在 `pnpm-workspace.yaml` 里加 `allowBuilds`。

生产环境建议钉住 commit，避免后续推送改变实际安装的内容：

```bash
dsh plugin --profile <profile> add github:pierrotto12138-code/dsh-workstation-spec#<commit-sha>
```

### 从本地目录或压缩包安装

```bash
git clone https://github.com/pierrotto12138-code/dsh-workstation-spec.git
dsh plugin --profile <profile> add ./dsh-workstation-spec

# 或者
npm pack
dsh plugin --profile <profile> add ./dsh-workstation-spec-0.2.0.tgz
```

安装后重启 DSH（新增 bundle 只在启动时读取；启用 HMR 的 profile 会等待重组）。

### 验证安装

```bash
dsh --profile <profile> --dump-config | grep -A2 dsh-workstation-spec
```

应能看到一层：

```yaml
# == dsh-workstation-spec
- id: dsh-workstation-spec
  name: dsh-workstation-spec
```

## 使用

### `workbench_spec`

```text
workbench_spec()
workbench_spec(section="layout")
```

不带 `section` 时返回章节目录。常用别名：

| `section` | 章节 |
| --- | --- |
| `intro` / `rules` | 三条铁律 |
| `form` | 形态选择 |
| `layout` | 布局系统 |
| `tokens` / `token` | Design tokens |
| `components` | 组件规范 |
| `interaction` | 交互 |
| `a11y` / `accessibility` | 可访问性 |
| `structure` / `engineering` | 工程结构 |
| `adaptation` / `site` | 站点适配流程 |
| `checklist` | 规则清单 |
| `acceptance` | 验收清单 |
| `style` / `defaults` / `preference` | 默认风格 |

### `workbench_starter`

```text
workbench_starter(file="manifest")
workbench_starter(file="station")
workbench_starter(file="css")
workbench_starter(file="background")
```

返回起步模板对应文件的完整内容，直接复制到新站点目录即可。

### 典型用法

在 DSH 里说：

> 给 example.com 做个工作站扩展，能批量处理列表里的条目。

模型会先调 `workbench_spec(section="form")` 选形态，再调 `workbench_starter(file="manifest")` 等取模板，按规范实现。

## 卸载

```bash
dsh plugin --profile <profile> remove dsh-workstation-spec
```

卸载会同时移除 profile 依赖和 `dsh.profile.bundles` 中的条目。

## 兼容性

| 项 | 值 |
| --- | --- |
| DSH | `>=0.2.1-rc.5 <0.3.0`（实测 `0.2.1-rc.5`） |
| Node.js | `>= 20` |
| 运行时依赖 | 无；仅声明 `@deepseek-ai/dsh-tools` 为可选 peer，由宿主提供 |
| 构建步骤 | 无 |

## 仓库结构

```text
.
├── package.json           # dsh.bundle 清单
├── cordis.patch.yml       # 插入 dsh-workstation-spec 行
├── lib/index.js           # 注册 workbench_spec / workbench_starter
├── assets/
│   ├── spec.md            # 完整规范
│   └── starter/           # 起步模板（manifest / station.js / station.css / background.js）
├── tools/preflight.mjs    # 发布前自检（零依赖）
└── .github/workflows/     # CI：语法、清单、打包自检
```

## 开发与自检

本仓库零运行时依赖、零构建，改 `lib/index.js` 或 `assets/` 后直接验证：

```bash
node --check lib/index.js
node tools/preflight.mjs
npm pack --dry-run
```

`preflight.mjs` 检查：包名与 semver、`dsh.bundle.patch` 存在、patch 中的 id/name 与包名一致、入口与资源存在、`keywords` 含 `dsh-plugin`、README/LICENSE 存在、无凭据类文件。

## 相关

- 规范正文：[`assets/spec.md`](assets/spec.md)
- 起步模板：[`assets/starter/`](assets/starter/)
- DSH 官方插件打包文档：[Package and install a plugin](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/develop/basic/publish.md)

## 许可

MIT © 2026 Pierrot
