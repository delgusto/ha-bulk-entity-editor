import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";
import type { HassArea } from "../types.js";
import type {
  ActivityFilter,
  FilterState,
  StateFilter,
} from "../lib/filters.js";

@customElement("bee-filter-bar")
export class BeeFilterBar extends LitElement {
  @property({ attribute: false }) filters!: FilterState;
  @property({ attribute: false }) domains: string[] = [];
  @property({ attribute: false }) integrations: string[] = [];
  @property({ attribute: false }) areas: HassArea[] = [];

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

  render() {
    const hasSearch = this.filters.search.length > 0;
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
            : ""}
        </div>

        <select
          .value=${this.filters.domain}
          @change=${(e: Event) =>
            this._emit({ domain: (e.target as HTMLSelectElement).value })}
        >
          <option value="">All domains</option>
          ${this.domains.map(
            (d) => html`<option value=${d}>${d}</option>`,
          )}
        </select>

        <select
          .value=${this.filters.areaId}
          @change=${(e: Event) =>
            this._emit({ areaId: (e.target as HTMLSelectElement).value })}
        >
          <option value="">All areas</option>
          <option value="__none__">— No area —</option>
          ${this.areas.map(
            (a) => html`<option value=${a.area_id}>${a.name}</option>`,
          )}
        </select>

        <select
          .value=${this.filters.integration}
          @change=${(e: Event) =>
            this._emit({ integration: (e.target as HTMLSelectElement).value })}
        >
          <option value="">All integrations</option>
          ${this.integrations.map(
            (i) => html`<option value=${i}>${i}</option>`,
          )}
        </select>

        <select
          .value=${this.filters.state}
          @change=${(e: Event) =>
            this._emit({
              state: (e.target as HTMLSelectElement).value as StateFilter,
            })}
        >
          <option value="all">All states</option>
          <option value="active">Active only</option>
          <option value="disabled">Disabled only</option>
          <option value="hidden">Hidden only</option>
        </select>

        <select
          .value=${this.filters.activity}
          @change=${(e: Event) =>
            this._emit({
              activity: (e.target as HTMLSelectElement).value as ActivityFilter,
            })}
        >
          <option value="any">Any activity</option>
          <option value="never_received">Never received data</option>
        </select>

        <button class="reset" @click=${this._reset}>Reset</button>
      </div>
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
    }
    .search-wrap {
      position: relative;
      flex: 1 1 240px;
      min-width: 200px;
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
    input,
    select,
    button {
      font: inherit;
      padding: 8px 10px;
      border-radius: 6px;
      border: 1px solid var(--divider-color, #d0d0d0);
      background: var(--primary-background-color, #fff);
      color: var(--primary-text-color, #212121);
    }
    input:focus,
    select:focus {
      outline: 2px solid var(--primary-color, #03a9f4);
      outline-offset: -1px;
    }
    .reset {
      cursor: pointer;
    }
    .reset:hover {
      background: var(--secondary-background-color, #f5f5f5);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "bee-filter-bar": BeeFilterBar;
  }
}
