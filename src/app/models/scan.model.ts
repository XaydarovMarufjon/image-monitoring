export interface Scan {
  id: number;
  siteUrl: string;
  status: 'running' | 'finished';
  createdAt: string;
}

export interface ScanItem {
  id: number;
  imageUrl: string;
  label: string;
  score: number | null;
  provider: string;
}

export interface ScanProgress {
  status: string;
  total: number;
  done: number;
}

export interface ScanDetail {
  id: number;
  siteUrl: string;
  status: string;
  items: ScanItem[];
}