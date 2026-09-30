import { Injectable, signal } from '@angular/core';
import { ConfigService } from './config.service';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class AuthService {
  token = signal<string | null>(localStorage.getItem('jwt_token'));
  username = signal<string | null>(localStorage.getItem('username'));

  constructor(private router: Router, private configService: ConfigService) { }

  async login(username: string, password: string): Promise<boolean> {
    try {
      const baseUrl = this.configService.apiUrl;
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (!res.ok) return false;

      //TODO: make rag api changes for authentication api calls, and add token in http headers

      const data = await res.json();
      //TODO:  fix local storage and use JWT and OAUTH2 flow
      localStorage.setItem('jwt_token', data.token);
      localStorage.setItem('username', data.username);
      this.token.set(data.token);
      this.username.set(data.username);
      return true;
    } catch {
      return false;
    }
  }

  logout() {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('username');
    this.token.set(null);
    this.username.set(null);
    this.router.navigate(['/login']);
  }

  isAuthenticated(): boolean {
    return !!this.token();
  }
}
