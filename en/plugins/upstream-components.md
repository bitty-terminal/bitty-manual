# Native Component Boundary

Bitty Core ships with **zero network code** and **zero extraneous background runtime code**. Yet, plugins often need network connectivity, HTTP APIs, or heavy computation. Bitty resolves this tension through its **Native Component Boundary** architecture: single-purpose native binaries act as upstream capability providers behind a policy-enforcing host.

## The Architectural Axioms

To prevent the ecosystem entropy seen in traditional extensible environments (where each plugin pulls in separate Python/Node runtimes, uncoordinated worker processes, and duplicate connection pools), Bitty establishes two core axioms:

$$\boxed{\text{Plugins share infrastructure, not duplicate infrastructure}}$$
$$\boxed{\text{Plugins request capabilities, not own system privileges}}$$

## The Coprocess Model

Native components are independent, single-purpose native binaries that act as **upstream capability providers**:

```text
Plugin Lua Sandbox
        │ (1) Capability Request: versioned service call
        ▼
Bitty Core Host (Rust)
        │ (2) Policy Authority: Checks manifest grant, timeout, byte budget
        ▼
stdio Wire Protocol v1 (Framed JSON / Binary IPC)
        ▼
Native Coprocess (Rust)
        │ (3) Shares connection pools & caches across all plugins
        ▼
External Resource
```

### Key Design Tenets

1. **On-Demand Stdio Coprocess**: Bitty Core spawns the native component upon first usage, communicates over standard input and output (`stdin` / `stdout`), and gracefully suspends or terminates it when idle.
2. **Zero `dlopen` & Zero Ambient Daemon**: Components are never dynamically loaded into the Core process space (preserving host stability and memory boundaries), nor do they run as lingering system background daemons.
3. **No PATH Scanning**: Bitty Core never scans system `$PATH` for components. Binaries live at explicit paths (user `$XDG_DATA_HOME/bitty/components/` wins over system locations) with cryptographic SHA-256 digest validation.
4. **Mechanism vs. Policy Separation**:
   - **Core is the Policy Authority**: Core validates permission grants, user consent, request deadlines, and body byte ceilings.
   - **The Component is the Execution Mechanism**: The component performs the heavy work and re-verifies handed capability tokens as defense-in-depth.

## Bootstrapping Without a Network Stack

Core links no network client, so distribution itself is bootstrapped from tools the OS already ships: fixed-argument system `curl` fetches hash-pinned release bundles from the CDN, system `tar` unpacks them, and SHA-256 verification runs before anything is staged. No toolchain is required on the user machine.

## Component Administration

Manage registered native components via the CLI (see [CLI Commands & Controls](../getting-started/cli.md)):

```bash
# List registered components and verify binary digest integrity
bitty component list

# Register a verified binary
bitty component add /path/to/component-binary

# Fetch + verify + stage one hash-pinned release bundle from the CDN
bitty component install <name>

# Remove a component
bitty component remove <name>
```
