# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
