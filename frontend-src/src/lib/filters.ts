import type { HassDevice, HassEntityRegistryEntry } from "../types.js";

export type StateFilter = "all" | "active" | "disabled" | "hidden";
export type ActivityFilter = "any" | "never_received";

export interface FilterState {
  search: string;
  domain: string; // "" = all
  areaId: string; // "" = all, "__none__" = no area
  integration: string; // "" = all
  state: StateFilter;
  activity: ActivityFilter;
}

export const DEFAULT_FILTER_STATE: FilterState = {
  search: "",
  domain: "",
  areaId: "",
  integration: "",
  state: "all",
  activity: "any",
};

/** True when the entity is enabled in the registry but has no state object
 *  (i.e., the integration has never pushed a value for it). Disabled
 *  entities are excluded because they don't have states by design. */
export function hasNeverReceivedData(
  entity: HassEntityRegistryEntry,
  entityIdsWithState: Set<string>,
): boolean {
  if (entity.disabled_by) return false;
  return !entityIdsWithState.has(entity.entity_id);
}

const effectiveArea = (
  entity: HassEntityRegistryEntry,
  devicesById: Map<string, HassDevice>,
): string | null => {
  if (entity.area_id) return entity.area_id;
  if (!entity.device_id) return null;
  return devicesById.get(entity.device_id)?.area_id ?? null;
};

export const domainOf = (entityId: string): string =>
  entityId.split(".", 1)[0] ?? "";

export function filterEntities(
  entities: HassEntityRegistryEntry[],
  devices: HassDevice[],
  filters: FilterState,
  entityIdsWithState?: Set<string>,
): HassEntityRegistryEntry[] {
  const devicesById = new Map(devices.map((d) => [d.id, d]));
  const needle = filters.search.trim().toLowerCase();

  return entities.filter((e) => {
    if (filters.domain && domainOf(e.entity_id) !== filters.domain) {
      return false;
    }

    if (filters.integration && e.platform !== filters.integration) {
      return false;
    }

    if (filters.areaId) {
      const area = effectiveArea(e, devicesById);
      if (filters.areaId === "__none__") {
        if (area) return false;
      } else if (area !== filters.areaId) {
        return false;
      }
    }

    switch (filters.state) {
      case "active":
        if (e.disabled_by || e.hidden_by) return false;
        break;
      case "disabled":
        if (!e.disabled_by) return false;
        break;
      case "hidden":
        if (!e.hidden_by) return false;
        break;
    }

    if (
      filters.activity === "never_received" &&
      (!entityIdsWithState ||
        !hasNeverReceivedData(e, entityIdsWithState))
    ) {
      return false;
    }

    if (needle) {
      const name = (e.name ?? e.original_name ?? "").toLowerCase();
      if (
        !name.includes(needle) &&
        !e.entity_id.toLowerCase().includes(needle)
      ) {
        return false;
      }
    }

    return true;
  });
}

export function collectDomains(entities: HassEntityRegistryEntry[]): string[] {
  return [...new Set(entities.map((e) => domainOf(e.entity_id)))].sort();
}

export function collectIntegrations(
  entities: HassEntityRegistryEntry[],
): string[] {
  return [...new Set(entities.map((e) => e.platform))].sort();
}
