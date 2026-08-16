import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import type { KeyId } from "@earendil-works/pi-tui";
import { type GrokTuiConfig, loadConfig, saveConfig } from "./config.ts";
import { installEditor } from "./editor.ts";
import { installFooter } from "./footer.ts";
import { installHeader } from "./header.ts";
import { detectNerdFont } from "./icons.ts";
import { installSpinner } from "./spinner.ts";
import { installThinking } from "./thinking.ts";
import { installWorkingStats } from "./working.ts";

type Teardown = () => void;

/**
 * Wipe the screen, the scrollback, and the shell line that launched pi.
 *
 * `session_start` fires after `ui.start()` but before the first frame reaches
 * the terminal, and that frame paints from wherever the cursor sits without
 * clearing. So this is the last safe moment: any later and pi's differential
 * renderer would still believe the wiped lines are on screen. Hence once per
 * process — `/new` and `/grok-tui reload` must not re-clear.
 */
let hasCleared = false;
function clearTerminal(): void {
	if (hasCleared) return;
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

	// Event handlers can't be unregistered, so these read config lazily and
	// no-op when the chrome is off.
	installWorkingStats(pi, () => config);
	const thinking = installThinking(pi, () => config);

	const reportThinking = (ctx: ExtensionContext) =>
		ctx.ui.notify(`Thinking blocks: ${thinking.isVisible() ? "visible" : "hidden"}`, "info");

	if (config.thinkingToggleKey) {
		pi.registerShortcut(config.thinkingToggleKey as KeyId, {
			description: "Show or hide thinking blocks",
			handler: (ctx) => {
				thinking.toggle(ctx);
				reportThinking(ctx);
			},
		});
	}

	pi.on("session_start", (_event, ctx) => {
		// Independent of `enabled`: a clean screen isn't chrome.
		if (ctx.mode === "tui" && config.clearOnStart) clearTerminal();
		install(ctx);
	});

	// pi answers to /quit but not /exit. A command context's shutdown() is the
	// same path /quit takes: immediate while idle, deferred to the end of the
	// turn otherwise.
	pi.registerCommand("exit", {
		description: "Quit pi (same as /quit)",
		handler: async (_args, ctx) => ctx.shutdown(),
	});

	pi.registerCommand("grok-tui", {
		description: "Toggle the Grok TUI chrome, or show what it resolved",
		handler: async (args, ctx) => {
			const [arg, value] = (args ?? "").trim().split(/\s+/);

			if (arg === "on" || arg === "off") {
				config = { ...config, enabled: arg === "on" };
				saveConfig(config);
				uninstall();
				install(ctx);
				ctx.ui.notify(`grok-tui ${arg}`, "info");
				return;
			}

			if (arg === "thinking") {
				if (value === "show") thinking.set(ctx, true);
				else if (value === "hide") thinking.set(ctx, false);
				else thinking.toggle(ctx);
				reportThinking(ctx);
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
					`thinking ${thinking.isVisible() ? "visible" : "hidden"}${config.thinkingToggleKey ? ` · ${config.thinkingToggleKey}` : ""}`,
					`icons ${icons}`,
					"edit ~/.pi/agent/grok-tui.json, then /grok-tui reload",
				].join("  ·  "),
				"info",
			);
		},
	});
}
