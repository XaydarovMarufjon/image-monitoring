import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ScanService } from '../../services/scan.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent {
  url = signal('');
  images = signal<any[]>([]);
  loading = signal(false);
  message = signal('');
  progress = 0;
  constructor(private scan: ScanService, private router: Router) { }


  startScan() {
    // alert('Diqqat! Bu xizmat faqat .uz domenidagi saytlar uchun mo‘ljallangan. Boshqa domenlar qo‘llab-quvvatlanmaydi.');
    const urlVal = this.url();
    if (!urlVal) { this.message.set('URL kiriting'); return; }
    this.loading.set(true);
    this.message.set('');
    this.scan.startScan(urlVal).subscribe({
      next: (res) => {
        this.message.set(`Scan started (id: ${res.scanId}), found ${res.total} images.`);
        // avtomatik detailga o'tish
        this.router.navigate(['/scan', res.scanId]);
        this.loading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.message.set('Server bilan bog‘lanishda xatolik. Konsolni tekshiring.');
        this.loading.set(false);
      }
    });
  }
}
