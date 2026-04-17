# Bulk Entity Editor

Adds a **Bulk Editor** panel to your Home Assistant sidebar that lets you multi-select entities and apply changes in one shot — instead of clicking into each entity one at a time.

## What it does

- **Filter** by name, domain, area, integration, or state.
- **Multi-select** across filter changes — build up a selection across multiple filters.
- **Bulk actions:**
  - Change area (including "No area")
  - Enable / disable
  - Show / hide
  - Rename — friendly names or entity IDs, with prefix, suffix, or find / replace (plain or regex). Live preview, collision detection, and a warning banner before renaming IDs.
- **Progress + retry failed** — parallel execution with a results dialog and one-click retry for any failures.
- **Live updates** — the table reflects registry changes made elsewhere in HA in real time.
- **Admin-only** — respects HA's admin role.

## After installing

1. Settings → Devices & Services → **Add Integration** → "Bulk Entity Editor".
2. Open **Bulk Editor** in the sidebar.

## Notes

- Renaming entity IDs will **not** auto-update automations, scripts, dashboards, or templates that reference the old IDs. The dialog warns you before you confirm.
- Requires Home Assistant 2024.7 or later.

[Full documentation and source on GitHub →](https://github.com/delgusto/ha-bulk-entity-editor)
