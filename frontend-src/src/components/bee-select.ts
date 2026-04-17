import { LitElement, html, css, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";

export interface BeeSelectOption {
  value: string;
  label: string;
}

/**
 * Custom single-select dropdown rendered entirely in DOM. Avoids the native
 * `<select>` element, whose macOS/iOS (WKWebView) OS-level popover causes two
 * bugs inside modal dialogs: picking an option can close the parent modal,
 * and the dropdown sometimes won't reopen after a selection until the user
 * clicks elsewhere first.
 */
@customElement("bee-select")
export class BeeSelect extends LitElement {
  @property({ attribute: false }) options: BeeSelectOption[] = [];
  @property({ type: String }) value = "";
  @property({ type: String }) placeholder = "";
  @property({ type: Boolean }) disabled = false;

  @state() private _open = false;
  @state() private _menuRect: {
    top: number;
    left: number;
    width: number;
  } | null = null;

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this._removeGlobalListeners();
  }

  private _addGlobalListeners() {
    document.addEventListener("mousedown", this._onDocDown, true);
    document.addEventListener("keydown", this._onKey, true);
    window.addEventListener("resize", this._close);
    window.addEventListener("scroll", this._close, true);
  }

  private _removeGlobalListeners() {
    document.removeEventListener("mousedown", this._onDocDown, true);
    document.removeEventListener("keydown", this._onKey, true);
    window.removeEventListener("resize", this._close);
    window.removeEventListener("scroll", this._close, true);
  }

  private _onDocDown = (e: MouseEvent) => {
    if (e.composedPath().includes(this)) return;
    this._close();
  };

  private _onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape" && this._open) {
      e.stopPropagation();
      this._close();
    }
  };

  private _toggle = (e: MouseEvent) => {
    e.stopPropagation();
    if (this.disabled) return;
    if (this._open) {
      this._close();
    } else {
      this._openMenu();
    }
  };

  private _openMenu() {
    const trigger = this.renderRoot.querySelector<HTMLElement>(".trigger");
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    this._menuRect = {
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    };
    this._open = true;
    // Defer listeners so the click that opened us doesn't immediately close us.
    queueMicrotask(() => this._addGlobalListeners());
  }

  private _close = () => {
    if (!this._open) return;
    this._open = false;
    this._menuRect = null;
    this._removeGlobalListeners();
  };

  private _pick(value: string, e: MouseEvent) {
    e.stopPropagation();
    this.value = value;
    this.dispatchEvent(
      new CustomEvent<string>("select-change", {
        detail: value,
        bubbles: true,
        composed: true,
      }),
    );
    this._close();
  }

  private get _currentLabel(): string {
    const match = this.options.find((o) => o.value === this.value);
    return match ? match.label : this.placeholder;
  }

  render() {
    return html`
      <button
        type="button"
        class="trigger ${this._open ? "open" : ""}"
        @click=${this._toggle}
        ?disabled=${this.disabled}
        aria-haspopup="listbox"
        aria-expanded=${this._open}
      >
        <span class="label ${this.value ? "" : "placeholder"}">
          ${this._currentLabel}
        </span>
        <span class="chev" aria-hidden="true">▾</span>
      </button>
      ${this._open && this._menuRect
        ? html`
            <ul
              class="menu"
              role="listbox"
              style=${`top:${this._menuRect.top}px;left:${this._menuRect.left}px;min-width:${this._menuRect.width}px;`}
            >
              ${this.options.map(
                (opt) => html`
                  <li
                    role="option"
                    aria-selected=${opt.value === this.value}
                    class=${opt.value === this.value ? "selected" : ""}
                    @click=${(e: MouseEvent) => this._pick(opt.value, e)}
                  >
                    ${opt.label}
                  </li>
                `,
              )}
              ${this.options.length === 0
                ? html`<li class="empty">No options</li>`
                : nothing}
            </ul>
          `
        : nothing}
    `;
  }

  static styles = css`
    :host {
      display: inline-block;
      position: relative;
      width: 100%;
    }
    .trigger {
      font: inherit;
      width: 100%;
      padding: 8px 10px;
      border-radius: 6px;
      border: 1px solid var(--divider-color, #d0d0d0);
      background: var(--primary-background-color, #fff);
      color: var(--primary-text-color, #212121);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      text-align: left;
    }
    .trigger:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .trigger:focus-visible,
    .trigger.open {
      outline: 2px solid var(--primary-color, #03a9f4);
      outline-offset: -1px;
    }
    .label {
      flex: 1 1 auto;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .placeholder {
      color: var(--secondary-text-color, #727272);
    }
    .chev {
      font-size: 12px;
      color: var(--secondary-text-color, #727272);
      flex: 0 0 auto;
    }
    .menu {
      position: fixed;
      z-index: 100;
      margin: 0;
      padding: 4px 0;
      list-style: none;
      background: var(--card-background-color, #fff);
      color: var(--primary-text-color, #212121);
      border: 1px solid var(--divider-color, #d0d0d0);
      border-radius: 8px;
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.18);
      max-height: 280px;
      overflow: auto;
    }
    .menu li {
      padding: 8px 12px;
      cursor: pointer;
      font-size: 14px;
      white-space: nowrap;
    }
    .menu li:hover {
      background: var(--secondary-background-color, #f0f0f0);
    }
    .menu li.selected {
      background: color-mix(
        in srgb,
        var(--primary-color, #03a9f4) 12%,
        transparent
      );
      font-weight: 500;
    }
    .menu li.empty {
      color: var(--secondary-text-color, #727272);
      cursor: default;
      font-style: italic;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "bee-select": BeeSelect;
  }
}
