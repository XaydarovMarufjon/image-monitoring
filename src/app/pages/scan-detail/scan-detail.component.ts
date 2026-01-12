import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ScanService } from '../../services/scan.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-scan-detail',
  standalone: true,
  imports: [CommonModule ],
  templateUrl: './scan-detail.component.html',
  styleUrls: ['./scan-detail.component.scss']
})
export class ScanDetailComponent implements OnInit {
  items: any[] = [];
  scanId!: number;
  loading = false;

  constructor(private route: ActivatedRoute, private scan: ScanService) {}

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) return;
    this.scanId = id;
    this.load();
  }

  load() {
    this.loading = true;
    this.scan.getScanDetail(this.scanId).subscribe({
      next: (res) => { this.items = res?.items ?? []; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }
}
