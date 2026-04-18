// Minimal shape of the Home Assistant objects the panel touches.
// We type only what we use — HA ships a richer object at runtime.

export interface HassArea {
  area_id: string;
  name: string;
  icon: string | null;
  floor_id: string | null;
}

export interface HassDevice {
  id: string;
  name: string | null;
  name_by_user: string | null;
  area_id: string | null;
}

export interface HassEntityRegistryEntry {
  entity_id: string;
  name: string | null;          // user-set friendly name override
  original_name: string | null; // integration-provided name
  icon: string | null;
  area_id: string | null;
  device_id: string | null;
  platform: string;             // integration domain (e.g. "hue")
  disabled_by: string | null;
  hidden_by: string | null;
  entity_category: "config" | "diagnostic" | null;
  labels: string[];
}

export interface HassPanelInfo {
  component_name: string;
  config: Record<string, unknown>;
  icon: string | null;
  title: string | null;
  url_path: string;
}

export interface HassRoute {
  prefix: string;
  path: string;
}

export interface HassState {
  entity_id: string;
  state: string;
  last_changed: string;
  last_updated: string;
  attributes: Record<string, unknown>;
}

export interface HomeAssistant {
  callWS<T = unknown>(msg: Record<string, unknown>): Promise<T>;
  connection: {
    subscribeEvents<T = unknown>(
      callback: (event: T) => void,
      eventType: string,
    ): Promise<() => Promise<void>>;
  };
  themes: { darkMode: boolean } & Record<string, unknown>;
  language: string;
  localize?: (key: string, ...args: unknown[]) => string;
}
