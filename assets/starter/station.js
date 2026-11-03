/* 工作站起步模板 —— 一个站点一个扩展。
   换站点：改下面的 SITE 配置 + manifest.json 的 matches。 */
(function () {
  "use strict";

  /* ===================== 站点配置（只改这里） ===================== */
  const SITE = {
    label: "示例站点",
    itemSelector: ".item",
    titleSelector: ".item-title",
  };
  const DEFAULT_WIDTH = 300;
  /* ============================================================== */

  const EXT = typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.id;
  const CSS_HREF = EXT ? chrome.runtime.getURL("station.css") : "station.css";
  const KEY = "station.settings";

  if (window.top !== window) return;
  if (document.getElementById("station-host")) return;

  /* ---------- 存储：扩展里用 chrome.storage，预览页退回 localStorage ---------- */
  const store = {
    async get(key, fallback) {
      if (EXT && chrome.storage && chrome.storage.local) {
        return new Promise((resolve) =>
          chrome.storage.local.get([key], (res) => resolve(key in res ? res[key] : fallback))
        );
      }
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch {
        return fallback;
      }
    },
    async set(key, value) {
      if (EXT && chrome.storage && chrome.storage.local) {
        return new Promise((resolve) => chrome.storage.local.set({ [key]: value }, resolve));
      }
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch {
        /* ignore */
      }
    },
  };

  /* ---------- 小工具 ---------- */
  function el(tag, props, ...kids) {
    const node = document.createElement(tag);
    if (props) {
      for (const [k, v] of Object.entries(props)) {
        if (v == null || v === false) continue;
        if (k === "class") node.className = v;
        else if (k === "text") node.textContent = v;
        else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
        else node.setAttribute(k, v === true ? "" : String(v));
      }
    }
    for (const kid of kids.flat()) {
      if (kid == null || kid === false) continue;
      node.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    }
    return node;
  }

  function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
  }

  /* ---------- 状态 ---------- */
  const settings = { width: DEFAULT_WIDTH, collapsed: false, offset: true, theme: "auto" };
  let open = false;
  let view = "overview";
  let itemsLit = false;

  /* ---------- 页面让位 ---------- */
  const pageStyle = document.createElement("style");
  pageStyle.textContent =
    "html.station-on{margin-left:var(--station-w,0px)!important;transition:margin-left .18s ease}" +
    "@media (prefers-reduced-motion:reduce){html.station-on{transition:none}}";
  (document.head || document.documentElement).appendChild(pageStyle);

  /* ---------- Shadow DOM 外壳 ---------- */
  const hostEl = document.createElement("div");
  hostEl.id = "station-host";
  const shadow = hostEl.attachShadow({ mode: "open" });
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = CSS_HREF;
  shadow.appendChild(link);

  const root = el("div", { class: "st-root" });
  const nav = el("nav", { class: "st-nav" });
  const stageBody = el("div", { class: "st-body" });
  const stageTitle = el("div", { class: "st-title" });
  const themeBtn = el("button", { class: "st-act", title: "切换主题", onclick: cycleTheme }, "◐");

  const stage = el(
    "section",
    { class: "st-stage" },
    el(
      "header",
      { class: "st-head" },
      el("button", { class: "st-icon", title: "返回网页", onclick: () => openView(view, true) }, "←"),
      stageTitle
    ),
    stageBody
  );

  const rail = el(
    "aside",
    { class: "st-rail" },
    el(
      "div",
      { class: "st-brand" },
      el("div", { class: "st-dot" }),
      el("div", { class: "st-brand-text" }, el("b", { text: SITE.label }), el("span", { text: "工作站" }))
    ),
    nav,
    el("div", { class: "st-foot" }, el("span", { text: location.host }), el("kbd", { text: "Alt+B" })),
    el("div", { class: "st-resize", title: "拖动调整宽度" })
  );

  const actions = el(
    "div",
    { class: "st-actions" },
    el("button", { class: "st-act", title: "打开主视图", onclick: () => openView(view) }, "▤"),
    themeBtn,
    el("button", { class: "st-act", title: "折叠侧栏", onclick: toggleCollapse }, "‹")
  );

  root.append(rail, stage, actions);
  shadow.appendChild(root);
  document.documentElement.appendChild(hostEl);

  /* ---------- 渲染 ---------- */
  function theme() {
    if (settings.theme !== "auto") return settings.theme;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function apply() {
    const w = settings.collapsed ? 64 : settings.width;
    root.dataset.theme = theme();
    root.dataset.collapsed = String(settings.collapsed);
    root.dataset.open = String(open);
    root.style.setProperty("--st-w", w + "px");
    document.documentElement.style.setProperty("--station-w", settings.offset ? w + "px" : "0px");
    document.documentElement.classList.toggle("station-on", settings.offset);
  }

  function renderNav() {
    const rows = [
      ["overview", "概览"],
      ["actions", "操作"],
      ["settings", "设置"],
    ];
    nav.replaceChildren(
      ...rows.map(([id, label]) =>
        el(
          "button",
          {
            class: "st-item",
            "aria-selected": String(open && view === id),
            onclick: () => openView(id),
          },
          el("span", { class: "st-item-dot" }),
          label
        )
      )
    );
  }

  function pageItems() {
    return Array.from(document.querySelectorAll(SITE.itemSelector));
  }

  function renderStage() {
    const titles = {
      overview: "概览",
      actions: "操作",
      settings: "设置",
    };
    stageTitle.textContent = titles[view];

    if (view === "overview") {
      const items = pageItems();
      stageBody.replaceChildren(
        el(
          "div",
          { class: "st-card" },
          el("div", { class: "st-kicker", text: location.host }),
          el("h1", { class: "st-h1", text: document.title || "（无标题）" }),
          el("div", { class: "st-url", text: location.href }),
          el(
            "div",
            { class: "st-stats" },
            el("div", { class: "st-stat" }, el("b", { text: String(items.length) }), el("span", { text: "条目" })),
            el("div", { class: "st-stat" }, el("b", { text: String(document.querySelectorAll("h1,h2").length) }), el("span", { text: "标题" }))
          )
        ),
        el("div", { class: "st-sub", text: "前 3 条" }),
        ...items.slice(0, 3).map((item) => {
          const t = item.querySelector(SITE.titleSelector);
          return el("div", { class: "st-row" }, el("span", { text: (t ? t.textContent : item.textContent).trim().slice(0, 80) }));
        })
      );
    }

    if (view === "actions") {
      stageBody.replaceChildren(
        el("div", { class: "st-sub", text: "站内操作" }),
        el("button", { class: "st-btn st-btn-primary", onclick: toggleLit }, itemsLit ? "取消高亮条目" : "高亮全部条目"),
        el("button", { class: "st-btn", onclick: copyTitles }, "复制全部标题"),
        el("p", { class: "st-hint", text: "把高频操作放这里：批量勾选、一键导出、状态切换。每个操作只做一件事。" })
      );
    }

    if (view === "settings") {
      stageBody.replaceChildren(
        el("div", { class: "st-sub", text: "外观" }),
        el(
          "label",
          { class: "st-switch" },
          el("span", { text: "页面让位" }),
          el("input", {
            type: "checkbox",
            checked: settings.offset,
            onchange: (e) => {
              settings.offset = e.target.checked;
              apply();
              save();
            },
          })
        ),
        el("div", { class: "st-sub", text: "侧栏宽度 " + settings.width + "px" }),
        el("input", {
          class: "st-range",
          type: "range",
          min: "240",
          max: "420",
          step: "10",
          value: String(settings.width),
          oninput: (e) => {
            settings.width = Number(e.target.value);
            apply();
          },
          onchange: save,
        }),
        el("button", { class: "st-btn", onclick: reset }, "恢复默认")
      );
    }
  }

  /* ---------- 动作 ---------- */
  function openView(id, close) {
    if (close) {
      open = false;
    } else {
      view = id;
      open = true;
    }
    apply();
    renderNav();
    if (open) renderStage();
  }

  function toggleCollapse() {
    settings.collapsed = !settings.collapsed;
    apply();
    save();
  }

  function cycleTheme() {
    const order = ["auto", "light", "dark"];
    settings.theme = order[(order.indexOf(settings.theme) + 1) % order.length];
    apply();
    save();
    if (open && view === "settings") renderStage();
  }

  async function save() {
    await store.set(KEY, { ...settings });
  }

  async function reset() {
    Object.assign(settings, { width: DEFAULT_WIDTH, collapsed: false, offset: true, theme: "auto" });
    apply();
    await save();
    renderStage();
  }

  function toggleLit() {
    itemsLit = !itemsLit;
    for (const item of pageItems()) item.style.outline = itemsLit ? "2px solid #4d6bfe" : "";
    renderStage();
  }

  async function copyTitles() {
    const text = pageItems()
      .map((item) => {
        const t = item.querySelector(SITE.titleSelector);
        return (t ? t.textContent : item.textContent).trim();
      })
      .filter(Boolean)
      .join("\n");
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* clipboard blocked */
    }
  }

  /* ---------- 拖拽 ---------- */
  const resizer = rail.querySelector(".st-resize");
  let dragging = false;
  resizer.addEventListener("pointerdown", (e) => {
    if (settings.collapsed) return;
    dragging = true;
    resizer.setPointerCapture(e.pointerId);
  });
  resizer.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    settings.width = clamp(Math.round(e.clientX), 240, 420);
    apply();
  });
  resizer.addEventListener("pointerup", () => {
    if (!dragging) return;
    dragging = false;
    save();
  });

  /* ---------- 快捷键 / 消息 ---------- */
  window.addEventListener(
    "keydown",
    (e) => {
      if (e.altKey && (e.key === "b" || e.key === "B")) {
        e.preventDefault();
        if (open) openView(view, true);
        else openView(view);
      }
      if (e.key === "Escape" && open) openView(view, true);
    },
    true
  );

  if (EXT && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg && msg.type === "toggle") {
        if (open) openView(view, true);
        else openView(view);
      }
    });
  }

  /* ---------- 启动 ---------- */
  (async () => {
    Object.assign(settings, await store.get(KEY, {}));
    apply();
    renderNav();
  })();
})();
