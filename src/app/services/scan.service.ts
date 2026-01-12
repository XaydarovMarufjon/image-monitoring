import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ScanStartResp {
  scanId: number;
  total: number;
  saved: number;
}

@Injectable({ providedIn: 'root' })
export class ScanService {
  private base = 'http://localhost:3000'; // backend port

  constructor(private http: HttpClient) {}

  startScan(url: string): Observable<ScanStartResp> {
    return this.http.post<ScanStartResp>(`${this.base}/scan`, { url });
  }

  getLatest(limit = 20) {
    return this.http.get<any[]>(`${this.base}/scan/latest?limit=${limit}`);
  }

  getBySite(siteUrl: string) {
    return this.http.get<any[]>(`${this.base}/scan?url=${encodeURIComponent(siteUrl)}`);
  }

  getScanDetail(id: number) {
    return this.http.get<any>(`${this.base}/scan/detail?id=${id}`);
  }
}
