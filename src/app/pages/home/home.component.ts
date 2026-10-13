import { Component, OnDestroy, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ScanService } from '../../services/scan.service';

@Component({
  standalone: true,
  selector: 'app-home',
  imports: [CommonModule, FormsModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnDestroy {

  private readonly pending = new Subscription();

  url = signal('');
  loading = signal(false);
  error = signal('');
  success = signal('');

  constructor(private scan: ScanService, private router: Router) { 
    
  }

  

  start() {
    const val = this.url().trim();

    if (!val) {
      this.error.set('Iltimos, URL kiriting');
      return;
    }

    if (!val.startsWith('http')) {
      this.error.set('URL http yoki https bilan boshlanishi kerak');
      return;
    }

    this.error.set('');
    this.success.set('');
    this.loading.set(true);

    this.pending.add(this.scan.startScan(val).subscribe({
      next: (res) => {
        this.success.set(`Scan boshlandi (ID: ${res.scanId})`);
        const redirectTimer = setTimeout(() => {
          this.router.navigate(['/scan', res.scanId]);
        }, 800);
        this.pending.add(() => clearTimeout(redirectTimer));
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Server bilan bog‘lanishda xatolik');
        this.loading.set(false);
      }
    }));
  }

  ngOnDestroy() {
    this.pending.unsubscribe();
  }
}
