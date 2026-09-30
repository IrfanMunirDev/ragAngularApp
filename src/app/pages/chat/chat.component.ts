import { Component, signal, ViewChild, ElementRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { ConfigService } from '../../services/config.service';

interface Message {
  sender: 'user' | 'bot';
  text: string;
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="flex flex-col h-screen bg-slate-950 text-slate-100">
      <!-- Navbar -->
      <header class="flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800">
        <div class="flex items-center space-x-3">
          <div class="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
          <h1 class="font-bold text-lg text-white">Policy RAG Assistant</h1>
        </div>
        <div class="flex items-center space-x-4">
          <span class="text-sm text-slate-400">Logged in as <strong class="text-slate-200">{{ auth.username() }}</strong></span>
          <button (click)="auth.logout()" class="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition">
            Logout
          </button>
        </div>
      </header>

      <!-- Message Area -->
      <main class="flex-1 overflow-y-auto p-6 space-y-4" #scrollContainer>
        @if (messages().length === 0) {
          <div class="h-full flex items-center justify-center text-center text-slate-500">
            <div>
              <p class="text-xl font-medium text-slate-400 mb-2">Ask anything about return policies</p>
              <p class="text-sm">Tokens will stream live from .NET 10 + Ollama local model.</p>
            </div>
          </div>
        }

        @for (msg of messages(); track $index) {
          <div class="flex" [class.justify-end]="msg.sender === 'user'">
            <div 
              class="max-w-2xl px-5 py-3 rounded-2xl text-sm leading-relaxed"
              [class.bg-indigo-600]="msg.sender === 'user'"
              [class.text-white]="msg.sender === 'user'"
              [class.bg-slate-900]="msg.sender === 'bot'"
              [class.border]="msg.sender === 'bot'"
              [class.border-slate-800]="msg.sender === 'bot'"
              [class.text-slate-200]="msg.sender === 'bot'"
            >
              {{ msg.text }}
            </div>
          </div>
        }
      </main>

      <!-- Input Area -->
      <footer class="p-4 bg-slate-900 border-t border-slate-800">
        <form (ngSubmit)="sendQuestion()" class="flex space-x-3 max-w-4xl mx-auto">
          <input 
            type="text" 
            [(ngModel)]="userInput" 
            name="input"
            [disabled]="isGenerating()"
            placeholder="Can I return an open box item within 30 days?"
            class="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
          />
          <button 
            type="submit" 
            [disabled]="isGenerating() || !userInput.trim()"
            class="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </footer>
    </div>
  `
})
export class ChatComponent {
  @ViewChild('scrollContainer') scrollContainer!: ElementRef;

  messages = signal<Message[]>([]);
  isGenerating = signal(false);
  userInput = '';

  constructor(
    public auth: AuthService,
    private configService: ConfigService
  ) { }

  async sendQuestion() {
    const question = this.userInput.trim();
    if (!question) return;

    this.userInput = '';
    this.messages.update(msgs => [
      ...msgs,
      { sender: 'user', text: question },
      { sender: 'bot', text: '' }
    ]);

    this.isGenerating.set(true);

    try {
      const baseUrl = this.configService.apiUrl;
      const response = await fetch(`${baseUrl}/api/PolicyRagEmbedding/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.auth.token()}`
        },
        body: JSON.stringify({ question })
      });

      if (!response.ok) {
        const errorMsg = `Error ${response.status}: ${response.statusText}`;
        this.updateBotMessage(errorMsg);
        return;
      }

      if (!response.body) {
        this.updateBotMessage('No response body received from server.');
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        this.updateBotMessage(chunk, true);
        this.scrollToBottom();
      }
    } catch (error: any) {
      console.error('Streaming request failed:', error);
      this.updateBotMessage(`Connection error: ${error.message || 'Failed to reach API'}`);
    } finally {
      this.isGenerating.set(false);
    }
  }

  private updateBotMessage(text: string, append = false) {
    this.messages.update(msgs => {
      const updated = [...msgs];
      const lastIdx = updated.length - 1;
      if (lastIdx >= 0 && updated[lastIdx].sender === 'bot') {
        updated[lastIdx].text = append ? updated[lastIdx].text + text : text;
      }
      return updated;
    });
  }

  private scrollToBottom() {
    setTimeout(() => {
      if (this.scrollContainer) {
        this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
      }
    }, 10);
  }
}
