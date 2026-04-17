import { LitElement, html, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import "../modal.js";
import "../bee-select.js";
import type { HassArea } from "../../types.js";

@customElement("bee-change-area-dialog")
export class BeeChangeAreaDialog extends LitElement {
  @property({ type: Boolean }) open = false;
  @property({ attribute: false }) areas: HassArea[] = [];
  @property({ type: Number }) count = 0;
  @property({ type: Boolean }) running = false;

  @state() private _selectedAreaId = "";

  willUpdate(changed: Map<string, unknown>) {
    if (changed.has("open") && this.open) {
      this._selectedAreaId = "";
    }
  }

  private _close() {
    this.dispatchEvent(
      new CustomEvent("dialog-close", { bubbles: true, composed: true }),
    );
  }

  private _apply() {
    // Empty string means "No area" (send null).
    this.dispatchEvent(
      new CustomEvent<string | null>("apply-area", {
        detail: this._selectedAreaId === "" ? null : this._selectedAreaId,
        bubbles: true,
        composed: true,
      }),
    );
  }

  render() {
    return html`
      <bee-modal
        .open=${this.open}
        heading="Change area"
        @modal-close=${this._close}
      >
        <p class="desc">
          Set the area for <strong>${this.count}</strong> selected
          ${this.count === 1 ? "entity" : "entities"}.
        </p>

        <label>
          <span>New area</span>
          <bee-select
            .value=${this._selectedAreaId}
            .options=${[
              { value: "", label: "— No area —" },
              ...this.areas.map((a) => ({
                value: a.area_id,
                label: a.name,
              })),
            ]}
            placeholder="Choose an area"
            ?disabled=${this.running}
            @select-change=${(e: CustomEvent<string>) =>
              (this._selectedAreaId = e.detail)}
          ></bee-select>
        </label>

        <p class="note">
          This overrides the device's inherited area for the selected
          entities.
        </p>

        <div slot="footer">
          <button
            class="btn"
            @click=${this._close}
            ?disabled=${this.running}
          >
            Cancel
          </button>
          <button
            class="btn primary"
            @click=${this._apply}
            ?disabled=${this.running}
          >
            ${this.running ? "Applying…" : "Apply"}
          </button>
        </div>
      </bee-modal>
    `;
  }

  static styles = css`
    .desc {
      margin: 0 0 16px;
    }
    label {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    label span {
      font-size: 13px;
      color: var(--secondary-text-color, #727272);
    }
    .note {
      margin: 12px 0 0;
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
    "bee-change-area-dialog": BeeChangeAreaDialog;
  }
}
