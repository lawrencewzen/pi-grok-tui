# pi-grok-tui

给 [pi](https://github.com/earendil-works/pi) 的一套 Grok 风格外观：主题（颜色）+ 扩展（布局）。

不是 fork 任何现有包，从零写的，只用 pi 的公开 API（`setHeader` / `setFooter` / `setEditorComponent`）。

```
┌─ pi v0.84.2 ───────────────────────────────────────────────────────────────┐
│                                         Welcome                            │
│      █████████                          Ask pi anything                    │
│      ███   ███                          ──────────                         │
│      ██████   ███                       Commands 7                         │
│      ███      ███                       /pi-subagents                      │
│                                         /gather-context-and-clarify        │
│      Let's build something great        /review-loop                       │
│      DeepSeek Chat · high               /parallel-review                   │
│      ~/Projects/pi-tui-theme            /help for all                      │
└────────────────────────────────────────────────────────────────────────────┘

~/Projects/pi-tui-theme | DeepSeek Chat | 86% left
```

## 装什么、不装什么

| 部件 | 归谁管 | 这里做了什么 |
|---|---|---|
| 启动清屏 | 扩展 | 在 pi 画第一帧之前清掉屏幕、回滚缓冲和你敲的那行 `pi` |
| header | 扩展 | 直角 hairline 框、白色方块 π、右栏命令提示；**启动动画真的会播** |
| footer | 扩展 | 单行三段 `cwd \| 模型 \| 剩余上下文`，`\|` 分隔，默认纯文字（Nerd Font 图标可选） |
| 编辑器 | 扩展 | 方角闭合细框（pi 默认只有上下两条横线），边框色仍随 thinking 等级和 bash 模式变化 |
| 编辑器光标 | 扩展 | 交给终端自己画（尊重你的 `cursor-style`），剥掉 pi 的反显方块 |
| 补全面板 | 扩展 | 向上展开，输入框留在原地；面板本身仍由 pi 渲染 |
| spinner | 扩展 | braille 转圈，换成重心恒定的一组帧（见下） |
| working 行 | 扩展 | `Working 12s · 3.4k tok`，秒数和输出 token 每 250ms 刷新；推理时变 `Working with thinking`，pi 自己那句 `Thinking...` 同时抹掉 |
| 思考块 | 扩展 | 默认整段不渲染（数据仍在 session 和上下文里），`alt+t` 随时调出来 |
| 工具输出 | 扩展 | 启动时折叠，`Ctrl+O`（pi 内置）随时展开 |
| 启动清单 | pi 内核 | 替换不了，用 `quietStartup` 静音；header 右栏改从 `getCommands()` 取真实命令补上 |
| 用户消息、工具框、语法高亮 | 主题 | 只能改颜色，结构是 pi 内核画的 |
| 消息流缩进、工具框骨架 | pi 内核 | 扩展 API 够不到 |

## 安装

```bash
./install.sh              # 主题 + 扩展，并把 pi-open-tui 置为 enabled:false
./install.sh --themes     # 只装主题，不动界面
./install.sh --uninstall  # 全部还原
```

装完重启 pi。主题选择：`/settings` 里选 `grok`，或写进 `~/.pi/agent/settings.json`：

```json
{ "theme": "grok" }
```

`pi-open-tui` 必须停用——它和本扩展抢同一组 API，后加载的会覆盖前面的。脚本只是把它的 `enabled` 翻成 `false`，不卸载，`--uninstall` 会翻回来。同时会设 `quietStartup: true`，把 pi 那段 `[Skills] [Prompts] [Extensions] [Themes]` 清单收起来（诊断和冲突警告不受影响，照常显示）。

**注意加载顺序**：`~/.pi/agent/extensions/` 是自动发现目录，加载顺序排在 `settings.json` 里的扩展之后。那里面任何调 `setHeader` / `setFooter` / `setEditorComponent` 的文件都会覆盖本扩展。`install.sh` 会扫描并列出这类文件。

**与 `pi-working-phrase` 冲突**：`workingStats` 每 250ms 重写 working 行，会盖掉那个包的随机工作词。想留着它就设 `workingStats: false`，想要统计就二选一。

## 配置

`~/.pi/agent/grok-tui.json`，改完 `/grok-tui reload`：

```json
{
  "enabled": true,
  "clearOnStart": true,
  "thinkingInWorking": true,
  "thinkingBlocks": "hidden",
  "thinkingToggleKey": "alt+t",
  "header": "full",
  "headerAnimation": true,
  "tagline": "Let's build something great",
  "commandTips": 4,
  "editorFrame": "box",
  "cursor": "bar",
  "completion": "above",
  "spinner": "braille",
  "workingStats": true,
  "workingLabel": "Working",
  "collapseTools": true,
  "icons": "off",
  "footer": { "gitBranch": false, "thinking": false, "cost": false, "indent": 1 }
}
```

- `clearOnStart` — 启动时清屏：屏幕、回滚缓冲、连你敲的那行 `pi` 一起清掉，header 从第一行开始画。只在进程内清一次（`/new`、`/grok-tui reload` 不会再清，否则会打乱 pi 的差分渲染），`enabled: false` 时依然生效
- `thinkingInWorking` — 思考状态并进 working 行：模型在推理时是 `Working with thinking 26s · ~2.7k tok`，不推理时就是 `Working …`。同时把 pi 那句 `Thinking...` 抹成空串，省得两处同时喊
- `thinkingBlocks` — 思考块的初始状态，`hidden` 或 `visible`。隐藏是**只改渲染**：思考内容照常留在 session 和模型上下文里，随时能调出来看
- `thinkingToggleKey` — 切换思考显隐的键，默认 `alt+t`。`ctrl+t` 是 pi 自己的开关键、被它保留了，扩展抢不过来；设成 `""` 就只留 `/grok-tui thinking`
- `header` — `full` 带框两栏 / `plain` 去框 / `logo` 只留标记
- `headerAnimation` — 启动时播一次组装动画（22 帧 × 70ms）
- `tagline` — logo 下那句话，设成 `""` 就没了
- `commandTips` — 右栏抽样显示几个真实命令，优先你自己装的 skill 和 prompt。`0` 隐藏整个右栏
- `editorFrame` — `box` 方角闭合框 / `lines` 回到 pi 默认的上下横线
- `cursor` — `bar` 把光标交给终端自己画（用终端的 cursor-style）/ `block` 保留 pi 的反显方块
- `completion` — `above` 补全向上展开 / `below` pi 的默认方向
- `spinner` — `braille` 重心恒定的 braille 转圈（默认）/ `square` 方形帧但只有 4 帧 / `pi` 原生那组（会上下抖）
- `workingStats` — working 行后面加秒数和输出 token
- `workingLabel` — 那行前面的词
- `collapseTools` — 启动时折叠工具输出。这只设初始状态，`Ctrl+O` 照常切换
- `icons` — `off` 纯文字 / `nerd` 强制开 Nerd Font 图标 / `auto` 按终端类型猜。`PI_NERD_FONT=0` 可强制关
- `footer.gitBranch` / `footer.thinking` / `footer.cost` — 打开会多出 `| main +2`、`| high`、`| 0.31` 这几段
- `footer.indent` — footer 左缩进几格，默认 `1`。框线字符是画在字格正中的，文字却从字格左边起笔，所以 footer 落在第 0 列时会显得比上面的框线左出半格；缩进一格把它压回框线上。想要严格的网格对齐就设 `0`

命令：`/grok-tui`（看当前解析结果）、`/grok-tui on|off`、`/grok-tui reload`、`/grok-tui thinking [show|hide]`（不带参数就是切换，等价于 `alt+t`）、`/exit`（pi 只认 `/quit`，这里补一个同义词，走的是同一条退出路径）。

### 思考块为什么要交给扩展

pi 自己隐藏思考块（`hideThinkingBlock: true`）是把整段推理换成一句 `Thinking...`，那行**是 pi 画的、扩展只能改文字不能删行**——抹成空串也还是一行空白，加上后面的间隔行，一段思考要占两行。

改走 Markdown 那条路（`hideThinkingBlock: false`）就没这问题：扩展用 markdown transformer 把思考内容换成空串，pi 渲染 0 行，只剩它给思考块留的一个间隔行。`install.sh` 会帮你把 `hideThinkingBlock` 设成 `false`（这本来就是 pi 的默认值），显隐改由 `alt+t` 控制。

数据一点没动：思考块仍原样存在消息里，session 文件和回传给模型的上下文都完整，`alt+t` 随时能把历史里的推理重新显示出来（切换时扩展会重新应用当前主题，强制整棵组件树重绘）。

## 主题

`themes/grok.json` 和 `themes/grok-light.json`。深色版**不是凭空配的**——它继承自作者 Ghostty 的 Grok 主题：

```
background #141414   foreground #e1e1e1   cursor #d8b173
palette 1/2/12 = #c6787a / #a8b380 / #a9c1cf
```

功能色直接取自那套 palette，线用终端的 selection 色 `#333333`，块背景 `#1a1a1a / #1e1e1e` 只比画布亮一到两档，thinking max 用光标的琥珀色。这样 pi 和同一个终端里的 ls、git、vim 是一套颜色。

**换终端主题的话这套要重新校。** 三条规则不变：强调色是白不是彩色；层次靠灰阶不靠色相；彩色只在有语义时出现。

两件主题管不了的事：

- **画布颜色**属于终端。pi 只画文字和局部色块。
- **字体**属于终端。这套配色是照着 `Maple Mono NF CN` 校的，Nerd Font 图标也依赖它。

## 开发

```bash
node preview.mjs themes/grok.json   # 在终端里渲染一屏假 TUI，看配色
node preview-chrome.mjs 78          # 不启动 pi，直接渲染 header/footer 各变体，看布局
node validate.mjs                   # 校验主题 token 完整性与 var 引用
open prototype.html                 # 设计稿：对比、变体、色板、决策记录
```

主题文件是软链，编辑后 pi 会热重载。扩展改完要重启 pi 或 `/grok-tui reload`。

## working 行的统计从哪来

- **秒数**：`agent_start` 到 `agent_end` 之间计时，跨越整个 agent 运行——多轮工具调用不会重新计时。
- **token**：已结束的消息用 provider 报告的 `usage.output` 累加；正在流的那条，如果 provider 还没报，就用 `estimateTokens()` 按文本估算。

**为什么需要估算**：走 OpenAI 兼容协议的 provider（DeepSeek 等）只在最后一个 chunk 里返回 usage（`stream_options: {include_usage: true}`），所以一整条回复流完之前，报告值都是 0——数字会一动不动然后突然跳。估算填掉这个空档，让它从第一秒就在走。

**`~` 表示当前数字含估算成分**，provider 的真实数字一到就接管（`~712 tok` → `712 tok`）。估算按字符数换算，跟真实计费 token 有出入。

估算只在每次重绘（250ms）时算一次，不是每个 token 都算——`message_update` 每个 delta 都会触发，那样太密。

## 为什么换 spinner 帧

pi 原生的 `⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏` 是**两点绕圈**——两个亮点在 2×4 的 braille 点阵里跑。这个网格带来两个问题（下列尺寸在 Maple Mono NF CN 里实测，单位 1/1000 em）：

| | 尺寸 | 宽高比 | 重心跳动 |
|---|---|---|---|
| pi 原生 `⠋⠙⠹…` | 376×772 | 0.49 | **213** |
| `braille` `⣾⣽⣻…` | 376×772 | 0.49 | 0 |
| `square` `◧◩◨◪` | **600×600** | **1.00** | 0 |

- **重心跳动 213**（约字号 21%）：亮点在动，字形重心跟着上下移，spinner 相对旁边的文字明显浮动。
- **宽高比 0.49**：braille 块是 2 列 × 4 行，天生是竖长的矩形。

默认用 `braille`：八点亮七点、转的是缺口，包围盒恒定，抖动归零，形状仍是 braille 的竖矩形。`square` 用完整方框翻转内部填充，形状是正方形，但 Unicode 里这类方形部分填充字符只有 4 个（U+25E7–25EA），帧数减半、动画更跳。

两组在 Maple Mono NF CN 和 JetBrains Mono NF 里都有完整字形。

## 致谢

logo 的网格坐标和 22 帧编排来自 [pi-open-tui](https://github.com/OldSuns/pi-open-tui)（MIT），它又源自 pi 官方安装脚本里的标记。那个包只渲染最后一帧——动画数据一直没被播过。这里把它播出来，并换成灰阶。

## License

MIT，见 [LICENSE](LICENSE)。
