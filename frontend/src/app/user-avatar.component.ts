import { Component, input } from '@angular/core';
import { User } from './models';

@Component({
  selector: 'app-user-avatar',
  template: `
    <span class="avatar" aria-hidden="true">
      @if (user().avatar_url; as avatarUrl) {
        <img [src]="avatarUrl" alt="" />
      } @else {
        <span>{{ user().name.charAt(0).toUpperCase() }}</span>
      }
    </span>
  `,
  host: {
    '[class.small]': 'size() === "small"',
    '[class.large]': 'size() === "large"',
  },
  styles: [`
    :host { display: inline-flex; flex: 0 0 auto; vertical-align: middle; }
    .avatar {
      align-items: center;
      background: var(--accent-soft);
      border: 1px solid var(--line);
      border-radius: 50%;
      color: var(--accent);
      display: inline-flex;
      font-size: .9rem;
      font-weight: 800;
      height: 38px;
      justify-content: center;
      overflow: hidden;
      width: 38px;
    }
    .avatar img { height: 100%; object-fit: cover; width: 100%; }
    :host(.small) .avatar { font-size: .72rem; height: 30px; width: 30px; }
    :host(.large) .avatar { font-size: 1.8rem; height: 88px; width: 88px; }
  `],
})
export class UserAvatarComponent {
  readonly user = input.required<Pick<User, 'name' | 'avatar_url'>>();
  readonly size = input<'small' | 'medium' | 'large'>('medium');
}
