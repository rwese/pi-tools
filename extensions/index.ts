/**
 * pi-tools
 *
 * Extension to view and manage active tools.
 *
 * Commands:
 *   /tools       - Interactive tool selector
 *   /show-tools  - Display list of active tools
 */

import type { ExtensionAPI, ExtensionContext, ToolInfo } from "@mariozechner/pi-coding-agent";
import { getSelectListTheme } from "@mariozechner/pi-coding-agent";
import { Box, Container, SelectList, type SelectItem, Spacer, Text } from "@mariozechner/pi-tui";
import type { TSchema } from "@sinclair/typebox";

interface ToolsState {
	enabledTools: string[];
}

/**
 * Parse TypeBox schema to extract parameter information.
 * Returns a summary string like "command (string), timeout (number?)"
 */
function parseParameters(schema: TSchema): string {
	if (!schema || typeof schema !== "object") {
		return "";
	}

	// Handle TObject (root schema for tools)
	if (schema.type === "object" && schema.properties) {
		const props = schema.properties as Record<string, TSchema>;
		const paramNames = Object.keys(props);

		if (paramNames.length === 0) {
			return "no parameters";
		}

		const params = paramNames.map((name) => {
			const prop = props[name] as TSchema;
			const isOptional = isOptionalType(prop);
			const typeName = getTypeName(prop);
			return `${name} (${typeName}${isOptional ? "?" : ""})`;
		});

		return params.join(", ");
	}

	return "";
}

function isOptionalType(schema: TSchema): boolean {
	const typeSymbol = Symbol.for("@sinclair/typebox/type");
	const schemaAny = schema as {
		[typeSymbol]?: string;
		optional?: boolean;
	};

	if (schemaAny[typeSymbol] === "Optional") {
		return true;
	}
	if (schemaAny.optional === true) {
		return true;
	}
	return false;
}

function getTypeName(schema: TSchema): string {
	const typeSymbol = Symbol.for("@sinclair/typebox/type");
	const schemaAny = schema as {
		type?: string;
		[typeSymbol]?: string;
		item?: TSchema;
		items?: TSchema;
	};

	const typeValue = schemaAny[typeSymbol];

	switch (typeValue) {
		case "String":
			return "string";
		case "Number":
			return "number";
		case "Boolean":
			return "boolean";
		case "Object":
			return "object";
		case "Array":
			return "array";
		case "Optional":
			// Recursively get the inner type
			if (schemaAny.item) {
				return getTypeName(schemaAny.item);
			}
			if (schemaAny.items) {
				return getTypeName(schemaAny.items);
			}
			return "optional";
		default:
			// Fallback: check for type property
			if (schemaAny.type === "string") return "string";
			if (schemaAny.type === "number") return "number";
			if (schemaAny.type === "boolean") return "boolean";
			if (schemaAny.type === "object") return "object";
			if (schemaAny.type === "array") return "array";
			return "unknown";
	}
}

export default function piToolsExtension(pi: ExtensionAPI) {
	let enabledTools: Set<string> = new Set();
	let allTools: ToolInfo[] = [];
	let selectedTool: ToolInfo | null = null;

	function persistState() {
		pi.appendEntry<ToolsState>("tools-config", {
			enabledTools: Array.from(enabledTools),
		});
	}

	function applyTools() {
		pi.setActiveTools(Array.from(enabledTools));
	}

	function restoreFromBranch(ctx: ExtensionContext) {
		allTools = pi.getAllTools().sort((a, b) => a.name.localeCompare(b.name));
		const branchEntries = ctx.sessionManager.getBranch();
		let savedTools: string[] | undefined;

		for (const entry of branchEntries) {
			if (entry.type === "custom" && entry.customType === "tools-config") {
				const data = entry.data as ToolsState | undefined;
				if (data?.enabledTools) {
					savedTools = data.enabledTools;
				}
			}
		}

		if (savedTools) {
			const allToolNames = allTools.map((t) => t.name);
			enabledTools = new Set(savedTools.filter((t: string) => allToolNames.includes(t)));
			applyTools();
		} else {
			enabledTools = new Set(pi.getActiveTools());
		}
	}

	// /tools - Interactive selector
	pi.registerCommand("tools", {
		description: "Enable/disable tools",
		handler: async (_args, ctx) => {
			allTools = pi.getAllTools().sort((a, b) => a.name.localeCompare(b.name));

			// Build SelectItems with description for each tool
			const items: SelectItem[] = allTools.map((tool) => ({
				value: tool.name,
				label: tool.name,
				description: tool.description,
			}));

			await ctx.ui.custom((tui, theme, _kb, done) => {
				const container = new Container();

				// Title
				container.addChild(
					new Text(theme.fg("accent", theme.bold("Tool Configuration")), 0, 0),
				);
				container.addChild(new Spacer(1));

				// Create detail panel component that updates with selection
				const detailPanel = new Box(1, 1);
				const detailTitle = new Text("", 0, 0);
				const detailDescription = new Text("", 0, 0);
				const detailParams = new Text("", 0, 0);
				const detailStatus = new Text("", 0, 0);

				detailPanel.addChild(detailTitle);
				detailPanel.addChild(detailDescription);
				detailPanel.addChild(detailParams);
				detailPanel.addChild(detailStatus);

				function updateDetailPanel(tool: ToolInfo | null) {
					if (!tool) {
						detailTitle.setText("");
						detailDescription.setText("");
						detailParams.setText("");
						detailStatus.setText(theme.fg("dim", "Select a tool to view details"));
					} else {
						const isEnabled = enabledTools.has(tool.name);
						const statusText = isEnabled
							? theme.fg("success", "● enabled")
							: theme.fg("error", "○ disabled");

						detailTitle.setText(
							theme.bold(theme.fg("accent", `┌─ ${tool.name} `)) +
							" ".repeat(Math.max(0, 50 - tool.name.length - 6)) +
							"─".repeat(Math.max(0, 50 - tool.name.length - 6)) + "┐",
						);
						detailDescription.setText(theme.fg("text", tool.description || "No description"));
						detailParams.setText(
							theme.fg("muted", "Parameters: ") +
							theme.fg("text", parseParameters(tool.parameters)),
						);
						detailStatus.setText(statusText);
					}
					detailPanel.invalidateCache();
				}

				// Calculate max visible items to leave room for detail panel
				const listMaxVisible = Math.max(3, Math.min(items.length, 8));

				// Create select list
				const selectList = new SelectList(
					items,
					listMaxVisible,
					getSelectListTheme(),
				);

				// Handle selection change
				selectList.onSelectionChange = (item) => {
					const tool = allTools.find((t) => t.name === item.value);
					selectedTool = tool || null;
					updateDetailPanel(selectedTool);
					tui.requestRender();
				};

				// Handle selection (Enter to toggle)
				selectList.onSelect = (item) => {
					const tool = allTools.find((t) => t.name === item.value);
					if (!tool) return;

					if (enabledTools.has(tool.name)) {
						enabledTools.delete(tool.name);
					} else {
						enabledTools.add(tool.name);
					}
					applyTools();
					persistState();
					updateDetailPanel(tool);
					tui.requestRender();
				};

				// Handle cancel (Escape)
				selectList.onCancel = () => {
					done(undefined);
				};

				// Layout: list on top, detail panel below
				container.addChild(selectList);
				container.addChild(new Spacer(1));
				container.addChild(detailPanel);

				// Initialize detail panel with first selected tool
				if (items.length > 0) {
					selectList.setSelectedIndex(0);
					const firstTool = allTools.find((t) => t.name === items[0].value);
					updateDetailPanel(firstTool || null);
				}

				// Keyboard hint
				container.addChild(new Spacer(1));
				container.addChild(
					new Text(
						theme.fg("dim", "  ↑↓ navigate · Enter toggle · Esc close"),
						0,
						0,
					),
				);

				const component = {
					render(width: number) {
						return container.render(width);
					},
					invalidate() {
						container.invalidate();
					},
					handleInput(data: string) {
						selectList.handleInput(data);
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
		handler: (_args, ctx) => {
			const active = pi.getActiveTools();
			const toolList = active.length > 0 ? active.join(", ") : "none";
			ctx.ui.notify(`Active tools: ${toolList}`, "info");
		},
	});

	pi.on("session_start", (_event, ctx) => {
		restoreFromBranch(ctx);
	});

	pi.on("session_tree", (_event, ctx) => {
		restoreFromBranch(ctx);
	});
}
