import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Answer, LearningSession, Paginated, Question, User } from './models';

@Injectable({ providedIn: 'root' })
export class ForumService {
  private readonly http = inject(HttpClient);

  questions(filters: { q?: string; session_id?: number; status?: string; page?: number }): Observable<Paginated<Question>> {
    let params = new HttpParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') params = params.set(key, value);
    });
    return this.http.get<Paginated<Question>>('/api/questions', { params });
  }

  question(id: number): Observable<Question> {
    return this.http.get<Question>(`/api/questions/${id}`);
  }

  createQuestion(data: { title: string; content: string; session_id: number | null }): Observable<Question> {
    return this.http.post<Question>('/api/questions', data);
  }

  updateQuestion(id: number, data: { title: string; content: string }): Observable<Question> {
    return this.http.patch<Question>(`/api/questions/${id}`, data);
  }

  deleteQuestion(id: number): Observable<void> {
    return this.http.delete<void>(`/api/questions/${id}`);
  }

  answer(questionId: number, content: string): Observable<Answer> {
    return this.http.post<Answer>(`/api/questions/${questionId}/answers`, { content });
  }

  acceptAnswer(id: number): Observable<Answer> {
    return this.http.post<Answer>(`/api/answers/${id}/accept`, {});
  }

  updateAnswer(id: number, content: string): Observable<Answer> {
    return this.http.patch<Answer>(`/api/answers/${id}`, { content });
  }

  deleteAnswer(id: number): Observable<void> {
    return this.http.delete<void>(`/api/answers/${id}`);
  }

  sessions(): Observable<LearningSession[]> {
    return this.http.get<LearningSession[]>('/api/sessions');
  }

  adminUsers(): Observable<User[]> {
    return this.http.get<User[]>('/api/admin/users');
  }

  adminSessions(): Observable<LearningSession[]> {
    return this.http.get<LearningSession[]>('/api/admin/sessions');
  }

  updateUser(id: number, data: { role: string; approved: boolean }): Observable<User> {
    return this.http.patch<User>(`/api/admin/users/${id}`, data);
  }

  createSession(data: { title: string; scheduled_at: string; theme: string; description: string; moderator_ids: number[] }): Observable<LearningSession> {
    return this.http.post<LearningSession>('/api/admin/sessions', data);
  }

  updateSession(id: number, data: { title: string; scheduled_at: string; theme: string; description: string; archived: boolean; moderator_ids: number[] }): Observable<LearningSession> {
    return this.http.patch<LearningSession>(`/api/admin/sessions/${id}`, data);
  }

  deleteSession(id: number): Observable<void> {
    return this.http.delete<void>(`/api/admin/sessions/${id}`);
  }
}
