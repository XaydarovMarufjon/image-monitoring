import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink],
  template: `
    <header class="header">
      <h1>Image Monitor</h1>
      <nav>
        <a routerLink="">Home</a>
        <a routerLink="history">History</a>
      </nav>
    </header>
    <main class="main"><router-outlet></router-outlet></main>
  `,
  styles: [`
    .header { display:flex; justify-content:space-between; align-items:center; padding:12px 20px; background:#0f172a; color:white; }
    nav a { color: #cbd5e1; margin-left:12px; text-decoration:none; }
    nav a:hover { color: white; }
    .main { padding:20px; }
  `]
})
export class App {}
