import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  private config: { apiUrl?: string } = {};

  async loadConfig(): Promise<void> {
    try {
      const response = await fetch('/config.json');
      this.config = await response.json();
    } catch (error) {
      console.error('Could not load config.json', error);
    }
  }

  get apiUrl(): string {
    return this.config.apiUrl || '';
  }
}
