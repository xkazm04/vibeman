---
name: leonardo
description: Generate images with Leonardo AI (Lucid Origin model), remove backgrounds, analyze with Gemini vision, and write SVG. For brand assets, UI illustrations, backgrounds, and icons.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash(node *), Bash(npx *)
argument-hint: <description of visual asset to create>
---

# Leonardo — AI Image Generation & Visual Assets

Generate production-quality images using Leonardo AI's Lucid Origin model, with Gemini vision for analysis and iterative refinement.

## Interactive Workflow

When the user invokes `/leonardo`, start by asking:

> **What type of visual do you need?**
>
> 1. **Icon** — App icons, logos, brand marks (square, centered, clean edges)
> 2. **State illustration** — Empty states, onboarding, success/error states (needs transparent bg)
> 3. **Background** — Ambient textures, atmospheric scenes, decorative backdrops
> 4. **Other** — Describe freely and I'll choose the best approach
>
> Also tell me: where will this be used? (component/page name)

Then follow the matching procedure below.

---

## Procedures by Type

### Icon / Logo
1. Discuss concept with user, confirm style direction
2. Generate with Leonardo: `--width 512 --height 512 --style dynamic --contrast 3.5`
3. Analyze with Gemini vision to verify quality
4. If user wants theme-adaptive version → analyze structure, write SVG with `currentColor`
5. Integrate into component

### State Illustration (transparent bg)
Leonardo's Lucid Origin does not support `--transparent`. Use the remove-bg pipeline:
1. Generate with solid dark background: `--style vibrant --contrast 3`
2. Use `remove-bg --id <imageId> --output path.png` (requires `--no-cleanup` on generate)
3. Clean up cloud generation manually after bg removal
4. Analyze result with Gemini to verify clean extraction
5. Integrate with appropriate sizing

### Background
1. Generate wide format: `--width 1536 --height 512 --style cinematic --contrast 2.5`
2. Integrate at very low opacity (8-15%) with gradient fade to `var(--background)`
3. For theme-adaptive version → analyze, write SVG using `currentColor` and CSS custom properties

### Other
1. Discuss with user to understand requirements
2. Choose appropriate dimensions, style, and contrast
3. Generate, analyze, iterate

---

## Tools

### Leonardo Image Generation
```bash
node .claude/skills/leonardo/tools/leonardo-image.mjs generate \
  --prompt "description" \
  --output path.png \
  --width 512 --height 512 \
  --style dynamic --contrast 3.5 \
  [--no-cleanup]
```

**Styles:** `bokeh`, `cinematic`, `dynamic`, `fashion`, `portrait`, `vibrant`
**Contrast:** `1.0`, `1.3`, `1.8`, `2.5`, `3`, `3.5`, `4`, `4.5`
**Auto-cleanup:** Generations are deleted from Leonardo cloud after download. Use `--no-cleanup` when chaining with `remove-bg`.

### Leonardo Background Removal
```bash
node .claude/skills/leonardo/tools/leonardo-image.mjs remove-bg \
  --id <imageId> --output path-nobg.png
```

### Gemini Image Analysis
```bash
node .claude/skills/leonardo/tools/gemini-recognize.mjs \
  --input path.png \
  --prompt "Describe shapes, colors, composition, quality"
```

### SVG Conversion Workflow
1. Generate PNG with Leonardo
2. Analyze with Gemini: `"Describe every shape, position, color as SVG recreation instructions"`
3. Hand-write SVG using `currentColor` / `var(--primary)` for theme adaptation
4. Test across themes

---

## Environment
Requires in `.env`:
- `LEONARDO_API_KEY` — from app.leonardo.ai
- `GEMINI_API_KEY` — for vision analysis

Load env before running (bash): `export $(grep -E '^(LEONARDO_API_KEY|GEMINI_API_KEY)=' .env | xargs)`
Load env before running (PowerShell): `Get-Content .env | ForEach-Object { if ($_ -match '^(LEONARDO_API_KEY|GEMINI_API_KEY)=(.*)') { [Environment]::SetEnvironmentVariable($matches[1], $matches[2]) } }`

## Brand Direction
Personas brand identity: **Neon android head** — representing AI agents of the new generation. Futuristic, glowing, geometric, clean. Primary palette from `src/styles/tokens.css` and `src/lib/colors.ts`.
