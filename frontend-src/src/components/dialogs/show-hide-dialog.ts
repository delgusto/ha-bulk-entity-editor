import { LitElement, html, css, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import "../modal.js";
import type { HassEntityRegistryEntry } from "../../types.js";

export type ShowHideMode = "show" | "hide";

@customElement("bee-show-hide-dialog")
export class BeeShowHideDialog extends LitElement {
  @property({ type: Boolean }) open = false;
  @property({ attribute: false }) selected: HassEntityRegistryEntry[] = [];
  @property({ type: Boolean }) running = false;

  @state() private _mode: ShowHideMode = "hide";

  willUpdate(changed: Map<string, unknown>) {
    if (changed.has("open") && this.open) {
      const currentlyHidden = this.selected.filter(
        (e) => e.hidden_by !== null,
      ).length;
      const currentlyShown = this.selected.length - currentlyHidden;
      this._mode = currentlyShown >= currentlyHidden ? "hide" : "show";
    }
  }

  private _close() {
    this.dispatchEvent(
      new CustomEvent("dialog-close", { bubbles: true, composed: true }),
    );
  }

  private _apply() {
    this.dispatchEvent(
      new CustomEvent<ShowHideMode>("apply-show-hide", {
        detail: this._mode,
        bubbles: true,
        composed: true,
      }),
    );
  }

  render() {
    const hidden = this.selected.filter((e) => e.hidden_by !== null);
    const shown = this.selected.filter((e) => e.hidden_by === null);
    const nonUserHidden = hidden.filter((e) => e.hidden_by !== "user");

    const willChange = this._mode === "show" ? hidden.length : shown.length;
    const alreadyInState =
      this._mode === "show" ? shown.length : hidden.length;

    return html`
      <bee-modal
        .open=${this.open}
        heading="Show / hide entities"
        @modal-close=${this._close}
      >
        <div class="segmented" role="radiogroup">
          <button
            role="radio"
            aria-checked=${this._mode === "show"}
            class=${this._mode === "show" ? "on" : ""}
            @click=${() => (this._mode = "show")}
            ?disabled=${this.running}
          >
            Show
          </button>
          <button
            role="radio"
            aria-checked=${this._mode === "hide"}
            class=${this._mode === "hide" ? "on" : ""}
            @click=${() => (this._mode = "hide")}
            ?disabled=${this.running}
          >
            Hide
          </button>
        </div>

        <dl class="stats">
          <div>
            <dt>Will ${this._mode}</dt>
            <dd><strong>${willChange}</strong></dd>
          </div>
          <div class="muted">
            <dt>Already ${this._mode === "show" ? "shown" : "hidden"}</dt>
            <dd>${alreadyInState}</dd>
          </div>
        </dl>

        ${this._mode === "show" && nonUserHidden.length > 0
          ? html`
              <div class="warn">
                <strong>${nonUserHidden.length}</strong> of these were hidden
                by their integration (not by a user). Showing them may not
                stick.
              </div>
            `
          : nothing}

        <p class="note">
          Hidden entities stay active but are excluded from default dashboards
          and auto-generated views.
        </p>

        <div slot="footer">
          <button class="btn" @click=${this._close} ?disabled=${this.running}>
            Cancel
          </button>
          <button
            class="btn primary"
            @click=${this._apply}
            ?disabled=${this.running || willChange === 0}
          >
            ${this.running
              ? "Applying…"
              : `${this._mode === "show" ? "Show" : "Hide"} ${willChange}`}
          </button>
        </div>
      </bee-modal>
    `;
  }

  static styles = css`
    .segmented {
      display: inline-flex;
      border: 1px solid var(--divider-color, #d0d0d0);
      border-radius: 8px;
      overflow: hidden;
      margin-bottom: 16px;
    }
    .segmented button {
      font: inherit;
      padding: 8px 16px;
      background: var(--primary-background-color, #fff);
      color: var(--primary-text-color, #212121);
      border: 0;
      cursor: pointer;
    }
    .segmented button + button {
      border-left: 1px solid var(--divider-color, #d0d0d0);
    }
    .segmented button.on {
      background: var(--primary-color, #03a9f4);
      color: var(--text-primary-color, #fff);
    }
    .segmented button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .stats {
      display: flex;
      gap: 24px;
      margin: 0 0 12px;
    }
    .stats div {
      display: flex;
      flex-direction: column;
    }
    .stats dt {
      font-size: 12px;
      color: var(--secondary-text-color, #727272);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .stats dd {
      margin: 0;
      font-size: 20px;
    }
    .stats .muted dd {
      color: var(--secondary-text-color, #727272);
    }
    .warn {
      padding: 10px 12px;
      border-radius: 8px;
      background: color-mix(
        in srgb,
        var(--warning-color, #ff9800) 15%,
        transparent
      );
      border: 1px solid
        color-mix(in srgb, var(--warning-color, #ff9800) 50%, transparent);
      font-size: 13px;
      margin-bottom: 12px;
    }
    .note {
      margin: 0;
      font-size: 12px;
      color: var(--secondary-text-color, #727272);
    }
    .btn {
      font: inherit;
      padding: 8px 14px;
      border-radius: 6px;
      border: 1px solid var(--divider-color, #d0d0d0);
      background: var(--primary-background-color, #fff);
      color: var(--primary-text-color, #212121);
      cursor: pointer;
    }
    .btn:hover:not(:disabled) {
      background: var(--secondary-background-color, #f5f5f5);
    }
    .btn.primary {
      background: var(--primary-color, #03a9f4);
      color: var(--text-primary-color, #fff);
      border-color: transparent;
    }
    .btn.primary:hover:not(:disabled) {
      filter: brightness(0.95);
    }
    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "bee-show-hide-dialog": BeeShowHideDialog;
  }
}
