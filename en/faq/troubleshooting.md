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

## Configuration Was Ignored at Startup

Startup is fail-soft for external configuration. If Bitty prints a line such as

```text
bitty: warning: ignoring 'window' in '/home/user/.config/bitty/profiles/default.lua':
validation error at 'window.opacity': must be finite within [0.0, 1.0] (found 2);
ignored; using defaults and remaining layers
```

then only the named table or scalar was invalid. Every other valid table from
that file and from other layers still applies, and Bitty never edits or
comments out your files.

1. Run `bitty config check` to see the strict first error. Add the same
   `--config` or `--profile` flag you launched with. The command exits `2` and
   names the exact field path.
2. Fix only the reported table or value. A partial `window` table is valid:
   `window = { opacity = 0.9 }` uses the default `padding = 8`, and
   `window = { padding = 4 }` uses the default `opacity = 1.0`.
3. Restart Bitty. The startup diagnostic describes what was ignored for this
   launch; a live reload never adopts an invalid edit, it keeps the last-good
   configuration and reports a reload error.

If the warning says `ignoring invalid config file` or `ignoring profile
layers` instead of naming a table, the whole file or profile chain could not
be salvaged — for example a Lua syntax error, an undeclared key, or an
`extends` cycle. `bitty config check` names the reason.

A missing explicit `--config` or `BITTY_CONFIG` path, or a `--profile` name
that does not exist, is still fatal (exit `2`). Those are launch-input
mistakes, not invalid file content, so fix the path or name and launch again.

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

- **Plugin-to-host floor**: each manifest declares its own `[compat] bitty` and `plugin-api` ranges. The host evaluates them before install and again before activation, so an incompatible install exits `4` and an incompatible update leaves the plugin disabled with a diagnostic instead of partially activating. Official catalog entries carry the same declared range in their registry record; `bitty plugin list` marks an entry `incompatible` and `bitty plugin install <id>` refuses it with the exact range before fetching anything.
- **Package-to-distro floor**: native Linux packages declare their runtime dependencies per format (fontconfig, freetype, libgcc family) and every package is install-smoked in a clean container of its distro before release. An unrelated distro is best-effort, not supported — use the install script or build from source there.

Plugin authors should declare a **minimum-only** host requirement such as `bitty = ">=0.0.26"`. An upper bound is enforced when present, so a `<0.1` ceiling blocks a 0.1 host that would still run the plugin. The Plugin API range (`compat.plugin-api`, currently `^1.0`) is the breaking boundary; it is what changes when the Lua surface breaks.

The standalone [statusline](../plugins/catalog/statusline.md) plugin is archived and removed from the official set; the bar plugin supersedes it. Do not re-add it or lower a range to bypass a refusal.

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

## Plugin Diagnostics (`bitty plugin list`, `bitty plugin doctor`, `bitty doctor`)

When a plugin behaves unexpectedly, inspect its record, the store, and the host environment:

```bash
# Recorded + official-catalog plugins, sources, states, and capability grants
bitty plugin list

# One plugin's manifest plus recorded grants (an official id works before install)
bitty plugin info <id>

# Diagnose the on-disk package store and the bitty-plugins.toml ledger
bitty plugin doctor

# Host environment health (GPU, fonts, dependencies)
bitty doctor
```

`bitty plugin doctor` never creates a plugin VM and changes nothing; `bitty plugin doctor --repair` quarantines broken or extra package trees, removes stale staging, and rebuilds `current.json` with the index write last. Live per-VM memory, fuel, and queue-drop introspection is not exposed on the CLI.

The host retains at most **four settings warning summaries per plugin activation**: an ambiguous short alias, canonical Lua shadowing an alias, the count of ignored entries, or a rejected file with fallback to lower value layers. Summaries may identify the short alias, but omit setting key names, values, and file error contents. See [per-plugin config files](../plugins/plugin-settings.md) for selection rules and limits.

Settings warning summaries are host log messages, not a Lua diagnostics API or settings/grant dump in activation reports.

Common store findings and their fixes:

- **`plugin list` shows `orphaned` or `broken`**: an install was interrupted or a package tree was edited by hand. Run `bitty plugin doctor` for the finding, then `bitty plugin doctor --repair` to re-index complete trees or quarantine partial ones. To discard one tree instead, run `bitty plugin remove <id> --force` and reinstall from its source.
- **`plugin install` reports a conflicting existing version**: the same manifest version exists with different content, usually a rebuilt checkout. Re-run with `--force`, or approve the `Replace it? [y/N]` prompt. A declined prompt changes nothing.
- **`plugin list` fails with an unreadable store index**: `current.json` is corrupt. Bitty fails closed rather than showing an empty store; `bitty plugin doctor --repair` quarantines the old file and rebuilds it from complete package directories.
- **`plugin doctor --repair` cannot write the quarantine**: the store is read-only or owned by another user. Fix ownership/permissions on the path named in the error and re-run; repair does not delete packages when it cannot quarantine them.
- **`install <id>` refuses with a compat range**: the catalog entry declares a host range that excludes this build. Upgrade Bitty; do not edit the catalog or lower a manifest range.

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

### Blurry or stretched text at fractional scaling

Bitty samples glyphs 1:1 at fractional DPI: the present plan spans the window
surface, so a leftover pixel strip stays background instead of scaling every
glyph. Font line metrics are measured at the resolved point size (configured
point size times the monitor scale), which keeps the baseline and integer cell
consistent.

If text still looks blurred on a scaled display:

1. Confirm the resolved size with `bitty +show-font`. It prints `font_family:`,
   `font_size:`, and optional `font_fallback:` from the merged configuration,
   without opening a window, starting a PTY, or loading a plugin VM.
2. Compare `font.size` with what you expect. `Ctrl+=` / `Ctrl+-` zoom the live
   window and can drift from the file until you save or restart.
3. Prefer a size that lands on a consistent cell for the font. DejaVu Sans Mono
   at 11pt is the reported case: at a 1.6 scale factor Bitty uses a 14x32
   physical cell and measures the face at 17.6pt, so the rounded advance must
   still fit that cell.
4. Run `bitty doctor` to check for missing font packages or a broken fontconfig
   installation.

Bitty answers the kitty font query (`DCS +q`, also accepted in the APC
spelling) from the live resolved configuration and provides `bitty +show-font`
for tools that probe out of process. Font display in third-party detectors such
as fastfetch is still limited by the upstream detector: Bitty's side is
implemented, but upstream fastfetch support is not fixed by this release.

### Ghost or stale rows in a full-screen app

If a selector or other full-screen program leaves an old highlighted row beside its replacement, or briefly shows a half-drawn repaint while you move quickly:

- Bitty 0.0.27 waits for a burst of terminal output to finish before presenting the frame, so the committed frame is the complete repaint. The wait is short and internal: there is no configuration key for it. Upgrade to 0.0.27 or later.
- A very short delay before the final frame appears during a burst is expected: the presenter is waiting for the repaint to finish arriving. The screen should settle on the complete frame once output stops.
- If the screen stays wrong after the application stops writing, that is a different defect. Collect `bitty doctor --format json` and the application name, version, and key sequence that reproduces it.

---

## Exit Behavior & Session Restore

- **Closing the last panel down to an empty window** skips the exit save. The transient empty base cannot be encoded as a restorable session, so Bitty keeps your last good session file (previous workspace, scrollback, cwd) and logs `no tiled pane or pinned panel left — keeping last good session` at info level. That line is not corruption.
- **A shell that exits in the last panel** ends Bitty promptly. Bitty bounds the window between the PTY reaching EOF and the child being reapable instead of waiting for another input event.
- **A session that is not restored** means the exit save was skipped or the previous file was already the last good one. A populated workspace still saves on exit; a mixed layout reports its warning and leaves the last good file untouched.

For image preview failures (yazi, chafa, `icat`), see [Inline image previews](../extensions/graphics.md#inline-image-previews).
