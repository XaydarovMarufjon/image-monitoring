import { HttpClient, HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ScanService } from './scan.service';
import { Observable } from 'rxjs';

// Exercise the real HttpClient through Angular's testing backend. No live scan,
// Socket.IO connection, database or moderation provider is started by these tests.
describe('ScanService HTTP contracts', () => {
  let service: ScanService;
  let http: HttpTestingController;
  const base = 'http://localhost:3000/scan';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
    });
    // Explicit construction keeps the contract test independent of DI metadata
    // generation while using the real configured HttpClient and testing backend.
    service = new ScanService(TestBed.inject(HttpClient));
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('posts the complete URL in the JSON body and returns the scan ID', () => {
    const url = 'https://example.com/gallery?q=a%26b#images';
    const next = jasmine.createSpy('next');
    const complete = jasmine.createSpy('complete');
    service.startScan(url).subscribe({ next, complete });
    const request = http.expectOne(base);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ url });
    request.flush({ scanId: 42 });
    expect(next).toHaveBeenCalledOnceWith({ scanId: 42 });
    expect(complete).toHaveBeenCalledTimes(1);
  });

  it('reads progress using the scan ID path segment', () => {
    const next = jasmine.createSpy('next');
    service.getProgress(42).subscribe(next);
    const request = http.expectOne(`${base}/42/progress`);
    expect(request.request.method).toBe('GET');
    expect(request.request.body).toBeNull();
    const progress = { status: 'running', total: 12, done: 5 };
    request.flush(progress);
    expect(next).toHaveBeenCalledOnceWith(progress);
  });

  it('reads detail using the query endpoint and preserves nullable item scores', () => {
    const next = jasmine.createSpy('next');
    service.getDetail(7).subscribe(next);
    const request = http.expectOne(`${base}/detail?id=7`);
    expect(request.request.method).toBe('GET');
    const detail = { id: 7, siteUrl: 'https://example.com', status: 'finished', items: [
      { id: 2, imageUrl: 'https://example.com/a.jpg', label: 'unknown', score: null, provider: 'test' },
    ] };
    request.flush(detail);
    expect(next).toHaveBeenCalledOnceWith(detail);
  });

  it('requests 500 recent scans by default without changing their order', () => {
    const next = jasmine.createSpy('next');
    service.getLatest().subscribe(next);
    const request = http.expectOne(`${base}/latest?limit=500`);
    expect(request.request.method).toBe('GET');
    const scans = [
      { id: 9, siteUrl: 'https://example.com/new', status: 'finished', createdAt: '2026-10-16T08:00:00Z' },
      { id: 2, siteUrl: 'https://example.com/old', status: 'running', createdAt: '2026-10-15T08:00:00Z' },
    ];
    request.flush(scans);
    expect(next).toHaveBeenCalledOnceWith(scans);
  });

  it('honors the history page limit and preserves an empty successful response', () => {
    const next = jasmine.createSpy('next');
    service.getLatest(50).subscribe(next);
    const request = http.expectOne(`${base}/latest?limit=50`);
    expect(request.request.method).toBe('GET');
    request.flush([]);
    expect(next).toHaveBeenCalledOnceWith([]);
  });

  for (const endpoint of ['start', 'progress', 'detail', 'latest'] as const) {
    const call = (): Observable<unknown> => ({
      start: () => service.startScan('https://example.com'),
      progress: () => service.getProgress(7),
      detail: () => service.getDetail(7),
      latest: () => service.getLatest(),
    }[endpoint]());

    it(`keeps ${endpoint} requests lazy until subscribed`, () => {
      const response = call();
      http.expectNone(() => true);
      const subscription = response.subscribe();
      const request = http.expectOne(() => true);
      subscription.unsubscribe();
      expect(request.cancelled).toBeTrue();
    });

    it(`propagates ${endpoint} server failures instead of emitting a successful value`, () => {
      const next = jasmine.createSpy('next');
      const error = jasmine.createSpy('error');
      const complete = jasmine.createSpy('complete');
      call().subscribe({ next, error, complete });
      http.expectOne(() => true).flush({ message: 'unavailable' }, { status: 503, statusText: 'Unavailable' });
      expect(next).not.toHaveBeenCalled();
      expect(complete).not.toHaveBeenCalled();
      expect(error).toHaveBeenCalledTimes(1);
      const failure = error.calls.mostRecent().args[0] as HttpErrorResponse;
      expect(failure.status).toBe(503);
      expect(failure.error).toEqual({ message: 'unavailable' });
    });
  }
});
