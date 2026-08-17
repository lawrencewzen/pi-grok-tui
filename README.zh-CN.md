<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/lawrencewzen/pi-grok-tui/main/docs/wordmark-dark.svg">
  <img src="https://raw.githubusercontent.com/lawrencewzen/pi-grok-tui/main/docs/wordmark-light.svg" alt="pi-grok-tui" width="240">
</picture>

<p>
  给 <a href="https://github.com/earendil-works/pi">pi</a> 的一套 Grok 风格外观<br>
  <sub>主题管颜色，扩展管布局</sub>
</p>

<p>
  <a href="https://www.npmjs.com/package/pi-grok-tui"><img alt="npm" src="https://img.shields.io/npm/v/pi-grok-tui?style=flat-square&labelColor=101010&color=3a3a3a"></a>
  <a href="LICENSE"><img alt="license MIT" src="https://img.shields.io/badge/license-MIT-3a3a3a?style=flat-square&labelColor=101010"></a>
  <img alt="需要 pi 0.84 或更新版本" src="https://img.shields.io/badge/pi-%E2%89%A5%200.84-3a3a3a?style=flat-square&labelColor=101010">
  <a href="README.md"><img alt="English docs" src="https://img.shields.io/badge/docs-English-3a3a3a?style=flat-square&labelColor=101010"></a>
</p>

<img alt="装上 grok-tui 后的 pi：带框的两栏 header，单行 footer" src="https://raw.githubusercontent.com/lawrencewzen/pi-grok-tui/main/docs/screenshot.png">

</div>

## 这是什么

一起装进来的两半。

**主题**是那套配色，深浅各一份。**扩展**重画 pi 交给扩展的那部分界面：带框的两栏 header，启动动画真的会播；单行 footer；闭合的编辑器边框；不上下浮动的 spinner；带秒数和输出 token 的 working 行。工具输出默认折叠。

从零写的，只用 pi 的公开 API（`setHeader` / `setFooter` / `setEditorComponent`），没有 fork 也没有打补丁。这套 API 够不到的地方仍归 pi：消息流、工具框、语法高亮。主题能给它们换颜色，换不了结构。

## 安装

```bash
pi install npm:pi-grok-tui
```

然后在 `/settings` 里选主题，或者写进 `~/.pi/agent/settings.json`：

```json
{ "theme": "grok" }
```

重启 pi。`/grok-tui` 会打印当前解析到的配置，背后的文件是 `~/.pi/agent/grok-tui.json`，界面的每个部件都能在那里单独关掉。

两件值得知道的事。`setHeader`、`setFooter`、`setEditorComponent` 各只有一个槽位，最后加载的扩展赢，所以同时装了别的改界面的扩展就得二选一。另外，比起装它，你要是更想改它——克隆仓库跑 `./install.sh`，主题走软链、扩展按路径注册，改完就地生效。

## 设计

**强调色是白。** 层次靠灰阶，不靠色相。彩色留给有语义的东西——footer 里唯一让颜色回来的地方是上下文那段，快满时转琥珀，再满转红。

**给能据以行动的数字。** footer 写的是 `18k/128k · 86% left`，不是光一个百分比。同样是剩 20%，128k 的窗口只剩 25k，1M 的窗口还有 200k，而你据以决定要不要 compact 的是绝对值。

**不许浮动。** pi 原生 spinner 是两个亮点在 2×4 的 braille 点阵里绕圈，字形重心每帧移动约字号的 21%——转起来相对旁边的文字明显在飘。这里改成八点亮七点、转的是那个缺口：还是同一个 braille 字格，包围盒恒定，抖动归零。

**动画会播。** logo 有 22 帧的启动编排，pi-open-tui 把数据带上了却从没播过——只有最后一帧被画出来。这里让它播，每次会话一遍，换成灰阶。

**属于终端的还给终端。** 画布颜色和字体属于你的终端模拟器，不属于主题；光标也交回终端自己画，这样它尊重你的 `cursor-style`。深色配色是照着 Ghostty 的 Grok 主题校的，所以 pi 和同一个窗口里的 `ls`、`git`、`vim` 是一套颜色。你的终端主题不同就得重校——不变的是三条：强调色是白，层次靠灰阶，彩色只在有语义时出现。

## 致谢

logo 的网格坐标和 22 帧编排来自 [pi-open-tui](https://github.com/OldSuns/pi-open-tui)（MIT），它又源自 pi 官方安装脚本里的标记。tagline 那句话也是从它的 header 继承来的。

MIT，见 [LICENSE](LICENSE)。
