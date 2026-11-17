import { Routes } from '@angular/router';
import { AdminComponent } from './pages/admin.component';
import { AuthComponent } from './pages/auth.component';
import { QuestionDetailComponent } from './pages/question-detail.component';
import { QuestionsComponent } from './pages/questions.component';
import { ProfileComponent } from './pages/profile.component';

export const routes: Routes = [
  { path: '', component: QuestionsComponent, title: 'Questions · Forum Section UIDT-EPT' },
  { path: 'questions/:id', component: QuestionDetailComponent, title: 'Question · Forum Section UIDT-EPT' },
  { path: 'login', component: AuthComponent, title: 'Connexion · Forum Section UIDT-EPT' },
  { path: 'profile', component: ProfileComponent, title: 'Mon profil · Forum Section UIDT-EPT' },
  { path: 'admin', component: AdminComponent, title: 'Administration · Forum Section UIDT-EPT' },
  { path: '**', redirectTo: '' },
];
