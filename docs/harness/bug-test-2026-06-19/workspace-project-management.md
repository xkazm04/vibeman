# Workspace & Project Management — Bug-Hunter + Test-Mastery Scan
> Context: ctx_1770495771391_fxbwt7i
> Group: Data & Infrastructure
> Files read: ~18
> Total: 5 (Critical: 2, High: 2, Medium: 1, Low: 0)

> NOTE on manifest drift: the context lists `src/app/api/disk/glob/route.ts`, `src/app/api/disk/list-directories/route.ts`, and `src/app/api/git/commit-and-push` paths. The disk routes were consolidated — the real files are `src/app/api/disk/search/route.ts` (glob + directories), `src/app/api/disk/file/route.ts` (read/write/check), and `src/app/api/disk/batch/route.ts`. The two manifest disk paths are **stale/missing**. Findings below target the live files.

## 1. disk/file read+write accepts ANY absolute path — full arbitrary-disk read/write
- **Severity**: Critical
- **Lens**: bug-hunter
- **Category**: path-traversal / arbitrary-file-access
- **File**: src/app/api/disk/file/route.ts:34,72 (via src/lib/pathSecurity.ts:104-128)
- **Scenario**: `POST /api/disk/file {action:"read", filePath:"C:\\Users\\me\\.ssh\\id_rsa"}` (or `"/etc/passwd"`, or a write to `C:\\Windows\\System32\\drivers\\etc\\hosts`). `validateFilePath` only rejects `..`, `~`, and null bytes (TRAVERSAL_PATTERNS, pathSecurity.ts:12-16). An absolute path that contains none of those passes, and line 124-125 returns it verbatim as `resolvedPath` — no base-directory confinement. The handler then `readFile`/`writeFile`s it. Access control is `minRole:'viewer'` with `skipProjectCheck:true`, and localhost role defaults to `admin`, so nothing else gates it.
- **Root cause**: Design assumes "no `..` ⇒ safe". But absolute paths never need `..` to escape — they just *are* outside the project. `validatePathWithinBase` (pathSecurity.ts:47) is the correct confinement primitive and **exists**, but is never called by any disk route.
- **Impact**: Any process that can reach localhost (browser tab on a malicious page via a no-CORS POST, another local app, a compromised dependency) can read SSH keys / `.env` / browser cookies and overwrite arbitrary files (write also auto-`mkdir`s parents). Whole-machine read+write.
- **Fix sketch**: Require an allowed root (active project path or a configured roots allow-list) and run `validatePathWithinBase(resolvedPath, allowedRoot)` after resolution; reject on escape. Apply to read, write, and check (handleCheck only does the same weak traversal check).
- **Value**: effort 4 / impact 10 / risk 9

## 2. disk directories-listing bypasses the system-path deny-list
- **Severity**: Critical
- **Lens**: bug-hunter
- **Category**: arbitrary-disk-enumeration
- **File**: src/app/api/disk/search/route.ts:111 (handleDirectories)
- **Scenario**: `POST /api/disk/search {type:"directories", path:"C:\\Windows\\System32"}` (or `/root`, `/etc`). `handleDirectories` validates with `validatePathTraversal` (only blocks `..`/`~`/null), then `readdir`s the path directly. The purpose-built `validateSafeBasePath` (pathSecurity.ts:163) — which carries `FORBIDDEN_SYSTEM_PREFIXES` for exactly this endpoint ("callers can browse user dirs but not enumerate OS internals") — is **never called here**.
- **Root cause**: The hardened helper was written for the directories API but the route was wired to the weaker generic traversal check, so the deny-list is dead code on its intended caller.
- **Impact**: Full filesystem directory enumeration of system roots (recon for finding the secret files then read via finding #1). On a non-existent/denied path it silently returns `{directories:[]}` (line 120), so the only guard that *does* exist also masks errors.
- **Fix sketch**: Replace the `validatePathTraversal` call at line 111 with `validateSafeBasePath(targetPath)`; keep returning 403 on its error string.
- **Value**: effort 1 / impact 8 / risk 8

## 3. addProject optimistic local insert uses client object, not server result → store divergence
- **Severity**: High
- **Lens**: bug-hunter
- **Category**: state-corruption / client-server divergence
- **File**: src/stores/serverProjectStore.ts:95-114
- **Scenario**: `addProject` POSTs the project, and on `response.ok` pushes the **caller-supplied `project`** into the local array (line 104-106). But the server (api/projects/route.ts:49-78) augments/derives fields — auto-detects `type` when omitted, normalizes `port`/`basePort`, restructures `git`, sets `workspaceId`. The client store now holds a record whose `type`/`git`/`port` differ from the canonical DB row until the next full `syncWithServer`. clientProjectStore caches the activeProject in localStorage from this same divergent object (clientProjectStore.ts:102-108), so git/server-start operations can run against stale fields (e.g. wrong `git_branch`, missing detected type).
- **Root cause**: Optimistic update assumes the request body equals the persisted entity; the API is non-trivially transforming it.
- **Impact**: Silent project-state drift; downstream git commit-and-push / server-start read the wrong branch/type/port. Hard to reproduce because a later sync "fixes" it, masking the window.
- **Fix sketch**: Push the project object returned by the POST response (`await response.json()`), not the input; have the route return the created row. Same pattern issue applies to `updateProject` (line 116-137).
- **Value**: effort 3 / impact 6 / risk 4

## 4. syncWithServer wipes the persisted project list to [] on any transient fetch failure
- **Severity**: High
- **Lens**: bug-hunter
- **Category**: silent-failure / data-loss
- **File**: src/stores/serverProjectStore.ts:66-80
- **Scenario**: `syncWithServer` runs on init/rehydrate. If the fetch throws (dev server momentarily restarting, network blip, abort) OR returns non-ok, control falls through to line 78 `set({ projects: [] })` and returns `[]`. The catch at line 75 is empty ("silent fail"). The store **persists** `projects` (line 330-332), so the emptied list is written to localStorage. clientProjectStore's `_verifyAndRestoreProject` then can't find the active project among `[]`, so it **deletes the saved active project from localStorage** (clientProjectStore.ts:248-251). A blip thus clears the user's project list *and* active selection.
- **Root cause**: Failure path conflates "fetch failed" with "server has zero projects" and overwrites good cached state with empty.
- **Impact**: Transient backend hiccup blanks the multi-workspace project view and loses active-project selection; user re-adds projects. Worsened by the fact the error is swallowed (no toast/log), so it looks like data was deleted.
- **Fix sketch**: On fetch failure, leave `projects` unchanged (return current state) and surface an error flag; only set `[]` when the server explicitly returns an empty list with 200.
- **Value**: effort 2 / impact 7 / risk 5

## 5. Zero tests across the entire security + state-sync surface (path validation, git args, all 3 stores)
- **Severity**: Medium
- **Lens**: test-mastery
- **Category**: missing-test / security-branch coverage
- **File**: src/lib/pathSecurity.ts, src/lib/command/shellEscape.ts, src/stores/{server,client}ProjectStore.ts, src/app/api/git/commit-and-push/route.ts (no `*.test.ts` for any)
- **Scenario**: Globbed `pathSecurity.test`, `command.test`, `shellEscape.test`, `workspaceStore/serverProjectStore/clientProjectStore.test`, `disk/**.test`, `observability.test` — **all returned no files**. The exact branches that finding #1/#2 exploit (absolute-path-without-`..`, system-prefix deny-list, null byte, encoded traversal) and the git-injection validators (`validateBranchName` reject `-flag`/`..`/`@{`, `validateCommitMessage` reject `$()`/backtick/`;|&`) have no asserting test — a regression that re-weakens them ships green.
- **Root cause**: Security-critical pure functions and store reducers were added without a test harness; "localhost-only" framing lowered the perceived need, but these are the app's primary trust boundary.
- **Impact**: Highest-leverage, highest-blast-radius gap — a one-line edit to TRAVERSAL_PATTERNS or SHELL_METACHARACTERS silently opens arbitrary read/write or git command injection with no failing test. Also the cheapest to close (pure-function table tests, LLM-generatable in one batch).
- **Fix sketch**: One vitest batch with invariant tables: pathSecurity (absolute escape must be rejected once #1 is fixed; system prefixes rejected; null byte; `~`); shellEscape (each metachar/`$()`/`@{`/leading-dash rejected, valid branch accepted); store unit tests for the #3/#4 divergence/wipe paths (mock fetch reject ⇒ projects unchanged).
- **Value**: effort 3 / impact 8 / risk 2
