# Feature Landscape

**Domain:** Template Discovery & Research Integration (development platform add-on)
**Researched:** 2026-03-14

## Table Stakes

Features that make this module actually usable. Without these it remains the "never used" PromptTemplates module.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Project path input + scan | Entry point to the whole feature | Low | Already implemented in TemplateDiscoveryPanel |
| Template list with metadata | User needs to see what was found | Low | Already implemented in TemplateColumn/TemplateItem |
| Query input field | Core interaction -- "what to research" | Low | Already in TemplateVariableForm |
| Granularity selector (quick/standard/deep) | Maps to res project's searchDepthGuidance | Low | Dropdown or radio group |
| Generate .md requirement file | The output of the whole flow | Med | fileGenerator.ts exists |
| CLI command display + copy | User needs to know what to run next | Low | Format: `cd [path] && npx claude --prompt [file]` |
| Scan progress indicator | Scanning takes time, user needs feedback | Low | Loading state during POST |
| Error display for failed scans | User needs to know if path is wrong | Low | Already handled in API |

## Differentiators

Features that make this better than "manually copy a template".

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Prompt preview before generation | User sees exactly what will be generated | Med | PromptPreviewModal exists, needs polish |
| Change detection on re-scan | Only updates modified templates, shows what changed | Low | Already implemented via contentHash |
| Generation history | Track what was generated, when, for what query | Med | GenerationHistoryPanel exists |
| Template categorization | Group templates by type (research, financial, etc.) | Low | Category already extracted from folder structure |
| Clean visual hierarchy | Makes the module feel professional, not prototype-y | Med | Main work of this milestone |

## Anti-Features

Features to explicitly NOT build (per PROJECT.md Out of Scope).

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Direct CLI execution from Vibeman | Security risk (executing arbitrary commands), different Node.js environment, res project has its own runtime | Show CLI command + copy button |
| Research results viewing | res project already has a report UI; duplicating it adds maintenance burden | Link to res project or show "results available in res" |
| Template editing | Templates are source code in the res project; editing in Vibeman creates sync issues | Show read-only config, point user to source file |
| Multi-project scanning | Adds state complexity for minimal value; one research project at a time is the use case | Single project path input, clear state on path change |
| Template versioning | Overcomplicates what should be "scan and use latest" | Always use latest scan result, show last_scanned timestamp |
| File watching / auto-rescan | chokidar on external project paths is fragile and unnecessary | Manual "Rescan" button |

## Feature Dependencies

```
Project Path Input --> Scan Trigger --> Template List Display
                                            |
                                            v
                                    Template Selection --> Query Input --> Prompt Preview --> Generate .md
                                                              |                                    |
                                                              v                                    v
                                                    Granularity Selector              CLI Command Display
                                                                                           |
                                                                                           v
                                                                                    Copy to Clipboard
                                                                                           |
                                                                                           v
                                                                                  Generation History
```

## MVP Recommendation

The infrastructure is already built. The MVP work is:

1. **Verify scanning pipeline works end-to-end** -- scan a real project, confirm templates appear
2. **Granularity selector** -- simple dropdown mapping to quick/standard/deep
3. **CLI command display with copy** -- the missing output step
4. **UI redesign** -- clean layout replacing the prototype UI

Defer:
- Generation history polish -- functional but low priority
- Template search/filter within results -- 10 templates don't need search
- Batch generation (multiple templates at once) -- complexity for minimal value

## Sources

- PROJECT.md requirements analysis (DISC-01 through EXEC-03)
- Existing codebase in `sub_TemplateDiscovery/`
