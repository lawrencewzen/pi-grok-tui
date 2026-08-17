<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/lawrencewzen/pi-grok-tui/main/docs/wordmark-dark.svg">
  <img src="https://raw.githubusercontent.com/lawrencewzen/pi-grok-tui/main/docs/wordmark-light.svg" alt="pi-grok-tui" width="240">
</picture>

<p>
  A Grok-styled look for <a href="https://github.com/earendil-works/pi">pi</a><br>
  <sub>a theme for the colors, an extension for the layout</sub>
</p>

<p>
  <a href="https://www.npmjs.com/package/pi-grok-tui"><img alt="npm" src="https://img.shields.io/npm/v/pi-grok-tui?style=flat-square&labelColor=101010&color=3a3a3a"></a>
  <a href="LICENSE"><img alt="license MIT" src="https://img.shields.io/badge/license-MIT-3a3a3a?style=flat-square&labelColor=101010"></a>
  <img alt="requires pi 0.84 or newer" src="https://img.shields.io/badge/pi-%E2%89%A5%200.84-3a3a3a?style=flat-square&labelColor=101010">
  <a href="README.zh-CN.md"><img alt="中文文档" src="https://img.shields.io/badge/docs-zh--CN-3a3a3a?style=flat-square&labelColor=101010"></a>
</p>

<img alt="pi with the grok-tui theme and extension: framed two-column header, single-line footer" src="https://raw.githubusercontent.com/lawrencewzen/pi-grok-tui/main/docs/screenshot.png">

</div>

## What it is

Two halves that install together.

The **theme** carries the palette — dark and light. The **extension** redraws the chrome pi hands to extensions: a framed two-column header whose startup animation actually plays, a single-line footer, a closed editor frame, a spinner that doesn't bob, and a working line that counts seconds and output tokens. Tool output starts collapsed.

It's written from scratch against pi's public API (`setHeader` / `setFooter` / `setEditorComponent`) — nothing forked, nothing patched. What that API doesn't reach stays pi's: the message stream, the tool boxes, the syntax highlighting. A theme can recolor those; it can't restructure them.

## Install

```bash
pi install npm:pi-grok-tui
```

Then pick the theme in `/settings`, or write it into `~/.pi/agent/settings.json`:

```json
{ "theme": "grok" }
```

Restart pi. `/grok-tui` prints the config it resolved; the file behind it is `~/.pi/agent/grok-tui.json` and every part of the chrome can be turned off there individually.

Two things worth knowing. `setHeader`, `setFooter` and `setEditorComponent` have one slot each and the last extension to load wins, so if you run another chrome extension, keep one of the two. And if you'd rather hack on this than install it, clone the repo and run `./install.sh` — it symlinks the themes and registers the extension by path, so edits take effect in place.

## Design

**White is the accent.** Depth comes from grayscale, not from hue. Color is kept for things that mean something — the one place it returns to the footer is the context gauge, which goes amber and then red as you run out of room.

**Numbers you can act on.** The footer reads `18k/128k · 86% left`, not a bare percentage. The same 20% is 25k tokens on a 128k window and 200k on a 1M one, and the number you decide to compact on is the absolute one.

**Nothing bobs.** pi's stock spinner runs two lit dots around a 2×4 braille grid, which moves the glyph's center of mass by about 21% of the font size every frame — the spinner visibly floats against the text beside it. This one lights seven of eight dots and rotates the gap instead: same braille cell, fixed bounding box, no jitter.

**The animation plays.** The logo has 22 frames of startup choreography that pi-open-tui shipped but never ran — only its final frame was ever drawn. Here it plays, once per session, in grayscale.

**The terminal keeps what's the terminal's.** The canvas color and the font belong to your emulator, not to a theme, and the caret is left for the terminal to draw so it respects your `cursor-style`. The dark palette is tuned against Ghostty's Grok theme, so pi matches the `ls`, `git` and `vim` sharing that window. Retune it if your terminal theme differs — the three rules that carry over are: the accent is white, hierarchy is grayscale, color only where it carries meaning.

## Credits

Logo grid coordinates and the 22-frame choreography come from [pi-open-tui](https://github.com/OldSuns/pi-open-tui) (MIT), which took the mark from pi's official install script. The tagline is inherited from its header.

MIT — see [LICENSE](LICENSE).
