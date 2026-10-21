# DevForge roadmap and implementation status

## Phase 1 — Desktop foundation (starter implemented; verification pending)
Electron main/preload split, context isolation, disabled renderer Node integration, workspace file operations constrained to user-selected roots, local settings, React/Vite, Monaco editor, theme and editor preferences, and runtime discovery UI. Cross-platform security review and runtime testing are still required.

## Phase 2 — Local execution (initial adapters implemented; verification pending)
The editor Run action is wired to local JavaScript, Python, Java, Go, Rust, C, C++, PHP, and Ruby adapters. Compiled languages use temporary source/build directories. Child processes use `shell:false`, bounded output, and an 8-second timeout per process. Compiler/runtime availability differs by operating system and must be tested on each target platform. This is not a hardened sandbox: code runs with the current user's OS permissions. Stdin, command-line arguments, process tree termination guarantees, online execution, and container isolation remain pending.

## Phase 3 — Developer toolbox (initial utilities implemented)
Interactive JSON formatting/minification and JSON-to-CSV, text comparison, Base64 and URL transforms, text statistics, and JWT payload decoding are implemented in the UI with unit tests for core helpers. JWT decoding does not validate signatures. Full formatter adapters, YAML/XML tooling, regex tester, API client, markdown preview, database clients, and additional utilities remain pending.

## Phase 4 — AI assistant (initial provider support implemented; verification pending)
The assistant can call an OpenAI-compatible chat-completions endpoint, supports configurable base URL/model, requires opt-in code context, stores API credentials using Electron safeStorage encryption, restricts remote providers to HTTPS (HTTP is permitted for localhost model servers), disables redirects, limits message sizes, and uses a request timeout. Secure key removal is available. Provider-specific compatibility, UI review/diff application, token budgeting, and integration tests remain pending. Never place secrets in source control or logs.

## Phase 5 — Advanced development (initial Git support implemented; remaining work pending)
A local Git view supports status, recent history, unstaged diff, explicit stage-all, and commit actions through an allowlisted argument map with shell execution disabled. Push/pull/fetch and arbitrary Git commands are not exposed. Git credentials, branch switching, conflict resolution, PTY-backed terminal, snippet library, language-server/static-analysis integrations, and DAP debugger adapters remain pending. The output panel is not a debugger.

## Phase 6 — Production readiness (pending)
Unit/integration/E2E coverage, dependency audit, threat review, installer smoke tests on Windows/macOS/Linux, signing/notarization, update infrastructure, and release documentation remain pending. Do not describe the application as production-ready until these gates pass.

## Known limitations
- Runtime detection reports command availability but does not configure toolchains.
- The workspace explorer indexes files recursively with a depth/file cap but does not yet provide a folder tree, create/rename/delete, or project-wide search.
- Tool execution depends on locally installed runtimes and is not isolated from the operating-system account.
- The AI panel is informational only and does not call an AI provider.
- Git, debugger, remote execution, and formatter integrations are not implemented yet.
