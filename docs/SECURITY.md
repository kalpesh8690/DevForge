# Security model and limitations

## Electron boundary

- Renderer Node integration is disabled, context isolation is enabled, and privileged operations are exposed through a narrow preload API.
- IPC handlers validate the sending WebContents and validate arguments. Workspace file read/write/list operations are constrained to folders selected by the user, resolve real paths, and reject symlink escapes.
- Renderer navigation is restricted to the app/dev origin. New windows are denied; HTTPS links may be handed to the system browser.
- Keep every new IPC method narrowly scoped. Never expose raw `ipcRenderer`, `fs`, `spawn`, or unrestricted shell access to the renderer.

## Code execution

- JavaScript, Python, Java, Go, Rust, C, C++, PHP, and Ruby adapters invoke child processes with `shell:false`, temporary source directories, bounded output, and per-process timeouts.
- These controls are not a security sandbox. Executed code retains the current OS user's permissions, may access user files/network, and can potentially spawn descendants. Only run trusted code. Use a container, VM, OS sandbox, or isolated remote worker before offering untrusted multi-tenant execution.
- Do not add arbitrary command strings, `shell:true`, or automatic execution of AI-generated commands. Compiler availability and behavior must be tested on each target OS.

## AI provider

- The user configures an OpenAI-compatible endpoint and model. Remote providers must use HTTPS; HTTP is allowed only for loopback model servers. Requests reject redirects to reduce credential forwarding risk.
- API keys are encrypted with Electron `safeStorage` and stored in the application data directory; plaintext keys are not stored in renderer state after save. If OS encryption is unavailable, saving keys is disabled.
- Prompts and any explicitly opted-in code context are sent to the selected provider. The user should review the provider's privacy/retention terms. AI output is untrusted and no generated edits are automatically applied.
- Provider endpoint/model compatibility, credential lifecycle, response-size handling, and network failures still need integration testing.

## Git

- Git operations use a fixed action allowlist and `shell:false`; arbitrary Git arguments and remote operations are not exposed.
- Staging and commit are explicit user actions. Repository Git hooks may execute repository-controlled code; review changes before staging/committing.

## Remaining release work

- Run dependency audits and tests for IPC validation, workspace path traversal, symlink handling, process timeout/output limits, and AI endpoint handling.
- Consider Electron fuses, application signing/notarization, a hardened process sandbox, updater integrity, and platform-specific installer smoke tests.
- External HTML previews must use a separate sandboxed renderer and must not inherit the application's preload API.
- Treat project files, repository content, remote responses, and AI output as untrusted input.
