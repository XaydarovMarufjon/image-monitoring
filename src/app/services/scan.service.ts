import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Scan, ScanDetail, ScanProgress } from '../models/scan.model';

@Injectable({ providedIn: 'root' })
export class ScanService {
  private base = 'http://localhost:3000/scan';

  constructor(private http: HttpClient) {}

  startScan(url: string) {
    return this.http.post<{ scanId: number }>(this.base, { url });
  }

  getProgress(id: number) {
    return this.http.get<ScanProgress>(`${this.base}/${id}/progress`);
  }

  getDetail(id: number) {
    return this.http.get<ScanDetail>(`${this.base}/detail?id=${id}`);
  }

  getLatest(limit = 500) {
    return this.http.get<Scan[]>(`${this.base}/latest?limit=${limit}`);
  }
}