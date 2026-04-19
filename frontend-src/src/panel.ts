import { LitElement, html, css, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type {
  HassArea,
  HassDevice,
  HassEntityRegistryEntry,
  HassPanelInfo,
  HassRoute,
  HassState,
  HomeAssistant,
} from "./types.js";
import {
  DEFAULT_FILTER_STATE,
  type FilterState,
  collectDomains,
  collectIntegrations,
  filterEntities,
} from "./lib/filters.js";
import { runBulk, type BulkProgress } from "./lib/bulk-runner.js";
import type {
  RenameRow,
  RenameTarget,
} from "./lib/rename.js";

import "./components/filter-bar.js";
import "./components/entity-table.js";
import "./components/action-bar.js";
import type { ActionId } from "./components/action-bar.js";
import "./components/dialogs/change-area-dialog.js";
import "./components/dialogs/enable-disable-dialog.js";
import type { EnableDisableMode } from "./components/dialogs/enable-disable-dialog.js";
import "./components/dialogs/show-hide-dialog.js";
import type { ShowHideMode } from "./components/dialogs/show-hide-dialog.js";
import "./components/dialogs/rename-dialog.js";
import "./components/dialogs/results-dialog.js";

type UpdateFields = Record<string, unknown>;

interface UpdateItem {
  id: string;
  fields: UpdateFields;
}

interface LastRun {
  action: ActionId;
  items: UpdateItem[];
}

@customElement("bulk-entity-editor-panel")
export class BulkEntityEditorPanel extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;
  @property({ attribute: false }) narrow = false;
  @property({ attribute: false }) route?: HassRoute;
  @property({ attribute: false }) panel?: HassPanelInfo;

  @state() private _entities: HassEntityRegistryEntry[] = [];
  @state() private _areas: HassArea[] = [];
  @state() private _devices: HassDevice[] = [];
  @state() private _entityIdsWithState: Set<string> = new Set();
  @state() private _loading = true;
  @state() private _error: string | null = null;

  @state() private _filters: FilterState = { ...DEFAULT_FILTER_STATE };
  @state() private _selection: Set<string> = new Set();

  @state() private _activeDialog: ActionId | null = null;
  @state() private _running = false;
  @state() private _progress: BulkProgress | null = null;
  @state() private _resultsOpen = false;

  private _lastRun: LastRun | null = null;
  private _unsubscribers: Array<() => Promise<void>> = [];

  connectedCallback(): void {
    super.connectedCallback();
    void this._loadData();
    void this._subscribeToRegistryUpdates();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    for (const unsub of this._unsubscribers) void unsub();
    this._unsubscribers = [];
  }

  private async _loadData(): Promise<void> {
    if (!this.hass) return;
    this._loading = this._entities.length === 0;
    this._error = null;
    try {
      const [entities, areas, devices, states] = await Promise.all([
        this.hass.callWS<HassEntityRegistryEntry[]>({
          type: "config/entity_registry/list",
        }),
        this.hass.callWS<HassArea[]>({ type: "config/area_registry/list" }),
        this.hass.callWS<HassDevice[]>({ type: "config/device_registry/list" }),
        this.hass.callWS<HassState[]>({ type: "get_states" }),
      ]);
      this._entities = entities;
      this._areas = areas;
      this._devices = devices;
      this._entityIdsWithState = new Set(states.map((s) => s.entity_id));
    } catch (err) {
      this._error = err instanceof Error ? err.message : String(err);
    } finally {
      this._loading = false;
    }
  }

  private async _subscribeToRegistryUpdates(): Promise<void> {
    if (!this.hass) return;
    const events = [
      "entity_registry_updated",
      "area_registry_updated",
      "device_registry_updated",
    ];
    let pending: ReturnType<typeof setTimeout> | null = null;
    const schedule = () => {
      if (pending) clearTimeout(pending);
      pending = setTimeout(() => {
        pending = null;
        void this._loadData();
      }, 300);
    };
    for (const type of events) {
      const unsub = await this.hass.connection.subscribeEvents(schedule, type);
      this._unsubscribers.push(unsub);
    }
  }

  private get _filteredEntities(): HassEntityRegistryEntry[] {
    return filterEntities(
      this._entities,
      this._devices,
      this._filters,
      this._entityIdsWithState,
    );
  }

  private get _selectedEntities(): HassEntityRegistryEntry[] {
    return this._entities.filter((e) => this._selection.has(e.entity_id));
  }

  private _onFiltersChange = (e: CustomEvent<Partial<FilterState>>) => {
    this._filters = { ...this._filters, ...e.detail };
  };

  private _onFiltersReset = () => {
    this._filters = { ...DEFAULT_FILTER_STATE };
  };

  private _onToggleEntity = (e: CustomEvent<string>) => {
    const next = new Set(this._selection);
    if (next.has(e.detail)) next.delete(e.detail);
    else next.add(e.detail);
    this._selection = next;
  };

  private _onToggleAllVisible = (e: CustomEvent<boolean>) => {
    const next = new Set(this._selection);
    const visible = this._filteredEntities;
    if (e.detail) {
      for (const ent of visible) next.add(ent.entity_id);
    } else {
      for (const ent of visible) next.delete(ent.entity_id);
    }
    this._selection = next;
  };

  private _onClearSelection = () => {
    this._selection = new Set();
  };

  private _onBulkAction = (e: CustomEvent<ActionId>) => {
    this._activeDialog = e.detail;
  };

  private _onDialogClose = () => {
    if (this._running) return;
    this._activeDialog = null;
  };

  private _onResultsClose = () => {
    this._resultsOpen = false;
    this._progress = null;
    this._lastRun = null;
  };

  private async _executeUpdate(
    action: ActionId,
    items: UpdateItem[],
  ): Promise<void> {
    if (!this.hass || items.length === 0) return;
    this._lastRun = { action, items };
    this._running = true;
    this._progress = {
      total: items.length,
      done: 0,
      succeeded: 0,
      failed: 0,
      results: [],
    };
    this._resultsOpen = true;

    const hass = this.hass;
    const final = await runBulk<UpdateItem>({
      items,
      idOf: (it) => it.id,
      concurrency: 8,
      run: async (it) => {
        await hass.callWS({
          type: "config/entity_registry/update",
          entity_id: it.id,
          ...it.fields,
        });
      },
      onProgress: (p) => {
        this._progress = p;
      },
    });

    this._progress = final;
    this._running = false;
    this._activeDialog = null;

    const succeeded = new Set(
      final.results.filter((r) => r.ok).map((r) => r.id),
    );
    if (succeeded.size > 0) {
      const next = new Set(this._selection);
      for (const id of succeeded) next.delete(id);
      this._selection = next;
    }
  }

  private _uniformUpdate(
    action: ActionId,
    ids: string[],
    fields: UpdateFields,
  ): Promise<void> {
    return this._executeUpdate(
      action,
      ids.map((id) => ({ id, fields })),
    );
  }

  private _onApplyArea = (e: CustomEvent<string | null>) => {
    void this._uniformUpdate("change-area", [...this._selection], {
      area_id: e.detail,
    });
  };

  private _onApplyEnableDisable = (e: CustomEvent<EnableDisableMode>) => {
    const mode = e.detail;
    const targets = this._selectedEntities
      .filter((ent) =>
        mode === "enable" ? ent.disabled_by !== null : ent.disabled_by === null,
      )
      .map((ent) => ent.entity_id);

    void this._uniformUpdate("enable-disable", targets, {
      disabled_by: mode === "enable" ? null : "user",
    });
  };

  private _onApplyShowHide = (e: CustomEvent<ShowHideMode>) => {
    const mode = e.detail;
    const targets = this._selectedEntities
      .filter((ent) =>
        mode === "show" ? ent.hidden_by !== null : ent.hidden_by === null,
      )
      .map((ent) => ent.entity_id);

    void this._uniformUpdate("show-hide", targets, {
      hidden_by: mode === "show" ? null : "user",
    });
  };

  private _onApplyRename = (
    e: CustomEvent<{ target: RenameTarget; rows: RenameRow[] }>,
  ) => {
    const { target, rows } = e.detail;
    const items: UpdateItem[] = rows.map((r) => ({
      id: r.entityId,
      fields:
        target === "entity_id"
          ? { new_entity_id: r.newValue }
          : { name: r.newValue === "" ? null : r.newValue },
    }));
    void this._executeUpdate("rename", items);
  };

  private _formatBuildTime(): string {
    try {
      return new Date(__BUILD_TIME__).toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return __BUILD_TIME__;
    }
  }

  private _onRetryFailed = (e: CustomEvent<string[]>) => {
    const ids = e.detail;
    if (ids.length === 0 || !this._lastRun) return;
    const failedSet = new Set(ids);
    const { action, items } = this._lastRun;
    const toRetry = items.filter((it) => failedSet.has(it.id));
    this._resultsOpen = false;
    void this._executeUpdate(action, toRetry);
  };

  render() {
    const visible = this._filteredEntities;
    const allEntityIds = this._entities.map((e) => e.entity_id);
    return html`
      <div class="app-bar">
        <ha-menu-button
          .hass=${this.hass}
          .narrow=${this.narrow}
        ></ha-menu-button>
        <div class="app-bar-title">Bulk Entity Editor</div>
        <div class="app-bar-spacer"></div>
        <div class="app-bar-count">
          ${this._loading
            ? "Loading…"
            : `${visible.length} of ${this._entities.length}`}
        </div>
      </div>

      <div class="page">
        ${this._error
          ? html`<div class="error">Error: ${this._error}</div>`
          : nothing}

        <div class="card">
          <bee-filter-bar
            .filters=${this._filters}
            .domains=${collectDomains(this._entities)}
            .integrations=${collectIntegrations(this._entities)}
            .areas=${this._areas}
            @filters-change=${this._onFiltersChange}
            @filters-reset=${this._onFiltersReset}
          ></bee-filter-bar>

          <div class="table-host">
            ${this._loading
              ? html`<div class="loading">Loading entities…</div>`
              : html`
                  <bee-entity-table
                    .entities=${visible}
                    .areas=${this._areas}
                    .devices=${this._devices}
                    .selection=${this._selection}
                    .entityIdsWithState=${this._entityIdsWithState}
                    @toggle-entity=${this._onToggleEntity}
                    @toggle-all-visible=${this._onToggleAllVisible}
                  ></bee-entity-table>
                `}
          </div>

          <bee-action-bar
            .count=${this._selection.size}
            @bulk-action=${this._onBulkAction}
            @clear-selection=${this._onClearSelection}
          ></bee-action-bar>
        </div>

        <bee-change-area-dialog
          .open=${this._activeDialog === "change-area"}
          .areas=${this._areas}
          .count=${this._selection.size}
          .running=${this._running}
          @dialog-close=${this._onDialogClose}
          @apply-area=${this._onApplyArea}
        ></bee-change-area-dialog>

        <bee-enable-disable-dialog
          .open=${this._activeDialog === "enable-disable"}
          .selected=${this._selectedEntities}
          .running=${this._running}
          @dialog-close=${this._onDialogClose}
          @apply-enable-disable=${this._onApplyEnableDisable}
        ></bee-enable-disable-dialog>

        <bee-show-hide-dialog
          .open=${this._activeDialog === "show-hide"}
          .selected=${this._selectedEntities}
          .running=${this._running}
          @dialog-close=${this._onDialogClose}
          @apply-show-hide=${this._onApplyShowHide}
        ></bee-show-hide-dialog>

        <bee-rename-dialog
          .open=${this._activeDialog === "rename"}
          .selected=${this._selectedEntities}
          .allEntityIds=${allEntityIds}
          .running=${this._running}
          @dialog-close=${this._onDialogClose}
          @apply-rename=${this._onApplyRename}
        ></bee-rename-dialog>

        <bee-results-dialog
          .open=${this._resultsOpen}
          .progress=${this._progress}
          @dialog-close=${this._onResultsClose}
          @retry-failed=${this._onRetryFailed}
        ></bee-results-dialog>

        <footer class="build-info">
          v${__BUILD_VERSION__} · built ${this._formatBuildTime()}
        </footer>
      </div>
    `;
  }

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: var(--primary-background-color, #fafafa);
      color: var(--primary-text-color, #212121);
      font-family: var(--paper-font-body1_-_font-family, Roboto, sans-serif);
    }
    .app-bar {
      display: flex;
      align-items: center;
      gap: 8px;
      height: 56px;
      padding: 0 4px 0 4px;
      background: var(
        --app-header-background-color,
        var(--primary-background-color, #fafafa)
      );
      color: var(
        --app-header-text-color,
        var(--primary-text-color, #212121)
      );
      border-bottom: 1px solid var(--divider-color, #e0e0e0);
      flex: 0 0 auto;
    }
    ha-menu-button {
      flex: 0 0 auto;
      --mdc-icon-button-size: 40px;
    }
    .app-bar-title {
      font-size: 20px;
      font-weight: 400;
      line-height: 56px;
      flex: 0 0 auto;
      padding-left: 4px;
    }
    .app-bar-spacer {
      flex: 1 1 auto;
    }
    .app-bar-count {
      color: var(--secondary-text-color, #727272);
      font-size: 13px;
      flex: 0 0 auto;
      padding-right: 16px;
    }
    .page {
      padding: 16px;
      max-width: 1400px;
      margin: 0 auto;
      width: 100%;
      box-sizing: border-box;
      flex: 1 1 auto;
      min-height: 0;
      display: flex;
      flex-direction: column;
    }
    @media (max-width: 700px) {
      .page {
        padding: 8px;
      }
      .app-bar-title {
        font-size: 18px;
      }
      .app-bar-count {
        font-size: 12px;
        padding-right: 8px;
      }
    }
    .error {
      padding: 12px 16px;
      border-radius: var(--ha-card-border-radius, 12px);
      background: var(--error-color, #db4437);
      color: #fff;
      margin-bottom: 16px;
    }
    .card {
      background: var(--ha-card-background, var(--card-background-color, #fff));
      border-radius: var(--ha-card-border-radius, 12px);
      box-shadow: var(
        --ha-card-box-shadow,
        0 1px 3px rgba(0, 0, 0, 0.08),
        0 1px 1px rgba(0, 0, 0, 0.05)
      );
      border: var(--ha-card-border-width, 1px) solid
        var(--ha-card-border-color, var(--divider-color, #e0e0e0));
      flex: 1 1 auto;
      min-height: 0;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .table-host {
      flex: 1 1 auto;
      min-height: 0;
      overflow: hidden;
    }
    .loading {
      padding: 48px;
      text-align: center;
      color: var(--secondary-text-color, #727272);
    }
    .build-info {
      margin-top: 12px;
      font-size: 11px;
      color: var(--secondary-text-color, #727272);
      opacity: 0.6;
      text-align: right;
      font-family: var(--code-font-family, ui-monospace, monospace);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "bulk-entity-editor-panel": BulkEntityEditorPanel;
  }
}
