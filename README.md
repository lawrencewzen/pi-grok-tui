# pi-grok-tui

A Grok-styled look for [pi](https://github.com/earendil-works/pi) — a theme for the colors, an extension for the layout.

[中文](README.zh-CN.md)

```
┌─ pi v0.84.2 ───────────────────────────────────────────────────────────────┐
│                                         Welcome                            │
│      █████████                          Ask pi anything                    │
│      ███   ███                          ──────────                         │
│      ██████   ███                       Commands 7                         │
│      ███      ███                       /review                            │
│                                         /changelog                         │
│      Let's build something great        /grok-tui                          │
│      DeepSeek Chat · high               /compact                           │
│      ~/Projects/pi-grok-tui             /help for all                      │
└────────────────────────────────────────────────────────────────────────────┘

~/Projects/pi-grok-tui | DeepSeek Chat | high | 18k/128k · 86% left
```

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
