#!/usr/bin/env bash
# Install the grok theme and TUI chrome into pi.
#
#   ./install.sh            link themes + register the extension + disable pi-open-tui
#   ./install.sh --themes   themes only, leave the chrome alone
#   ./install.sh --uninstall  undo all of the above
#
# Nothing is deleted: pi-open-tui is only flipped to enabled:false, and the
# extension is added to / removed from settings.json by path.
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
agent="${PI_AGENT_DIR:-$HOME/.pi/agent}"
themes_dir="$agent/themes"
settings="$agent/settings.json"
open_tui="$agent/open-tui.json"
entry="$root/extensions/grok-tui/index.ts"
mode="${1:-}"

link_themes() {
	mkdir -p "$themes_dir"
	for f in "$root"/themes/*.json; do
		ln -sfn "$f" "$themes_dir/$(basename "$f")"
		echo "linked   $themes_dir/$(basename "$f")"
	done
}

unlink_themes() {
	for f in "$root"/themes/*.json; do
		target="$themes_dir/$(basename "$f")"
		[ -L "$target" ] && rm "$target" && echo "removed  $target"
	done
	return 0
}

# $1 = add | remove
settings_extension() {
	python3 - "$settings" "$entry" "$1" <<'PY'
import json, sys, pathlib
path, entry, action = pathlib.Path(sys.argv[1]), sys.argv[2], sys.argv[3]
data = json.loads(path.read_text()) if path.exists() else {}
extensions = data.get("extensions", [])
if action == "add" and entry not in extensions:
    extensions.append(entry)
    print(f"registered  {entry}")
elif action == "remove" and entry in extensions:
    extensions.remove(entry)
    print(f"unregistered {entry}")
else:
    print(f"unchanged   settings.json")
data["extensions"] = extensions
path.parent.mkdir(parents=True, exist_ok=True)
path.write_text(json.dumps(data, indent=2) + "\n")
PY
}

# The startup resource listing ([Skills]/[Prompts]/[Extensions]/[Themes]) is
# drawn by pi itself and cannot be replaced by an extension — only silenced. The
# header samples the same commands instead. Diagnostics still show when quiet.
# $1 = on | off
set_quiet_startup() {
	python3 - "$settings" "$1" <<'QUIET'
import json, sys, pathlib
path, action = pathlib.Path(sys.argv[1]), sys.argv[2]
data = json.loads(path.read_text()) if path.exists() else {}
if action == "on":
    if data.get("quietStartup") is True:
        print("unchanged   quietStartup=true")
    else:
        data["quietStartup"] = True
        print("set         quietStartup=true  (\u542f\u52a8\u6e05\u5355\u6536\u8fdb header)")
elif "quietStartup" in data:
    del data["quietStartup"]
    print("removed     quietStartup")
else:
    print("unchanged   quietStartup")
path.parent.mkdir(parents=True, exist_ok=True)
path.write_text(json.dumps(data, indent=2) + "\n")
QUIET
}

# pi's own hiding swaps thinking for a `Thinking...` label and still spends a
# row on it. Handing thinking to the extension (hideThinkingBlock=false) lets it
# render nothing at all, toggled with alt+t. false is also pi's default, so
# uninstall just drops the key.
# $1 = on | off
set_thinking() {
	python3 - "$settings" "$1" <<'THINK'
import json, sys, pathlib
path, action = pathlib.Path(sys.argv[1]), sys.argv[2]
data = json.loads(path.read_text()) if path.exists() else {}
if action == "on":
    if data.get("hideThinkingBlock") is True:
        data["hideThinkingBlock"] = False
        print("set         hideThinkingBlock=false  (思考显隐交给扩展，alt+t 切换)")
    else:
        print("unchanged   hideThinkingBlock")
elif "hideThinkingBlock" in data:
    del data["hideThinkingBlock"]
    print("removed     hideThinkingBlock")
else:
    print("unchanged   hideThinkingBlock")
path.parent.mkdir(parents=True, exist_ok=True)
path.write_text(json.dumps(data, indent=2) + "\n")
THINK
}

# $1 = true | false
set_open_tui() {
	[ -f "$open_tui" ] || return 0
	python3 - "$open_tui" "$1" <<'PY'
import json, sys, pathlib
path, value = pathlib.Path(sys.argv[1]), sys.argv[2] == "true"
data = json.loads(path.read_text())
if data.get("enabled") == value:
    print(f"unchanged   pi-open-tui enabled={str(value).lower()}")
else:
    data["enabled"] = value
    path.write_text(json.dumps(data, indent=2) + "\n")
    print(f"set         pi-open-tui enabled={str(value).lower()}")
PY
}

# setHeader/setFooter/setEditorComponent each have exactly one slot — whoever
# loads last wins. Auto-discovered extensions load after settings.json entries,
# so a stray file in extensions/ silently overrides this package.
check_conflicts() {
	local found=""
	for f in "$agent"/extensions/*.ts "$agent"/extensions/*.js; do
		[ -f "$f" ] || continue
		if grep -lq "setHeader\|setFooter\|setEditorComponent" "$f" 2>/dev/null; then
			found="$found  $f\n"
		fi
	done
	[ -z "$found" ] && return 0
	echo
	echo "⚠️  这些扩展也在改 header/footer/编辑器，会覆盖本扩展："
	printf "%b" "$found"
	echo "   移到 $agent/extensions-backup/ 即可停用（不会删除）。"
}

case "$mode" in
--uninstall)
	unlink_themes
	settings_extension remove
	set_quiet_startup off
	set_thinking off
	set_open_tui true
	echo
	echo "回到原状。重启 pi 生效。"
	;;
--themes)
	link_themes
	echo
	echo "主题已装。在 pi 里 /settings 选 grok。"
	;;
*)
	link_themes
	settings_extension add
	set_quiet_startup on
	set_thinking on
	set_open_tui false
	check_conflicts
	echo
	echo "装好了。重启 pi 生效。"
	echo "  /settings      选 grok 主题"
	echo "  alt+t          显示/隐藏思考块"
	echo "  /grok-tui      查看当前解析到的配置"
	echo "  ./install.sh --uninstall   全部还原"
	;;
esac
