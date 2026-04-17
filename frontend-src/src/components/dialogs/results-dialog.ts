import { LitElement, html, css, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import "../modal.js";
import type { BulkProgress } from "../../lib/bulk-runner.js";

@customElement("bee-results-dialog")
export class BeeResultsDialog extends LitElement {
  @property({ type: Boolean }) open = false;
  @property({ attribute: false }) progress: BulkProgress | null = null;

  private _close() {
    this.dispatchEvent(
      new CustomEvent("dialog-close", { bubbles: true, composed: true }),
    );
  }

  private _retryFailed() {
    if (!this.progress) return;
    const failedIds = this.progress.results
      .filter((r) => !r.ok)
      .map((r) => r.id);
    this.dispatchEvent(
      new CustomEvent<string[]>("retry-failed", {
        detail: failedIds,
        bubbles: true,
        composed: true,
      }),
    );
  }

  render() {
    const p = this.progress;
    const running = p != null && p.done < p.total;
    const hasFailures = p != null && p.failed > 0;

    return html`
      <bee-modal
        .open=${this.open}
        heading=${running ? "Applying…" : "Done"}
        @modal-close=${this._close}
      >
        ${p
          ? html`
              <div class="summary">
                <div class="counts">
                  <span class="ok">${p.succeeded} succeeded</span>
                  ${p.failed > 0
                    ? html`<span class="err">${p.failed} failed</span>`
                    : nothing}
                  <span class="total">of ${p.total}</span>
                </div>
                <div class="bar">
                  <div
                    class="fill"
                    style="width: ${p.total === 0
                      ? 0
                      : (p.done / p.total) * 100}%"
                  ></div>
                </div>
              </div>

              ${hasFailures
                ? html`
                    <details open>
                      <summary>Failures</summary>
                      <ul class="failures">
                        ${p.results
                          .filter((r) => !r.ok)
                          .map(
                            (r) => html`
                              <li>
                                <code>${r.id}</code>
                                <span class="msg">${r.error}</span>
                              </li>
                            `,
                          )}
                      </ul>
                    </details>
                  `
                : nothing}
            `
          : nothing}

        <div slot="footer">
          ${hasFailures && !running
            ? html`
                <button class="btn" @click=${this._retryFailed}>
                  Retry failed
                </button>
              `
            : nothing}
          <button
            class="btn primary"
            @click=${this._close}
            ?disabled=${running}
          >
            ${running ? "Running…" : "Close"}
          </button>
        </div>
      </bee-modal>
    `;
  }

  static styles = css`
    .summary {
      margin-bottom: 16px;
    }
    .counts {
      display: flex;
      gap: 12px;
      align-items: baseline;
      margin-bottom: 8px;
      font-size: 14px;
    }
    .ok {
      color: var(--success-color, #2e7d32);
      font-weight: 500;
    }
    .err {
      color: var(--error-color, #db4437);
      font-weight: 500;
    }
    .total {
      color: var(--secondary-text-color, #727272);
    }
    .bar {
      height: 6px;
      background: var(--divider-color, #e0e0e0);
      border-radius: 3px;
      overflow: hidden;
    }
    .fill {
      height: 100%;
      background: var(--primary-color, #03a9f4);
      transition: width 120ms linear;
    }
    details {
      margin-top: 8px;
      border: 1px solid var(--divider-color, #e0e0e0);
      border-radius: 8px;
      padding: 8px 12px;
    }
    summary {
      cursor: pointer;
      font-weight: 500;
    }
    .failures {
      list-style: none;
      padding: 8px 0 0;
      margin: 0;
      max-height: 240px;
      overflow: auto;
    }
    .failures li {
      padding: 6px 0;
      border-top: 1px solid var(--divider-color, #f0f0f0);
      font-size: 13px;
      display: flex;
      gap: 12px;
      justify-content: space-between;
    }
    .failures code {
      font-family: var(--code-font-family, ui-monospace, monospace);
    }
    .msg {
      color: var(--error-color, #db4437);
      text-align: right;
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
    "bee-results-dialog": BeeResultsDialog;
  }
}
