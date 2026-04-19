# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2026-04-19

### Added

- **"Never received data"** activity filter and dashed-grey "No data" state pill so users can find entities in the registry that their integration has never pushed a value for. Useful for cleaning up dead entities from integrations like FoxESS after hardware changes.
- **Mobile-responsive layout** — 56px app bar with a hamburger that opens the sidebar, filters collapse to a "Filters" button with active-count badge, entity table hides secondary columns (Entity ID inline under the Name; Integration hidden), action bar is a 2×2 grid of buttons instead of a wrapping row.
- **Version footer** — small `v0.1.0 · built <time>` line at the bottom of the panel, rendered in the viewer's local timezone, so you can verify which build is loaded.
- **Custom `bee-select` component** replacing native `<select>` in dialogs and the filter bar. Fixes two WKWebView bugs in the iOS/macOS HA apps: picking an option no longer closes the parent modal, and the dropdown reopens correctly after a selection.
- **Clear (×) button** inside the filter search input.

### Changed

- **Panel styling matches HA native pages** — uses `--app-header-*`, `--ha-card-*`, and `--primary-background-color` theme variables so the panel inherits whichever theme the user has set.
- **Filter bar collapse breakpoint raised to 1440px** — below that, the 5 dropdowns crowd the search and reset; now they collapse to a single Filters button until there's genuinely room for them all inline.
- **Asset URL cache-bust**: the panel JS is now served through a dynamic HTTP view that sets `Cache-Control: no-cache` + an `ETag` derived from the bundle's mtime, so browsers and WKWebView revalidate on every request. Dropping a new bundle over Samba and hard-refreshing Just Works — no HA restart or integration reload needed.

### Fixed

- Selecting an option in a native `<select>` inside a modal no longer closes the whole modal (macOS + iOS).
- Rename dialog's prefix/suffix text field no longer balloons to 180px tall (flex-basis was being interpreted along the column main axis).
- Entity table rows now align cleanly across long entity IDs (added `min-width: 0` on grid cells).
- Live-update subscription to `state_changed` is no longer scheduled — "Never received" snapshot is refreshed on registry events to avoid 100+ events/second overhead.

## [0.1.1] - 2026-04-18

### Added

- Brand assets (icon + logo) shipped in `custom_components/bulk_entity_editor/brand/` per Home Assistant's 2026.3 brands proxy API.

### Changed

- Minimum Home Assistant version bumped to **2026.3.0** to support the in-repo brand assets introduced in that release.


## [0.1.0] - 2026-04-17

Initial release.

### Added

- Sidebar panel **Bulk Editor** registered via `panel_custom`, admin-only.
- Entity table with virtualized scrolling (handles thousands of entities).
- Filters: search, domain, area (including "No area"), integration, state.
- Multi-select with sticky selection across filter changes.
- Bulk actions:
  - Change area
  - Enable / disable
  - Show / hide
  - Rename — friendly name and entity_id, with prefix / suffix / find-replace (plain or regex), live preview, collision detection, and a warning banner before renaming IDs.
- Concurrency-capped parallel executor (8 in-flight) with progress, per-entity results, and retry-failed.
- Live subscription to entity / area / device registry events for real-time table refresh.
