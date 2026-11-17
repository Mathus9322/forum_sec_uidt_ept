import { Component, ElementRef, effect, inject, viewChild } from '@angular/core';
import { ConfirmationService } from './confirmation.service';

@Component({
  selector: 'app-confirmation-dialog',
  template: `
    <dialog
      #dialog
      class="confirmation-dialog"
      aria-labelledby="confirmation-title"
      aria-describedby="confirmation-message"
      (cancel)="cancel($event)"
      (click)="dismissFromBackdrop($event)"
    >
      @if (confirmations.current(); as confirmation) {
        <div class="dialog-content">
          <div class="dialog-icon" [class.destructive]="confirmation.destructive" aria-hidden="true">
            {{ confirmation.destructive ? '!' : '?' }}
          </div>
          <h2 id="confirmation-title">{{ confirmation.title }}</h2>
          <p id="confirmation-message">{{ confirmation.message }}</p>
          <div class="dialog-actions">
            <button type="button" class="cancel-button" (click)="resolve(false)">
              {{ confirmation.cancelLabel ?? 'Annuler' }}
            </button>
            <button
              type="button"
              class="confirm-button"
              [class.destructive]="confirmation.destructive"
              (click)="resolve(true)"
            >
              {{ confirmation.confirmLabel ?? 'Confirmer' }}
            </button>
          </div>
        </div>
      }
    </dialog>
  `,
  styles: [`
    .confirmation-dialog {
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: 18px;
      box-shadow: 0 24px 80px rgb(22 16 13 / 28%);
      color: var(--ink);
      max-width: calc(100vw - 32px);
      padding: 0;
      width: 440px;
    }

    .confirmation-dialog::backdrop {
      -webkit-backdrop-filter: blur(3px);
      backdrop-filter: blur(3px);
      background: rgb(25 18 15 / 58%);
    }

    .dialog-content { padding: 30px; }
    .dialog-icon {
      align-items: center;
      background: var(--accent-soft);
      border-radius: 50%;
      color: var(--accent);
      display: flex;
      font-size: 1.15rem;
      font-weight: 800;
      height: 42px;
      justify-content: center;
      margin-bottom: 18px;
      width: 42px;
    }
    .dialog-icon.destructive { background: color-mix(in srgb, var(--danger) 12%, var(--surface)); color: var(--danger); }
    h2 { font-family: 'Segoe UI', sans-serif; font-size: 1.3rem; letter-spacing: -.025em; margin: 0 0 9px; }
    p { color: var(--muted); line-height: 1.6; margin: 0; }
    .dialog-actions { display: flex; flex-wrap: wrap; gap: 10px; justify-content: flex-end; margin-top: 26px; }
    .dialog-actions button { min-height: 40px; }
    .cancel-button { background: var(--surface); border-color: var(--line); color: var(--ink); }
    .cancel-button:hover { background: var(--canvas); }
    .confirm-button.destructive { background: var(--danger); border-color: var(--danger); color: #fff; }
    .confirm-button.destructive:hover { filter: brightness(.92); }
    button:focus-visible { outline: 3px solid color-mix(in srgb, var(--accent) 45%, transparent); outline-offset: 3px; }

    @media (max-width: 480px) {
      .dialog-content { padding: 24px; }
      .dialog-actions { flex-direction: column-reverse; }
      .dialog-actions button { width: 100%; }
    }
  `],
})
export class ConfirmationDialogComponent {
  protected readonly confirmations = inject(ConfirmationService);
  private readonly dialogElement = viewChild<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    effect(() => {
      const dialog = this.dialogElement()?.nativeElement;
      const confirmation = this.confirmations.current();
      if (!dialog) return;
      if (confirmation && !dialog.open) dialog.showModal();
      else if (!confirmation && dialog.open) dialog.close();
    });
  }

  cancel(event: Event): void {
    event.preventDefault();
    this.resolve(false);
  }

  dismissFromBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.resolve(false);
  }

  resolve(confirmed: boolean): void {
    this.confirmations.resolve(confirmed);
  }
}
