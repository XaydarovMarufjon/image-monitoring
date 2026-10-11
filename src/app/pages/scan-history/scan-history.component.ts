import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScanService } from '../../services/scan.service';
import { RouterLink } from '@angular/router';
import { finalize, Subscription } from 'rxjs';

@Component({
  selector: 'app-scan-history',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './scan-history.component.html',
  styleUrls: ['./scan-history.component.scss']
})
export class ScanHistoryComponent implements OnInit, OnDestroy {
  scans: any[] = [];
  loading = false;
  error = '';
  private request?: Subscription;
  private destroyed = false;

  constructor(private scan: ScanService, private changeDetector: ChangeDetectorRef) {}

  ngOnInit() { this.load(); }

  ngOnDestroy() {
    this.destroyed = true;
    this.request?.unsubscribe();
  }

  load() {
    if (this.loading || this.destroyed) return;
    this.loading = true;
    this.error = '';
    this.request = this.scan.getLatest(50).pipe(
      finalize(() => {
        this.loading = false;
        if (!this.destroyed) this.changeDetector.markForCheck();
      })
    ).subscribe({
      next: (scans) => { this.scans = scans; },
      error: () => { this.error = 'Scanlar tarixini yuklab bo‘lmadi'; }
    });
  }
}
