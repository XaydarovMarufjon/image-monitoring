import { Router } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { ScanService } from '../../services/scan.service';
import { HomeComponent } from './home.component';

describe('HomeComponent scan lifecycle', () => {
  let component: HomeComponent;
  let response: Subject<{ scanId: number }>;
  let scan: jasmine.SpyObj<ScanService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    jasmine.clock().install();
    response = new Subject();
    scan = jasmine.createSpyObj<ScanService>('ScanService', ['startScan']);
    scan.startScan.and.returnValue(response);
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    component = new HomeComponent(scan, router);
    component.url.set('https://example.uz');
  });

  afterEach(() => {
    // Optional call also permits running these regressions against the old component.
    (component as HomeComponent & { ngOnDestroy?: () => void }).ngOnDestroy?.();
    jasmine.clock().uninstall();
  });

  function leaveHome() {
    (component as HomeComponent & { ngOnDestroy?: () => void }).ngOnDestroy?.();
  }

  it('unsubscribes an in-flight request when Home is destroyed', () => {
    component.start();
    expect(response.observed).toBeTrue();
    leaveHome();
    expect(response.observed).toBeFalse();
  });

  it('ignores a late scan response after leaving Home', () => {
    component.start();
    leaveHome();
    response.next({ scanId: 42 });
    jasmine.clock().tick(1000);
    expect(component.success()).toBe('');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('cancels the delayed redirect after a successful scan', () => {
    component.start();
    response.next({ scanId: 42 });
    response.complete();
    jasmine.clock().tick(799);
    leaveHome();
    jasmine.clock().tick(1);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('also cancels redirects from synchronous responses', () => {
    scan.startScan.and.returnValue(of({ scanId: 7 }));
    component.start();
    leaveHome();
    jasmine.clock().tick(800);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('preserves the success message and redirect while Home remains active', () => {
    component.start();
    expect(component.loading()).toBeTrue();
    response.next({ scanId: 42 });
    response.complete();
    expect(component.success()).toContain('42');
    expect(component.loading()).toBeFalse();
    jasmine.clock().tick(799);
    expect(router.navigate).not.toHaveBeenCalled();
    jasmine.clock().tick(1);
    expect(router.navigate).toHaveBeenCalledOnceWith(['/scan', 42]);
  });

  it('preserves error recovery without scheduling a redirect', () => {
    scan.startScan.and.returnValue(throwError(() => new Error('offline')));
    component.start();
    expect(component.error()).toBe('Server bilan bog‘lanishda xatolik');
    expect(component.loading()).toBeFalse();
    jasmine.clock().tick(800);
    expect(router.navigate).not.toHaveBeenCalled();
    scan.startScan.and.returnValue(response);
    component.start();
    expect(component.error()).toBe('');
    leaveHome();
    expect(response.observed).toBeFalse();
  });

  it('cancels every redirect if another scan succeeds during the delay', () => {
    scan.startScan.and.returnValues(of({ scanId: 1 }), of({ scanId: 2 }));
    component.start();
    jasmine.clock().tick(100);
    component.start();
    leaveHome();
    jasmine.clock().tick(1000);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('cancels every pending subscription on teardown', () => {
    const second = new Subject<{ scanId: number }>();
    scan.startScan.and.returnValues(response, second);
    component.start();
    component.start();
    leaveHome();
    expect(response.observed).toBeFalse();
    expect(second.observed).toBeFalse();
  });

  it('allows teardown before any scan and repeated teardown', () => {
    expect(() => { leaveHome(); leaveHome(); }).not.toThrow();
    jasmine.clock().tick(800);
    expect(scan.startScan).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
