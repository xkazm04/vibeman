# Vibeman Backlog Implementation Phases

**Created:** March 4, 2026  
**Total Tasks:** 83 ideas  
**Estimated Timeline:** 12 weeks

---

## 📋 Phase Overview

```
PHASE 1: STABILIZATION (Quick Wins)       — 1-2 weeks — 13 tasks
         Focus: Code quality, security, data integrity

PHASE 2: CORE ARCHITECTURE                — 3-4 weeks — 20 tasks
         Focus: System consolidation, refactoring, resilience

PHASE 3: MAJOR FEATURES                   — 2-3 weeks each — 5 tasks
         Focus: New capabilities, significant refactoring

PHASE 4: POLISH & STEADY PROGRESS         — 4-6 weeks — 44 tasks
         Focus: UX refinements, ongoing maintenance
```

---

## 🔥 PHASE 1: STABILIZATION (Quick Wins) — 1-2 Weeks

**Objective:** Improve system stability, fix security issues, prevent data corruption

**13 Tasks | Est. Time: 1-2 weeks | Impact: ⭐⭐⭐⭐⭐**

### Tasks in This Phase:

1. **16faec7c** — Unbounded pagination limit DoS prevention
   - Add Math.min(limit, 100) clamping to all paginated endpoints
   - Files: All Brain API endpoints

2. **7010c911** — JSON.parse guards on context parsing
   - Add try-catch around unsafe JSON.parse calls in scan worker
   - Files: scanWorker.ts

3. **33a2bbac** — Canonical signal type enum
   - Create single SignalType enum to fix silent signal type drops
   - Files: signal.types.ts, 4+ locations using scattered definitions

4. **366caa77** — Cascade delete for evidence junction rows
   - Add ON DELETE CASCADE to evidence junction tables
   - Files: database schema migrations

5. **3bcea70a** — Transactional batch insight creation
   - Wrap insight batch creation in transaction, validate evidence refs
   - Files: insight.repository.ts

6. **c2c9806f** — Numeric parameter validation
   - Create parseQueryInt utility with NaN/range checks
   - Files: Brain endpoints, queryUtils.ts

7. **aac7016a** — LRU cache eviction for dedup
   - Replace soft-cap cache with bounded LRU eviction
   - Files: cacheManager.ts

8. **0747605f** — AbortController for Brain fetch calls
   - Add AbortController to prevent memory leaks on component unmount
   - Files: BrainLayout.tsx, useQuery hooks

9. **1abe240e** — Transparent fallback indicator
   - Add compositionMethod field to /api/ai/compose-prompt response
   - Files: compose-prompt route, types

10. **1a404926** — Cache invalidation fix
    - Fire cache invalidation on all direction status transitions
    - Files: directionsApi.ts, cache invalidation logic

11. **15e15d42** — Delete deprecated store aliases
    - Remove activeProjectStore.ts, unifiedProjectStore.ts, projectConfigStore.ts
    - Files: lib/stores/

12. **1b89b8a5** — Auto-scroll card to top on nav
    - Reset card scroll position when navigating between Tinder cards
    - Files: TinderCard.tsx

13. **0d17ff06** — LLM provider failure hints
    - Enhance /api/llm/providers with reason/suggestion fields
    - Files: /api/llm/providers/route.ts

---

## 🎯 PHASE 2: CORE ARCHITECTURE (High Impact/Medium Effort) — 3-4 Weeks

**Objective:** Remove architectural debt, consolidate scattered systems, improve resilience

**20 Tasks | Est. Time: 3-4 weeks | Impact: ⭐⭐⭐⭐**

### Tasks in This Phase:

#### Data Integrity Group (8 tasks)
1. **0120cac1** — Auto-merge transaction wrapping
2. **11852a09** — Clear phantom blocking items from ScanQueueWorker
3. **2e1eab32** — Normalize evidence into junction table
4. **42dc4cc1** — ApplicationSessionStore coordinator
5. **bc32fbd5** — Fix Tinder optimistic revert race condition
6. **dfd17cfa** — File-write queue for acceptance
7. **29729b57** — Collapse dual reflection state
8. **8a508f06** — Canvas state reducer machine

#### System Consolidation Group (7 tasks)
1. **1860dff8** — createRouteHandler factory (unify 3 middleware wrappers)
2. **203f50da** — Unified usePolling hook (replace 4+ ad-hoc polling)
3. **28efcbd6** — Shared CanvasRenderPipeline (dedup 600 LOC)
4. **3b4bc9b6** — Unified execution paths (Conductor + CLI)
5. **942e414e** — Unified scan strategies (LLM + Claude Code)
6. **76403c72** — Insight ID-based deduplication
7. **2dbc3d8a** — Extract lifecycle phases into executors

#### Resilience & Observability Group (5 tasks)
1. **10f052dc** — System status dashboard (/api/system-status)
2. **553fb184** — Web Worker for D3 force layout
3. **96facca0** — Reflection completion cascade refetch
4. **b1d08fdb** — LLM provider circuit breaker with fallback
5. **dff53781** — Event-driven cache invalidation

---

## 🚀 PHASE 3: MAJOR FEATURES (High Impact/High Effort) — 2-3 Weeks Each

**Objective:** Deliver significant new capabilities and architectural improvements

**5 Tasks | Est. Time: 2-3 weeks each | Impact: ⭐⭐⭐⭐⭐**

### Tasks in This Phase:

1. **b8672c1f** — Unified EventBus replacing 8 event systems
   - Single typed EventBus consolidating 8 competing systems
   - Sub-second latency vs 15s polling
   - Estimated effort: 3 weeks

2. **7a5854ed** — Bulk triage with auto-accept rules engine
   - Rules engine for auto-triage + batch selection UI
   - Estimated effort: 2 weeks

3. **853a029c** — Decouple reflection from CLI callback
   - Enable non-CLI reflection sources
   - Estimated effort: 2 weeks

4. **b50c72da** — Always-visible TaskMonitor
   - Persistent session health awareness
   - Estimated effort: 1-2 weeks

5. **ebf4b0e3** — Normalize error handling across all routes
   - Extend ideasHandlers to all routes
   - Estimated effort: 1 week

---

## ✨ PHASE 4: POLISH & STEADY PROGRESS — 4-6 Weeks

**Objective:** UX refinements, ongoing refactoring, maintainability improvements

**44 Tasks | Est. Time: 4-6 weeks | Impact: ⭐⭐⭐⭐**

### Tasks in This Phase:

#### UI/UX Polish (17 items)
- Viewport-relative column heights
- Hover tooltips on visual components
- Responsive grid breakpoints
- Truncated name tooltips
- WCAG compliance (progress rings, reduced motion)
- Keyboard shortcut overlay
- Text size upgrades (10px → 12px)
- Color system alignment
- Responsive touch targets

#### Refactoring & Maintenance (27 items)
- Service layer extraction from oversized routes
- Hook decomposition (useTinderItems, useReflectionTrigger)
- Repository pattern extraction
- Type safety improvements (branded types, discriminated unions)
- Status algebra consolidation
- Lifecycle phase extraction
- Custom error handling integration

---

## 📊 Summary by Category

| Category | Count | Phase 1 | Phase 2 | Phase 3 | Phase 4 |
|----------|-------|---------|---------|---------|---------|
| Code Quality | 28 | 8 | 8 | 1 | 11 |
| Maintenance | 19 | 1 | 7 | 0 | 11 |
| Functionality | 19 | 1 | 5 | 4 | 9 |
| UI | 13 | 3 | 0 | 0 | 10 |
| User Benefit | 4 | 0 | 0 | 0 | 4 |

---

## 🎯 Implementation Strategy

### Before Starting Any Phase:
1. Check prerequisites in task description
2. Review context files linked in task
3. Create a feature branch (if using git)
4. Update progress tracking

### During Implementation:
1. Implement one task at a time
2. Run `npx tsc --noEmit` after changes
3. Verify no regressions in related features
4. Update comments/documentation

### After Each Task:
1. Create a summary of changes
2. Link related tasks
3. Add to memory notes if pattern discovered
4. Move to next task

---

## ⏱️ Timeline Estimate

- **Phase 1 (Quick Wins):** 1-2 weeks — High ROI, improves stability
- **Phase 2 (Core Architecture):** 3-4 weeks — Removes architectural debt
- **Phase 3 (Major Features):** 2-3 weeks per task — Significant capability additions
- **Phase 4 (Polish & Maintenance):** 4-6 weeks — Continuous improvement

**Total Estimated Time:** 12+ weeks for all 83 tasks

*Note: Some tasks can be parallelized if team resources allow*

---

## Next Steps

→ **Start with Phase 1: Stabilization**  
→ All 13 quick wins ready to implement  
→ Most provide immediate stability improvements
