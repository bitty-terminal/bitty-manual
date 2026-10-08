# Troubleshooting & Safe Mode

This guide provides troubleshooting procedures, diagnostic commands, and recovery strategies for Bitty.

## Emergency Safe Mode (`--safe`)

If a newly installed plugin, syntax error, or incompatible hardware state prevents Bitty from starting normally, launch in **Safe Mode**:

```bash
bitty --safe
```

### What Happens in Safe Mode

- **Plugins Disabled**: All third-party plugins are completely ignored. No Lua virtual machines are instantiated.
- **Defaults Enforced**: User `init.lua` is bypassed; Bitty starts with compiled-in fallback defaults.
- **Watchers Suspended**: Dynamic file watchers and background reload hooks are temporarily deactivated.

Safe Mode allows you to open a terminal session, locate offending configuration files, or remove broken plugins without GUI crashes.

---

## Validating Configuration Offline

Before reloading your terminal, test your Lua configuration file without launching a GUI:

```bash
bitty ctl config check
```

- Returns exit code `0` if all syntax and schema fields are valid.
- Prints specific line numbers, column offsets, and error descriptions if parsing or validation fails.

---

## Plugin Diagnostics (`bitty plugin doctor`)

When a plugin behaves unexpectedly, runs slowly, or drops events, run `bitty plugin doctor`:

```bash
bitty plugin doctor
```

### Diagnostic Output Highlights

1. **Memory & Fuel**: Reports active heap size per plugin VM against the 32 MiB ceiling and instruction fuel counts.
2. **Event Queues**: Highlights dropped events caused by slow event loops (buffer overflow indicators).
3. **Tool Dependencies**: Checks declared `[tools.*]` requirements (e.g. `git`, `rg`, `fd`) against the user's host environment and reports missing binaries or version mismatches.

---

## Log Files & Verbosity

Bitty writes structured diagnostics to disk according to platform standards:

- **Linux / BSD**: `$XDG_STATE_HOME/bitty/bitty.log` (defaults to `~/.local/state/bitty/bitty.log`)
- **macOS**: `~/Library/Logs/bitty/bitty.log`

### Increasing Log Verbosity

Set the `RUST_LOG` environment variable when running from an existing shell:

```bash
RUST_LOG=bitty=debug,bitty_runtime=trace bitty
```

---

## GPU & Rendering Fallbacks

Bitty utilizes `wgpu` to select the fastest available native graphics backend (Vulkan on Linux, Metal on macOS).

If your environment lacks hardware GPU acceleration (e.g. inside a virtual machine or software-rendered container):

```bash
# Force OpenGL backend fallback
WGPU_BACKEND=gl bitty

# Force low-power GPU adapter selection
WGPU_POWER_PREF=low bitty
```
