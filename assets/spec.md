# Chrome 工作站 UI 规范

> 给「单站点增强」类扩展用的设计与工程规范。目标不是做一个万能增强器，而是让**某个你天天用的网站**变成一张操作台。
>
> 版本 0.1 · 适用于 Manifest V3 · 配套起步模板见 [`starter/`](starter/)

---

## 0. 三条铁律

| # | 铁律 | 违反后的后果 |
| --- | --- | --- |
| 1 | **一个站点一个扩展** | `matches` 写 `*://*/*` 的"万能增强"必然在 90% 的站点上出问题，且商店审核必被问用途 |
| 2 | **不遮挡内容** | 侧栏盖住正文、按钮压住站点导航，用户第一次用就会卸载 |
| 3 | **随时能退出** | 没有关闭入口 / 禁用开关的注入式 UI，等于劫持 |

工作站扩展的价值是「把重复操作变短」，不是「给网页换皮」。任何改动都要能回答：**它替用户省了哪几步？**

---

## 1. 形态选择

先决定 UI 长在哪，再谈视觉。

| 形态 | 适合 | 不适合 | 关键约束 |
| --- | --- | --- | --- |
| **注入式左栏**（本规范默认） | 单站点、需要边看边操作、要挤开页面 | 跨站点通用工具 | 每标签一份实例；要处理 fixed 元素 |
| **页内工具条 / 浮动按钮** | 操作点集中在一处（下载、收藏） | 多步骤工作流 | 别挡住站点主按钮 |
| **右侧抽屉** | 详情、预览、批量确认 | 需要长期常驻 | 打开时焦点要进抽屉 |
| **Side Panel** | 跨标签页的工具（队列、便签） | 需要改页面布局 | 左右由用户在 Chrome 设置里决定，扩展不能设；打不开页面 DOM |
| **Popup** | 一次性动作（导出、复制） | 任何"边看边做" | 点外面就关 |

**判断法**：如果用户的操作对象是「当前这一页的内容」，选注入式左栏；如果是「跨页面积累的东西」，选 Side Panel；如果只是「点一下就好」，选 Popup 或页内按钮。

---

## 2. 布局系统

### 2.1 尺寸

| 项 | 值 | 说明 |
| --- | --- | --- |
| 侧栏宽度 | **300px**（240–420 可拖拽） | 小于 240 放不下中文标签；大于 420 挤压正文 |
| 折叠宽度 | **64px** | 只留图标，图标 16px，点击区 34px |
| 主视图内容宽 | **≤ 760px** 居中 | 再宽阅读动线断掉 |
| 顶栏高度 | **52px**（外壳）/ **56px**（品牌区） | |
| 行高 | 列表 34px / 输入 32px / 按钮 30px | 桌面密度，不做移动端 44px |
| 间距刻度 | 4 / 8 / 12 / 16 / 24 / 32 | 只用这六档 |
| 圆角 | 8（控件）/ 10（列表项）/ 12（卡片）/ 14（窗口） | |

### 2.2 让位策略

注入式左栏必须让网页内容后退，否则就是遮挡。

```css
html.wb-host {
  margin-left: var(--wb-offset, 0px) !important;
  transition: margin-left 180ms ease;
}
```

- 用 `<html>` 的 `margin-left`，不要给 `body` 加 `padding`——大量站点在 `body` 上用 `min-height:100vh` + 背景，padding 会露底。
- 关闭让位时把变量设为 `0px`，不要移除 class（避免过渡抖动）。
- **`position: fixed` 元素不会跟随 margin 移动**，站点顶栏可能被压住。应对顺序：
  1. 侧栏用不透明背景，压住也不脏；
  2. 站点有固定顶栏时，给它 `margin-left` 或 `left` 偏移（仅限选择器稳定时）；
  3. 仍不行就把形态降级为「右侧抽屉」。
- 站点 `html { overflow: hidden }` 时，让位可能裁切内容——提供「页面让位」开关。

### 2.3 层级（z-index）

| 层 | 值 | 说明 |
| --- | --- | --- |
| 外壳 | `2147483000` | 低于 `2147483647`，给站点的极端弹层留空间 |
| 外壳内浮层（toast） | 外壳 + 10 | |
| 模态 | 外壳 + 100 | |

整层外壳用一个 `position: fixed; inset: 0; pointer-events: none` 的容器，只有实际控件 `pointer-events: auto`，避免整页点击被吞。

### 2.4 隔离

- 所有 UI 放进 **Shadow DOM**，`attachShadow({ mode: 'open' })`。
- 样式用 `<link>` 指向扩展内 CSS（`web_accessible_resources`），不要往页面 `<style>` 里灌规则。
- 唯一允许触碰站点的样式，是上面那条让位规则。
- 外壳挂到 `document.documentElement`，不要挂 `body`（SPA 会重渲染 body）。

---

## 3. Design tokens

深色不是把颜色反过来，而是重新定一套。

| Token | Light | Dark | 用途 |
| --- | --- | --- | --- |
| `--bg` | `#FFFFFF` | `#15171C` | 主视图背景 |
| `--bg-sub` | `#F7F8FA` | `#101216` | 侧栏、卡片底 |
| `--bg-hover` | `#EEF0F4` | `#22252D` | hover / 选中底 |
| `--fg` | `#1C2029` | `#E8EBF2` | 主文字 |
| `--fg-mut` | `#6A7384` | `#98A2B5` | 次要文字（对比度 ≥ 4.5:1） |
| `--border` | `#E6E9EF` | `#272B35` | 分割线、描边 |
| `--accent` | `#4D6BFE` | `#7C93FF` | 主色 |
| `--accent-soft` | `rgba(77,107,254,.09)` | `rgba(124,147,255,.14)` | 选中底 |
| `--danger` | `#D93A3F` | `#FF6B6B` | 破坏性操作 |

字体与字号：

| 角色 | 字号 / 字重 | 备注 |
| --- | --- | --- |
| 页面标题 | 20 / 650 | 主视图 H1 |
| 小节标题 | 12 / 600，大写间距 | `letter-spacing:.04em` |
| 正文 | 13 / 400，行高 1.6 | |
| 控件文字 | 12.5 / 400 | |
| 辅助文字 | 11.5 / 400 | 时间、来源 |
| 数字强调 | 15 / 650 | 统计卡 |

阴影两级：`0 1px 2px rgba(15,23,42,.06)`（贴地）、`0 12px 32px rgba(15,23,42,.12)`（浮起）。

主题必须设置 `color-scheme`，否则滚动条、滑块、输入框仍是浅色：

```css
.wb-root[data-theme="light"] { color-scheme: light; }
.wb-root[data-theme="dark"]  { color-scheme: dark; }
```

---

## 4. 组件规范

### 4.1 侧栏项（Rail item）

- 高 34，圆角 8，内边距 9，图标 16 + 间距 9 + 标签 13px。
- 状态：默认 / hover（`--bg-hover`）/ 选中（`--accent-soft` + `--accent`）/ 禁用（40% 不透明）。
- 选中用 `aria-selected="true"`，不要只靠颜色。
- 计数徽标右对齐，`11px`，底色 `--bg-hover`，圆角 999。

### 4.2 按钮

| 类型 | 规格 | 用途 |
| --- | --- | --- |
| Primary | 高 30，主色底白字 | 每个视图**最多一个** |
| Secondary | 高 30，描边 + 透明底 | 常规动作 |
| Danger | 描边红字 | 删除、隐藏 |
| Icon | 28×28，圆角 7 | 顶栏、列表行尾 |

- 文案是动词：「采集选中文字」而不是「采集」；「在此站点隐藏」而不是「隐藏」。
- 图标按钮必须有 `title` + `aria-label`。

### 4.3 卡片与统计

- 卡片：`--bg-sub` 底 + 1px 描边 + 12 圆角 + 16 内边距。
- 统计卡：三等分网格，数字 15px 在上、标签 10.5px 在下。
- 卡片之间用 10–12px 间距，不要用分割线堆叠。

### 4.4 输入

- 搜索框高 32，左内边距 30 留给图标，聚焦时 `border-color: accent` + `0 0 0 3px accent-soft`。
- 不要用 placeholder 当标签；标签独立成行。
- 滑块配数值回显（「侧栏宽度 300px」）。

### 4.5 空状态

必须有：图标（44 圆角容器）、一句结论、一句下一步。

> ❌「暂无数据」
> ✅「采集箱是空的 —— 选中网页文字后点右上角 +，或使用右键菜单。」

### 4.6 Toast

- 底部居中，深色胶囊，12px 字，1.8s 自动消失。
- 用 `role="status"`，不要抢焦点。
- 只用于「已复制」「已采集」这类确认，不用于错误详情。

---

## 5. 交互

| 行为 | 规范 |
| --- | --- |
| 开合 | `Alt+B` 或扩展图标；同一快捷键只做一件事 |
| 关闭主视图 | `Esc`，或左上角返回 |
| 拖拽宽度 | 指针事件 + `setPointerCapture`；松手才写 storage |
| 双击拖拽条 | 复位 300 |
| 折叠 | 只留图标，`title` 补全称 |
| 焦点 | 可见焦点环 `2px accent` + `2px offset`；不用 `outline:none` |
| 动效 | 120–180ms，`ease`；`prefers-reduced-motion` 下关闭 |
| 长任务 | 300ms 内不显示 loading；超过则骨架或进度 |

**不要做的事**：整页键盘劫持、自动弹开侧栏、滚动时自动隐藏、每次导航都重置视图。

---

## 6. 可访问性

- 正文对比度 ≥ 4.5:1；次要文字不低于 4.5:1（`#6A7384` 对 `#FFF` ≈ 4.9）。
- 所有交互元素可 Tab 到达，顺序与视觉一致。
- 图标按钮有文本替代；图片有 `alt`。
- 折叠状态用 `aria-expanded`；开关用 `aria-pressed` 或原生 checkbox。
- 动效尊重 `prefers-reduced-motion`。
- 侧栏是常驻区域，不做焦点陷阱；只有模态才做。

---

## 7. 工程结构

### 7.1 一个站点一个包

```json
{
  "matches": ["https://example.com/*", "https://www.example.com/*"],
  "run_at": "document_idle"
}
```

- 不写 `<all_urls>`。确需多域名，逐个列。
- 权限只留 `storage`；读页面用 content script，不需要 `scripting`。
- 需要跨站请求时才加 `host_permissions`，并在 README 写理由。

### 7.2 站点差异集中在一个文件

```js
// site.config.js —— 换站点只改这里
export default {
  host: "example.com",
  title: "示例站点",
  accent: "#4D6BFE",
  features: { collect: true, outline: true },
  selectors: { list: ".item", title: ".item-title" },
};
```

选择器、开关、文案都放这里。站点改版时只修一个文件。

### 7.3 状态

- 键名带站点前缀：`wb.<host>.settings` / `wb.<host>.notes`。
- 只存用户数据，不存 DOM 引用；页面刷新后重新计算。
- service worker 里不放模块级变量（会被回收）。

### 7.4 消息

能不用就不用。必须用时只定义三种：`toggle` / `collect` / `open`，全部单向，不回包。

### 7.5 无构建优先

单人维护的小工具，改一行 CSS 等 3 秒编译不值。用原生 JS + 一个 `h()` 辅助函数足够；确实需要打包时再引入。

---

## 8. 站点适配流程

每接一个新站点，按顺序做：

1. **探测**：打开目标页，DevTools 检查 `html` 的 `overflow`、`body` 宽度、是否有 `position:fixed` 顶栏、是否 SPA。
2. **定形态**：按第 1 节表格选左栏 / 工具条 / 抽屉。
3. **定让位**：能 `margin-left` 就 `margin-left`；不行改抽屉。
4. **找挂载点**：`document.documentElement`；只在顶层 frame 注入（`window.top !== window` 直接 return）。
5. **收选择器**：只把**只读**选择器放进 `site.config.js`，写清用途和失效兜底。
6. **处理登录态**：不要读取/复制 cookie；需要调用站点接口时，用页面自身的 fetch + 同源请求，并接受随时失效。
7. **限流**：不要全页 `MutationObserver`；必须观察时限定容器 + `subtree`，回调里做 100ms 防抖。
8. **回归**：站点改版后先跑 `npm run check`，再看空状态是否还成立。

---

## 9. 规则清单（评审用）

**P0 必须**

1. `matches` 限定到具体站点，禁止 `<all_urls>`。
2. 顶层 frame 才注入。
3. UI 全部在 Shadow DOM 内。
4. 页面让位可关闭。
5. 扩展随时可关：`Esc` 关主视图，设置里有「在此站点隐藏」。
6. 不读取、不复制站点 cookie。
7. 不 `eval`、不加载远程脚本。
8. service worker 不存状态。
9. 权限最小化，新增权限写理由。
10. 图标要么真实存在，要么不写。

**P1 应该**

11. 侧栏宽度可拖拽，双击复位。
12. 折叠后只留图标并有 `title`。
13. 键盘可达，焦点环可见。
14. 空状态给出下一步。
15. 破坏性操作有二次确认或明确文案。
16. 深色模式设置 `color-scheme`。
17. 动效 ≤ 180ms，尊重 `prefers-reduced-motion`。
18. 列表项选中不只靠颜色（`aria-selected`）。
19. 图标按钮有 `aria-label`。
20. 站点选择器集中在 `site.config.js`。

**P2 建议**

21. 侧栏内容宽 ≤ 760px 居中。
22. 数字用千分位，时间用相对时间。
23. Toast 只用于成功确认。
24. 拖拽时禁用文本选择。
25. 提供「恢复默认设置」。
26. 主视图关闭后回到网页，不保留离屏 DOM。
27. 站点顶栏 fixed 时优先降级形态，而不是硬改站点样式。
28. 首屏不闪：CSS 先于 JS 加载，或接受 100ms 内无样式。
29. 文案中文、代码注释英文。
30. 每次发布更新版本号与 README。

---

## 10. 验收清单

- [ ] 打开目标站点，侧栏出现且正文完整可见
- [ ] 拖动宽度、折叠、`Alt+B` 开合、`Esc` 关闭都正常
- [ ] 刷新页面后设置保留
- [ ] 深色/浅色切换后滚动条、输入框同色
- [ ] 空采集箱有下一步提示
- [ ] 键盘 Tab 能走完所有控件
- [ ] 关闭「页面让位」后侧栏浮在内容上，但可读
- [ ] 在 `chrome://extensions` 无报错，service worker 无异常
- [ ] `npm run check` 通过

---

## 参考

- [Chrome 扩展：内容脚本](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts)
- [chrome.sidePanel](https://developer.chrome.com/docs/extensions/reference/api/sidePanel)
- [扩展 UI 设计](https://developer.chrome.com/docs/extensions/develop/ui)
- [Chrome Web Store 质量指南](https://developer.chrome.com/docs/webstore/program-policies/quality-guidelines)
