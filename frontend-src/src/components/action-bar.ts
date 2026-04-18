import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";

export type ActionId = "change-area" | "enable-disable" | "show-hide" | "rename";

@customElement("bee-action-bar")
export class BeeActionBar extends LitElement {
  @property({ type: Number }) count = 0;

  private _emit(action: ActionId) {
    this.dispatchEvent(
      new CustomEvent<ActionId>("bulk-action", {
        detail: action,
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _clear() {
    this.dispatchEvent(
      new CustomEvent("clear-selection", { bubbles: true, composed: true }),
    );
  }

  render() {
    if (this.count === 0) return null;
    return html`
      <div class="bar" role="toolbar" aria-label="Bulk actions">
        <div class="count">
          <strong>${this.count}</strong> selected
          <button class="link" @click=${this._clear}>Clear</button>
        </div>
        <div class="actions">
          <button @click=${() => this._emit("change-area")}>
            Change area
          </button>
          <button @click=${() => this._emit("enable-disable")}>
            Enable / disable
          </button>
          <button @click=${() => this._emit("show-hide")}>
            Show / hide
          </button>
          <button @click=${() => this._emit("rename")}>Rename</button>
        </div>
      </div>
    `;
  }

  static styles = css`
    :host {
      display: block;
    }
    .bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 10px 16px;
      background: var(--primary-color, #03a9f4);
      color: var(--text-primary-color, #fff);
      border-radius: 0 0 12px 12px;
    }
    .count {
      font-size: 13px;
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 0 0 auto;
      white-space: nowrap;
    }
    .link {
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.6);
      color: inherit;
      font: inherit;
      padding: 3px 8px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 12px;
    }
    .link:hover {
      background: rgba(255, 255, 255, 0.15);
    }
    .actions {
      display: flex;
      gap: 6px;
      flex: 1 1 auto;
      justify-content: flex-end;
      overflow-x: auto;
      scrollbar-width: none;
    }
    .actions::-webkit-scrollbar {
      display: none;
    }
    .actions button {
      font: inherit;
      font-size: 13px;
      padding: 6px 12px;
      border-radius: 6px;
      border: 0;
      background: rgba(255, 255, 255, 0.18);
      color: inherit;
      cursor: pointer;
      white-space: nowrap;
      flex: 0 0 auto;
    }
    .actions button:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.3);
    }
    .actions button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    @media (max-width: 1024px) {
      .bar {
        padding: 8px 12px;
        gap: 8px;
      }
      .count {
        font-size: 12px;
      }
      .actions {
        justify-content: flex-start;
      }
      .actions button {
        padding: 6px 10px;
        font-size: 12px;
      }
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "bee-action-bar": BeeActionBar;
  }
}
