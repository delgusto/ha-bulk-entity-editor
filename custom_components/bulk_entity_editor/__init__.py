"""The Bulk Entity Editor integration."""
from __future__ import annotations

import logging
from pathlib import Path

from homeassistant.components.frontend import async_register_built_in_panel, async_remove_panel
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

from .const import (
    DOMAIN,
    PANEL_FILENAME,
    PANEL_ICON,
    PANEL_JS_URL,
    PANEL_STATIC_URL_PREFIX,
    PANEL_TITLE,
    PANEL_URL_PATH,
    PANEL_WEBCOMPONENT_NAME,
)

_LOGGER = logging.getLogger(__name__)

_STATIC_REGISTERED_KEY = "static_path_registered"


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up Bulk Entity Editor from a config entry."""
    frontend_dir = Path(__file__).parent / "frontend"
    panel_file = frontend_dir / PANEL_FILENAME

    if not panel_file.is_file():
        _LOGGER.error(
            "Panel bundle missing at %s — did you forget to build the frontend?",
            panel_file,
        )
        return False

    # HA doesn't expose a way to un-register static paths, so we guard against
    # double-registration if the integration gets reloaded during the same
    # HA process lifetime.
    domain_data = hass.data.setdefault(DOMAIN, {})
    if not domain_data.get(_STATIC_REGISTERED_KEY):
        await hass.http.async_register_static_paths(
            [
                StaticPathConfig(
                    PANEL_STATIC_URL_PREFIX,
                    str(frontend_dir),
                    cache_headers=False,
                )
            ]
        )
        domain_data[_STATIC_REGISTERED_KEY] = True

    # Cache-bust the module URL with the bundle's mtime so browsers (and
    # WKWebView in the macOS/iOS companion app, which is particularly sticky)
    # always fetch a fresh copy after a rebuild.
    bundle_version = int(panel_file.stat().st_mtime)
    versioned_js_url = f"{PANEL_JS_URL}?v={bundle_version}"

    async_register_built_in_panel(
        hass,
        component_name="custom",
        sidebar_title=PANEL_TITLE,
        sidebar_icon=PANEL_ICON,
        frontend_url_path=PANEL_URL_PATH,
        config={
            "_panel_custom": {
                "name": PANEL_WEBCOMPONENT_NAME,
                "embed_iframe": False,
                "trust_external": False,
                # The Vite bundle is an ES module (uses `export`). We must
                # load it via module_url so the browser treats it as one.
                "module_url": versioned_js_url,
            }
        },
        require_admin=True,
    )

    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry."""
    async_remove_panel(hass, PANEL_URL_PATH)
    # Note: we intentionally keep the static path registered — HA has no
    # public API to remove it, and re-registering on re-setup would raise.
    return True
