import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { Scan } from '../../models/scan.model';
import { ScanService } from '../../services/scan.service';
import { ScanHistoryComponent } from './scan-history.component';

const scan = (id = 7): Scan => ({
  id, siteUrl: `https://example.com/${id}`, status: 'finished', createdAt: '2026-10-11T08:00:00Z',
});

describe('ScanHistoryComponent loading and recovery', () => {
  let fixture: ComponentFixture<ScanHistoryComponent>;
  let component: ScanHistoryComponent & { error?: string };
  let getLatest: jasmine.Spy<ScanService['getLatest']>;
  let initial: Subject<Scan[]>;
  const element = () => fixture.nativeElement as HTMLElement;
  const finish = async (request: Subject<Scan[]>, rows: Scan[]) => {
    request.next(rows);
    request.complete();
    await fixture.whenStable();
  };

  beforeEach(async () => {
    initial = new Subject<Scan[]>();
    getLatest = jasmine.createSpy<ScanService['getLatest']>('getLatest').and.returnValue(initial);
    await TestBed.configureTestingModule({
      imports: [ScanHistoryComponent],
      providers: [provideZonelessChangeDetection(), provideRouter([]),
        { provide: ScanService, useValue: { getLatest } }],
    }).compileComponents();
    fixture = TestBed.createComponent(ScanHistoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('starts one request and shows a loading state rather than empty results', () => {
    expect(getLatest).toHaveBeenCalledOnceWith(50);
    expect(element().querySelector('[role="status"]')?.textContent).toContain('Yuklanmoqda');
    expect(element().querySelector('table')).toBeNull();
    expect(element().querySelector('[role="alert"]')).toBeNull();
  });

  it('renders asynchronous results and scan links in the zoneless app', async () => {
    await finish(initial, [{ ...scan(), _count: { items: 4 } } as Scan]);
    expect(element().querySelector('tbody')?.textContent).toContain('https://example.com/7');
    expect(element().querySelector('tbody')?.textContent).toContain('4');
    expect(element().querySelector('a')?.getAttribute('href')).toBe('/scan/7');
    expect(element().querySelector('[role="status"]')).toBeNull();
    expect(element().querySelector('[role="alert"]')).toBeNull();
  });

  it('distinguishes a successful empty history from a failure', async () => {
    await finish(initial, []);
    expect(element().querySelector('[role="status"]')?.textContent).toContain('Hali scanlar yo‘q');
    expect(element().querySelector('[role="alert"]')).toBeNull();
    expect(element().querySelector('button')).toBeNull();
    expect(element().querySelector('table')).toBeNull();
  });

  it('shows an actionable error after an asynchronous failure', async () => {
    initial.error(new Error('offline'));
    await fixture.whenStable();
    expect(component.loading).toBe(false);
    expect(element().querySelector('[role="alert"]')?.textContent).toContain('Scanlar tarixini yuklab bo‘lmadi');
    expect(element().querySelector('button')?.textContent).toContain('Qayta urinish');
    expect(element().querySelector('[role="status"]')).toBeNull();
    expect(element().querySelector('table')).toBeNull();
  });

  it('clears the error while retrying and renders recovered rows', async () => {
    initial.error(new Error('offline'));
    await fixture.whenStable();
    const retry = new Subject<Scan[]>();
    getLatest.and.returnValue(retry);
    const button = element().querySelector('button');
    expect(button).not.toBeNull();
    button?.click();
    await fixture.whenStable();
    expect(getLatest).toHaveBeenCalledTimes(2);
    expect(element().querySelector('[role="alert"]')).toBeNull();
    expect(element().querySelector('[role="status"]')?.textContent).toContain('Yuklanmoqda');
    await finish(retry, [scan(8)]);
    expect(element().querySelector('tbody')?.textContent).toContain('https://example.com/8');
    expect(element().querySelector('button')).toBeNull();
  });

  it('allows another retry after a repeated failure', async () => {
    initial.error(new Error('offline'));
    await fixture.whenStable();
    const retry = new Subject<Scan[]>();
    getLatest.and.returnValue(retry);
    element().querySelector('button')?.click();
    retry.error(new Error('still offline'));
    await fixture.whenStable();
    expect(element().querySelector('[role="alert"]')).not.toBeNull();
    expect(element().querySelector('button')).not.toBeNull();
    expect(component.loading).toBe(false);
    const recovered = new Subject<Scan[]>();
    getLatest.and.returnValue(recovered);
    element().querySelector('button')?.click();
    await finish(recovered, []);
    expect(getLatest).toHaveBeenCalledTimes(3);
    expect(element().querySelector('[role="status"]')?.textContent).toContain('Hali scanlar yo‘q');
  });

  it('does not start overlapping reads on repeated load calls', () => {
    component.load();
    component.load();
    expect(getLatest).toHaveBeenCalledTimes(1);
    expect(initial.observed).toBe(true);
  });

  it('settles a synchronous successful retry and allows a later read', async () => {
    initial.error(new Error('offline'));
    await fixture.whenStable();
    getLatest.and.returnValue(of([scan(8)]));
    element().querySelector('button')?.click();
    await fixture.whenStable();
    expect(component.loading).toBe(false);
    expect(element().querySelector('a')?.getAttribute('href')).toBe('/scan/8');
    getLatest.and.returnValue(of([scan(9)]));
    component.load();
    await fixture.whenStable();
    expect(getLatest).toHaveBeenCalledTimes(3);
    expect(element().querySelector('a')?.getAttribute('href')).toBe('/scan/9');
  });

  it('settles a synchronous retry failure without locking the retry button', async () => {
    initial.error(new Error('offline'));
    await fixture.whenStable();
    getLatest.and.returnValue(throwError(() => new Error('still offline')));
    element().querySelector('button')?.click();
    await fixture.whenStable();
    expect(component.loading).toBe(false);
    expect(element().querySelector('[role="alert"]')).not.toBeNull();
    expect(element().querySelector('button')).not.toBeNull();
    getLatest.and.returnValue(of([scan(9)]));
    element().querySelector('button')?.click();
    await fixture.whenStable();
    expect(getLatest).toHaveBeenCalledTimes(3);
    expect(element().querySelector('a')?.getAttribute('href')).toBe('/scan/9');
  });

  it('hides previous rows on failure and replaces them on successful retry', async () => {
    await finish(initial, [scan(7)]);
    const refresh = new Subject<Scan[]>();
    getLatest.and.returnValue(refresh);
    component.load();
    refresh.error(new Error('offline'));
    await fixture.whenStable();
    expect(component.scans).toEqual([scan(7)]);
    expect(element().querySelector('table')).toBeNull();
    expect(element().querySelector('[role="alert"]')).not.toBeNull();
    const retry = new Subject<Scan[]>();
    getLatest.and.returnValue(retry);
    element().querySelector('button')?.click();
    await finish(retry, [scan(9)]);
    expect(element().querySelector('tbody')?.textContent).toContain('https://example.com/9');
    expect(element().querySelector('tbody')?.textContent).not.toContain('https://example.com/7');
  });

  it('cancels a pending request on navigation away and ignores later results', () => {
    fixture.destroy();
    expect(initial.observed).toBe(false);
    initial.next([scan(99)]);
    initial.complete();
    expect(component.scans).toEqual([]);
    expect(component.error).toBe('');
  });

  it('does not start another request after destruction', () => {
    fixture.destroy();
    component.load();
    expect(getLatest).toHaveBeenCalledTimes(1);
  });
});
