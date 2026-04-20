# TODO: Extend Tool Information Display

## Plan Status: ✅ Complete

### Tasks

| # | Task | Status | Notes |
|---|------|--------|-------|
| 1 | Replace SettingsList with SelectList | ✅ Done | Custom selector with description |
| 2 | Add TypeBox parameters parser | ✅ Done | Extract param names/types from schema |
| 3 | Create detail panel component | ✅ Done | Render description + params below list |
| 4 | Wire up onSelectionChange | ✅ Done | Detail panel updates on tool selection |
| 5 | Add keyboard hint for Enter toggle | ✅ Done | Shows "↑↓ navigate · Enter toggle · Esc close" |
| 6 | Validate with typecheck/lint | ✅ Done | npm run lint passes |

## Changes Made

- Replaced `SettingsList` with `SelectList` for cleaner list with descriptions
- Added `parseParameters()` function to extract param names/types from TypeBox schemas
- Created `Box`-based detail panel showing: title, description, parameters, status
- Wired `onSelectionChange` callback to update detail panel on navigation
- Added keyboard hints at bottom of dialog
- Fixed theme colors (`success`/`error` instead of `green`/`red`, `text` instead of `default`)

## Testing

Interactive tmux test verified:
- Tool list displays with descriptions
- Detail panel shows selected tool info (description + parameters)
- Parameters parsed correctly (e.g., `command (string), timeout (number?)`)
- Enter toggles tool enabled/disabled state
- Esc closes dialog
- State persists via `/show-tools` command

---

## Plan: Add Tool Source Badge (2026-04-20)

### Status: ✅ Complete

| # | Task | Status | Notes |
|---|------|--------|-------|
| 1 | Add source badge to detail panel | ✅ Done | Badge shows `[source]` after tool name |
| 2 | Test with lint | ✅ Done | npm run lint passes (warning only) |

### Changes Made

- Added source badge display in detail panel showing which extension/package injected the tool
- Badge rendered with muted color: `[extension-name]`
