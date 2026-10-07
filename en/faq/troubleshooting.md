# Troubleshooting & FAQ

## Safe Mode (`--safe`)

If an experimental plugin or malformed configuration causes startup failures, start Bitty in Safe Mode:

```bash
bitty --safe
```

In Safe Mode:

- All third-party plugins are disabled.
- Built-in default configuration is locked.
- File watchers and dynamic hot reloads are suspended.

## Configuration Validation

To test your configuration without launching a GUI window:

```bash
bitty ctl config check
```

## Logs and Diagnostics

Bitty outputs structured diagnostics to stderr and log files located under:

- Linux: `$XDG_STATE_HOME/bitty/bitty.log` (default: `~/.local/state/bitty/bitty.log`)
- macOS: `~/Library/Logs/bitty/bitty.log`
