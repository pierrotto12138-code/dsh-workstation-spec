# Changelog

## 0.2.3

- 许可证改回 **MIT**，与 DSH 插件生态保持一致。

## 0.2.2

- 许可证从 MIT 改为 **0BSD**（BSD Zero Clause）：不要求署名，保留免责声明即可，任意使用/修改/再发布。
- README 与 `package.json` 的 license 字段同步更新。

## 0.2.1

- 修复「启用失败」：移除对 `@deepseek-ai/dsh-tools` 的 import。插件安装进 profile 后无法解析 `@deepseek-ai/*`，现在工具定义使用原始 JSON Schema，通过 `ctx.tools.register` 注册。
- 移除宿主 peer 声明，包恢复为完全零依赖。
- `tools/preflight.mjs` 增加守护：`lib/` 中出现 `@deepseek-ai/*` import 时直接失败。

## 0.2.0

- 新增「默认风格」章节（第 11 章）及 `style` / `defaults` / `preference` 别名。
- 规范正文与起步模板同步更新。

## 0.1.0

- 首个版本：`workbench_spec` 读规范，`workbench_starter` 取起步模板。
