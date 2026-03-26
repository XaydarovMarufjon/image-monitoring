import {
  Component,
  OnInit,
  OnDestroy,
  signal,
  computed
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ScanService } from '../../services/scan.service';
import { ScanItem } from '../../models/scan.model';

@Component({
  standalone: true,
  selector: 'app-scan-detail',
  imports: [CommonModule],
  templateUrl: './scan-detail.component.html',
  styleUrls: ['./scan-detail.component.scss']
})
export class ScanDetailComponent implements OnInit, OnDestroy {

  // 📊 DATA
  items = signal<ScanItem[]>([]);
  status = signal<'loading' | 'running' | 'finished'>('loading');
  progress = signal(0);

  // 🎯 FILTER
  threshold = signal(0.3);
  error = signal('');

  filteredItems = computed(() =>
    this.items().filter(i => (i.score ?? 0) >= this.threshold())
  );

  // 🔧 INTERNAL
  private scanId!: number;
  private timer: any;

  constructor(
    private route: ActivatedRoute,
    private scan: ScanService
  ) { }

  ngOnInit() {
    this.scanId = Number(this.route.snapshot.paramMap.get('id'));
    this.startPolling();
  }

  // 🔁 POLLING
  startPolling() {
    this.timer = setInterval(() => {
      this.scan.getProgress(this.scanId).subscribe({
        next: (res) => {
          this.status.set(res.status as any);

          const percent = res.total
            ? Math.floor((res.done / res.total) * 100)
            : 0;

          this.progress.set(percent);

          if (res.status === 'finished') {
            clearInterval(this.timer);
            this.loadDetail();
          }
        },
        error: () => {
          clearInterval(this.timer);
        }
      });
    }, 2000);
  }

  // 📥 DETAIL LOAD
  loadDetail() {
    this.scan.getDetail(this.scanId).subscribe({
      next: (res) => {
        this.items.set(res.items || []);
      },
      error: (err) => {
        console.error(err);
        this.error.set('Serverdan ma’lumot olishda xatolik');
      }
    });
  }

  ngOnDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
}