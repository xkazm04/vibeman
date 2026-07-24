#!/usr/bin/env node
/**
 * coverage.mjs — deterministic scan-memory helper for the /vibeman skill.
 *
 * The vault schema and the rules this script encodes live in ../SCAN-MEMORY.md.
 * Read-only with respect to the ledgers: this script computes and prints, the skill
 * writes the markdown. The one exception is `init`, which scaffolds empty seed files.
 *
 * Commands
 *   init    --vault V --project P --name N [--contexts F]
 *   plan    --vault V --project P --contexts F --lens L [--budget N] [--json]
 *   digest  --vault V --project P --contexts F --slug S [--lens L]
 *   status  --vault V [--json]
 *   verify  --vault V --contexts F
 *
 * No dependencies. Node >= 18.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

// ─────────────────────────────────────────────────────────────── args

const argv = process.argv.slice(2);
const cmd = argv[0];
const flag = (name, def = undefined) => {
  const i = argv.indexOf(`--${name}`);
  if (i === -1) return def;
  const v = argv[i + 1];
  return v === undefined || v.startsWith('--') ? true : v;
};
const has = (name) => argv.includes(`--${name}`);

const die = (msg) => {
  console.error(`coverage.mjs: ${msg}`);
  process.exit(1);
};

// ─────────────────────────────────────────────────────────────── utils

const slugify = (s) =>
  String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

const norm = (p) => String(p).replace(/\\/g, '/').replace(/^\.\//, '');

const readIf = (f) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null);

const ensureDir = (d) => fs.mkdirSync(d, { recursive: true });

const today = () => new Date().toISOString().slice(0, 10);

function git(projectPath, args) {
  try {
    return execFileSync('git', ['-C', projectPath, ...args], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────── contexts loading

/** Accepts context-map.json, GET /api/contexts payloads, or a bare array. */
function loadContexts(file) {
  if (!file) die('--contexts is required (path to context-map.json or an /api/contexts dump)');
  const raw = readIf(file);
  if (raw === null) die(`contexts file not found: ${file}`);
  let j;
  try {
    j = JSON.parse(raw);
  } catch (e) {
    die(`contexts file is not valid JSON: ${e.message}`);
  }

  const out = [];
  const push = (name, group, files, description) => {
    if (!name) return;
    out.push({
      name,
      slug: slugify(name),
      group: group || '(ungrouped)',
      files: (files || []).map(norm),
      description: description || '',
    });
  };

  if (Array.isArray(j?.groups)) {
    for (const g of j.groups)
      for (const c of g.contexts || [])
        push(c.name, g.name, c.filePaths || c.file_paths, c.description);
  } else {
    const arr = Array.isArray(j) ? j : j.data || j.contexts || [];
    for (const c of arr) {
      let files = c.filePaths ?? c.file_paths ?? [];
      if (typeof files === 'string') {
        try {
          files = JSON.parse(files);
        } catch {
          files = files.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
        }
      }
      push(c.name, c.groupName || c.group_name || c.group, files, c.description);
    }
  }
  if (!out.length) die('no contexts found in the supplied file');
  return out;
}

// ──────────────────────────────────────────────────── ledger parsing

const SECTIONS = {
  fixed: /^##\s+Fixed\b/i,
  rejected: /^##\s+Rejected\b/i,
  open: /^##\s+Open\s*\/\s*deferred\b/i,
  clean: /^##\s+Known\s+clean\b/i,
  notes: /^##\s+Notes\b/i,
};

/** Minimal frontmatter reader: flat `key: value` plus a `scans:` list of inline maps. */
function parseFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const fm = { scans: [] };
  if (!m) return fm;
  let inScans = false;
  for (const line of m[1].split(/\r?\n/)) {
    if (/^scans:\s*$/.test(line)) {
      inScans = true;
      continue;
    }
    if (inScans) {
      const entry = line.match(/^\s*-\s*\{(.*)\}\s*$/);
      if (entry) {
        const o = {};
        for (const pair of entry[1].split(',')) {
          const kv = pair.split(':');
          if (kv.length < 2) continue;
          const k = kv[0].trim();
          const v = kv.slice(1).join(':').trim().replace(/^["']|["']$/g, '');
          o[k] = /^\d+$/.test(v) ? Number(v) : v;
        }
        if (o.date) fm.scans.push(o);
        continue;
      }
      if (/^\S/.test(line)) inScans = false;
      else continue;
    }
    const kv = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (kv) fm[kv[1]] = /^\d+$/.test(kv[2].trim()) ? Number(kv[2].trim()) : kv[2].trim();
  }
  fm.scans.sort((a, b) => String(b.date).localeCompare(String(a.date)));
  return fm;
}

/**
 * Ledger bullet:
 *   - `#03` **crit** · bug · Title — seen 2026-06-25 · fixed 2026-06-26 `9a1c4e2`
 * A following `  > …` line is the rejection reason / annotation.
 */
function parseLedger(vault, slug) {
  const file = path.join(vault, 'Scan', 'contexts', `${slug}.md`);
  const text = readIf(file);
  if (text === null) return null;

  const fm = parseFrontmatter(text);
  const rows = { fixed: [], rejected: [], open: [], clean: [] };
  let notes = '';
  let section = null;

  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const head = Object.entries(SECTIONS).find(([, re]) => re.test(line));
    if (head) {
      section = head[0];
      continue;
    }
    if (/^##\s/.test(line)) {
      section = null;
      continue;
    }
    if (!section) continue;
    if (section === 'notes') {
      notes += line + '\n';
      continue;
    }

    const bullet = line.match(/^-\s+(.*)$/);
    if (!bullet) continue;
    const body = bullet[1];

    if (section === 'clean') {
      rows.clean.push({ text: body.trim() });
      continue;
    }

    const idm = body.match(/^`#(\d+)`\s*(.*)$/);
    if (!idm) continue;
    const rest = idm[2];
    const sev = (rest.match(/^\*\*([a-z]+)\*\*/i) || [])[1] || 'med';
    const parts = rest.replace(/^\*\*[a-z]+\*\*\s*·?\s*/i, '').split('·');
    const lens = parts.length > 1 ? parts[0].trim() : '';
    const tail = (parts.length > 1 ? parts.slice(1).join('·') : parts[0]).trim();
    const title = tail.split(/\s+—\s+/)[0].trim();
    const sha = (rest.match(/`([0-9a-f]{7,40})`\s*$/) || [])[1] || '';

    let reason = '';
    for (let k = i + 1; k < lines.length && /^\s+>\s?/.test(lines[k]); k++) {
      reason += (reason ? ' ' : '') + lines[k].replace(/^\s+>\s?/, '').trim();
    }
    rows[section].push({ id: Number(idm[1]), sev, lens, title, sha, reason });
  }

  return { file, fm, rows, notes: notes.trim() };
}

function parsePatterns(vault) {
  const text = readIf(path.join(vault, 'Scan', 'patterns.md'));
  if (!text) return [];
  const out = [];
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\|\s*(P?\d+)\s*\|\s*([^|]+?)\s*\|/i);
    if (m && !/^-+$/.test(m[2])) out.push({ id: m[1].startsWith('P') ? m[1] : `P${m[1]}`, name: m[2] });
  }
  return out;
}

// ───────────────────────────────────────────────────────── churn

/** One `git diff --name-only sha..HEAD` per distinct SHA, intersected in JS. */
function churnIndex(projectPath, shas) {
  const idx = new Map();
  for (const sha of new Set(shas.filter(Boolean))) {
    const out = git(projectPath, ['diff', '--name-only', `${sha}..HEAD`]);
    idx.set(sha, out === null ? null : new Set(out.split(/\r?\n/).map(norm).filter(Boolean)));
  }
  return idx;
}

const daysBetween = (isoA, isoB) =>
  Math.max(0, Math.round((Date.parse(isoB) - Date.parse(isoA)) / 86400000));

/** Files touched in the last `days` — the churn signal for never-scanned contexts. */
function recentlyTouched(projectPath, days = 90) {
  const out = git(projectPath, ['log', `--since=${days}.days`, '--name-only', '--pretty=format:']);
  if (out === null) return null;
  return new Set(out.split(/\r?\n/).map(norm).filter(Boolean));
}

/** Per SCAN-MEMORY.md → "Staleness and context selection". */
function score(ctx, ledger, changed, recentChanged, lens) {
  const scans = ledger?.fm.scans || [];
  const sameLens = scans.filter((s) => String(s.lens || '').includes(lens));
  const last = sameLens[0] || null;

  const lensGap = last ? 0 : 1;
  const days = last ? daysBetween(last.date, today()) : 9999;
  const ageTerm = last ? Math.min(days / 60, 1) : 1;

  // Churn: since the last same-lens scan when we have one, else recent-window churn.
  // Without a tiebreaker every never-scanned context scores identically and the plan
  // degenerates to context-map order, which carries no information.
  // Additive smoothing (+CHURN_K) keeps a fully-churned 3-file context from outranking a
  // heavily-churned 18-file one — a small denominator is a noisy ratio, not a strong signal.
  const CHURN_K = 4;
  const churnCount = last && changed !== null ? changed : recentChanged;
  const churnTerm =
    ctx.files.length && churnCount !== null
      ? Math.min(churnCount / (ctx.files.length + CHURN_K), 1)
      : 1;

  const open = ledger?.rows.open.length || 0;
  const openTerm = Math.min(open / 5, 1);
  const reachTerm = Math.min(ctx.files.length / 25, 1);

  const recent = scans.slice(0, 2);
  const surfaced = recent.reduce((a, s) => a + (Number(s.surfaced) || 0), 0);
  const actioned = recent.reduce((a, s) => a + (Number(s.actioned) || 0), 0);
  const decay = recent.length >= 2 && surfaced >= 4 && actioned / surfaced < 0.15 ? 1 : 0;

  const total =
    1.0 * lensGap + 0.6 * ageTerm + 1.2 * churnTerm + 0.4 * openTerm + 0.3 * reachTerm - 0.8 * decay;

  return {
    total: Math.round(total * 100) / 100,
    lensGap,
    days: last ? days : null,
    lastDate: last?.date || null,
    lastSha: last?.sha || scans[0]?.sha || null,
    lastAnyLens: scans[0]?.lens || null,
    changed,
    recentChanged,
    open,
    fixed: ledger?.rows.fixed.length || 0,
    rejected: ledger?.rows.rejected.length || 0,
    decay,
    yield: surfaced ? Math.round((actioned / surfaced) * 100) : null,
  };
}

function buildRows(vault, projectPath, contexts, lens, windowDays = 90) {
  const ledgers = new Map(contexts.map((c) => [c.slug, parseLedger(vault, c.slug)]));
  const shas = [...ledgers.values()].map((l) => l?.fm.scans?.[0]?.sha).filter(Boolean);
  const churn = churnIndex(projectPath, shas);
  const recent = recentlyTouched(projectPath, windowDays);

  return contexts.map((c) => {
    const l = ledgers.get(c.slug);
    const sha = l?.fm.scans?.[0]?.sha || null;
    const set = sha ? churn.get(sha) : null;
    const changed = !sha || !set ? null : c.files.filter((f) => set.has(f)).length;
    const recentChanged = recent ? c.files.filter((f) => recent.has(f)).length : null;
    return { ctx: c, ledger: l, windowDays, ...score(c, l, changed, recentChanged, lens) };
  });
}

// ─────────────────────────────────────────────────────────── commands

function cmdInit() {
  const vault = flag('vault') || die('--vault required');
  const name = flag('name') || path.basename(vault);
  const root = path.join(vault, 'Scan');
  ensureDir(path.join(root, 'contexts'));
  ensureDir(path.join(root, 'lenses'));
  ensureDir(path.join(root, 'runs'));

  const seed = (rel, body) => {
    const f = path.join(root, rel);
    if (fs.existsSync(f)) return `kept   ${rel}`;
    fs.writeFileSync(f, body, 'utf8');
    return `wrote  ${rel}`;
  };

  const ctxFile = flag('contexts');
  let counts = '';
  if (ctxFile && fs.existsSync(String(ctxFile))) {
    const cs = loadContexts(String(ctxFile));
    const groups = new Set(cs.map((c) => c.group));
    counts = `- **Contexts:** ${cs.length} in ${groups.size} groups · **Never scanned:** ${cs.length}\n`;
  }

  const archive = [];
  const projectPath = flag('project');
  if (projectPath) {
    const h = path.join(String(projectPath), 'docs', 'harness');
    if (fs.existsSync(h))
      for (const e of fs.readdirSync(h, { withFileTypes: true }))
        if (e.isDirectory()) archive.push(`- \`docs/harness/${e.name}/\``);
  }

  const log = [
    seed(
      'Scan.md',
      `# ${name} — Scan Memory\n\nIndex for \`/vibeman\` scans. Full reports live in the repo at \`docs/harness/\`.\n\n${counts}- **Open findings:** 0 · **Rejected (do-not-propose):** 0 · **Fixed on record:** 0\n- **Last run:** — · **Next:** first scan; no coverage yet\n- [[Scan/coverage|Coverage heatmap]] · [[Scan/patterns|Pattern catalogue]] · [[Scan/config|Config]]\n\n## Pre-vault archive (pointers only — not indexed)\n${archive.join('\n') || '_None._'}\n`
    ),
    seed(
      'config.md',
      `# Scan config — ${name}\n\n## Gates\n- typecheck: <cmd>            # baseline: <N> errors\n- tests: <cmd>                # baseline: <P>/<T>\n- lint: <cmd>\n- build: <cmd>\n- extra: <none>\n\n## Run shape\n- findings target per context: 5-7\n- wave size (parallel scan subagents): 8\n- fixes per implementation wave: 5-7\n- session context budget: 20 contexts per scan session\n\n## User taste\n_None recorded yet._\n\n## Do-not-suggest\n_None recorded yet._\n\n## Skill improvement log\n_None yet._\n`
    ),
    seed(
      'coverage.md',
      `# Coverage — ${name}\n\nOne row per context. Yield = findings actioned / surfaced across the last 3 scans.\n\n| Context | Group | Files | Lenses scanned | Last scan | @SHA | Open | Fixed | Rej | Yield |\n|---|---|---:|---|---|---|---:|---:|---:|---|\n_No contexts scanned yet._\n`
    ),
    seed(
      'patterns.md',
      `# Pattern catalogue — ${name}\n\nDurable shapes found here, so future scans grep proactively. Promote after 2+ contexts.\n\n| # | Pattern | When it bites | Fix shape | Seen in |\n|---|---|---|---|---|\n_No patterns yet._\n`
    ),
  ];
  console.log(`vault: ${root}`);
  console.log(log.join('\n'));
}

function cmdPlan() {
  const vault = flag('vault') || die('--vault required');
  const projectPath = flag('project') || die('--project required');
  const lens = String(flag('lens', '') || '');
  const budget = Number(flag('budget', 0)) || 0;
  const contexts = loadContexts(flag('contexts'));

  const rows = buildRows(vault, projectPath, contexts, lens).sort((a, b) => b.total - a.total);
  const picked = budget ? rows.slice(0, budget) : rows;
  const skipped = budget ? rows.slice(budget) : [];

  if (has('json')) {
    console.log(
      JSON.stringify(
        { lens, budget, picked: picked.map(serialize), skipped: skipped.map(serialize) },
        null,
        2
      )
    );
    return;
  }

  const win = rows[0]?.windowDays ?? 90;
  console.log(`# Scan plan — lens: ${lens || '(any)'} · ${rows.length} contexts\n`);
  console.log(`| # | Context | Files | Chg | Last (this lens) | Open | Yield | Score | Why |`);
  console.log('|---:|---|---:|---:|---|---:|---:|---:|---|');
  rows.forEach((r, i) => {
    const why = r.lensGap
      ? `never scanned with this lens${r.recentChanged !== null ? `; ${r.recentChanged}/${r.ctx.files.length} touched in ${win}d` : ''}`
      : r.changed === null
        ? 'no SHA on record'
        : r.changed === 0
          ? r.decay
            ? 'unchanged + no yield — skip'
            : 'unchanged since last scan'
          : `${r.changed}/${r.ctx.files.length} files changed`;
    const chg = r.lensGap ? (r.recentChanged === null ? '—' : `${r.recentChanged}*`) : (r.changed ?? '—');
    const mark = budget && i >= budget ? ' ' : '*';
    console.log(
      `| ${mark}${i + 1} | ${r.ctx.name} | ${r.ctx.files.length} | ${chg} | ${
        r.lastDate ? `${r.lastDate} (${r.days}d)` : 'never'
      } | ${r.open} | ${r.yield === null ? '—' : r.yield + '%'} | ${r.total.toFixed(2)} | ${why} |`
    );
  });
  console.log(`\n\`Chg\` = files changed since the last same-lens scan; \`N*\` = touched in the last ${win}d (never-scanned contexts).`);
  if (budget) {
    console.log(`\n**Selected (${picked.length}):** ${picked.map((r) => r.ctx.name).join(', ')}`);
    console.log(
      `\n**Skipped (${skipped.length})** — report these to the user, never cap silently:\n` +
        skipped.map((r) => `- ${r.ctx.name} — score ${r.total.toFixed(2)}`).join('\n')
    );
  }
}

const serialize = (r) => ({
  name: r.ctx.name,
  slug: r.ctx.slug,
  group: r.ctx.group,
  files: r.ctx.files.length,
  changed: r.changed,
  lastDate: r.lastDate,
  lastSha: r.lastSha,
  open: r.open,
  fixed: r.fixed,
  rejected: r.rejected,
  yield: r.yield,
  score: r.total,
});

function cmdDigest() {
  const vault = flag('vault') || die('--vault required');
  const projectPath = flag('project') || die('--project required');
  const slug = String(flag('slug') || die('--slug required'));
  const lens = String(flag('lens', '') || '');
  const contexts = loadContexts(flag('contexts'));
  const ctx = contexts.find((c) => c.slug === slug) || { name: slug, slug, files: [] };

  const L = parseLedger(vault, slug);
  const out = [];
  out.push('## PRIOR COVERAGE FOR THIS CONTEXT — read before you scan');
  out.push('');

  if (!L || !L.fm.scans.length) {
    out.push('No prior coverage — first scan of this context. Everything is new ground.');
    const archive = path.join(String(projectPath), 'docs', 'harness');
    if (fs.existsSync(archive)) {
      const hits = fs
        .readdirSync(archive, { withFileTypes: true })
        .filter((e) => e.isDirectory() && fs.existsSync(path.join(archive, e.name, `${slug}.md`)))
        .map((e) => `docs/harness/${e.name}/${slug}.md`);
      if (hits.length) {
        out.push('');
        out.push('Pre-vault reports exist but are NOT indexed (treat as unverified history):');
        hits.forEach((h) => out.push(`  ${h}`));
      }
    }
    console.log(out.join('\n'));
    return;
  }

  const scans = L.fm.scans;
  out.push(
    'Scanned before: ' +
      scans
        .slice(0, 4)
        .map((s) => `${s.lens} ${s.date} (@${s.sha || '?'}, ${s.surfaced ?? '?'} findings)`)
        .join(' · ')
  );

  const sameLens = scans.find((s) => lens && String(s.lens || '').includes(lens)) || scans[0];
  if (sameLens?.sha) {
    const diff = git(projectPath, ['diff', '--name-only', `${sameLens.sha}..HEAD`]);
    if (diff !== null) {
      const set = new Set(diff.split(/\r?\n/).map(norm).filter(Boolean));
      const changed = ctx.files.filter((f) => set.has(f));
      out.push(
        `Changed since ${sameLens.lens} ${sameLens.date}: ${changed.length} of ${ctx.files.length} files` +
          (changed.length ? ` — ${changed.slice(0, 12).join(', ')}${changed.length > 12 ? ', …' : ''}` : '')
      );
      if (changed.length === 0) {
        out.push(
          '  → NOTHING in this context has changed since that scan. Expect few or zero new findings;'
        );
        out.push('    report honestly rather than padding to hit the target.');
      } else if (changed.length < ctx.files.length) {
        out.push(
          `  → The other ${ctx.files.length - changed.length} files are byte-identical to that scan.`
        );
        out.push('    Weight your budget toward the changed files and toward paths listed below as');
        out.push('    neither fixed nor clean.');
      }
    }
  }

  const emit = (title, rows, render, capNote) => {
    if (!rows.length) return;
    out.push('');
    out.push(title);
    const cap = 12;
    rows.slice(0, cap).forEach((r) => render(r));
    if (rows.length > cap) out.push(`  +${rows.length - cap} older — see contexts/${slug}.md${capNote || ''}`);
  };

  emit('ALREADY FIXED — do NOT re-report:', L.rows.fixed, (r) =>
    out.push(`  #${String(r.id).padStart(2, '0')} ${r.sev.padEnd(4)} ${r.title}${r.sha ? `   (fixed ${r.sha})` : ''}`)
  );

  if (L.rows.rejected.length) {
    out.push('');
    out.push('REJECTED BY THE USER — do NOT re-propose, in any framing:');
    // never capped: re-proposing a rejected finding is the most expensive failure mode
    L.rows.rejected.forEach((r) => {
      out.push(`  #${String(r.id).padStart(2, '0')} ${r.sev.padEnd(4)} ${r.title}`);
      if (r.reason) out.push(`            reason: ${r.reason}`);
    });
  }

  if (L.rows.open.length) {
    out.push('');
    out.push('OPEN / DEFERRED — confirm-or-retire; these do NOT count against your findings target:');
    L.rows.open.forEach((r) => {
      out.push(`  #${String(r.id).padStart(2, '0')} ${r.sev.padEnd(4)} ${r.title}`);
      out.push(
        `            → still present? reply \`CONFIRM #${String(r.id).padStart(2, '0')}\`; gone? reply \`RETIRE #${String(r.id).padStart(2, '0')}\`.`
      );
    });
    out.push('            Do not re-file any of these as a new finding.');
  }

  if (L.rows.clean.length) {
    out.push('');
    out.push('KNOWN CLEAN — traced and healthy, do not re-spend budget:');
    out.push('  ' + L.rows.clean.map((r) => r.text).join(' · '));
  }

  const pats = parsePatterns(vault);
  if (pats.length) {
    out.push('');
    out.push('KNOWN PATTERNS in this project — grep for these shapes proactively:');
    out.push('  ' + pats.map((p) => `${p.id} ${p.name}`).join(' · '));
  }

  if (L.notes) {
    out.push('');
    out.push('CONTEXT NOTES:');
    L.notes.split(/\r?\n/).slice(0, 8).forEach((n) => n.trim() && out.push('  ' + n.trim()));
  }

  out.push('');
  out.push('Your findings target is for NEW ground only.');
  console.log(out.join('\n'));
}

function cmdStatus() {
  const vault = flag('vault') || die('--vault required');
  const dir = path.join(vault, 'Scan', 'contexts');
  if (!fs.existsSync(dir)) die(`no vault at ${path.join(vault, 'Scan')} — run \`init\` first`);
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md'));
  const rows = files.map((f) => {
    const slug = f.replace(/\.md$/, '');
    const L = parseLedger(vault, slug);
    return {
      slug,
      name: L?.fm.context || slug,
      scans: L?.fm.scans.length || 0,
      last: L?.fm.scans[0]?.date || '—',
      open: L?.rows.open.length || 0,
      fixed: L?.rows.fixed.length || 0,
      rejected: L?.rows.rejected.length || 0,
      clean: L?.rows.clean.length || 0,
    };
  });
  if (has('json')) return console.log(JSON.stringify(rows, null, 2));

  const sum = (k) => rows.reduce((a, r) => a + r[k], 0);
  console.log(`# Scan memory — ${vault}\n`);
  console.log(
    `${rows.length} contexts with a ledger · open ${sum('open')} · fixed ${sum('fixed')} · rejected ${sum('rejected')} · known-clean ${sum('clean')}\n`
  );
  console.log('| Context | Scans | Last | Open | Fixed | Rej |');
  console.log('|---|---:|---|---:|---:|---:|');
  rows
    .sort((a, b) => String(b.last).localeCompare(String(a.last)))
    .forEach((r) => console.log(`| ${r.name} | ${r.scans} | ${r.last} | ${r.open} | ${r.fixed} | ${r.rejected} |`));
}

function cmdVerify() {
  const vault = flag('vault') || die('--vault required');
  const contexts = loadContexts(flag('contexts'));
  const dir = path.join(vault, 'Scan', 'contexts');
  const problems = [];
  const known = new Set(contexts.map((c) => c.slug));

  if (fs.existsSync(dir))
    for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.md'))) {
      const slug = f.replace(/\.md$/, '');
      if (!known.has(slug)) problems.push(`orphan ledger (context no longer in the map): ${f}`);
      const L = parseLedger(vault, slug);
      if (!L) continue;
      const ids = [...L.rows.fixed, ...L.rows.rejected, ...L.rows.open].map((r) => r.id);
      const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
      if (dupes.length) problems.push(`${f}: duplicate finding ids ${[...new Set(dupes)].join(', ')}`);
      const maxId = ids.length ? Math.max(...ids) : 0;
      if ((L.fm.next_id ?? 1) <= maxId)
        problems.push(`${f}: next_id (${L.fm.next_id}) must exceed the highest id (#${maxId})`);
      for (const r of L.rows.rejected)
        if (!r.reason) problems.push(`${f}: rejected #${r.id} has no reason — the reason is the point`);
      for (const r of L.rows.fixed)
        if (!r.sha) problems.push(`${f}: fixed #${r.id} has no commit sha`);
      if (!L.fm.scans.length) problems.push(`${f}: no scans recorded in frontmatter`);
      else for (const s of L.fm.scans) if (!s.sha) problems.push(`${f}: scan ${s.date} has no sha`);
    }

  const missing = contexts.filter((c) => !fs.existsSync(path.join(dir, `${c.slug}.md`)));
  console.log(`# Vault verify — ${vault}\n`);
  console.log(`contexts in map: ${contexts.length} · with a ledger: ${contexts.length - missing.length}`);
  if (missing.length)
    console.log(`\nNever scanned (${missing.length}): ${missing.map((c) => c.name).join(', ')}`);
  console.log(problems.length ? `\nProblems (${problems.length}):\n- ${problems.join('\n- ')}` : '\nNo integrity problems.');
  if (problems.length) process.exitCode = 1;
}

// ───────────────────────────────────────────────────────────── main

switch (cmd) {
  case 'init':
    cmdInit();
    break;
  case 'plan':
    cmdPlan();
    break;
  case 'digest':
    cmdDigest();
    break;
  case 'status':
    cmdStatus();
    break;
  case 'verify':
    cmdVerify();
    break;
  default:
    console.log(
      `usage: node coverage.mjs <init|plan|digest|status|verify> [flags]\n\n` +
        `  init    --vault V [--project P] [--name N] [--contexts F]\n` +
        `  plan    --vault V --project P --contexts F --lens L [--budget N] [--json]\n` +
        `  digest  --vault V --project P --contexts F --slug S [--lens L]\n` +
        `  status  --vault V [--json]\n` +
        `  verify  --vault V --contexts F\n\n` +
        `Schema and rules: ../SCAN-MEMORY.md`
    );
    process.exit(cmd ? 1 : 0);
}
