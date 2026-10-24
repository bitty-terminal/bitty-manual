# 权限是如何判定的

插件、Agent 或工具发起的每一项特权操作都是一次**请求**，而不是一次授权。Bitty 按固定顺序通过四道关卡来回答每个请求；四道关卡必须全部通过，第一个拒绝的关卡即为拒绝来源。任何来源都不带环境权限，空答案也从不等于允许。

本页解释判定路径。规范性文本见[安全概览](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md)与[能力语法权威](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/specifications/manifest-capability-authority.md)。可请求的能力清单见[能力与沙箱](capabilities-and-sandbox.md)；本页不重复该目录。

## 判定顺序

| #   | 关卡         | 回答的问题                                           | 拒绝形态                       |
| :-- | :----------- | :--------------------------------------------------- | :----------------------------- |
| 1   | 来源信任等级 | 这类来源是否可以使用该能力家族？                     | 仅指出等级与家族的信任关卡拒绝 |
| 2   | 六层交集     | 所有适用层取交集后是否仍然允许？                     | 首个拦截层 + 有界的原因链      |
| 3   | 显式授权     | 用户是否针对该 manifest 修订版授予了这一确切能力？   | 授权错误；需要显式重新同意     |
| 4   | 运行时预算   | 操作是否落在燃料、时间、内存、描述符与队列限制之内？ | 预算类失败；不重新评估策略     |

后续关卡只能比前一道更严格，绝不能更宽松。通过信任关卡本身不产生任何授权；通过交集同样不产生授权——显式授权是独立的决定，而预算即便对已允许的操作也会施加限制。

对插件而言，记录的授权就是提供 `task-grant` 层的同意记录。撤销某项能力会把它从该记录中移除，因此下一次请求会同时通不过交集与授权检查。

## 来源信任等级

每个来源都有一个信任等级。数值越低越可信，排序仅具结构性含义：等级本身从不授予权限。未知等级标签失败关闭。

| 等级 | 标签              | 典型来源                           | 允许的边界域                                                                                       |
| :--- | :---------------- | :--------------------------------- | :------------------------------------------------------------------------------------------------- |
| 0    | `core`            | Bitty Core 自身                    | filesystem、network、process、clipboard、environment、credentials、terminal input/output、ipc、gpu |
| 1    | `bundled-lua`     | 随发行版分发的第一方 Lua           | filesystem、network、process、clipboard、environment、terminal input/output、ipc                   |
| 2    | `third-party-lua` | 注册表、本地路径、Git 或归档的 Lua | filesystem、clipboard、environment、terminal output、ipc                                           |
| 3    | `native-sidecar`  | 编译型辅助进程                     | filesystem、terminal output、ipc                                                                   |
| 4    | `external-tool`   | 外部工具、MCP 服务器、网络服务     | 默认不包含任何域                                                                                   |

矩阵拦截的是能力**家族**，而且只拦截映射到边界域的家族：`fs`、`network`、`process`、`clipboard`、`terminal` 与 `history`。只要某个家族映射到的任一域被允许，该家族就通过。共享的 `terminal` 家族是粗粒度的：只要任一终端域被允许它就会通过，因此输入/输出的逐头收窄仍由授权交集负责。矩阵没有映射的家族——`ui`、`workspace`、`panel`、`env`、`runtime`、`debug`、`platform`、`protocol`、`browser`、`layout` 与 `audio`——在每个等级都会通过这道关卡，改由授权决定。

各等级永远不能做的事：

- **等级 0（`core`）** 是宿主本身。矩阵不会给它额外权限；交集与预算仍然约束它。
- **等级 1（`bundled-lua`）** 不持有凭据域，也不包含 GPU 域。它允许已接受家族映射到的每一个域，因此矩阵不会拒绝等级 0 也会接受的任何已接受家族；它更短的列表只对当前没有已接受家族命名的域有意义。
- **等级 2（`third-party-lua`）** 永远不能使用 `network.*` 或 `process.*` 能力。其域列表也不包含终端输入、凭据与 GPU；由于 `terminal` 家族是粗粒度的，终端输入的收窄由授权负责。
- **等级 3（`native-sidecar`）** 永远不能使用 `network.*`、`process.*` 或 `clipboard.*` 能力。其域列表也不包含环境、终端输入、凭据与 GPU。
- **等级 4（`external-tool`）** 默认不允许任何已映射域，只能通过每次调用时的显式授权行事。

`credentials` 与 `gpu` 是边界域而非可安装的能力 id；当前没有已接受的能力家族暴露它们。

## 六个层

信任关卡放行该家族后，请求会在六个层上取交集。权威顺序从高到低；它只决定拒绝报告的顺序，不改变其他任何东西。

| 层（explain 标签）  | 含义                                     | 来源                                       |
| :------------------ | :--------------------------------------- | :----------------------------------------- |
| `host-ceiling`      | 内建、不可覆盖的 Core 上限               | Core                                       |
| `user-policy`       | 每用户策略                               | `$XDG_CONFIG_HOME/bitty/capabilities.conf` |
| `project-policy`    | 项目本地策略，仅在项目受信任时生效       | `<project>/.bitty/capabilities.conf`       |
| `parent-delegation` | 委派方 Agent 的有效集合                  | 委派运行时                                 |
| `task-grant`        | 任务的已授予集合；对插件而言即其同意记录 | 任务记录或插件授权账本                     |
| `agent-request`     | 本次请求确切列出的能力                   | 调用方                                     |

这些层遵循五条规则：

- **低层只会收窄。** `host-ceiling` 权威最高，`agent-request` 最低。优先级只决定原因链的顺序，绝不会放宽某项能力。
- **匹配是精确集合匹配。** `fs.read:~/projects/**` 只覆盖这一拼写——不会覆盖更宽或更窄的路径，也不会覆盖 `fs.write`。带参数的能力必须按实际使用时的确切写法声明并授予。
- **显式拒绝跨层生效。** 任何层中的 `deny` 条目都会移除该能力，即使另一层允许它。
- **标量上限向下合并。** `max_agents` 取各层声明值中的最小值（宿主默认 16）；`allow_root` 只有在所有表态的层都为 true 时才为 true，默认拒绝。请求无法提高其中任何一项。
- **委派会衰减。** 子级的有效集合是其父级集合的子集。超出父级的请求会失败关闭，而不是继承父级权限。

### 空层不是授权

最常见的误读是把缺失或空的层当作“允许”。事实并非如此。这些状态并不相同：

| 层状态           | 含义                                   | 对请求的影响                           |
| :--------------- | :------------------------------------- | :------------------------------------- |
| 缺失（未配置）   | 该层什么也没说                         | 既不允诺也不拦截；必须由另一层明确允许 |
| 存在但具约束性   | 该层列出了白名单，但未包含此能力       | 拦截；该能力不会出现在交集中           |
| 存在、封闭且为空 | 必需的授权集合中没有任何条目（任务层） | 拦截；空的任务授权是拒绝，不是通配符   |
| 存在显式拒绝     | 该层在拒绝集合中点名了此能力           | 拦截，无论其他层是否允许               |

只要任何地方都没有明确允许，有效集合就是空的。因此，授权集合为空的插件，或授权为空的任务，即使所有策略层都沉默也会被拒绝。

### Pin、冲突与漂移

层可以把某个条目 **pin** 为不可覆盖：某项能力、`max_agents` 或 `allow_root`。pin 断言的是全体一致，而不是优先级。任何能力 pin 都必须保留在每个约束能力的层中；标量 pin 必须在其他层声明该值时保持一致。收窄、省略或违背 pin 的层会产生 `policy-conflict`，绝不会被静默截断。格式错误的 pin 同样会被拒绝。

授权被 pin 到用户同意时的确切 manifest 哈希。当记录的哈希与 Bitty 将加载的 manifest 不再匹配时，pin 即过期：

- `bitty plugin info <id>` 会显示 `pin: stale`，`bitty plugin list` 会在 `PIN` 列显示 `stale`。
- 过期授权不再生效，因此在插件被重新安装或在显式同意下重新授权之前，该能力会被拒绝。
- 收窄或保持能力集合不变的更新会沿用现有授权；新增能力的更新会被阻止，等待对差异的显式批准。
- 被撤销或拒绝的能力不会因更新而复活；它需要显式重新授权。
- 当某个内置记录的 manifest 哈希与随附 manifest 不再匹配时，`bitty plugin doctor` 会报告 `ledger-pin <id>`，并要求重新运行 `bitty plugin install <id>` 以重新 pin 并重新同意。

策略漂移绝不是绕过手段：每次判定都基于当前各层求值，已被拒绝的请求不会事后转为允许。策略变化可以收窄或放宽未来的请求，但无法复活显式拒绝或过期授权。

## 交集与拒绝路径

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

诊断命令 `explain` 的输出使用相同顺序：先是六个层的行，然后是首个拒绝层、拒绝类型与原因链。

## 场景：插件加载

Lua 插件带着声明好的能力列表与一次显式同意决定安装。内置插件属于信任等级 1；其他任何 Lua 来源（注册表、本地路径、Git 或归档）都是等级 2。

| 层                  | 插件中的典型取值                                        |
| :------------------ | :------------------------------------------------------ |
| `host-ceiling`      | 内建上限；除信任关卡外没有针对插件的额外收窄            |
| `user-policy`       | 除非用户编写了 `capabilities.conf`，否则为空            |
| `project-policy`    | 除非受信任项目带有 `.bitty/capabilities.conf`，否则为空 |
| `parent-delegation` | 不适用——插件不由另一个 Agent 委派                       |
| `task-grant`        | 针对该 manifest 哈希的同意记录；为空时封闭              |
| `agent-request`     | 插件本次实际使用的那一项能力                            |

对插件作者而言，需要推理的是宿主、用户与项目策略这三层。其余三层是机械性的：`parent-delegation` 不适用，`task-grant` 是安装时获得的授权，`agent-request` 就是调用本身。如实声明插件实际使用的每一项能力，接受授权绑定到 manifest 哈希，并把 `E_CAPABILITY_DENIED` 视为正常的可捕获结果。[插件入门指南](getting-started.md)介绍安装与同意流程；[能力家族](capabilities-and-sandbox.md)介绍声明本身的写法。

## 场景：Agent 请求

Agent 请求会用到全部六个层。AI 运行时提供 Agent 的任务授权（本任务可以做什么）、父级委派（委派方 Agent 能做什么）以及 Agent 请求（本次调用想要什么）。用户与项目策略照常生效，宿主上限仍然优先。Agent 组件如何打包见 [agent 扩展](../extensions/agent.md)；Agent 语义本身属于 AI 运行时，不在本手册范围内。

由此产生两个结果：

- **扇出会收窄。** `max_agents` 取各层最小值，默认 16；子级无法提高它。`allow_root` 是合取，默认拒绝，因此 Agent 无法通过请求获得提权。
- **子级永远不会超出父级。** 超出父级有效集合的子 Agent 请求会以 `self-grant` 失败关闭，而不是被静默截断。宿主会重新授权每个委派请求；AI 运行时的策略与调度选择永远不会变成权限。

## 如何诊断拒绝

先查看记录状态，再索取判定链：

```bash
# 已安装什么、处于什么状态、授权是否过期？
bitty plugin list

# 单个插件：manifest 哈希、pin 状态与逐能力授权标记。
bitty plugin info <id>

# 针对某项能力的完整只读判定链。
bitty plugin explain <id> <capability>
```

`bitty plugin list` 会打印 `PIN` 列（`ok`、`stale` 或 `-`）以及形如 `2/3` 的 `GRANTED` 比例。`bitty plugin info <id>` 会打印 manifest 哈希，并把每项声明的能力标记为 `granted`、`requested, not granted`、`revoked` 或 `not requested`，同时给出被撤销条目的重新授权命令。

`bitty plugin explain <id> <capability>`（0.0.27 及以后）会打印信任等级、判定结果、首个拒绝层、拒绝类型、带来源的全部六层行以及收集到的 pin；发生拒绝时还会打印原因链。它接受 `--format table|json|jsonl`，被拒绝的能力会以退出码 `4` 结束。拒绝类型是以下之一：

| 拒绝类型            | 含义                                               |
| :------------------ | :------------------------------------------------- |
| `self-grant`        | 宽泛声明或委派超额试图自行授予权限                 |
| `exceeds-policy`    | 请求超出了计算出的交集                             |
| `policy-conflict`   | 被 pin 的条目遭到收窄，或信任/角色关卡拒绝了该家族 |
| `untrusted-project` | 存在项目策略，但项目未受信任                       |
| `invalid-request`   | 请求格式错误或超出已记录的边界                     |

在 0.0.27 之前的构建中，同样的拒绝会以标准错误表返回给 Lua：匹配 `err.code`（能力拒绝为 `E_CAPABILITY_DENIED`），并从 `err.message` 读取宿主编写的原因。`bitty plugin explain` 是前进路径：其层标签、拒绝类型与退出码保持稳定。

本构建有两点状态说明：

- 运行中的宿主会强制执行信任关卡与记录的授权。用户与项目策略文件会被 `bitty plugin explain` 读取、校验并报告，但在本构建中仅具建议性；策略层的拒绝是失败关闭的指引，而不是一次变更。适用时 `explain` 会打印该说明。
- `explain` 报告只陈述预算上限。它不会从独立进程虚构实时用量计数。

等剩余的策略接线落地后，`bitty plugin explain` 将成为完整判定链而非建议性报告。

## 下一步

- [能力与沙箱](capabilities-and-sandbox.md) —— 上文引用的能力家族与资源预算。
- [插件入门](getting-started.md) —— 安装、同意、启用与更新流程。
- [故障排查与安全模式](../faq/troubleshooting.md) —— 运行时诊断与安全模式。
