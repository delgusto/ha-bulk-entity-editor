import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";
import type { HassArea } from "../types.js";
import type { FilterState, StateFilter } from "../lib/filters.js";

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
    return html`
      <div class="bar">
        <input
          type="search"
          placeholder="Search name or entity_id"
          .value=${this.filters.search}
          @input=${(e: Event) =>
            this._emit({ search: (e.target as HTMLInputElement).value })}
          class="search"
        />

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
    .search {
      flex: 1 1 240px;
      min-width: 200px;
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
