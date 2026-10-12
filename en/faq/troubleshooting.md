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

## Plugin Diagnostics (`bitty plugin list` + `bitty doctor`)

When a plugin behaves unexpectedly, inspect its record and the host environment:

```bash
# Recorded plugins, sources, states, and capability grants
bitty plugin list

# One plugin's manifest plus recorded grants
bitty plugin info <id>

# Host environment health (GPU, fonts, dependencies)
bitty doctor
```

> [!NOTE]
> There is no `bitty plugin doctor` verb. Live per-VM memory, fuel, and queue-drop introspection is not exposed on the CLI.

---

## Extension & Tool-Spawn Failures

Failures in this area are fail-closed by design: nothing half-installed is left behind, and nothing untrusted is executed or printed.

- **Pin-mismatch on `bitty extension install` (exit code `4`)**: the fetched release digest differs from the recorded TOFU pin. The pin never auto-updates. Verify the release out-of-band, then re-pin explicitly with `--force`.
- **`show-source` prints nothing (exit code `4`)**: the install is missing or the executable no longer matches its pinned descriptor hash. Re-install the extension; Bitty refuses to print untrusted bytes.
- **Tool spawn refused under confinement**: on Linux, admitted tool spawns run under Landlock execute confinement; a refusal naming confinement means setup failed (e.g. pre-5.13 kernel or a container policy forbidding unprivileged restriction) and the spawn was refused rather than run unconfined. On macOS and Windows, admitted tool spawns are refused fail-closed with a confinement diagnostic until platform mechanisms land.
- **Capability denied after update**: grants bind to the exact manifest hash. Re-run `bitty plugin install` and approve the fresh consent prompt; use `bitty plugin revoke <id> --cap <capability>` to drop a single grant without removing the plugin.

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
