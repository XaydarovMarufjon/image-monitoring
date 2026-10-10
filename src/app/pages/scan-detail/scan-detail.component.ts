import {
  Component,
  OnDestroy,
  OnInit,
  signal,
  computed
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
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
export class ScanDetailComponent implements OnInit, OnDestroy {

  items = signal<ScanItem[]>([]);
  status = signal<'loading' | 'running' | 'finished'>('loading');
  progress = signal(0);
  stage = signal('');

  threshold = signal(0.3);
  error = signal('');

  filteredItems = computed(() =>
    this.items().filter(i => (i.score ?? 0) >= this.threshold())
  );

  private scanId: number | null = null;
  private routeSubscription?: Subscription;
  private detailSubscription?: Subscription;
  private removeProgressListener?: () => void;
  private destroyed = false;

  constructor(
    private route: ActivatedRoute,
    private scan: ScanService,
    private socket: SocketService
  ) {}

  ngOnInit() {
    // The backend finishes a new scan before POST returns. Read persisted
    // detail on navigation instead of waiting for an event already emitted.
    this.removeProgressListener = this.socket.onProgress((data) => {
      // Intermediate backend events have no scan ID and cannot safely be
      // attributed to this page. Only this scan's completion triggers a reload.
      if (!this.destroyed && data?.scanId === this.scanId && data?.stage === 'finished') {
        this.loadDetail();
      }
    });

    this.routeSubscription = this.route.paramMap.subscribe((params) => {
      this.detailSubscription?.unsubscribe();
      const id = Number(params.get('id'));
      this.scanId = Number.isSafeInteger(id) && id > 0 ? id : null;
      this.items.set([]);
      this.status.set('loading');
      this.progress.set(0);
      this.stage.set('');
      this.error.set('');

      if (this.scanId === null) {
        this.error.set('Scan ID noto‘g‘ri');
        return;
      }
      this.loadDetail();
    });
  }

  loadDetail() {
    if (this.destroyed || this.scanId === null) return;

    // Cancel the previous read so a slower response cannot replace a newer
    // route or completion refresh, including with an outdated running status.
    this.detailSubscription?.unsubscribe();
    this.error.set('');
    this.detailSubscription = this.scan.getDetail(this.scanId).subscribe({
      next: (res) => {
        if (!res) {
          this.error.set('Scan topilmadi');
          return;
        }
        this.items.set(res.items || []);
        const finished = res.status === 'finished';
        this.status.set(finished ? 'finished' : 'running');
        this.stage.set(finished ? 'finished' : 'running');
        this.progress.set(finished ? 100 : 0);
      },
      error: () => {
        this.error.set('Server xatosi');
      }
    });
  }

  ngOnDestroy() {
    this.destroyed = true;
    this.routeSubscription?.unsubscribe();
    this.detailSubscription?.unsubscribe();
    this.removeProgressListener?.();
  }
}
