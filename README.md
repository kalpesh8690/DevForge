# DevForge

DevForge is a cross-platform Electron developer workspace built with React, Vite, and Monaco Editor.

## Current implementation

- Electron desktop shell with context isolation, renderer Node integration disabled, a narrow preload API, and workspace-root file access checks.
- Monaco code editor, workspace file indexing, save action, editor preferences, and dark/light theme.
- Local runner adapters for JavaScript, Python, Java, Go, Rust, C, C++, PHP, and Ruby. The relevant runtimes/compilers must be installed on the machine.
- Interactive local-first toolbox: JSON format/minify, JSON-to-CSV, line comparison, Base64/URL transforms, text statistics, and JWT payload decoding.
- Runtime discovery panel, bounded output, temporary execution directories, and per-process timeouts.
- Initial OpenAI-compatible AI chat panel with optional code context, configurable endpoint/model, HTTPS-only remote endpoints, and OS-encrypted credential storage.
- Local Git view for status, recent history, unstaged diff, explicit stage-all, and commits (no remote commands).
- Vitest unit tests for utility functions and GitHub Actions CI configuration.

## Important security and maturity notes

**This is an active starter project, not a production-ready IDE yet.** Local code execution runs with the current operating-system user's permissions and is not a hardened sandbox. Only execute code you trust. Process timeouts/output caps reduce accidental runaway output but do not replace OS-level isolation. JWT payload decoding does not validate a signature.

Advanced AI editing with preview/diff, full terminal, Git UI, debugger/DAP, full formatter adapters, remote execution providers, and installer verification are not yet implemented. See docs/ROADMAP.md for a current feature status.

## Requirements

- Node.js 22 or a supported current LTS release and npm
- Electron's platform-specific build prerequisites for packaging
- Optional language toolchains: Python, JDK (java/javac), Go, Rust (rustc), GCC/Clang, PHP, Ruby

## Development

```bash
npm install
npm run dev
```

## Verification and packaging

```bash
npm run lint
npm test
npm run build:web
npm run build
```

Run the build and smoke tests on each target OS (Windows, macOS, Linux) before distributing installers. Platform signing and notarization require appropriate credentials and are not configured here.

## Security design

Privileged operations live in Electron's main process and are exposed through a constrained preload API. Renderer Node integration is disabled and context isolation is enabled. Never pass renderer-controlled command strings to a shell. A secure production execution environment should use an OS sandbox, container, VM, or remote isolated runner with explicit resource limits.
