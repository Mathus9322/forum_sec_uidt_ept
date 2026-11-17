import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../auth.service';
import { ConfirmationService } from '../confirmation.service';
import { ForumService } from '../forum.service';
import { Question } from '../models';
import { UserAvatarComponent } from '../user-avatar.component';

@Component({
  standalone: true,
  imports: [DatePipe, FormsModule, RouterLink, UserAvatarComponent],
  template: `
    <a class="back" routerLink="/">← Toutes les questions</a>
    @if (loading()) {
      <p class="muted">Chargement…</p>
    } @else if (error() && !question()) {
      <p class="error" role="alert">{{ error() }}</p>
    } @else if (question(); as item) {
      <article class="panel question">
        <div class="question-meta">
          <span class="status" [class.resolved]="item.is_resolved">{{ item.is_resolved ? 'Résolue' : 'Ouverte' }}</span>
          @if (item.session) { <a [routerLink]="['/']" [queryParams]="{ session_id: item.session.id }">{{ item.session.title }}</a> }
        </div>
        <h1>{{ item.title }}</h1>
        <p class="byline"><app-user-avatar [user]="item.user" size="small" /> Posée par {{ item.user.name }} · {{ item.created_at | date:'d MMMM y, HH:mm' }}</p>
        <p class="content">{{ item.content }}</p>
        @if (canManage(item)) {
          <div class="actions">
            <button type="button" class="secondary" (click)="startEdit()">{{ editing() ? 'Annuler' : 'Modifier' }}</button>
            <button type="button" class="danger-button" (click)="deleteQuestion()">Supprimer</button>
          </div>
        }
        @if (editing()) {
          <form class="edit-form" (ngSubmit)="saveQuestion()">
            <div class="field"><label for="edit-title">Titre</label><input id="edit-title" name="editTitle" maxlength="140" [(ngModel)]="editDraft.title" /></div>
            <div class="field"><label for="edit-content">Question</label><textarea id="edit-content" name="editContent" maxlength="5000" [(ngModel)]="editDraft.content"></textarea></div>
            <button type="submit">Enregistrer</button>
          </form>
        }
      </article>

      <section class="answers-section">
        <div class="section-title"><h2>Réponses</h2><span class="muted">{{ item.answers_count }}</span></div>
        @for (answer of item.answers ?? []; track answer.id) {
          <article class="panel answer" [class.accepted]="answer.accepted">
            @if (answer.accepted) { <p class="accepted-label">✓ Réponse acceptée</p> }
            <p class="answer-content">{{ answer.content }}</p>
            <div class="answer-foot">
              <span class="answer-author"><app-user-avatar [user]="answer.user" size="small" /> {{ answer.user.name }} · {{ answer.created_at | date:'d MMM y, HH:mm' }}</span>
              <div class="actions">
                @if (!item.is_resolved && canAccept(item)) { <button type="button" class="secondary" (click)="accept(answer.id)">Accepter cette réponse</button> }
                @if (auth.user()?.id === answer.user.id || auth.user()?.role === 'admin' || (auth.user()?.role === 'animator' && item.session)) {
                  <button type="button" class="secondary" (click)="editAnswer(answer.id, answer.content)">{{ editAnswerId() === answer.id ? 'Annuler' : 'Modifier' }}</button>
                  <button type="button" class="danger-button" (click)="deleteAnswer(answer.id)">Supprimer</button>
                }
              </div>
            </div>
            @if (editAnswerId() === answer.id) {
              <form class="edit-form" (ngSubmit)="saveAnswer(answer.id)">
                <div class="field"><label [for]="'answer-' + answer.id">Réponse</label><textarea [id]="'answer-' + answer.id" [name]="'answer-' + answer.id" maxlength="5000" [(ngModel)]="editAnswerContent"></textarea></div>
                <button type="submit">Enregistrer</button>
              </form>
            }
          </article>
        } @empty {
          <div class="panel empty"><p>Aucune réponse pour le moment. Soyez le premier à aider.</p></div>
        }
      </section>

      @if (auth.user()?.approved && !item.session?.archived) {
        <form class="panel reply-form" (ngSubmit)="submitAnswer()">
          <h2>Votre réponse</h2>
          <div class="field"><label for="reply">Réponse</label><textarea id="reply" name="reply" maxlength="5000" required [(ngModel)]="reply" placeholder="Partagez votre explication…"></textarea></div>
          @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
          <button [disabled]="saving() || !reply.trim()">Publier la réponse</button>
        </form>
      } @else if (!auth.user()) {
        <p class="notice">Connectez-vous pour répondre à cette question. <a routerLink="/login">Connexion</a></p>
      }
    }
  `,
  styles: [`
    .back { color: var(--muted); display: inline-block; margin-bottom: 20px; text-decoration: none; }
    .back:hover { color: var(--accent); }
    .question { padding: clamp(22px, 5vw, 38px); }
    h1, h2 { font-family: 'Segoe UI', sans-serif; letter-spacing: -.035em; }
    h1 { font-size: clamp(1.7rem, 4vw, 2.5rem); margin: 20px 0 8px; }
    h2 { font-size: 1.35rem; margin: 0; }
    .question-meta, .byline, .answer-foot { align-items: center; color: var(--muted); display: flex; flex-wrap: wrap; font-size: .9rem; gap: 12px; }
    .byline, .answer-author { align-items: center; }
    .question-meta a { color: var(--accent); }
    .status { background: var(--accent-soft); border-radius: 20px; color: var(--accent); font-size: .76rem; font-weight: 700; padding: 5px 9px; }
    .status.resolved { background: var(--accent-soft); color: var(--accent); }
    .byline { margin: 0 0 24px; }
    .content, .answer-content { line-height: 1.8; white-space: pre-wrap; overflow-wrap: anywhere; }
    .actions { display: flex; flex-wrap: wrap; gap: 8px; }
    .actions button { font-size: .82rem; min-height: 34px; padding: 6px 10px; }
    .danger-button { background: transparent; border-color: transparent; color: var(--danger); }
    .danger-button:hover { background: #fff0ee; }
    .edit-form, .reply-form { display: grid; gap: 14px; margin-top: 20px; }
    .answers-section { display: grid; gap: 12px; margin-top: 36px; }
    .section-title { align-items: center; display: flex; gap: 12px; margin-bottom: 3px; }
    .answer { padding: 22px; }
    .answer.accepted { border-color: var(--accent); }
    .accepted-label { color: var(--accent); font-size: .82rem; font-weight: 800; margin: 0; }
    .answer-foot { border-top: 1px solid var(--line); justify-content: space-between; padding-top: 12px; }
    .answer-foot .actions { justify-content: flex-end; }
    .empty { color: var(--muted); padding: 22px; }
    .reply-form { padding: 24px; }
    .notice { background: var(--accent-soft); border-radius: 8px; margin-top: 20px; padding: 14px; }
    @media (max-width: 650px) { .answer-foot { align-items: flex-start; flex-direction: column; } }
  `],
})
export class QuestionDetailComponent implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly confirmations = inject(ConfirmationService);
  private readonly forum = inject(ForumService);
  private readonly route = inject(ActivatedRoute);
  readonly question = signal<Question | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly editing = signal(false);
  readonly editAnswerId = signal<number | null>(null);
  readonly error = signal('');
  reply = '';
  editDraft = { title: '', content: '' };
  editAnswerContent = '';

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = Number(params.get('id'));
      this.loading.set(true);
      this.forum.question(id).subscribe({
        next: (question) => { this.question.set(question); this.loading.set(false); },
        error: () => { this.error.set('Cette question est introuvable.'); this.loading.set(false); },
      });
    });
  }

  canManage(question: Question): boolean {
    const user = this.auth.user();
    return !!user && (user.role === 'admin'
      || (user.id === question.user.id && !question.session?.archived)
      || (user.role === 'animator' && !!question.session?.moderators?.some((moderator) => moderator.id === user.id)));
  }

  canAccept(question: Question): boolean {
    const user = this.auth.user();
    return !!user && !question.session?.archived && (user.id === question.user.id || user.role === 'admin'
      || (user.role === 'animator' && !!question.session?.moderators?.some((moderator) => moderator.id === user.id)));
  }

  startEdit(): void {
    const item = this.question();
    if (!item) return;
    if (!this.editing()) this.editDraft = { title: item.title, content: item.content };
    this.editing.set(!this.editing());
  }

  saveQuestion(): void {
    const item = this.question();
    if (!item) return;
    this.forum.updateQuestion(item.id, this.editDraft).subscribe({
      next: () => { this.editing.set(false); this.reload(); },
      error: (error) => this.error.set(error.error?.message ?? 'Modification impossible.'),
    });
  }

  async deleteQuestion(): Promise<void> {
    const item = this.question();
    if (!item) return;
    const confirmed = await this.confirmations.confirm({
      title: 'Supprimer cette question ?',
      message: 'Cette action supprimera également toutes ses réponses et ne pourra pas être annulée.',
      confirmLabel: 'Supprimer',
      destructive: true,
    });
    if (!confirmed) return;
    this.forum.deleteQuestion(item.id).subscribe({
      next: () => window.location.assign('/'),
      error: (error) => this.error.set(error.error?.message ?? 'Suppression impossible.'),
    });
  }

  submitAnswer(): void {
    const item = this.question();
    if (!item) return;
    this.saving.set(true);
    this.forum.answer(item.id, this.reply.trim()).subscribe({
      next: () => { this.reply = ''; this.saving.set(false); this.reload(); },
      error: (error) => { this.error.set(error.error?.message ?? 'La réponse n’a pas pu être publiée.'); this.saving.set(false); },
    });
  }

  accept(answerId: number): void {
    this.forum.acceptAnswer(answerId).subscribe({
      next: () => this.reload(),
      error: (error) => this.error.set(error.error?.message ?? 'Impossible d’accepter cette réponse.'),
    });
  }

  async deleteAnswer(answerId: number): Promise<void> {
    const confirmed = await this.confirmations.confirm({
      title: 'Supprimer cette réponse ?',
      message: 'Cette action est définitive.',
      confirmLabel: 'Supprimer',
      destructive: true,
    });
    if (!confirmed) return;
    this.forum.deleteAnswer(answerId).subscribe({
      next: () => this.reload(),
      error: (error) => this.error.set(error.error?.message ?? 'Suppression impossible.'),
    });
  }

  editAnswer(answerId: number, content: string): void {
    if (this.editAnswerId() === answerId) {
      this.editAnswerId.set(null);
      return;
    }

    this.editAnswerContent = content;
    this.editAnswerId.set(answerId);
  }

  saveAnswer(answerId: number): void {
    this.forum.updateAnswer(answerId, this.editAnswerContent).subscribe({
      next: () => { this.editAnswerId.set(null); this.reload(); },
      error: (error) => this.error.set(error.error?.message ?? 'Modification impossible.'),
    });
  }

  private reload(): void {
    const item = this.question();
    if (!item) return;
    this.forum.question(item.id).subscribe({ next: (question) => this.question.set(question) });
  }
}
