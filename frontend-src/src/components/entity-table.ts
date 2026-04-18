import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";
import "@lit-labs/virtualizer";
import type {
  HassArea,
  HassDevice,
  HassEntityRegistryEntry,
} from "../types.js";

@customElement("bee-entity-table")
export class BeeEntityTable extends LitElement {
  @property({ attribute: false }) entities: HassEntityRegistryEntry[] = [];
  @property({ attribute: false }) areas: HassArea[] = [];
  @property({ attribute: false }) devices: HassDevice[] = [];
  @property({ attribute: false }) selection: Set<string> = new Set();
  @property({ attribute: false }) entityIdsWithState: Set<string> = new Set();

  private _areaName(areaId: string | null): string {
    if (!areaId) return "—";
    return this.areas.find((a) => a.area_id === areaId)?.name ?? areaId;
  }

  private _deviceAreaId(deviceId: string | null): string | null {
    if (!deviceId) return null;
    return this.devices.find((d) => d.id === deviceId)?.area_id ?? null;
  }

  private _displayName(e: HassEntityRegistryEntry): string {
    return e.name ?? e.original_name ?? e.entity_id;
  }

  private _stateLabel(e: HassEntityRegistryEntry): string {
    if (e.disabled_by) return "Disabled";
    if (e.hidden_by) return "Hidden";
    if (!this.entityIdsWithState.has(e.entity_id)) return "No data";
    return "Active";
  }

  private _stateClass(e: HassEntityRegistryEntry): string {
    if (e.disabled_by) return "state-disabled";
    if (e.hidden_by) return "state-hidden";
    if (!this.entityIdsWithState.has(e.entity_id)) return "state-nodata";
    return "";
  }

  private _toggle(entityId: string) {
    this.dispatchEvent(
      new CustomEvent<string>("toggle-entity", {
        detail: entityId,
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _toggleAll(e: Event) {
    const checked = (e.target as HTMLInputElement).checked;
    this.dispatchEvent(
      new CustomEvent<boolean>("toggle-all-visible", {
        detail: checked,
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _allVisibleSelected(): boolean {
    if (this.entities.length === 0) return false;
    for (const e of this.entities) {
      if (!this.selection.has(e.entity_id)) return false;
    }
    return true;
  }

  render() {
    const allSelected = this._allVisibleSelected();
    return html`
      <div class="grid">
        <div class="head row">
          <div class="cell cell-check">
            <input
              type="checkbox"
              .checked=${allSelected}
              .indeterminate=${!allSelected && this.selection.size > 0}
              @change=${this._toggleAll}
              aria-label="Select all visible"
            />
          </div>
          <div class="cell">Name</div>
          <div class="cell hide-on-narrow">Entity ID</div>
          <div class="cell">Area</div>
          <div class="cell hide-on-narrow">Integration</div>
          <div class="cell">State</div>
        </div>
        <lit-virtualizer
          scroller
          .items=${this.entities}
          .renderItem=${(e: HassEntityRegistryEntry) => {
            const selected = this.selection.has(e.entity_id);
            const effectiveArea =
              e.area_id ?? this._deviceAreaId(e.device_id);
            const rowClasses = [
              "row",
              "body",
              selected ? "selected" : "",
              e.disabled_by ? "is-disabled" : "",
              e.hidden_by ? "is-hidden" : "",
            ]
              .filter(Boolean)
              .join(" ");
            const stateLabel = this._stateLabel(e);
            const stateClass = this._stateClass(e);
            return html`
              <div
                class=${rowClasses}
                @click=${() => this._toggle(e.entity_id)}
              >
                <div class="cell cell-check">
                  <input
                    type="checkbox"
                    .checked=${selected}
                    @click=${(ev: Event) => ev.stopPropagation()}
                    @change=${() => this._toggle(e.entity_id)}
                    aria-label=${`Select ${e.entity_id}`}
                  />
                </div>
                <div class="cell">
                  <div class="primary-name">${this._displayName(e)}</div>
                  <div class="secondary-id">${e.entity_id}</div>
                </div>
                <div class="cell mono hide-on-narrow">${e.entity_id}</div>
                <div class="cell">${this._areaName(effectiveArea)}</div>
                <div class="cell hide-on-narrow">${e.platform}</div>
                <div class="cell">
                  <span class="state-pill ${stateClass}">${stateLabel}</span>
                </div>
              </div>
            `;
          }}
        ></lit-virtualizer>
      </div>
    `;
  }

  static styles = css`
    :host {
      display: block;
      height: 100%;
      min-height: 0;
    }
    .grid {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 0;
      background: var(--card-background-color, #fff);
    }
    lit-virtualizer {
      flex: 1 1 auto;
      min-height: 0;
    }
    .row {
      display: grid;
      grid-template-columns: 48px minmax(140px, 2fr) minmax(200px, 2fr) minmax(
          120px,
          1fr
        ) minmax(100px, 1fr) 90px;
      align-items: center;
      font-size: 14px;
      /* lit-virtualizer positions body rows absolutely, which strips their
         automatic 100% width. Without this, fr tracks collapse to their
         minimums and misalign with the header row (which IS 100% wide). */
      width: 100%;
      box-sizing: border-box;
    }
    .head {
      position: sticky;
      top: 0;
      z-index: 1;
      background: var(--card-background-color, #fff);
      border-bottom: 1px solid var(--divider-color, #e0e0e0);
      font-weight: 500;
    }
    .body {
      border-bottom: 1px solid var(--divider-color, #f0f0f0);
      cursor: pointer;
    }
    .body:hover {
      background: var(--secondary-background-color, #f5f5f5);
    }
    .body.selected {
      background: color-mix(
        in srgb,
        var(--primary-color, #03a9f4) 10%,
        transparent
      );
    }
    .body.is-disabled .cell:not(.cell-check) {
      opacity: 0.55;
      font-style: italic;
    }
    .body.is-hidden .cell:not(.cell-check) {
      opacity: 0.75;
    }
    .state-pill {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 500;
      background: color-mix(
        in srgb,
        var(--success-color, #2e7d32) 15%,
        transparent
      );
      color: var(--success-color, #2e7d32);
    }
    .state-pill.state-disabled {
      background: color-mix(
        in srgb,
        var(--error-color, #db4437) 15%,
        transparent
      );
      color: var(--error-color, #db4437);
    }
    .state-pill.state-hidden {
      background: color-mix(
        in srgb,
        var(--warning-color, #ff9800) 15%,
        transparent
      );
      color: var(--warning-color, #e65100);
    }
    .state-pill.state-nodata {
      background: var(--secondary-background-color, #ececec);
      color: var(--secondary-text-color, #727272);
      border: 1px dashed var(--divider-color, #c0c0c0);
    }
    .primary-name {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .secondary-id {
      display: none;
      font-family: var(--code-font-family, ui-monospace, monospace);
      font-size: 11px;
      color: var(--secondary-text-color, #727272);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-top: 2px;
    }
    @media (max-width: 700px) {
      .hide-on-narrow {
        display: none !important;
      }
      .row {
        grid-template-columns: 44px minmax(120px, 2fr) minmax(80px, 1fr) 80px;
      }
      .secondary-id {
        display: block;
      }
      .cell {
        padding: 8px 10px;
      }
      .cell-check {
        padding: 8px 0 8px 12px;
      }
    }
    .cell {
      padding: 10px 12px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      /* Grid items default to min-width: auto (= min-content), which lets
         a long unbreakable entity_id push its track wider than the fr unit
         would allocate — producing slightly different column widths per
         row. min-width: 0 lets the column shrink and the ellipsis kick in. */
      min-width: 0;
    }
    .cell-check {
      padding: 10px 0 10px 16px;
    }
    .mono {
      font-family: var(--code-font-family, ui-monospace, monospace);
      font-size: 13px;
      color: var(--secondary-text-color, #727272);
    }
    input[type="checkbox"] {
      width: 18px;
      height: 18px;
      cursor: pointer;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "bee-entity-table": BeeEntityTable;
  }
}
