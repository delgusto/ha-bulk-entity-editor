import { LitElement, html, css, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import "@lit-labs/virtualizer";
import "../modal.js";
import "../bee-select.js";
import type { HassEntityRegistryEntry } from "../../types.js";
import {
  buildRenameRows,
  summarizeRows,
  type RenameMode,
  type RenameOptions,
  type RenameRow,
  type RenameTarget,
} from "../../lib/rename.js";

@customElement("bee-rename-dialog")
export class BeeRenameDialog extends LitElement {
  @property({ type: Boolean }) open = false;
  @property({ attribute: false }) selected: HassEntityRegistryEntry[] = [];
  @property({ attribute: false }) allEntityIds: string[] = [];
  @property({ type: Boolean }) running = false;

  @state() private _target: RenameTarget = "friendly_name";
  @state() private _mode: RenameMode = "prefix";
  @state() private _text = "";
  @state() private _find = "";
  @state() private _replace = "";
  @state() private _regex = false;
  @state() private _caseSensitive = true;

  willUpdate(changed: Map<string, unknown>) {
    if (changed.has("open") && this.open) {
      this._target = "friendly_name";
      this._mode = "prefix";
      this._text = "";
      this._find = "";
      this._replace = "";
      this._regex = false;
      this._caseSensitive = true;
    }
  }

  private get _options(): RenameOptions {
    return {
      target: this._target,
      mode: this._mode,
      text: this._text,
      find: this._find,
      replace: this._replace,
      regex: this._regex,
      caseSensitive: this._caseSensitive,
    };
  }

  private get _rows(): RenameRow[] {
    return buildRenameRows(this.selected, this.allEntityIds, this._options);
  }

  private _close() {
    this.dispatchEvent(
      new CustomEvent("dialog-close", { bubbles: true, composed: true }),
    );
  }

  private _apply() {
    const toApply = this._rows.filter((r) => !r.error && r.changed);
    this.dispatchEvent(
      new CustomEvent<{ target: RenameTarget; rows: RenameRow[] }>(
        "apply-rename",
        {
          detail: { target: this._target, rows: toApply },
          bubbles: true,
          composed: true,
        },
      ),
    );
  }

  render() {
    const rows = this._rows;
    const summary = summarizeRows(rows);
    const anyRowErrors = rows.some((r) => r.error !== null);
    const disableApply =
      this.running || summary.applicable === 0 || anyRowErrors;

    return html`
      <bee-modal
        .open=${this.open}
        heading="Rename entities"
        @modal-close=${this._close}
      >
        <div class="body">
          <div class="row">
            <label class="field">
              <span>Target</span>
              <bee-select
                .value=${this._target}
                .options=${[
                  { value: "friendly_name", label: "Friendly name" },
                  { value: "entity_id", label: "Entity ID" },
                ]}
                ?disabled=${this.running}
                @select-change=${(e: CustomEvent<string>) =>
                  (this._target = e.detail as RenameTarget)}
              ></bee-select>
            </label>

            <label class="field">
              <span>Mode</span>
              <bee-select
                .value=${this._mode}
                .options=${[
                  { value: "prefix", label: "Add prefix" },
                  { value: "suffix", label: "Add suffix" },
                  { value: "find-replace", label: "Find & replace" },
                ]}
                ?disabled=${this.running}
                @select-change=${(e: CustomEvent<string>) =>
                  (this._mode = e.detail as RenameMode)}
              ></bee-select>
            </label>
          </div>

          ${this._target === "entity_id"
            ? html`
                <div class="warn">
                  <strong>Renaming entity IDs is risky.</strong> Home
                  Assistant will not automatically update automations,
                  scripts, dashboards, or templates that reference the old
                  IDs. You'll need to update those by hand.
                </div>
              `
            : nothing}

          ${this._mode === "prefix" || this._mode === "suffix"
            ? html`
                <label class="field">
                  <span
                    >${this._mode === "prefix" ? "Prefix text" : "Suffix text"}</span
                  >
                  <input
                    type="text"
                    .value=${this._text}
                    @input=${(e: Event) =>
                      (this._text = (e.target as HTMLInputElement).value)}
                    placeholder=${this._target === "entity_id"
                      ? "e.g. kitchen_"
                      : "e.g. Kitchen - "}
                    ?disabled=${this.running}
                  />
                </label>
              `
            : html`
                <div class="row">
                  <label class="field">
                    <span>Find</span>
                    <input
                      type="text"
                      .value=${this._find}
                      @input=${(e: Event) =>
                        (this._find = (e.target as HTMLInputElement).value)}
                      ?disabled=${this.running}
                    />
                  </label>
                  <label class="field">
                    <span>Replace with</span>
                    <input
                      type="text"
                      .value=${this._replace}
                      @input=${(e: Event) =>
                        (this._replace = (e.target as HTMLInputElement).value)}
                      ?disabled=${this.running}
                    />
                  </label>
                </div>
                <div class="opts">
                  <label class="check">
                    <input
                      type="checkbox"
                      .checked=${this._regex}
                      @change=${(e: Event) =>
                        (this._regex = (e.target as HTMLInputElement).checked)}
                      ?disabled=${this.running}
                    />
                    Use regex (<code>$1</code> etc. in Replace)
                  </label>
                  <label class="check">
                    <input
                      type="checkbox"
                      .checked=${this._caseSensitive}
                      @change=${(e: Event) =>
                        (this._caseSensitive = (
                          e.target as HTMLInputElement
                        ).checked)}
                      ?disabled=${this.running}
                    />
                    Case-sensitive
                  </label>
                </div>
              `}

          <dl class="stats">
            <div>
              <dt>Will rename</dt>
              <dd><strong>${summary.applicable}</strong></dd>
            </div>
            <div class="muted">
              <dt>Unchanged</dt>
              <dd>${summary.unchanged}</dd>
            </div>
            <div class=${summary.errors > 0 ? "err" : "muted"}>
              <dt>Errors</dt>
              <dd>${summary.errors}</dd>
            </div>
          </dl>

          <div class="preview">
            <div class="preview-head">Preview</div>
            <div class="preview-scroll">
              <lit-virtualizer
                scroller
                .items=${rows}
                .renderItem=${(r: RenameRow) => html`
                  <div
                    class="preview-row ${r.error
                      ? "has-error"
                      : r.changed
                        ? "will-change"
                        : "unchanged"}"
                  >
                    <div class="old">${r.currentValue || "—"}</div>
                    <div class="arrow">→</div>
                    <div class="new">${r.newValue || "—"}</div>
                    ${r.error
                      ? html`<div class="err-msg">${r.error}</div>`
                      : r.changed
                        ? nothing
                        : html`<div class="unchanged-msg">no change</div>`}
                  </div>
                `}
              ></lit-virtualizer>
            </div>
          </div>
        </div>

        <div slot="footer">
          <button class="btn" @click=${this._close} ?disabled=${this.running}>
            Cancel
          </button>
          <button
            class="btn primary"
            @click=${this._apply}
            ?disabled=${disableApply}
          >
            ${this.running
              ? "Applying…"
              : summary.applicable === 0
                ? "Nothing to rename"
                : anyRowErrors
                  ? "Fix errors to continue"
                  : `Rename ${summary.applicable}`}
          </button>
        </div>
      </bee-modal>
    `;
  }

  static styles = css`
    :host {
      display: contents;
    }
    .body {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .row {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }
    .field {
      display: flex;
      flex-direction: column;
      gap: 4px;
      flex: 1 1 180px;
      min-width: 160px;
    }
    .field span {
      font-size: 12px;
      color: var(--secondary-text-color, #727272);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    input[type="text"] {
      font: inherit;
      padding: 8px 10px;
      border-radius: 6px;
      border: 1px solid var(--divider-color, #d0d0d0);
      background: var(--primary-background-color, #fff);
      color: var(--primary-text-color, #212121);
    }
    input[type="text"]:focus {
      outline: 2px solid var(--primary-color, #03a9f4);
      outline-offset: -1px;
    }
    .opts {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
      font-size: 13px;
    }
    .check {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
    }
    .warn {
      padding: 10px 12px;
      border-radius: 8px;
      background: color-mix(
        in srgb,
        var(--error-color, #db4437) 12%,
        transparent
      );
      border: 1px solid
        color-mix(in srgb, var(--error-color, #db4437) 50%, transparent);
      font-size: 13px;
    }
    .stats {
      display: flex;
      gap: 24px;
      margin: 4px 0;
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
    .stats .err dd {
      color: var(--error-color, #db4437);
    }
    .preview {
      border: 1px solid var(--divider-color, #e0e0e0);
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      min-height: 200px;
      max-height: 320px;
    }
    .preview-head {
      padding: 8px 12px;
      border-bottom: 1px solid var(--divider-color, #e0e0e0);
      font-weight: 500;
      font-size: 13px;
    }
    .preview-scroll {
      flex: 1 1 auto;
      min-height: 0;
      display: flex;
    }
    lit-virtualizer {
      flex: 1 1 auto;
      min-height: 0;
    }
    .preview-row {
      display: grid;
      grid-template-columns: 1fr 24px 1fr auto;
      gap: 8px;
      padding: 6px 12px;
      font-size: 13px;
      align-items: baseline;
      border-bottom: 1px solid var(--divider-color, #f0f0f0);
      font-family: var(--code-font-family, ui-monospace, monospace);
    }
    .old,
    .new {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .arrow {
      color: var(--secondary-text-color, #727272);
      text-align: center;
    }
    .will-change .new {
      color: var(--primary-color, #03a9f4);
    }
    .unchanged .new,
    .unchanged .old {
      color: var(--secondary-text-color, #727272);
    }
    .has-error .new {
      color: var(--error-color, #db4437);
      text-decoration: line-through;
    }
    .err-msg {
      color: var(--error-color, #db4437);
      font-family: inherit;
      font-size: 12px;
    }
    .unchanged-msg {
      color: var(--secondary-text-color, #727272);
      font-family: inherit;
      font-size: 12px;
      font-style: italic;
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
    "bee-rename-dialog": BeeRenameDialog;
  }
}
