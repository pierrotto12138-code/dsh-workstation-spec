import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineTool } from '@deepseek-ai/dsh-tools'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ASSETS = path.join(HERE, '..', 'assets')
const SPEC = fs.readFileSync(path.join(ASSETS, 'spec.md'), 'utf8')

const ALIASES = {
  intro: '三条铁律',
  rules: '三条铁律',
  form: '形态选择',
  layout: '布局',
  token: 'tokens',
  tokens: 'tokens',
  component: '组件',
  components: '组件',
  interaction: '交互',
  a11y: '可访问性',
  accessibility: '可访问性',
  engineering: '工程结构',
  structure: '工程结构',
  adaptation: '站点适配流程',
  site: '站点适配流程',
  checklist: '规则清单',
  acceptance: '验收清单',
}

function sections() {
  const out = []
  const lines = SPEC.split(/\r?\n/)
  let current = null
  for (const line of lines) {
    const m = /^##\s+(.+?)\s*$/.exec(line)
    if (m) {
      if (current) out.push(current)
      current = { title: m[1], body: [] }
    } else if (current) {
      current.body.push(line)
    }
  }
  if (current) out.push(current)
  return out
}

function findSection(query) {
  const list = sections()
  const q = String(query || '').trim().toLowerCase()
  if (!q) return null
  const alias = ALIASES[q]
  const hit = list.find((s) => {
    const t = s.title.toLowerCase()
    return t === q || t.includes(q) || (alias && t.includes(alias.toLowerCase()))
  })
  return hit || null
}

const text = (value) => [{ type: 'text', text: value }]

export const name = 'dsh-workstation-spec'

export const inject = ['tools']

export function apply(ctx) {
  const disposers = []

  disposers.push(
    ctx.tools.register(
      defineTool({
        name: 'workbench_spec',
        description:
          'Read the Chrome workstation UI spec (per-site extension: left rail, page offset, design tokens, P0 rules). ' +
          'Call this before building or reviewing an extension that turns one website into a workstation. ' +
          'Without a section it returns the table of contents; with a section it returns that chapter.',
        parameters: {
          section: {
            type: 'string',
            description:
              'Chapter to read, e.g. "layout", "tokens", "components", "rules", "adaptation", "acceptance". Omit for the TOC.',
          },
        },
        output: {
          schema: { type: 'string' },
          render: (_args, value) => text(value),
        },
        execute: ({ section }) => {
          const list = sections()
          if (!section) {
            return [
              '# Chrome 工作站 UI 规范 v0.1',
              '',
              '章节（用 section 参数读取任意一章）：',
              ...list.map((s, i) => `${i + 1}. ${s.title}`),
              '',
              '起步模板：用 workbench_starter 工具取 manifest / station.js / station.css / background.js。',
            ].join('\n')
          }
          const hit = findSection(section)
          if (!hit) {
            return [
              `没有找到章节「${section}」。可用章节：`,
              ...list.map((s) => `- ${s.title}`),
            ].join('\n')
          }
          return `## ${hit.title}\n${hit.body.join('\n').trim()}`
        },
      })
    )
  )

  disposers.push(
    ctx.tools.register(
      defineTool({
        name: 'workbench_starter',
        description:
          'Return one file of the per-site Chrome extension starter (manifest.json, station.js, station.css, background.js). ' +
          'Use it to copy the exact scaffold instead of writing the shell from scratch.',
        parameters: {
          file: {
            type: 'string',
            required: true,
            description: 'One of: manifest, station, css, background',
          },
        },
        output: {
          schema: { type: 'string' },
          render: (_args, value) => text(value),
        },
        execute: ({ file }) => {
          const map = {
            manifest: 'manifest.json',
            'manifest.json': 'manifest.json',
            station: 'station.js',
            'station.js': 'station.js',
            css: 'station.css',
            'station.css': 'station.css',
            background: 'background.js',
            'background.js': 'background.js',
          }
          const name = map[String(file || '').toLowerCase()]
          if (!name) {
            return '未知文件。可用：manifest / station / css / background'
          }
          return fs.readFileSync(path.join(ASSETS, 'starter', name), 'utf8')
        },
      })
    )
  )

  return () => {
    for (const dispose of disposers.reverse()) dispose()
  }
}
