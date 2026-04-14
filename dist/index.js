/**
 * pi-tools
 *
 * Extension to view and manage active tools.
 *
 * Commands:
 *   /tools       - Interactive tool selector
 *   /show-tools  - Display list of active tools
 */
import { getSettingsListTheme } from "@mariozechner/pi-coding-agent";
import { Container, SettingsList } from "@mariozechner/pi-tui";
export default function piToolsExtension(pi) {
    let enabledTools = new Set();
    let allTools = [];
    function persistState() {
        pi.appendEntry("tools-config", {
            enabledTools: Array.from(enabledTools),
        });
    }
    function applyTools() {
        pi.setActiveTools(Array.from(enabledTools));
    }
    function restoreFromBranch(ctx) {
        allTools = pi.getAllTools();
        const branchEntries = ctx.sessionManager.getBranch();
        let savedTools;
        for (const entry of branchEntries) {
            if (entry.type === "custom" && entry.customType === "tools-config") {
                const data = entry.data;
                if (data?.enabledTools) {
                    savedTools = data.enabledTools;
                }
            }
        }
        if (savedTools) {
            const allToolNames = allTools.map((t) => t.name);
            enabledTools = new Set(savedTools.filter((t) => allToolNames.includes(t)));
            applyTools();
        }
        else {
            enabledTools = new Set(pi.getActiveTools());
        }
    }
    // /tools - Interactive selector
    pi.registerCommand("tools", {
        description: "Enable/disable tools",
        handler: async (_args, ctx) => {
            allTools = pi.getAllTools();
            await ctx.ui.custom((tui, theme, _kb, done) => {
                const items = allTools.map((tool) => ({
                    id: tool.name,
                    label: tool.name,
                    currentValue: enabledTools.has(tool.name) ? "enabled" : "disabled",
                    values: ["enabled", "disabled"],
                }));
                const container = new Container();
                container.addChild(new (class {
                    render(_width) {
                        return [theme.fg("accent", theme.bold("Tool Configuration")), ""];
                    }
                    invalidate() { }
                })());
                const settingsList = new SettingsList(items, Math.min(items.length + 2, 15), getSettingsListTheme(), (id, newValue) => {
                    if (newValue === "enabled") {
                        enabledTools.add(id);
                    }
                    else {
                        enabledTools.delete(id);
                    }
                    applyTools();
                    persistState();
                }, () => {
                    done(undefined);
                });
                container.addChild(settingsList);
                const component = {
                    render(width) {
                        return container.render(width);
                    },
                    invalidate() {
                        container.invalidate();
                    },
                    handleInput(data) {
                        settingsList.handleInput?.(data);
                        tui.requestRender();
                    },
                };
                return component;
            });
        },
    });
    // /show-tools - Display active tools list
    pi.registerCommand("show-tools", {
        description: "Show active tools",
        handler: async (_args, ctx) => {
            const active = pi.getActiveTools();
            const toolList = active.length > 0 ? active.join(", ") : "none";
            ctx.ui.notify(`Active tools: ${toolList}`, "info");
        },
    });
    pi.on("session_start", async (_event, ctx) => {
        restoreFromBranch(ctx);
    });
    pi.on("session_tree", async (_event, ctx) => {
        restoreFromBranch(ctx);
    });
}
