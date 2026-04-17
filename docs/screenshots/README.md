# Screenshots

The README references three images from this folder. Drop them in with these exact filenames to have them show up in the published README:

| Filename | What it should show |
|---|---|
| `panel.png` | Main panel with entities loaded. Take a wide screenshot (≥ 1400px) showing: sidebar with "Bulk Editor" highlighted, the filter bar, and the table with a handful of entities. Extra credit: have 3-5 rows selected so the action bar is visible at the bottom. |
| `change-area.png` | Change-area dialog open with a target area selected. Crop tightly around the dialog (e.g. 600×500). |
| `rename.png` | Rename dialog with entity_id target selected so the red warning banner is visible, plus a few rows in the preview showing `old → new` transforms. Crop to the dialog. |

## How to take them

1. Open Bulk Editor in a **real HA instance with a representative number of entities** (the screenshots are more convincing when they show real-looking data).
2. On macOS: **⌘⇧4** + Space to capture a specific window, or ⌘⇧4 + drag for a region.
3. Save as PNG. Aim for 2x DPI (Retina) — GitHub will downscale, but large originals look sharper.
4. Drop the files into this folder with the exact filenames above.

No optimization required, but if you want to keep the repo small, run them through `imageoptim` or `squoosh.app` to trim ~30-40% without visible loss.
