import { LitElement, html, css, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import "./bee-select.js";
import "./modal.js";
import type { HassArea } from "../types.js";
import type {
  ActivityFilter,
  FilterState,
  StateFilter,
} from "../lib/filters.js";
import { DEFAULT_FILTER_STATE } from "../lib/filters.js";

@customElement("bee-filter-bar")
export class BeeFilterBar extends LitElement {
  @property({ attribute: false }) filters!: FilterState;
  @property({ attribute: false }) domains: string[] = [];
  @property({ attribute: false }) integrations: string[] = [];
  @property({ attribute: false }) areas: HassArea[] = [];

  @state() private _modalOpen = false;

  private _emit(patch: Partial<FilterState>) {
    this.dispatchEvent(
      new CustomEvent<Partial<FilterState>>("filters-change", {
        detail: patch,
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _reset() {
    this.dispatchEvent(
      new CustomEvent("filters-reset", { bubbles: true, composed: true }),
    );
  }

  private _activeFilterCount(): number {
    let count = 0;
    if (this.filters.domain !== DEFAULT_FILTER_STATE.domain) count += 1;
    if (this.filters.areaId !== DEFAULT_FILTER_STATE.areaId) count += 1;
    if (this.filters.integration !== DEFAULT_FILTER_STATE.integration)
      count += 1;
    if (this.filters.state !== DEFAULT_FILTER_STATE.state) count += 1;
    if (this.filters.activity !== DEFAULT_FILTER_STATE.activity) count += 1;
    return count;
  }

  private _renderDropdowns() {
    const areaOptions = [
      { value: "", label: "All areas" },
      { value: "__none__", label: "— No area —" },
      ...this.areas.map((a) => ({ value: a.area_id, label: a.name })),
    ];
    const domainOptions = [
      { value: "", label: "All domains" },
      ...this.domains.map((d) => ({ value: d, label: d })),
    ];
    const integrationOptions = [
      { value: "", label: "All integrations" },
      ...this.integrations.map((i) => ({ value: i, label: i })),
    ];
    return html`
      <bee-select
        .value=${this.filters.domain}
        .options=${domainOptions}
        @select-change=${(e: CustomEvent<string>) =>
          this._emit({ domain: e.detail })}
      ></bee-select>
      <bee-select
        .value=${this.filters.areaId}
        .options=${areaOptions}
        @select-change=${(e: CustomEvent<string>) =>
          this._emit({ areaId: e.detail })}
      ></bee-select>
      <bee-select
        .value=${this.filters.integration}
        .options=${integrationOptions}
        @select-change=${(e: CustomEvent<string>) =>
          this._emit({ integration: e.detail })}
      ></bee-select>
      <bee-select
        .value=${this.filters.state}
        .options=${[
          { value: "all", label: "All states" },
          { value: "active", label: "Active only" },
          { value: "disabled", label: "Disabled only" },
          { value: "hidden", label: "Hidden only" },
        ]}
        @select-change=${(e: CustomEvent<string>) =>
          this._emit({ state: e.detail as StateFilter })}
      ></bee-select>
      <bee-select
        .value=${this.filters.activity}
        .options=${[
          { value: "any", label: "Any activity" },
          { value: "never_received", label: "Never received data" },
        ]}
        @select-change=${(e: CustomEvent<string>) =>
          this._emit({ activity: e.detail as ActivityFilter })}
      ></bee-select>
    `;
  }

  render() {
    const hasSearch = this.filters.search.length > 0;
    const activeCount = this._activeFilterCount();
    return html`
      <div class="bar">
        <div class="search-wrap">
          <input
            type="search"
            placeholder="Search name or entity_id"
            .value=${this.filters.search}
            @input=${(e: Event) =>
              this._emit({ search: (e.target as HTMLInputElement).value })}
            class="search"
          />
          ${hasSearch
            ? html`<button
                type="button"
                class="search-clear"
                aria-label="Clear search"
                title="Clear search"
                @click=${() => this._emit({ search: "" })}
              >
                ×
              </button>`
            : nothing}
        </div>

        <div class="inline-filters">
          ${this._renderDropdowns()}
        </div>

        <button
          type="button"
          class="filters-button"
          @click=${() => (this._modalOpen = true)}
        >
          <svg class="funnel" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="currentColor" d="M3 5h18l-7 8v6l-4-2v-4L3 5z"/>
          </svg>
          Filters
          ${activeCount > 0
            ? html`<span class="badge">${activeCount}</span>`
            : nothing}
        </button>

        <button class="reset" @click=${this._reset}>Reset</button>
      </div>

      <bee-modal
        .open=${this._modalOpen}
        heading="Filters"
        @modal-close=${() => (this._modalOpen = false)}
      >
        <div class="stacked-filters">${this._renderDropdowns()}</div>
        <div slot="footer">
          <button
            class="btn"
            @click=${() => {
              this._reset();
              this._modalOpen = false;
            }}
          >
            Reset
          </button>
          <button
            class="btn primary"
            @click=${() => (this._modalOpen = false)}
          >
            Done
          </button>
        </div>
      </bee-modal>
    `;
  }

  static styles = css`
    :host {
      display: block;
    }
    .bar {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      padding: 12px 16px;
      background: var(--card-background-color, #fff);
      border-radius: 12px 12px 0 0;
      border-bottom: 1px solid var(--divider-color, #e0e0e0);
      align-items: center;
    }
    .search-wrap {
      position: relative;
      flex: 1 1 240px;
      min-width: 160px;
      max-width: 320px;
      display: flex;
    }
    .search {
      flex: 1 1 auto;
      padding-right: 32px;
    }
    .search::-webkit-search-cancel-button,
    .search::-webkit-search-decoration {
      appearance: none;
    }
    .search-clear {
      position: absolute;
      right: 4px;
      top: 50%;
      transform: translateY(-50%);
      width: 24px;
      height: 24px;
      border-radius: 50%;
      border: 0;
      background: var(--secondary-background-color, #f0f0f0);
      color: var(--secondary-text-color, #727272);
      cursor: pointer;
      font-size: 16px;
      line-height: 1;
      padding: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .search-clear:hover {
      background: var(--divider-color, #d0d0d0);
      color: var(--primary-text-color, #212121);
    }
    .inline-filters {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      flex: 1 1 auto;
    }
    .inline-filters > bee-select {
      flex: 0 1 160px;
      min-width: 140px;
    }
    .filters-button {
      display: none;
      align-items: center;
      gap: 6px;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 20px;
      height: 20px;
      padding: 0 6px;
      border-radius: 10px;
      background: var(--primary-color, #03a9f4);
      color: var(--text-primary-color, #fff);
      font-size: 12px;
      font-weight: 600;
    }
    input,
    .filters-button,
    .reset,
    .btn {
      font: inherit;
      padding: 0 12px;
      height: 40px;
      border-radius: 6px;
      border: 1px solid var(--divider-color, #d0d0d0);
      background: var(--primary-background-color, #fff);
      color: var(--primary-text-color, #212121);
      cursor: pointer;
      box-sizing: border-box;
    }
    input:focus {
      outline: 2px solid var(--primary-color, #03a9f4);
      outline-offset: -1px;
      cursor: text;
    }
    input {
      cursor: text;
    }
    .reset:hover,
    .filters-button:hover,
    .btn:hover {
      background: var(--secondary-background-color, #f5f5f5);
    }
    .btn.primary {
      background: var(--primary-color, #03a9f4);
      color: var(--text-primary-color, #fff);
      border-color: transparent;
    }
    .btn.primary:hover {
      filter: brightness(0.95);
    }
    .stacked-filters {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    /* 1024px covers iPads in landscape and narrow laptop windows — below
       that, there isn't room for search + 5 dropdowns + reset in one row,
       so we collapse to the Filters button pattern. */
    @media (max-width: 1024px) {
      .bar {
        padding: 10px 12px;
      }
      .inline-filters {
        display: none;
      }
      .filters-button {
        display: inline-flex;
      }
      .search-wrap {
        flex: 1 1 auto;
        max-width: none;
      }
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "bee-filter-bar": BeeFilterBar;
  }
}
