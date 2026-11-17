import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './auth.service';
import { ConfirmationDialogComponent } from './confirmation-dialog.component';
import { ConfirmationService } from './confirmation.service';
import { UserAvatarComponent } from './user-avatar.component';

@Component({
  imports: [ConfirmationDialogComponent, RouterLink, RouterLinkActive, RouterOutlet, UserAvatarComponent],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  protected readonly auth = inject(AuthService);
  private readonly confirmations = inject(ConfirmationService);
  protected readonly darkTheme = signal(false);
  protected readonly logoutError = signal('');
  private readonly router = inject(Router);

  constructor() {
    const savedTheme = localStorage.getItem('forum-theme');
    this.darkTheme.set(savedTheme === 'dark' || (savedTheme === null && window.matchMedia('(prefers-color-scheme: dark)').matches));
    this.applyTheme();
    this.auth.refresh();
  }

  toggleTheme(): void {
    this.darkTheme.update((enabled) => !enabled);
    localStorage.setItem('forum-theme', this.darkTheme() ? 'dark' : 'light');
    this.applyTheme();
  }

  async logout(): Promise<void> {
    const confirmed = await this.confirmations.confirm({
      title: 'Se déconnecter ?',
      message: 'Vous devrez vous reconnecter pour accéder à votre espace.',
      confirmLabel: 'Me déconnecter',
    });
    if (!confirmed) return;
    this.logoutError.set('');
    this.auth.logout().subscribe({
      next: () => this.router.navigateByUrl('/'),
      error: () => this.logoutError.set('La déconnexion a échoué. Réessayez.'),
    });
  }

  private applyTheme(): void {
    document.documentElement.dataset['theme'] = this.darkTheme() ? 'dark' : 'light';
  }
}
