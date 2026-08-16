import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { type GrokTuiConfig, loadConfig, saveConfig } from "./config.ts";
import { installEditor } from "./editor.ts";
import { installFooter } from "./footer.ts";
import { installHeader } from "./header.ts";
import { detectNerdFont } from "./icons.ts";
import { installSpinner } from "./spinner.ts";
import { installWorkingStats } from "./working.ts";

type Teardown = () => void;

/**
 * Wipe the screen, the scrollback, and the shell line that launched pi.
 *
 * `session_start` fires after `ui.start()` but before the first frame reaches
 * the terminal, and pi's first frame paints from wherever the cursor sits
 * without clearing. So this is the last safe moment to clear: any later and
 * pi's differential renderer would still believe the wiped lines are on screen.
 * Hence once per process — a `/new` session or `/grok-tui reload` must not
 * re-clear.
 */
let hasCleared = false;
function clearTerminal(): void {
	if (hasCleared || !process.stdout.isTTY) return;
	hasCleared = true;
	process.stdout.write("\x1b[2J\x1b[H\x1b[3J");
}

/** Tool output starts collapsed; pi's own ctrl+o still toggles it. */
function installTools(ctx: ExtensionContext, config: GrokTuiConfig): Teardown {
	if (!config.collapseTools) return () => {};
	ctx.ui.setToolsExpanded(false);
	return () => ctx.ui.setToolsExpanded(true);
}

export default function (pi: ExtensionAPI) {
	let teardowns: Teardown[] = [];
	let config: GrokTuiConfig = loadConfig();

	const install = (ctx: ExtensionContext) => {
		if (ctx.mode !== "tui" || !config.enabled) return;
		teardowns = [
			installHeader(pi, ctx, config),
			installFooter(pi, ctx, config),
			installEditor(ctx, config),
			installSpinner(ctx, config),
			installTools(ctx, config),
		];
	};

	const uninstall = () => {
		for (const teardown of teardowns.reverse()) teardown();
		teardowns = [];
	};

	// Event handlers can't be unregistered, so this reads config lazily and
	// no-ops when the chrome is off.
	installWorkingStats(pi, () => config);

	pi.on("session_start", (_event, ctx) => {
		// Independent of `enabled`: a clean screen isn't chrome.
		if (ctx.mode === "tui" && config.clearOnStart) clearTerminal();
		install(ctx);
	});

	pi.registerCommand("grok-tui", {
		description: "Toggle the Grok TUI chrome, or show what it resolved",
		handler: async (args, ctx) => {
			const arg = (args ?? "").trim();

			if (arg === "on" || arg === "off") {
				config = { ...config, enabled: arg === "on" };
				saveConfig(config);
				uninstall();
				install(ctx);
				ctx.ui.notify(`grok-tui ${arg}`, "info");
				return;
			}

			if (arg === "reload") {
				config = loadConfig();
				uninstall();
				install(ctx);
				ctx.ui.notify("grok-tui reloaded", "info");
				return;
			}

			const icons = config.icons === "auto" ? `auto → ${detectNerdFont() ? "nerd" : "off"}` : config.icons;
			ctx.ui.notify(
				[
					`enabled ${config.enabled}`,
					`header ${config.header}${config.headerAnimation ? " + animation" : ""}`,
					`editor ${config.editorFrame}`,
					`clearOnStart ${config.clearOnStart}`,
					`icons ${icons}`,
					"edit ~/.pi/agent/grok-tui.json, then /grok-tui reload",
				].join("  ·  "),
				"info",
			);
		},
	});
}
