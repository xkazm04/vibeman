# Vibeman Harness Scenario

## Purpose
Autonomous development lifecycle harness for Vibeman — a Next.js 16 development platform with 23 feature modules, 70+ API routes, 65+ database repositories, and multi-provider AI integration.

## Goal
Achieve a **reliable and performant fully autonomous development lifecycle platform** by systematically hardening every layer from foundation through integration.

## Baseline Assessment (2026-04-01)
- **TypeScript:** 1 real error (ProcessLog.tsx icon type), 9 stale .next cache refs
- **Tests:** 634/682 passing (93%), 7 failing test files, 48 failing tests
- **Stack:** Next.js 16, React 19, SQLite (better-sqlite3), Zustand, TypeScript 5.9
- **Modules:** 23 features, 70+ API routes, 65+ repos, 45+ stores

## Tier Architecture

### Tier 0 — Foundation Stability (no dependencies)
| Area | Description | Verification |
|------|-------------|--------------|
| ts-compilation | Fix all TypeScript errors, clear stale .next cache | `tsc --noEmit` = 0 errors |
| build-pipeline | Ensure `next build` completes cleanly | exit code 0 |

### Tier 1 — Test Infrastructure (depends: Tier 0)
| Area | Description | Verification |
|------|-------------|--------------|
| polling-tests | Fix 20+ timeout failures in polling integration tests | all pass |
| brain-tests | Fix 13 insight-deduplication test failures | all pass |
| canvas-tests | Fix 5 canvasStateReducer + 6 useCanvasData failures | all pass |
| hook-tests | Fix 3 usePollingTask failures | all pass |
| scan-tests | Fix scan-pipeline test failures | all pass |

### Tier 2 — Database Layer Hardening (depends: Tier 1)
| Area | Description | Verification |
|------|-------------|--------------|
| repo-consistency | Audit repository patterns, fix inconsistencies | typecheck clean |
| type-alignment | Ensure DB model types match TypeScript interfaces | typecheck clean |
| migration-safety | Verify all migrations are idempotent and non-destructive | tests pass |

### Tier 3 — API Route Reliability (depends: Tier 2)
| Area | Description | Verification |
|------|-------------|--------------|
| route-cleanup | Remove stale route references, fix broken imports | typecheck clean |
| error-handling | Standardize error responses across API routes | build clean |
| validation | Ensure input validation at system boundaries | tests pass |

### Tier 4 — Core Module Robustness (depends: Tier 3)
| Area | Description | Verification |
|------|-------------|--------------|
| conductor | Harden conductor pipeline for autonomous operation | typecheck + build |
| brain-module | Ensure signal processing reliability | typecheck + tests |
| context-mgmt | Verify context lifecycle management | typecheck + build |

### Tier 5 — Integration & Build Verification (depends: Tier 4)
| Area | Description | Verification |
|------|-------------|--------------|
| full-build | Complete `next build` with zero errors | exit code 0 |
| full-tests | All tests passing | 0 failures |
| ci-alignment | Verify CI workflow compatibility | build + typecheck + tests |

## Execution Protocol
1. **Pick next area** from lowest tier with all dependencies satisfied
2. **Execute** — read relevant files, diagnose issues, apply fixes
3. **Verify** — run gate checks (tsc, vitest, next build)
4. **Record** — log results, learnings, files modified
5. **Repeat** until all areas complete

## Verification Gates
- `npx tsc --noEmit` — TypeScript compilation
- `npx vitest run` — Unit/integration tests
- `npx next build` — Production build
- `npx eslint . --max-warnings 0` — Lint (advisory)

## Target
- TypeScript: 0 errors
- Tests: 682/682 passing (100%)
- Build: clean exit
- All 23 modules operational
