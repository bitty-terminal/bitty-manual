# statusline (retired)

> **Retirement notice.** The standalone `bitty-terminal.statusline` plugin is archived and was removed from the official plugin catalog. The [bar](bar.md) plugin supersedes it and owns the visible workspace bar and status presentation. `statusline` is not part of the v1 UI slot set — mounting it fails closed with `E_UI_COMPONENT_INVALID` — so this page is historical reference only. There is no installable statusline revision on 0.0.26, and `bitty plugin list` does not show it.

Historical behavior: Cwd, mode, git, and task presentation via status-component composition, recomposing declarative components whenever a reactive terminal event fired.

- Historical plugin id: `bitty-terminal.statusline`, last declared manifest version `0.1.0`
- Last revision: `3eab0f44b9bf76fc8c01a029176a9bd885f91d07`, which required Bitty **`>=0.1,<1.0`** and plugin API `^1.0`; it was never compatible with a `0.0.x` host.
- Archived repository: [github.com/bitty-terminal/statusline](https://github.com/bitty-terminal/statusline)

## Replacement

Use the bar plugin:

```bash
bitty plugin install bitty-terminal.bar
bitty plugin enable bitty-terminal.bar
```

See the [bar modules user guide](../bar-modules.md) for module groups, anchors, icons, and pointer actions. Do not re-add the archived repository, and do not lower a manifest compatibility range to bypass a refusal.
