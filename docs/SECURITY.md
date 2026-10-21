# Security model

- Renderer runs with Node integration disabled and context isolation enabled. Privileged operations are exposed through the preload bridge only.
- IPC handlers verify the sender and validate basic argument shapes. Continue to audit every new IPC handler and restrict filesystem operations to explicit user-selected workspaces where possible.
- The JavaScript runner uses a child process, a temporary directory, a timeout, and an output cap. This is not a security sandbox. A child process can still access files and resources permitted to the current OS user; run only code you trust.
- Do not add shell:true to execution adapters. Do not silently disable TLS verification. Do not execute AI-generated commands without explicit user approval.
- Never commit API keys, credentials, local settings, or .env files. Use OS credential storage (for example, safeStorage plus a carefully designed credential lifecycle) before enabling hosted AI providers.
- External HTML previews must use a sandboxed, unprivileged renderer and must not inherit the application's preload API.
- Treat project files, repository content, remote responses, and AI output as untrusted input.

Before release, run dependency audits, test IPC sender validation, review Electron fuses, and smoke-test packaging on each supported operating system.
