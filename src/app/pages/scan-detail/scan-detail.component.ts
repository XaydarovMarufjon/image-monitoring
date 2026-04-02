import {
  Component,
  OnInit,
  signal,
  computed
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ScanService } from '../../services/scan.service';
import { SocketService } from '../../services/socket.service';
import { ScanItem } from '../../models/scan.model';

@Component({
  standalone: true,
  selector: 'app-scan-detail',
  imports: [CommonModule],
  templateUrl: './scan-detail.component.html',
  styleUrls: ['./scan-detail.component.scss']
})
export class ScanDetailComponent implements OnInit {

  items = signal<ScanItem[]>([]);
  status = signal<'loading' | 'running' | 'finished'>('loading');
  progress = signal(0);
  stage = signal('');

  threshold = signal(0.3);
  error = signal('');

  filteredItems = computed(() =>
    this.items().filter(i => (i.score ?? 0) >= this.threshold())
  );

  private scanId!: number;

  constructor(
    private route: ActivatedRoute,
    private scan: ScanService,
    private socket: SocketService
  ) {}

  ngOnInit() {
    this.scanId = Number(this.route.snapshot.paramMap.get('id'));

    // 🔥 REAL TIME SOCKET
    this.socket.onProgress((data) => {

      this.stage.set(data.stage);

      if (data.progress !== undefined) {
        this.progress.set(data.progress);
      }

      // 🔥 FINISH
      if (data.stage === 'finished') {
        this.status.set('finished');
        this.loadDetail();
      } else {
        this.status.set('running');
      }

    });
  }

  loadDetail() {
    this.scan.getDetail(this.scanId).subscribe({
      next: (res) => {
        this.items.set(res.items || []);
      },
      error: () => {
        this.error.set('Server xatosi');
      }
    });
  }
}