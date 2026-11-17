import { Component, effect, inject, OnDestroy, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../auth.service';

@Component({
  standalone: true,
  imports: [FormsModule],
  template: `
    <p class="eyebrow">Mon espace</p>
    <h1>Mon profil</h1>
    @if (!auth.user()) {
      <p class="muted">Vérification de la session…</p>
    } @else {
      <form class="panel profile-form" (ngSubmit)="save()">
        <div class="avatar-field">
          <div class="avatar-preview">
            @if (avatarPreview() ?? auth.user()?.avatar_url; as avatarUrl) {
              <img [src]="avatarUrl" alt="" />
            } @else {
              <span aria-hidden="true">{{ (name || auth.user()?.name || '?').charAt(0).toUpperCase() }}</span>
            }
          </div>
          <div class="field">
            <label for="avatar">Photo de profil</label>
            <input id="avatar" name="avatar" type="file" accept="image/jpeg,image/png,image/webp" [disabled]="saving()" (change)="selectAvatar($event)" />
            <small class="muted">JPEG, PNG ou WebP, 2 Mo maximum. Photo visible publiquement sur le forum.</small>
          </div>
        </div>
        <div class="field"><label for="name">Nom affiché</label><input id="name" name="name" maxlength="120" required [(ngModel)]="name" /></div>
        <div class="field"><label for="email">Adresse email</label><input id="email" name="email" type="email" readonly [value]="auth.user()?.email" /></div>
        <hr />
        <h2>Changer le mot de passe</h2>
        <p class="muted">Laissez ces champs vides si vous ne souhaitez pas le modifier.</p>
        <div class="field"><label for="current-password">Mot de passe actuel</label><input id="current-password" name="currentPassword" type="password" autocomplete="current-password" [(ngModel)]="currentPassword" /></div>
        <div class="field"><label for="new-password">Nouveau mot de passe</label><input id="new-password" name="newPassword" type="password" autocomplete="new-password" minlength="8" [(ngModel)]="password" /></div>
        <div class="field"><label for="confirm-password">Confirmer le nouveau mot de passe</label><input id="confirm-password" name="confirmPassword" type="password" autocomplete="new-password" minlength="8" [(ngModel)]="passwordConfirmation" /></div>
        @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
        @if (message()) { <p class="success" role="status">{{ message() }}</p> }
        <button [disabled]="saving() || !name.trim()">Enregistrer le profil</button>
      </form>
    }
  `,
  styles: [`
    h1, h2 { font-family: 'Segoe UI', sans-serif; letter-spacing: -.035em; }
    h1 { font-size: clamp(2rem, 4vw, 2.8rem); margin: 8px 0 24px; }
    h2 { font-size: 1.15rem; margin: 0; }
    .profile-form { display: grid; gap: 18px; max-width: 620px; padding: 28px; }
    .profile-form p { margin: -12px 0 0; }
    .avatar-field { align-items: center; display: flex; flex-wrap: wrap; gap: 20px; }
    .avatar-preview { align-items: center; background: var(--accent-soft); border: 1px solid var(--line); border-radius: 50%; color: var(--accent); display: flex; flex: 0 0 88px; font-size: 2rem; font-weight: 800; height: 88px; justify-content: center; overflow: hidden; width: 88px; }
    .avatar-preview img { height: 100%; object-fit: cover; width: 100%; }
    .avatar-field .field { flex: 1; min-width: 220px; }
    .avatar-field small { line-height: 1.5; }
    hr { border: 0; border-top: 1px solid var(--line); margin: 0; width: 100%; }
  `],
})
export class ProfileComponent implements OnDestroy {
  protected readonly auth = inject(AuthService);
  readonly error = signal('');
  readonly message = signal('');
  readonly saving = signal(false);
  readonly avatarPreview = signal<string | null>(null);
  avatarFile: File | null = null;
  private previewUrl: string | null = null;
  name = '';
  currentPassword = '';
  password = '';
  passwordConfirmation = '';

  constructor() {
    effect(() => {
      const user = this.auth.user();
      if (user && !this.name) this.name = user.name;
    });
  }

  selectAvatar(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    this.clearAvatarPreview();
    this.avatarFile = file;
    if (!file) return;
    this.previewUrl = URL.createObjectURL(file);
    this.avatarPreview.set(this.previewUrl);
  }

  ngOnDestroy(): void {
    this.clearAvatarPreview();
  }

  save(): void {
    this.error.set('');
    this.message.set('');
    this.saving.set(true);
    const avatar = this.avatarFile;
    this.auth.updateProfile({
      name: this.name.trim(),
      ...(this.password ? {
        current_password: this.currentPassword,
        password: this.password,
        password_confirmation: this.passwordConfirmation,
      } : {}),
      ...(avatar ? { avatar } : {}),
    }).subscribe({
      next: (user) => {
        this.name = user.name;
        this.clearAvatarPreview();
        this.avatarFile = null;
        this.currentPassword = '';
        this.password = '';
        this.passwordConfirmation = '';
        this.message.set('Profil mis à jour.');
        this.saving.set(false);
      },
      error: (error) => {
        this.error.set(error.error?.message ?? 'Impossible de modifier le profil.');
        this.saving.set(false);
      },
    });
  }

  private clearAvatarPreview(): void {
    if (this.previewUrl) URL.revokeObjectURL(this.previewUrl);
    this.previewUrl = null;
    this.avatarPreview.set(null);
  }
}
