import { Injectable, signal } from '@angular/core';

export interface ConfirmationOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

interface PendingConfirmation {
  options: ConfirmationOptions;
  resolve: (confirmed: boolean) => void;
}

@Injectable({ providedIn: 'root' })
export class ConfirmationService {
  readonly current = signal<ConfirmationOptions | null>(null);
  private readonly queue: PendingConfirmation[] = [];
  private active: PendingConfirmation | null = null;

  confirm(options: ConfirmationOptions): Promise<boolean> {
    return new Promise((resolve) => {
      this.queue.push({ options, resolve });
      this.showNext();
    });
  }

  resolve(confirmed: boolean): void {
    if (!this.active) return;
    this.active.resolve(confirmed);
    this.active = null;
    this.current.set(null);
    this.showNext();
  }

  private showNext(): void {
    if (this.active || this.queue.length === 0) return;
    const next = this.queue.shift();
    if (!next) return;
    this.active = next;
    this.current.set(this.active.options);
  }
}
