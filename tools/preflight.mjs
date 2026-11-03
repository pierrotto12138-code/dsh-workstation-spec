#!/usr/bin/env node
// Preflight checks for a DSH plugin bundle. Zero dependencies, no network.
// Mirrors the "dsh-plugin" ecosystem checklist:
//   bundle manifest, patch identity, entry/resources, discovery metadata,
//   license, README, and accidental credential files.

import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const errors = []
const warnings = []

const rel = (p) => path.relative(root, p).split(path.sep).join('/')
const fail = (m) => errors.push(m)
const warn = (m) => warnings.push(m)
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8')
const exists = (p) => fs.existsSync(path.join(root, p))

let pkg
try {
  pkg = JSON.parse(read('package.json'))
} catch (error) {
  console.error(`FAIL package.json: ${error.message}`)
  process.exit(1)
}

// --- identity ---------------------------------------------------------------

if (typeof pkg.name !== 'string' || !/^[a-z0-9][a-z0-9._-]*$/.test(pkg.name)) {
  fail(`package name must be a lowercase npm name, got ${JSON.stringify(pkg.name)}`)
}
if (typeof pkg.version !== 'string' || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(pkg.version)) {
  fail(`version must be valid semver, got ${JSON.stringify(pkg.version)}`)
}
if (typeof pkg.description !== 'string' || !pkg.description.trim()) {
  fail('description is required (it is what the plugin manager shows)')
}

// --- bundle manifest --------------------------------------------------------

const patch = pkg.dsh?.bundle?.patch
if (typeof patch !== 'string' || !patch.trim()) {
  fail('dsh.bundle.patch is missing; the package would install as a plain dependency')
} else if (!exists(patch)) {
  fail(`dsh.bundle.patch points to a missing file: ${patch}`)
} else {
  const yml = read(patch)
  const idLine = new RegExp(`^\\s*-?\\s*id:\\s*${escapeRe(pkg.name)}\\s*$`, 'm')
  const nameLine = new RegExp(`^\\s*-?\\s*name:\\s*['"]?${escapeRe(pkg.name)}['"]?\\s*$`, 'm')
  if (!idLine.test(yml)) fail(`${patch}: no row with id: ${pkg.name}`)
  if (!nameLine.test(yml)) fail(`${patch}: no row with name: ${pkg.name}`)
}

// --- entry and shipped files ------------------------------------------------

if (typeof pkg.main !== 'string' || !exists(pkg.main)) {
  fail(`main entry is missing: ${pkg.main ?? '(none)'}`)
} else {
  try {
    execFileSync(process.execPath, ['--check', path.join(root, pkg.main)], { stdio: 'pipe' })
  } catch (error) {
    fail(`syntax error in ${pkg.main}: ${String(error.stderr || error.message).trim()}`)
  }
}

for (const entry of Array.isArray(pkg.files) ? pkg.files : []) {
  if (!exists(entry)) fail(`files entry does not exist: ${entry}`)
}

// --- discovery and docs -----------------------------------------------------

if (!Array.isArray(pkg.keywords) || !pkg.keywords.includes('dsh-plugin')) {
  warn('keywords should include "dsh-plugin" so the package is discoverable')
}
if (!exists('README.md')) fail('README.md is required (what/install/uninstall/example)')
if (!exists('LICENSE')) fail('LICENSE file is missing')
if (pkg.license !== 'MIT' && !pkg.license) fail('license field is missing')

const repo = pkg.repository?.url ?? pkg.repository
if (typeof repo !== 'string' || !/github\.com[:/]/.test(repo)) {
  warn('repository should point at the public GitHub repository')
}

// --- resources the tools read at runtime -----------------------------------

if (!exists('assets/spec.md')) fail('assets/spec.md is missing')
for (const file of ['manifest.json', 'station.js', 'station.css', 'background.js']) {
  if (!exists(`assets/starter/${file}`)) fail(`assets/starter/${file} is missing`)
}

// --- no secrets, no giant blobs -------------------------------------------

const CREDENTIAL = /(^|\/)(\.env(\..*)?|\.npmrc|\.netrc|id_(rsa|dsa|ecdsa|ed25519)|.*\.(pem|p12|pfx|key))$/i
const SKIP = new Set(['.git', 'node_modules'])
const MAX_BYTES = 5 * 1024 * 1024

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walk(full)
      continue
    }
    const r = rel(full)
    if (CREDENTIAL.test(r)) fail(`possible credential file: ${r}`)
    if (r.startsWith('lib/') && /\.[cm]?js$/.test(entry.name)) {
      const source = fs.readFileSync(full, 'utf8')
      for (const match of source.matchAll(/(?:from\s*|import\s*\(\s*)['"](@deepseek-ai\/[^'"]+)['"]/g)) {
        fail(`${r} imports host package ${match[1]}; installed plugins cannot resolve @deepseek-ai/*`)
      }
    }
    const size = fs.statSync(full).size
    if (size > MAX_BYTES) warn(`large file (${(size / 1024 / 1024).toFixed(1)} MiB): ${r}`)
  }
}
walk(root)

// --- report ----------------------------------------------------------------

for (const message of warnings) console.log(`WARN  ${message}`)
for (const message of errors) console.log(`FAIL  ${message}`)

if (errors.length) {
  console.log(`\n${errors.length} error(s), ${warnings.length} warning(s)`)
  process.exit(1)
}
console.log(`OK    ${pkg.name}@${pkg.version} — ${warnings.length} warning(s)`)

function escapeRe(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
