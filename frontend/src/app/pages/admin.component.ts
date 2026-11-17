import { Component, effect, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../auth.service';
import { ConfirmationService } from '../confirmation.service';
import { ForumService } from '../forum.service';
import { LearningSession, User } from '../models';

@Component({
  standalone: true,
  imports: [DatePipe, FormsModule],
  template: `
    <p class="eyebrow">Administration</p>
    <h1>Gérer la plateforme</h1>
    @if (auth.user()?.role !== 'admin') {
      <div class="panel denied"><h2>Accès réservé</h2><p class="muted">Cette page est accessible uniquement aux administrateurs.</p></div>
    } @else {
      @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
      @if (message()) { <p class="success" role="status">{{ message() }}</p> }

      <section class="panel section">
        <div class="section-title"><div><p class="eyebrow">Comptes</p><h2>Utilisateurs</h2></div><span class="muted">{{ users().length }} compte(s)</span></div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Nom</th><th>Email</th><th>Rôle</th><th>Accès</th><th></th></tr></thead>
            <tbody>
              @for (user of users(); track user.id) {
                <tr>
                  <td>{{ user.name }}</td><td>{{ user.email }}</td>
                  <td>
                    <select [value]="user.role" [disabled]="user.id === auth.user()?.id" (change)="changeRole(user, $event)">
                      <option value="participant">Participant</option><option value="animator">Animateur</option><option value="admin">Administrateur</option>
                    </select>
                  </td>
                  <td><span class="status" [class.approved]="user.approved">{{ user.approved ? 'Actif' : 'En attente' }}</span></td>
                  <td><button class="secondary compact" type="button" [disabled]="user.id === auth.user()?.id" (click)="toggleApproval(user)">{{ user.approved ? 'Suspendre' : 'Valider' }}</button></td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>

      <section class="panel section">
        <div class="section-title"><div><p class="eyebrow">Organisation</p><h2>Séances</h2></div></div>
        <form class="session-form" (ngSubmit)="saveSession()">
          <h3>{{ editingSessionId() ? 'Modifier la séance' : 'Créer une séance' }}</h3>
          <div class="form-grid">
            <div class="field"><label for="session-title">Titre</label><input id="session-title" name="title" maxlength="140" required [(ngModel)]="draft.title" /></div>
            <div class="field"><label for="session-date">Date et heure</label><input id="session-date" name="date" type="datetime-local" required [(ngModel)]="draft.scheduled_at" /></div>
            <div class="field"><label for="session-theme">Thème</label><input id="session-theme" name="theme" [(ngModel)]="draft.theme" /></div>
            <div class="field"><label for="moderators">Animateurs</label>
              <select id="moderators" name="moderators" multiple size="4" [(ngModel)]="draft.moderator_ids">
                @for (user of animatorUsers(); track user.id) { <option [ngValue]="user.id">{{ user.name }} ({{ user.email }})</option> }
              </select>
              <small class="muted">Ctrl-clic pour sélectionner plusieurs animateurs.</small>
            </div>
            <div class="field description"><label for="session-description">Description</label><textarea id="session-description" name="description" maxlength="5000" [(ngModel)]="draft.description"></textarea></div>
            @if (editingSessionId()) {
              <label class="archive-toggle"><input type="checkbox" name="archived" [(ngModel)]="draft.archived" /> Archiver cette séance (lecture seule)</label>
            }
          </div>
          <div class="form-actions">
            <button [disabled]="saving()">{{ editingSessionId() ? 'Enregistrer' : 'Créer la séance' }}</button>
            @if (editingSessionId()) { <button type="button" class="secondary" (click)="cancelEdit()">Annuler</button> }
          </div>
        </form>
        <div class="session-list">
          @for (session of sessions(); track session.id) {
            <article class="session-row">
              <div><strong>{{ session.title }}</strong>
                @if (session.archived) { <span class="status">Archivée</span> }
                <p class="muted">{{ session.scheduled_at | date:'d MMM y, HH:mm' }} · {{ session.moderators?.length ?? 0 }} animateur(s)</p>
              </div>
              <div class="actions">
                <button type="button" class="secondary compact" (click)="editSession(session)">Modifier</button>
                <button type="button" class="danger secondary compact" (click)="deleteSession(session)">Supprimer</button>
              </div>
            </article>
          } @empty { <p class="muted">Aucune séance créée.</p> }
        </div>
      </section>
    }
  `,
  styles: [`
    h1, h2 { font-family: 'Segoe UI', sans-serif; letter-spacing: -.04em; }
    h1 { font-size: clamp(2rem, 4vw, 2.8rem); margin: 8px 0 28px; }
    h2 { margin: 2px 0; }
    .section { margin-bottom: 22px; padding: 24px; }
    .section-title { align-items: center; display: flex; justify-content: space-between; margin-bottom: 20px; }
    .section-title .eyebrow { margin: 0 0 5px; }
    .table-wrap { overflow-x: auto; }
    table { border-collapse: collapse; min-width: 680px; text-align: left; width: 100%; }
    th { color: var(--muted); font-size: .78rem; text-transform: uppercase; }
    td, th { border-bottom: 1px solid var(--line); padding: 12px 10px; }
    td select { background: var(--surface); border: 1px solid var(--line); border-radius: 6px; color: var(--ink); padding: 7px; }
    .status { background: var(--accent-soft); border-radius: 16px; color: var(--accent); font-size: .76rem; padding: 5px 8px; }
    .status.approved { background: var(--accent-soft); color: var(--accent); }
    .compact { font-size: .8rem; min-height: 32px; padding: 5px 10px; }
    .session-form { border-bottom: 1px solid var(--line); padding-bottom: 22px; }
    .session-form h3 { margin: 0 0 14px; }
    .form-grid { display: grid; gap: 14px; grid-template-columns: 1fr 1fr; margin-bottom: 16px; }
    .description { grid-column: 1 / -1; }
    .archive-toggle { align-items: center; display: flex; gap: 8px; }
    .form-actions, .actions { display: flex; flex-wrap: wrap; gap: 8px; }
    .session-list { display: grid; }
    .session-row { align-items: center; border-bottom: 1px solid var(--line); display: flex; justify-content: space-between; padding: 14px 0; }
    .session-row p { font-size: .85rem; margin: 5px 0 0; }
    .danger { color: var(--danger) !important; }
    .denied { padding: 24px; }
    @media (max-width: 650px) { .section { padding: 17px; } .form-grid { grid-template-columns: 1fr; } .description { grid-column: auto; } }
  `],
})
export class AdminComponent {
  protected readonly auth = inject(AuthService);
  private readonly confirmations = inject(ConfirmationService);
  private readonly forum = inject(ForumService);
  readonly users = signal<User[]>([]);
  readonly sessions = signal<LearningSession[]>([]);
  readonly error = signal('');
  readonly message = signal('');
  readonly saving = signal(false);
  private loaded = false;
  readonly editingSessionId = signal<number | null>(null);
  draft = { title: '', scheduled_at: '', theme: '', description: '', archived: false, moderator_ids: [] as number[] };

  constructor() {
    effect(() => {
      if (this.auth.user()?.role === 'admin' && !this.loaded) {
        this.loaded = true;
        this.load();
      }
    });
  }

  animatorUsers(): User[] {
    return this.users().filter((user) => user.role === 'animator' && user.approved);
  }

  async changeRole(user: User, event: Event): Promise<void> {
    const select = event.target as HTMLSelectElement;
    const role = select.value;
    if (role === user.role) return;
    const roleLabel: Record<string, string> = {
      participant: 'participant',
      animator: 'animateur',
      admin: 'administrateur',
    };
    const confirmed = await this.confirmations.confirm({
      title: 'Modifier le rôle ?',
      message: `Le compte de ${user.name} aura le rôle ${roleLabel[role] ?? role}.`,
      confirmLabel: 'Modifier le rôle',
    });
    if (!confirmed) {
      select.value = user.role;
      return;
    }
    this.saveUser(user, { role, approved: user.approved });
  }

  async toggleApproval(user: User): Promise<void> {
    const approved = !user.approved;
    const action = approved ? 'réactiver' : 'suspendre';
    const confirmed = await this.confirmations.confirm({
      title: approved ? 'Réactiver ce compte ?' : 'Suspendre ce compte ?',
      message: `Voulez-vous vraiment ${action} l’accès de ${user.name} ?`,
      confirmLabel: approved ? 'Réactiver' : 'Suspendre',
      destructive: !approved,
    });
    if (!confirmed) return;
    this.saveUser(user, { role: user.role, approved });
  }

  async saveSession(): Promise<void> {
    const editingId = this.editingSessionId();
    const session = this.sessions().find((item) => item.id === editingId);
    if (session && !session.archived && this.draft.archived
      && !await this.confirmations.confirm({
        title: 'Archiver cette séance ?',
        message: 'Elle passera en lecture seule. Vous pourrez la réactiver plus tard.',
        confirmLabel: 'Archiver',
      })) return;

    this.saving.set(true);
    this.error.set('');
    const request = editingId
      ? this.forum.updateSession(editingId, this.draft)
      : this.forum.createSession(this.draft);
    request.subscribe({
      next: () => {
        this.cancelEdit();
        this.saving.set(false);
        this.message.set(editingId ? 'Séance mise à jour.' : 'Séance créée.');
        this.loadSessions();
      },
      error: (error) => { this.error.set(error.error?.message ?? 'Impossible d’enregistrer la séance.'); this.saving.set(false); },
    });
  }

  editSession(session: LearningSession): void {
    this.editingSessionId.set(session.id);
    this.draft = {
      title: session.title,
      scheduled_at: session.scheduled_at.slice(0, 16),
      theme: session.theme ?? '',
      description: session.description ?? '',
      archived: session.archived,
      moderator_ids: session.moderators?.map((moderator) => moderator.id) ?? [],
    };
  }

  cancelEdit(): void {
    this.editingSessionId.set(null);
    this.draft = { title: '', scheduled_at: '', theme: '', description: '', archived: false, moderator_ids: [] };
  }

  async deleteSession(session: LearningSession): Promise<void> {
    const confirmed = await this.confirmations.confirm({
      title: 'Supprimer cette séance ?',
      message: `La séance « ${session.title} » sera supprimée définitivement.`,
      confirmLabel: 'Supprimer',
      destructive: true,
    });
    if (!confirmed) return;
    this.forum.deleteSession(session.id).subscribe({
      next: () => { this.message.set('Séance supprimée.'); this.loadSessions(); },
      error: (error) => this.error.set(error.error?.message ?? 'Impossible de supprimer la séance.'),
    });
  }

  private saveUser(user: User, data: { role: string; approved: boolean }): void {
    this.error.set('');
    this.forum.updateUser(user.id, data).subscribe({
      next: (updated) => {
        this.users.update((users) => users.map((item) => item.id === updated.id ? updated : item));
        this.message.set('Compte mis à jour.');
      },
      error: (error) => this.error.set(error.error?.message ?? 'Impossible de modifier ce compte.'),
    });
  }

  private load(): void {
    this.forum.adminUsers().subscribe({
      next: (users) => this.users.set(users),
      error: (error) => this.error.set(error.error?.message ?? 'Impossible de charger les comptes.'),
    });
    this.loadSessions();
  }

  private loadSessions(): void {
    this.forum.adminSessions().subscribe({
      next: (sessions) => this.sessions.set(sessions),
      error: (error) => this.error.set(error.error?.message ?? 'Impossible de charger les séances.'),
    });
  }
}
