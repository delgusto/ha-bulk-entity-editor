import { LitElement, html, css, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import "../modal.js";
import type { HassEntityRegistryEntry } from "../../types.js";

export type EnableDisableMode = "enable" | "disable";

@customElement("bee-enable-disable-dialog")
export class BeeEnableDisableDialog extends LitElement {
  @property({ type: Boolean }) open = false;
  @property({ attribute: false }) selected: HassEntityRegistryEntry[] = [];
  @property({ type: Boolean }) running = false;

  @state() private _mode: EnableDisableMode = "disable";

  willUpdate(changed: Map<string, unknown>) {
    if (changed.has("open") && this.open) {
      // Default to the action that would change the most entities.
      const currentlyDisabled = this.selected.filter(
        (e) => e.disabled_by !== null,
      ).length;
      const currentlyEnabled = this.selected.length - currentlyDisabled;
      this._mode = currentlyEnabled >= currentlyDisabled ? "disable" : "enable";
    }
  }

  private _close() {
    this.dispatchEvent(
      new CustomEvent("dialog-close", { bubbles: true, composed: true }),
    );
  }

  private _apply() {
    this.dispatchEvent(
      new CustomEvent<EnableDisableMode>("apply-enable-disable", {
        detail: this._mode,
        bubbles: true,
        composed: true,
      }),
    );
  }

  render() {
    const disabled = this.selected.filter((e) => e.disabled_by !== null);
    const enabled = this.selected.filter((e) => e.disabled_by === null);
    const nonUserDisabled = disabled.filter((e) => e.disabled_by !== "user");

    const willChange =
      this._mode === "enable" ? disabled.length : enabled.length;
    const alreadyInState =
      this._mode === "enable" ? enabled.length : disabled.length;

    return html`
      <bee-modal
        .open=${this.open}
        heading="Enable / disable entities"
        @modal-close=${this._close}
      >
        <div class="segmented" role="radiogroup">
          <button
            role="radio"
            aria-checked=${this._mode === "enable"}
            class=${this._mode === "enable" ? "on" : ""}
            @click=${() => (this._mode = "enable")}
            ?disabled=${this.running}
          >
            Enable
          </button>
          <button
            role="radio"
            aria-checked=${this._mode === "disable"}
            class=${this._mode === "disable" ? "on" : ""}
            @click=${() => (this._mode = "disable")}
            ?disabled=${this.running}
          >
            Disable
          </button>
        </div>

        <dl class="stats">
          <div>
            <dt>Will ${this._mode}</dt>
            <dd><strong>${willChange}</strong></dd>
          </div>
          <div class="muted">
            <dt>Already ${this._mode === "enable" ? "enabled" : "disabled"}</dt>
            <dd>${alreadyInState}</dd>
          </div>
        </dl>

        ${this._mode === "enable" && nonUserDisabled.length > 0
          ? html`
              <div class="warn">
                <strong>${nonUserDisabled.length}</strong> of these were
                disabled by their integration or device (not by a user).
                Re-enabling them may not stick — Home Assistant can disable
                them again on reload.
              </div>
            `
          : nothing}

        <p class="note">
          Disabled entities stop receiving state updates and are hidden from
          default dashboards.
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
              : `${this._mode === "enable" ? "Enable" : "Disable"} ${willChange}`}
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
    "bee-enable-disable-dialog": BeeEnableDisableDialog;
  }
}
