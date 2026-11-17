import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../auth.service';
import { ForumService } from '../forum.service';
import { LearningSession, Paginated, Question } from '../models';
import { UserAvatarComponent } from '../user-avatar.component';

@Component({
  standalone: true,
  imports: [DatePipe, FormsModule, RouterLink, UserAvatarComponent],
  template: `
    <section class="hero">
      <div>
        <p class="eyebrow">Le savoir se partage</p>
        <h1>Les questions continuent<br />après la séance.</h1>
        <p class="hero-copy">Posez vos questions, échangez avec les participants et retrouvez les réponses utiles.</p>
      </div>
      @if (auth.user()?.approved) {
        <button type="button" (click)="showForm.set(!showForm())">
          {{ showForm() ? 'Fermer' : 'Poser une question' }}
        </button>
      } @else if (auth.user()) {
        <p class="notice">Votre inscription attend la validation d’un administrateur.</p>
      } @else {
        <a class="button" routerLink="/login">Rejoindre la discussion</a>
      }
    </section>

    @if (showForm()) {
      <form class="panel compose" (ngSubmit)="createQuestion()">
        <h2>Nouvelle question</h2>
        <div class="field">
          <label for="title">Titre</label>
          <input id="title" name="title" maxlength="140" required [(ngModel)]="draft.title" />
        </div>
        <div class="field">
          <label for="content">Votre question</label>
          <textarea id="content" name="content" maxlength="5000" required [(ngModel)]="draft.content"></textarea>
          <small class="muted">{{ draft.content.length }}/5000 caractères</small>
        </div>
        <div class="field">
          <label for="session">Séance (facultatif)</label>
          <select id="session" name="session" [(ngModel)]="draft.sessionId">
            <option value="">Aucune séance précise</option>
            @for (session of sessions(); track session.id) {
              @if (!session.archived) {
              <option [value]="session.id">{{ session.title }}</option>
              }
            }
          </select>
        </div>
        @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
        <button [disabled]="saving() || !draft.title.trim() || !draft.content.trim()">Publier la question</button>
      </form>
    }

    <section class="content">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Espace d’échange</p>
          <h2>Questions récentes</h2>
        </div>
        <span class="muted">{{ results()?.total ?? 0 }} question(s)</span>
      </div>
      <form class="filters panel" (ngSubmit)="load(1)">
        <input aria-label="Rechercher" name="search" placeholder="Rechercher une question…" [(ngModel)]="filters.q" />
        <select aria-label="Séance" name="sessionFilter" [(ngModel)]="filters.session_id">
          <option value="">Toutes les séances</option>
          @for (session of sessions(); track session.id) {
            <option [value]="session.id">{{ session.title }}</option>
          }
        </select>
        <select aria-label="État" name="status" [(ngModel)]="filters.status">
          <option value="">Tous les états</option>
          <option value="unanswered">Sans réponse</option>
          <option value="resolved">Résolues</option>
        </select>
        <button type="submit">Filtrer</button>
      </form>

      @if (error() && !showForm()) { <p class="error" role="alert">{{ error() }}</p> }
      @if (loading()) {
        <p class="muted">Chargement des questions…</p>
      } @else if ((results()?.data?.length ?? 0) === 0) {
        <div class="panel empty">
          <h3>Aucune question pour le moment</h3>
          <p class="muted">Essayez un autre filtre ou lancez la conversation.</p>
        </div>
      } @else {
        <div class="question-list">
          @for (question of results()?.data ?? []; track question.id) {
            <article class="panel question-card">
              <div class="question-meta">
                <span class="status" [class.resolved]="question.is_resolved">
                  {{ question.is_resolved ? 'Résolue' : question.answers_count ? 'En discussion' : 'Sans réponse' }}
                </span>
                @if (question.session) { <span>{{ question.session.title }}</span> }
              </div>
              <h3><a [routerLink]="['/questions', question.id]">{{ question.title }}</a></h3>
              <p class="excerpt">{{ question.content }}</p>
              <div class="card-foot">
                <span class="card-author"><app-user-avatar [user]="question.user" size="small" /> Par {{ question.user.name }} · {{ question.created_at | date:'d MMM y' }}</span>
                <span>{{ question.answers_count }} réponse(s)</span>
              </div>
            </article>
          }
        </div>
      }
      @if (results() && results()!.last_page > 1) {
        <div class="pagination">
          <button type="button" class="secondary" [disabled]="results()!.current_page <= 1" (click)="load(results()!.current_page - 1)">Précédent</button>
          <span>Page {{ results()!.current_page }} sur {{ results()!.last_page }}</span>
          <button type="button" class="secondary" [disabled]="results()!.current_page >= results()!.last_page" (click)="load(results()!.current_page + 1)">Suivant</button>
        </div>
      }
    </section>
  `,
  styles: [`
    .hero { align-items: center; background: linear-gradient(120deg, var(--accent-soft), var(--surface)); border: 1px solid var(--line); border-radius: 18px; display: flex; gap: 30px; justify-content: space-between; padding: 38px 42px; }
    h1, h2, h3 { font-family: 'Segoe UI', sans-serif; letter-spacing: -0.035em; }
    h1 { font-size: clamp(2rem, 5vw, 3.2rem); line-height: 1.12; margin: 10px 0 14px; }
    h2 { font-size: 1.45rem; margin: 4px 0; }
    h3 { margin: 12px 0 8px; }
    .hero-copy { color: var(--muted); line-height: 1.65; max-width: 520px; }
    .notice { background: var(--surface); border-radius: 8px; color: var(--muted); padding: 12px 16px; }
    .compose { display: grid; gap: 18px; margin-top: 20px; padding: 24px; }
    .compose h2 { margin: 0; }
    .content { margin-top: 48px; }
    .section-heading { align-items: end; display: flex; justify-content: space-between; margin-bottom: 18px; }
    .filters { align-items: center; display: grid; gap: 10px; grid-template-columns: minmax(180px, 1fr) minmax(160px, .75fr) minmax(140px, .6fr) auto; margin-bottom: 18px; padding: 12px; }
    .question-list { display: grid; gap: 12px; }
    .question-card { padding: 20px 22px; }
    .question-card h3 a { color: var(--ink); text-decoration: none; }
    .question-card h3 a:hover { color: var(--accent); }
    .question-meta, .card-foot { align-items: center; color: var(--muted); display: flex; flex-wrap: wrap; font-size: .85rem; gap: 12px; }
    .status { background: var(--accent-soft); border-radius: 20px; color: var(--accent); font-size: .76rem; font-weight: 700; padding: 5px 9px; }
    .status.resolved { background: var(--accent-soft); color: var(--accent); }
    .excerpt { color: var(--muted); line-height: 1.55; margin: 0 0 14px; max-height: 3.1em; overflow: hidden; white-space: pre-line; }
    .card-foot { border-top: 1px solid var(--line); justify-content: space-between; padding-top: 12px; }
    .card-author { align-items: center; display: inline-flex; gap: 8px; }
    .empty { padding: 30px; text-align: center; }
    .pagination { align-items: center; display: flex; gap: 18px; justify-content: center; margin-top: 24px; }
    @media (max-width: 700px) { .hero { align-items: flex-start; flex-direction: column; padding: 26px 22px; } .filters { grid-template-columns: 1fr; } .section-heading { align-items: flex-start; flex-direction: column; gap: 8px; } }
  `],
})
export class QuestionsComponent implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly forum = inject(ForumService);
  private readonly route = inject(ActivatedRoute);
  readonly results = signal<Paginated<Question> | null>(null);
  readonly sessions = signal<LearningSession[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly showForm = signal(false);
  filters = { q: '', session_id: '', status: '' };
  draft = { title: '', content: '', sessionId: '' };

  ngOnInit(): void {
    this.filters.session_id = this.route.snapshot.queryParamMap.get('session_id') ?? '';
    this.load(1);
    this.forum.sessions().subscribe({
      next: (sessions) => this.sessions.set(sessions),
      error: () => this.error.set('Impossible de charger les séances.'),
    });
  }

  load(page: number): void {
    this.loading.set(true);
    this.error.set('');
    this.forum.questions({
      q: this.filters.q.trim(),
      session_id: this.filters.session_id ? Number(this.filters.session_id) : undefined,
      status: this.filters.status,
      page,
    }).subscribe({
      next: (results) => { this.results.set(results); this.loading.set(false); },
      error: () => { this.error.set('Impossible de charger les questions. Réessayez.'); this.loading.set(false); },
    });
  }

  createQuestion(): void {
    this.saving.set(true);
    this.error.set('');
    this.forum.createQuestion({
      title: this.draft.title.trim(),
      content: this.draft.content.trim(),
      session_id: this.draft.sessionId ? Number(this.draft.sessionId) : null,
    }).subscribe({
      next: () => {
        this.draft = { title: '', content: '', sessionId: '' };
        this.showForm.set(false);
        this.saving.set(false);
        this.load(1);
      },
      error: (error) => {
        this.error.set(error.error?.message ?? 'La question n’a pas pu être publiée.');
        this.saving.set(false);
      },
    });
  }
}
