import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { type GrokTuiConfig, loadConfig, saveConfig } from "./config.ts";
import { installEditor } from "./editor.ts";
import { installFooter } from "./footer.ts";
import { installHeader } from "./header.ts";
import { detectNerdFont } from "./icons.ts";
import { installSpinner } from "./spinner.ts";

type Teardown = () => void;

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
		];
	};

	const uninstall = () => {
		for (const teardown of teardowns.reverse()) teardown();
		teardowns = [];
	};

	pi.on("session_start", (_event, ctx) => {
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
					`icons ${icons}`,
					"edit ~/.pi/agent/grok-tui.json, then /grok-tui reload",
				].join("  ·  "),
				"info",
			);
		},
	});
}
