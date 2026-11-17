import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  standalone: true,
  imports: [FormsModule],
  template: `
    <section class="auth-wrap">
      <div class="auth-intro">
        <p class="eyebrow">Bienvenue au forum</p>
        <h1>Apprendre ensemble,<br />à son rythme.</h1>
        <p class="muted">Connectez-vous pour poser une question, partager une réponse ou retrouver vos échanges.</p>
      </div>
      <form class="panel auth-card" (ngSubmit)="submit()">
        <h2>{{ mode() === 'register' ? 'Créer un compte' : mode() === 'reset' ? 'Nouveau mot de passe' : 'Connexion' }}</h2>
        @if (mode() === 'register') {
          <div class="field"><label for="name">Nom affiché</label><input id="name" name="name" autocomplete="name" maxlength="120" required [(ngModel)]="name" /></div>
        }
        @if (mode() !== 'reset') {
          <div class="field"><label for="email">Adresse email</label><input id="email" name="email" type="email" autocomplete="email" required [(ngModel)]="email" /></div>
          <div class="field"><label for="password">Mot de passe</label><input id="password" name="password" type="password" [attr.autocomplete]="mode() === 'register' ? 'new-password' : 'current-password'" minlength="8" required [(ngModel)]="password" /></div>
        } @else {
          <div class="field"><label for="email">Adresse email</label><input id="email" name="email" type="email" autocomplete="email" required readonly [(ngModel)]="email" /></div>
          <div class="field"><label for="password">Nouveau mot de passe</label><input id="password" name="password" type="password" autocomplete="new-password" minlength="8" required [(ngModel)]="password" /></div>
        }
        @if (mode() === 'register' || mode() === 'reset') {
          <div class="field"><label for="password_confirmation">Confirmer le mot de passe</label><input id="password_confirmation" name="password_confirmation" type="password" autocomplete="new-password" minlength="8" required [(ngModel)]="passwordConfirmation" /></div>
        }
        @if (message()) { <p class="success" role="status">{{ message() }}</p> }
        @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
        <button class="submit" [disabled]="loading()">{{ loading() ? 'Patientez…' : (mode() === 'register' ? 'Créer mon compte' : mode() === 'reset' ? 'Réinitialiser le mot de passe' : 'Se connecter') }}</button>
        @if (mode() !== 'reset') {
          <p class="switch">{{ mode() === 'register' ? 'Vous avez déjà un compte ?' : 'Pas encore de compte ?' }}
            <button type="button" class="link-button" (click)="toggleMode()">{{ mode() === 'register' ? 'Se connecter' : 'Créer un compte' }}</button>
          </p>
        } @if (mode() === 'login') {
          <button type="button" class="forgot link-button" (click)="forgotPassword()">Mot de passe oublié ?</button>
        }
        @if (mode() === 'reset') { <button type="button" class="forgot link-button" (click)="mode.set('login')">Retour à la connexion</button> }
      </form>
    </section>
  `,
  styles: [`
    .auth-wrap { align-items: center; display: grid; gap: clamp(32px, 8vw, 100px); grid-template-columns: 1fr minmax(320px, 450px); margin: 20px auto; max-width: 1000px; }
    h1, h2 { font-family: 'Segoe UI', sans-serif; letter-spacing: -.04em; }
    h1 { font-size: clamp(2.2rem, 5vw, 3.5rem); line-height: 1.12; }
    .auth-intro p:last-child { line-height: 1.7; max-width: 430px; }
    .auth-card { display: grid; gap: 18px; padding: 28px; }
    h2 { font-size: 1.5rem; margin: 0 0 2px; }
    .submit { width: 100%; }
    .switch { color: var(--muted); font-size: .9rem; margin: 0; text-align: center; }
    .link-button { background: transparent; border: 0; color: var(--accent); cursor: pointer; font-weight: 700; min-height: auto; padding: 0; }
    .link-button:hover { background: transparent; text-decoration: underline; }
    .forgot { justify-self: center; }
    @media (max-width: 750px) { .auth-wrap { grid-template-columns: 1fr; margin-top: 0; } .auth-intro { display: none; } }
  `],
})
export class AuthComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly mode = signal<'login' | 'register' | 'reset'>('login');
  readonly loading = signal(false);
  readonly error = signal('');
  readonly message = signal('');
  name = '';
  email = '';
  password = '';
  passwordConfirmation = '';
  resetToken = '';

  constructor() {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (token) {
      this.mode.set('reset');
      this.resetToken = token;
      this.email = this.route.snapshot.queryParamMap.get('email') ?? '';
    }
  }

  submit(): void {
    this.error.set('');
    this.message.set('');
    this.loading.set(true);
    if (this.mode() === 'register') {
      this.auth.register(this.name.trim(), this.email.trim(), this.password, this.passwordConfirmation).subscribe({
        next: () => {
          this.message.set('Votre demande a été envoyée. Un administrateur validera votre compte avant que vous puissiez participer.');
          this.loading.set(false);
          this.mode.set('login');
        },
        error: (error: HttpErrorResponse) => this.handleError(error),
      });
      return;
    }
    if (this.mode() === 'reset') {
      this.auth.resetPassword({
        email: this.email.trim(),
        token: this.resetToken,
        password: this.password,
        password_confirmation: this.passwordConfirmation,
      }).subscribe({
        next: () => {
          this.loading.set(false);
          this.password = '';
          this.passwordConfirmation = '';
          this.resetToken = '';
          this.mode.set('login');
          this.message.set('Mot de passe réinitialisé. Vous pouvez vous connecter.');
        },
        error: (error: HttpErrorResponse) => this.handleError(error),
      });
      return;
    }
    this.auth.login(this.email.trim(), this.password).subscribe({
      next: () => {
        this.loading.set(false);
        const destination = this.route.snapshot.queryParamMap.get('redirect') || '/';
        this.router.navigateByUrl(destination);
      },
      error: (error: HttpErrorResponse) => this.handleError(error),
    });
  }

  toggleMode(): void {
    this.mode.set(this.mode() === 'register' ? 'login' : 'register');
    this.error.set('');
    this.message.set('');
  }

  forgotPassword(): void {
    if (!this.email.trim()) {
      this.error.set('Saisissez votre adresse email pour recevoir un lien de réinitialisation.');
      return;
    }
    this.authForgotPassword();
  }

  private authForgotPassword(): void {
    this.loading.set(true);
    this.auth.requestPasswordReset(this.email.trim()).subscribe({
      next: () => {
        this.message.set('Si cette adresse est associée à un compte, un lien de réinitialisation lui sera envoyé.');
        this.loading.set(false);
      },
      error: (error: HttpErrorResponse) => this.handleError(error),
    });
  }

  private handleError(error: HttpErrorResponse): void {
    this.error.set(error.error?.message ?? 'Une erreur est survenue. Vérifiez vos informations et réessayez.');
    this.loading.set(false);
  }
}
