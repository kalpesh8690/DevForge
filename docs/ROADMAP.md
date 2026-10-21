# DevForge roadmap and honest status

## Phase 1 — Desktop foundation

Included in this starter: Electron main/preload split, context isolation, disabled renderer Node integration, file open/read/write IPC, folder listing, local settings, React/Vite, Monaco editor, theme toggle, and runtime discovery UI. Security review and cross-platform runtime testing remain required.

## Phase 2 — Execution

Implemented initial JavaScript child-process runner with a 5-second timeout, bounded output, temporary working directory, and runtime discovery probes. It is not a hardened sandbox: executed code has user-level OS permissions. Python/compiled-language execution, stdin, arguments, multiple concurrent sessions, online execution providers, and container isolation are pending.

## Phase 3 — Toolbox

Pending: formatter adapters, JSON/YAML/XML tools, regex tester, diff engine, API client, markdown preview, and utilities. Add deterministic unit tests before advertising each tool as complete.

## Phase 4 — AI

Pending: provider adapters, OS credential vault integration, model selection, context preview, token/time limits, and approval-based diff application. Do not place secrets in renderer state, source control, or logs.

## Phase 5 — Advanced development

Pending: PTY-backed terminal, Git workflow, snippet library, language-server/static-analysis integrations, and DAP debugger adapters. Do not call a plain output console a debugger.

## Phase 6 — Production

Pending: unit/integration/E2E coverage, dependency audit, threat review, installer smoke tests on Windows/macOS/Linux, signing/notarization, update infrastructure, and release documentation.

## Current limitations

- JavaScript execution is the only runner currently wired to the UI.
- Runtime detection reports command availability but does not configure toolchains.
- File explorer is currently a single-level list; recursive tree, safe rename/delete, and project-wide search are pending.
- The AI panel is informational only and does not call an AI provider.
- The UI does not yet imply Git, debugger, or remote execution support.
