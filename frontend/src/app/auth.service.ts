import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, Observable, of, switchMap, tap } from 'rxjs';
import { User } from './models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  readonly user = signal<User | null>(null);
  readonly error = signal('');

  refresh(): void {
    this.http.get<User>('/api/me').pipe(
      tap(() => this.error.set('')),
      catchError((error: HttpErrorResponse) => {
        this.user.set(null);
        if (error.status === 404 || error.status === 200) {
          this.error.set('La réponse reçue n’est pas le JSON de Laravel. Redémarrez Angular avec « npm start -- --host localhost --port 4200 » pour activer le proxy.');
        } else if (error.status === 0) {
          this.error.set('L’API Laravel est inaccessible. Vérifiez qu’elle est démarrée sur le port 8000.');
        } else if (error.status !== 401) {
          this.error.set(`La vérification de session a échoué (HTTP ${error.status}). Vérifiez l’API Laravel.`);
        }
        return of(null);
      }),
    ).subscribe((user) => this.user.set(user));
  }

  login(email: string, password: string): Observable<User> {
    return this.http.get('/sanctum/csrf-cookie').pipe(
      switchMap(() => this.http.post('/api/login', { email, password })),
      switchMap(() => this.http.get<User>('/api/me')),
      tap((user) => this.user.set(user)),
    );
  }

  register(name: string, email: string, password: string, password_confirmation: string): Observable<unknown> {
    return this.http.get('/sanctum/csrf-cookie').pipe(
      switchMap(() => this.http.post('/api/register', {
        name,
        email,
        password,
        password_confirmation,
      })),
    );
  }

  requestPasswordReset(email: string): Observable<unknown> {
    return this.http.post('/api/forgot-password', { email });
  }

  resetPassword(data: { email: string; token: string; password: string; password_confirmation: string }): Observable<unknown> {
    return this.http.post('/api/reset-password', data);
  }

  updateProfile(data: { name: string; current_password?: string; password?: string; password_confirmation?: string; avatar?: File }): Observable<User> {
    const formData = new FormData();
    formData.append('_method', 'PATCH');
    formData.append('name', data.name);
    if (data.current_password) formData.append('current_password', data.current_password);
    if (data.password) formData.append('password', data.password);
    if (data.password_confirmation) formData.append('password_confirmation', data.password_confirmation);
    if (data.avatar) formData.append('avatar', data.avatar);

    return this.http.post<User>('/api/profile', formData).pipe(
      tap((user) => this.user.set(user)),
    );
  }

  logout(): Observable<void> {
    return this.http.post<void>('/api/logout', {}).pipe(
      tap(() => this.user.set(null)),
    );
  }
}
