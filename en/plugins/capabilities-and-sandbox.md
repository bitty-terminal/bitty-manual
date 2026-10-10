# Capabilities & Sandboxing

Bitty's plugin runtime is built from the ground up around **Capability-based Security** and strict resource isolation. Unlike traditional editor and terminal plugin systems where plugins run with the user's full ambient operating system privileges, Bitty operates on a strict **Deny-by-Default** posture.

## The Sandboxed VM Architecture

Each active plugin instance runs inside an isolated, stackless **Phodopus** (pure-Rust Lua) virtual machine.

### Restricted Standard Library

To eliminate attack vectors and prevent privilege escalation, the Lua environment strictly strips hazardous standard library functions:

| Restricted Domain         | Host Behavior          | Rationale                                                                                                     |
| :------------------------ | :--------------------- | :------------------------------------------------------------------------------------------------------------ |
| `debug`                   | **Completely Removed** | Prevents metatable tampering, closure introspection, and sandbox escapes.                                     |
| `os.execute` / `io.popen` | **Denied**             | Plugins cannot spawn arbitrary subshells or execute host binaries.                                            |
| Raw Sockets / FFI         | **Denied**             | Plugins cannot open raw network sockets or load C dynamic libraries (`dlopen`).                               |
| Rooted `require`          | **Enforced**           | Module resolution strictly locks inside the plugin's own directory. Directory traversal (`../`) fails closed. |

## Capability System

Plugins declare their required capabilities in `bitty-plugin.toml`. Bitty computes a cryptographic manifest hash to bind granted permissions permanently to that specific manifest version.

```toml
[capabilities]
platform.notify = true
ui = ["ui.rich", "ui.overlay"]
workspace = ["workspace.read", "workspace.control"]
network = ["http"]

[network]
allow = ["api.github.com"]

[tools.git]
required = true
version = ">=2.30"
```

### Core Capability Families

1. **`ui` Family**:
   - `ui.rich`: Grants permission to mount and update declarative UI scenes into host band slots (`top`, `bottom`, `statusline`).
   - `ui.overlay`: Grants permission to mount into the `overlay` slot.
   - `ui.overlay.focus`: Grants permission to capture transient keyboard input focus via `bitty.ui.overlay.acquire`.
2. **`platform` Family**:
   - `platform.notify`: Grants permission to post desktop notifications via `bitty.notify.show`.
3. **`workspace` Family**:
   - `workspace.read`: Allows inspecting workspaces via `bitty.workspace.list`.
   - `workspace.control`: Allows switching, creating, closing, and moving workspaces and panels.
4. **`network` Family**:
   - Mediated exclusively through an upstream native coprocess behind the Native Component Boundary (see [Native Component Boundary](upstream-components.md)). Plugins never touch raw sockets.
   - Hosts and domains must be allowlisted under `[network].allow`.
5. **`process.spawn` & Tool Family**:
   - Ambient process creation is strictly forbidden.
   - Plugins can only invoke explicit, allowlisted system tools declared in `[tools.<name>]` (e.g. `process.spawn:git`), subject to host argument sanitization, timeout, and output caps (8 KiB default).

## Resource Quotas & Budgets

To ensure that poorly written or malicious plugins cannot stall the terminal or exhaust system memory, the host enforces deterministic hardware budgets:

### Memory & Execution Ceilings

- **VM Memory Ceiling**: Default 32 MiB per plugin VM. Exceeding memory allocation terminates the plugin generation safely.
- **Instruction Fuel Metering**: The stackless VM meters bytecodes per execution slice. Infinite loops run out of fuel and fail closed without freezing the UI or terminal rendering hot path.
- **Scene Tree Depth & Size**:
  - Maximum UI tree depth: 16 levels.
  - Maximum nodes per block: 2,048 nodes.
  - Maximum text content per block: 256 KiB.
  - Maximum retained UI blocks: 64 blocks per plugin.

### Event Queue Budgets

Events dispatched across the host bus are buffered in three-tier bounded rings:

- **Per-Subscription**: 64 events.
- **Per-Plugin**: 1,024 events (256 KiB).
- **Global Host Queue**: 8,192 events (2 MiB).
- When a plugin fails to drain events in time, the host uses `DropOldest` semantics to prevent memory unbounded growth.

## Diagnostic Introspection (`bitty plugin list`)

Inspect recorded sources, states, and capability grants at any time:

```bash
bitty plugin list
bitty plugin info <id>
```
