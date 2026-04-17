import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";

@customElement("bee-modal")
export class BeeModal extends LitElement {
  @property({ type: Boolean, reflect: true }) open = false;
  @property({ type: String }) heading = "";

  private _close() {
    this.dispatchEvent(
      new CustomEvent("modal-close", { bubbles: true, composed: true }),
    );
  }

  private _onBackdrop(e: MouseEvent) {
    // Only close when the click truly originated on the backdrop — not on
    // anything inside the dialog. macOS native <select> dropdowns dispatch
    // click events on options that bubble up here; the composedPath check
    // keeps them from closing the modal.
    const dialog = this.renderRoot.querySelector(".dialog");
    if (dialog && e.composedPath().includes(dialog)) return;
    this._close();
  }

  private _onKey = (e: KeyboardEvent) => {
    if (e.key !== "Escape" || !this.open) return;
    // Don't eat Escape when focus is inside a form control — the browser
    // uses it to dismiss open select dropdowns and IME compositions.
    for (const el of e.composedPath()) {
      if (!(el instanceof HTMLElement)) continue;
      if (["INPUT", "SELECT", "TEXTAREA"].includes(el.tagName)) return;
    }
    this._close();
  };

  connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener("keydown", this._onKey);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener("keydown", this._onKey);
  }

  render() {
    if (!this.open) return null;
    return html`
      <div class="backdrop" @click=${this._onBackdrop}>
        <div
          class="dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bee-modal-heading"
        >
          <header>
            <h2 id="bee-modal-heading">${this.heading}</h2>
            <button
              class="close"
              @click=${this._close}
              aria-label="Close dialog"
            >
              ×
            </button>
          </header>
          <div class="body"><slot></slot></div>
          <footer><slot name="footer"></slot></footer>
        </div>
      </div>
    `;
  }

  static styles = css`
    :host([open]) {
      display: block;
    }
    :host {
      display: none;
    }
    .backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10;
      padding: 20px;
    }
    .dialog {
      background: var(--card-background-color, #fff);
      color: var(--primary-text-color, #212121);
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
      min-width: 320px;
      max-width: 560px;
      width: 100%;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
    }
    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      border-bottom: 1px solid var(--divider-color, #e0e0e0);
    }
    h2 {
      margin: 0;
      font-size: 18px;
      font-weight: 500;
    }
    .close {
      font-size: 24px;
      line-height: 1;
      background: transparent;
      border: 0;
      color: inherit;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 6px;
    }
    .close:hover {
      background: var(--secondary-background-color, #f0f0f0);
    }
    .body {
      padding: 20px;
      overflow: auto;
    }
    footer {
      padding: 12px 20px;
      border-top: 1px solid var(--divider-color, #e0e0e0);
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "bee-modal": BeeModal;
  }
}
