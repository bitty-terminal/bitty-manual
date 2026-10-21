# 主题与可读性

Bitty 内置 30 个配色预设（20 个深色、10 个浅色），并支持完整的行内调色板。
预设按名称选择，不需要安装主题文件。

## 选择主题

```lua
return {
    appearance = {
        theme = "catppuccin-latte",
    },
}
```

也接受 `theme = "<name>"` 别名。若要跟随操作系统外观，使用双值形式（顺序不限，
两侧都必须提供）：

```lua
return {
    appearance = {
        theme = "light:catppuccin-latte,dark:catppuccin-mocha",
    },
}
```

切换主题会立即重绘已有文本、ANSI 颜色、光标、选区、回滚缓冲区和派生界面元素，
无需重启进程。未知名称会失败关闭，并列出有效名称；`bitty list themes` 会打印
目录、分类和别名。

### 深色预设

`bitty-dark`、`tokyo-night`、`tokyo-night-storm`、`catppuccin-mocha`、
`catppuccin-macchiato`、`catppuccin-frappe`、`dracula`、`nord`、
`gruvbox-dark`、`solarized-dark`、`one-dark`、`ayu-dark`、`ayu-mirage`、
`kanagawa-wave`、`rose-pine`、`rose-pine-moon`、`everforest-dark`、`monokai`、
`night-owl`、`github-dark`。

### 浅色预设

`tokyo-night-day`、`catppuccin-latte`、`gruvbox-light`、`solarized-light`、
`one-light`、`ayu-light`、`kanagawa-lotus`、`rose-pine-dawn`、
`everforest-light`、`github-light`。

## 可读性保证

每个内置预设都按 WCAG 2.1 对比度测量，回归会使构建失败：

- 默认文本，以及语法高亮、`ls --color`、diff 和 Vim 使用的 ANSI 颜色，相对
  背景必须达到 **4.5:1**。
- 光标块相对背景必须达到 **4.5:1**，相对选区（IME 预编辑底色）必须达到 **3:1**。
- 选中文本保留自身前景色，在选区填充上必须达到 **4.5:1**；选区填充本身相对
  背景保持 **1.3:1** 的可见度。
- 帮助面板描边、聚焦视图轮廓和其他非文本界面元素达到 **3:1**。
- 不同 ANSI 颜色族必须通过色相或感知亮度保持可区分；对比度修复不会把两个族
  合并成同一种颜色。

调色板修复只改变明度，不改变身份：修复后的槽位保持原有色相。唯一例外是
`one-light` 的青色：上游把它与绿色别名，Bitty 将其旋转为蓝绿色以便区分。

`bitty config check` 会打印当前预设的测量值和策略结果：

```text
theme.contrast = fg 15.80:1, min ANSI 4.52:1, cursor 5.19:1, selection 10.65:1/1.48:1, ring 3.05:1 (policy)
theme.contrast.result = pass (policy)
```

编辑 `appearance.colors` 或报告可读性问题后，可用它复核。

### 已知例外

Solarized 本身就是低对比度方案。`solarized-light` 保留上游 4.13:1 的前景；
两个 Solarized 预设都保留上游选区和中性亮色 ANSI 梯度。这些例外会在
`bitty config check` 输出中显式列出（`theme.contrast.exempt.*`），不会静默通过。

### Vim 等 TUI 程序

ANSI 颜色来自预设，TUI 程序不需要单独的主题文件。浅色预设搭配
`:set background=light`，深色预设搭配 `:set background=dark`，让 Vim 自身的
高亮组与终端颜色一致。在源码文件中执行 `:syntax on`，即可检查关键字、字符串、
注释、类型和诊断信息的显示效果。

## 自定义调色板

`appearance.colors` 接受完整行内调色板（`background`、`foreground`、`cursor`、
`selection`，以及恰好 16 个 `ansi` 条目）。它会替换所选预设的终端角色；
聚焦/空闲轮廓仍由预设提供。任何字段格式错误都会拒绝整个配置层，并指出具体字段。
