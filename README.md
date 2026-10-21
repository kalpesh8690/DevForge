# DevForge

A secure, cross-platform developer desktop workspace built with Electron, React, Vite, and Monaco Editor.

## Project status

This repository is being developed in phases. The initial foundation focuses on a secure Electron shell, editor, workspace file operations, and persistent preferences. Compiler adapters, AI providers, formatter integrations, toolbox utilities, Git, terminal, and debugging support are being added incrementally and must be tested on target operating systems before being described as production-ready.

## Requirements

- Node.js LTS and npm
- For desktop packaging, platform-specific build tools may be required
- Language execution requires the relevant runtime/compiler installed locally unless a configured remote provider is used

## Development

```bash
npm install
npm run dev
```

Build frontend: `npm run build:web`
Run tests: `npm test`
Package desktop app: `npm run build`

## Security

The renderer must not receive unrestricted Node.js or filesystem access. Privileged operations belong in the Electron main process and should be exposed only through a narrow preload API with sender and argument validation. Never run arbitrary shell commands from renderer-controlled strings. External code execution is powerful and must be explicitly configured by the user.

## Roadmap

1. Electron foundation, editor, project explorer, settings
2. Runtime detection and isolated execution adapters
3. Formatting and developer toolbox
4. AI providers with review-before-apply workflow
5. Terminal, Git, snippets, static analysis, debugging adapters
6. Testing, security review, documentation, and packaging verification

See `docs/ROADMAP.md` for implementation scope and known limitations.