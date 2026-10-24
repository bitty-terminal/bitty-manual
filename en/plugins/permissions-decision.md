# How Permissions Are Decided

Every privileged action a plugin, agent, or tool asks for is a **request**, never a grant. Bitty answers each request with four gates in a fixed order. All four must pass, and the first gate that refuses names the denial. No source starts with ambient authority, and an empty answer is never an allow.

This page explains the decision path. The normative text is the [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md) and the [capability grammar authority](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/specifications/manifest-capability-authority.md). The [Capabilities & Sandboxing](capabilities-and-sandbox.md) page lists what can be requested; this page does not repeat that catalog.

## Decision order

| #   | Gate                   | Question it answers                                                             | Refusal shape                                      |
| :-- | :--------------------- | :------------------------------------------------------------------------------ | :------------------------------------------------- |
| 1   | Source trust level     | May this kind of source use this capability family at all?                      | Trust-gate denial naming the level and family only |
| 2   | Six-layer intersection | Do all applicable layers, intersected, still allow it?                          | First blocking layer plus a bounded reason chain   |
| 3   | Explicit grant         | Did the user consent to this exact capability for this exact manifest revision? | Grant error; explicit re-consent required          |
| 4   | Runtime budgets        | Does the action fit the fuel, time, memory, descriptor, and queue limits?       | Budget-class failure; no policy re-evaluation      |

A later gate can only narrow what an earlier gate allowed. Passing the trust gate grants nothing, and passing the six-layer intersection grants nothing either: the explicit grant is a separate decision, and runtime budgets clamp even an allowed action.

For a plugin, the recorded grant is the consent record that supplies the `task-grant` layer. Revoking a capability removes it from that record, so the next request fails the intersection as well as the grant check.

## Source trust level

Each source has a trust level. Lower is more trusted, and ordering is structural only: a level never grants authority by itself. Unknown level labels fail closed.

| Level | Label             | Typical source                                | Boundary domains admitted                                                                          |
| :---- | :---------------- | :-------------------------------------------- | :------------------------------------------------------------------------------------------------- |
| 0     | `core`            | Bitty Core itself                             | filesystem, network, process, clipboard, environment, credentials, terminal input/output, ipc, gpu |
| 1     | `bundled-lua`     | First-party Lua shipped with the distribution | filesystem, network, process, clipboard, environment, terminal input/output, ipc                   |
| 2     | `third-party-lua` | Registry, local path, Git, or archive Lua     | filesystem, clipboard, environment, terminal output, ipc                                           |
| 3     | `native-sidecar`  | Compiled helper processes                     | filesystem, terminal output, ipc                                                                   |
| 4     | `external-tool`   | External tools, MCP servers, network services | none by default                                                                                    |

The matrix gates capability **families**, and only the families that map to a boundary domain: `fs`, `network`, `process`, `clipboard`, `terminal`, and `history`. A family passes when any domain it maps to is admitted. The shared `terminal` family is coarse: it passes when either terminal domain is admitted, so per-head input/output narrowing stays with the grant intersection. Families the matrix does not map — `ui`, `workspace`, `panel`, `env`, `runtime`, `debug`, `platform`, `protocol`, `browser`, `layout`, and `audio` — pass this gate at every level and are decided by grants.

What each level can never do:

- **Level 0 (`core`)** is the host itself. The matrix gives it nothing extra; the intersection and budgets still bound it.
- **Level 1 (`bundled-lua`)** holds no credentials and no GPU domain. It admits every domain an accepted family maps to, so the matrix refuses no accepted family that level 0 would admit; its shorter list matters for domains no accepted family names today.
- **Level 2 (`third-party-lua`)** can never use a `network.*` or `process.*` capability. Its domain list also omits terminal input, credentials, and GPU; because the `terminal` family is coarse, terminal input narrowing is the grant's job.
- **Level 3 (`native-sidecar`)** can never use a `network.*`, `process.*`, or `clipboard.*` capability. Its domain list also omits environment, terminal input, credentials, and GPU.
- **Level 4 (`external-tool`)** admits no mapped domain by default. It acts only through an explicit per-invocation grant.

`credentials` and `gpu` are boundary domains, not installable capability identifiers; no accepted capability family exposes them today.

## The six layers

Once the trust gate admits the family, the request is intersected across six layers. Authority order is highest first; it orders the denial report and nothing else.

| Layer (explain label) | What it represents                                              | Where it comes from                        |
| :-------------------- | :-------------------------------------------------------------- | :----------------------------------------- |
| `host-ceiling`        | Built-in, non-overridable Core ceiling                          | Core                                       |
| `user-policy`         | Per-user policy                                                 | `$XDG_CONFIG_HOME/bitty/capabilities.conf` |
| `project-policy`      | Project-local policy, applied only while the project is trusted | `<project>/.bitty/capabilities.conf`       |
| `parent-delegation`   | The delegating agent's effective set                            | Delegating runtime                         |
| `task-grant`          | The task's granted set; for a plugin, its consent record        | Task record or plugin grant ledger         |
| `agent-request`       | The exact capabilities named by this request                    | Caller                                     |

The layers obey five rules:

- **Lower layers only narrow.** `host-ceiling` has the highest authority, `agent-request` the lowest. Precedence orders the reason chain; it never widens a capability.
- **Matching is exact-set.** `fs.read:~/projects/**` covers that spelling only — never a wider or narrower path, and never `fs.write`. A parameterized capability must be declared and granted exactly as it is exercised.
- **Explicit deny wins across layers.** A `deny` entry in any layer removes the capability even when another layer allows it.
- **Scalar ceilings combine downward.** `max_agents` is the smallest value any layer states (host default: 16); `allow_root` is true only when every layer that says anything says true, and it defaults to deny. Neither can be raised by a request.
- **Delegation attenuates.** A child's effective set is a subset of its parent's. A request that exceeds the parent fails closed instead of inheriting it.

### Empty layers are not grants

The most common misreading is that a missing or empty layer means "allow". It does not. The states are different:

| Layer state                   | Meaning                                                  | Effect on the request                                             |
| :---------------------------- | :------------------------------------------------------- | :---------------------------------------------------------------- |
| Absent (not configured)       | The layer says nothing                                   | Neither allows nor blocks; another layer must affirmatively allow |
| Present but constraining      | The layer lists an allowlist and omits this capability   | Blocks; the capability is absent from the intersection            |
| Present, closed, empty        | A required grant set with nothing in it (the task layer) | Blocks; an empty task grant is a denial, not a wildcard           |
| Present with an explicit deny | The layer names the capability in its deny set           | Blocks, regardless of any allow in any other layer                |

With no affirmative allow anywhere, the effective set is empty. A plugin whose grant set is empty, or a task whose grant is empty, therefore denies even when every policy layer is silent.

### Pins, conflicts, and drift

A layer can **pin** an entry as non-overridable: a capability, `max_agents`, or `allow_root`. A pin asserts unanimity, not priority. Any capability pin must survive every layer that constrains capabilities, and a scalar pin must match wherever another layer states that value. A layer that narrows, omits, or contradicts a pin produces `policy-conflict`, never a silent clamp. A malformed pin also denies.

Grants are pinned to the exact manifest hash the user consented to. When the recorded hash no longer matches the manifest Bitty would load, the pin is stale:

- `bitty plugin info <id>` shows `pin: stale`, and `bitty plugin list` shows `stale` in its `PIN` column.
- The stale grant stops applying, so the capability is denied until the plugin is installed or re-granted under explicit consent.
- An update that narrows or keeps the capability set carries the existing grant forward; an update that adds a capability is blocked pending explicit approval of the diff.
- A revoked or denied capability is never revived by an update; it needs an explicit re-grant.
- `bitty plugin doctor` reports `ledger-pin <id>` when a bundled record's manifest hash no longer matches the shipped manifest, and asks you to re-run `bitty plugin install <id>` to re-pin and re-consent.

Policy drift is never a bypass: every decision is evaluated against the current layers, and a request that was denied is never retroactively converted to an allow. A policy change can narrow or widen future requests, but it cannot resurrect an explicit denial or a stale grant.

## Intersection and denial path

```text
request: capability C from source S
   │
   ├─[1] trust level of S ── family not admitted ──────────────▶ deny: policy-conflict (trust gate)
   │
   ├─[2] host-ceiling ∩ user-policy ∩ project-policy
   │      ∩ parent-delegation ∩ task-grant ∩ agent-request
   │        ├─ C missing from a constraining layer ───────────▶ deny: first blocking layer
   │        ├─ explicit deny in any layer ────────────────────▶ deny: that layer
   │        └─ pinned entry narrowed ─────────────────────────▶ deny: policy-conflict
   │
   ├─[3] recorded grant for C and this manifest hash
   │        ├─ not granted ───────────────────────────────────▶ deny: re-consent
   │        └─ stale pin ─────────────────────────────────────▶ deny: reinstall / re-grant
   │
   └─[4] runtime budgets ── exhausted ─────────────────────────▶ fail closed: budget class
            │
            ▼
          allow (bounded by all four gates)
```

Diagnostic `explain` output uses the same order: the six layer rows first, then the first denying layer, the denial kind, and the reason chain.

## Scenario: a plugin load

A Lua plugin installs with a declared capability list and an explicit consent decision. A bundled plugin is trust level 1; any other Lua source (registry, local path, Git, or archive) is level 2.

| Layer               | Typical plugin value                                                 |
| :------------------ | :------------------------------------------------------------------- |
| `host-ceiling`      | Built-in ceiling; no plugin-specific narrowing beyond the trust gate |
| `user-policy`       | Empty unless the user wrote `capabilities.conf`                      |
| `project-policy`    | Empty unless a trusted project ships `.bitty/capabilities.conf`      |
| `parent-delegation` | Not applicable — a plugin is not delegated by another agent          |
| `task-grant`        | The consent record for this manifest hash; closed when empty         |
| `agent-request`     | The one capability the plugin is exercising                          |

For a plugin author, the three layers to reason about are host, user, and project policy. The other three are mechanical: `parent-delegation` does not apply, `task-grant` is the grant you receive at install time, and `agent-request` is the call itself. Declare every capability the plugin actually exercises, expect consent to be bound to the manifest hash, and treat `E_CAPABILITY_DENIED` as a normal, catchable outcome. The [plugin getting-started guide](getting-started.md) covers install and consent; the [capability families](capabilities-and-sandbox.md) page covers the declarations themselves.

## Scenario: an agent request

An agent request uses all six layers. The AI runtime supplies the agent's task grant (what this task may do), the parent delegation (what the delegating agent could do), and the agent request (what this specific call wants). User and project policy apply unchanged, and the host ceiling still wins. See the [agent extension](../extensions/agent.md) for how agent components are packaged; agent semantics themselves live in the AI runtime, outside this manual.

Two consequences follow:

- **Fan-out narrows.** `max_agents` is the minimum across the layers and defaults to 16; a child cannot raise it. `allow_root` is a conjunction and defaults to deny, so an agent cannot gain privilege by asking for it.
- **A child never exceeds its parent.** A subagent request outside the parent's effective set fails closed with `self-grant` instead of being clamped silently. The host re-authorizes every delegated request; the AI runtime's strategy and scheduling choices never become authority.

## Diagnosing a denial

Start with the recorded state, then ask for the decision chain:

```bash
# What is installed, what state is it in, and are grants stale?
bitty plugin list

# One plugin: manifest hash, pin state, and per-capability grant markers.
bitty plugin info <id>

# The full read-only decision chain for one capability.
bitty plugin explain <id> <capability>
```

`bitty plugin list` prints a `PIN` column (`ok`, `stale`, or `-`) and a `GRANTED` ratio such as `2/3`. `bitty plugin info <id>` prints the manifest hash and marks every declared capability as `granted`, `requested, not granted`, `revoked`, or `not requested`, plus the re-grant command for revoked entries.

`bitty plugin explain <id> <capability>` (0.0.27 and later) prints the trust level, the decision, the first denying layer, the denial kind, all six layer rows with their sources, and the collected pins; on a denial it also prints the reason chain. It accepts `--format table|json|jsonl` and exits `4` on a denied capability. The denial kind is one of:

| Denial kind         | Meaning                                                                |
| :------------------ | :--------------------------------------------------------------------- |
| `self-grant`        | A wide declaration or delegation excess tried to grant authority       |
| `exceeds-policy`    | The request falls outside the computed intersection                    |
| `policy-conflict`   | A pinned entry was narrowed, or the trust/role gate refused the family |
| `untrusted-project` | Project policy exists but the project is not trusted                   |
| `invalid-request`   | The request is malformed or over the documented bounds                 |

On builds before 0.0.27, the same refusal reaches Lua as the standard error table: match on `err.code` (`E_CAPABILITY_DENIED` for a capability refusal) and read `err.message` for the host-authored reason. `bitty plugin explain` is the forward path: its layer labels, denial kinds, and exit code stay stable.

Two status notes for this build:

- The trust gate and the recorded grant are enforced by the running host. User and project policy files are read, validated, and reported by `bitty plugin explain`, but they are advisory in this build; a policy-layer denial is fail-closed guidance, not a mutation. `explain` prints that note when it applies.
- The `explain` report states budget limits only. It does not invent a live usage counter from a separate process.

When the remaining policy wiring lands, `bitty plugin explain` becomes the complete chain rather than an advisory one.

## Next steps

- [Capabilities & Sandboxing](capabilities-and-sandbox.md) — The capability families and resource budgets referenced above.
- [Getting Started with Plugins](getting-started.md) — Install, consent, enable, and update flow.
- [Troubleshooting & Safe Mode](../faq/troubleshooting.md) — Runtime diagnostics and safe mode.
