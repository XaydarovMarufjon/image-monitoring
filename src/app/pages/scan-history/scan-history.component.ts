import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScanService } from '../../services/scan.service';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-scan-history',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './scan-history.component.html',
  styleUrls: ['./scan-history.component.scss']
})
export class ScanHistoryComponent implements OnInit {
  scans: any[] = [];
  loading = false;

  constructor(private scan: ScanService) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.scan.getLatest(50).subscribe({
      next: (s) => { this.scans = s; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }
}
