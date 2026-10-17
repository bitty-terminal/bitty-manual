# Troubleshooting & Safe Mode

This guide provides troubleshooting procedures, diagnostic commands, and recovery strategies for Bitty.

## Emergency Safe Mode (`--safe`)

If a newly installed plugin or configuration error prevents Bitty from starting normally, try **Safe Mode**:

```bash
bitty --safe
```

### What Happens in Safe Mode

- **Third-party plugins bypassed**: No third-party plugin Lua VMs are instantiated. The host uses package provenance, not an id prefix, to distinguish bundled plugins.
- **Defaults enforced**: External configuration and third-party settings files are bypassed; Bitty uses compiled-in safe defaults.
- **Watchers Suspended**: Dynamic file watchers and background reload hooks are temporarily deactivated.

Safe Mode helps isolate configuration and third-party plugin failures. It does not guarantee recovery from GPU, hardware, or other GUI crashes.

Diagnostic commands such as `bitty doctor`, `bitty --safe config check`, and `bitty plugin list` do not activate plugin VMs. A successful diagnostic or headless run does not establish headed stability or plugin UI usability.

---

## Plugin Activation Errors (What They Mean)

The host validates every plugin before activation and fails closed — a rejected plugin is disabled with a diagnostic, never partially activated. Match what you see against this table:

| Symptom                                                       | Meaning                                                                                                                                                                                         | Fix                                                                                                                                                                                                     |
| :------------------------------------------------------------ | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Install exits `4` with a compat diagnostic                    | The plugin's `[compat] bitty` range does not admit your host version. Check the particular package's host and API ranges; see the compatibility floors below.                                   | Upgrade Bitty, or choose a plugin revision whose declared ranges admit your host. Do not lower the manifest's ranges to bypass rejection.                                                               |
| `bitty plugin list` shows the plugin disabled after an update | Version or capability mismatch recorded at load (`disabled_reason`); the plugin registered nothing — no commands, no keymap, no overlay.                                                        | Same as above; then `bitty plugin enable <id>` to retry after upgrading.                                                                                                                                |
| A bar module is missing but the bar renders                   | Not an error: the provider is absent, ungranted, stale, revoked, or malformed, so the module hid fail closed. Providers send raw numbers only — a lost source degrades to absence, never zeros. | Grant the capability (`bitty plugin list` shows granted vs requested), or accept the hide on hosts without that hardware.                                                                               |
| Clicking a bar control shows a notification instead of acting | The control grant is missing or the host denied the call (`E_NOT_PERMITTED`). The click degrades to a notification by design — it never retries or escalates.                                   | Grant the control capability at install/consent time, or keep the read-only render.                                                                                                                     |
| `E_SETTINGS_UNDECLARED` at activation                         | Plugin-author bug: the plugin read a settings key it never declared. Users cannot fix this from a config file.                                                                                  | Report it against the plugin; run `bitty --safe` to keep working meanwhile.                                                                                                                             |
| Your per-plugin config value seems ignored                    | The selected file was rejected, the key is undeclared or wrong-typed, a higher-priority file was selected, or a needed capability was not approved. Rejected values retain lower value layers.  | Check host settings warnings, compare the file with the plugin's declared settings, and inspect grants with `bitty plugin list`. `config check` checks main configuration, not all per-plugin settings. |

> [!NOTE]
> Installing or enabling a plugin does not prove its UI works on a headed host. When reporting a headed failure, include `bitty doctor --format json` output and the plugin id and version; review diagnostic output for personal information before sharing it.

---

## Compatibility Floors

Two floors gate what runs where, and both fail closed with a diagnostic rather than a crash:

- **Plugin-to-host floor**: each manifest declares its own `[compat] bitty` and `plugin-api` ranges. The approved revisions listed below for activity, bar, file-manager, git-panel, and palette require **`>=0.0.24,<0.1`**, with plugin API and registry SDK ranges **`^1.0`**. This does not apply to every plugin or prove release availability. Incompatible installation fails with exit code `4`.
- **Package-to-distro floor**: native Linux packages declare their runtime dependencies per format (fontconfig, freetype, libgcc family) and every package is install-smoked in a clean container of its distro before release. An unrelated distro is best-effort, not supported — use the install script or build from source there.

| Plugin       | Approved revision                          |
| :----------- | :----------------------------------------- |
| activity     | `e1566380b9bddb92a5db8b9f1ba96c080995ef8a` |
| bar          | `f007a03dfa6036ff67458095dc71169c0c6ee7e3` |
| file-manager | `bf3a17ea6aa1ea0fcc3a45a13ceaa069e83b71d4` |
| git-panel    | `862df1f90ad137eb1e92379ac0710c6cd22c7f21` |
| palette      | `c17dc321c8c7d4c8a1b8c5e7853d33e943af7c3d` |

The [statusline](../extensions/statusline.md) revision documented here instead requires `>=0.1,<1.0`; it is incompatible with Bitty 0.0.24.

---

## Validating Configuration Offline

Before reloading your terminal, check the **main configuration** without launching a GUI:

```bash
bitty config check
```

- Returns exit code `0` if all syntax and schema fields are valid.
- Prints specific line numbers, column offsets, and error descriptions if parsing or validation fails.

Per-plugin settings are selected and loaded during activation. `config check` is not a comprehensive validator for those files; use the settings warnings below as well.

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

The host retains at most **four settings warning summaries per plugin activation**: an ambiguous short alias, canonical Lua shadowing an alias, the count of ignored entries, or a rejected file with fallback to lower value layers. Summaries may identify the short alias, but omit setting key names, values, and file error contents. See [per-plugin config files](../plugins/plugin-settings.md) for selection rules and limits.

Settings warning summaries are host log messages, not a Lua diagnostics API or settings/grant dump in activation reports.

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
