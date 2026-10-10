import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { BehaviorSubject, Subject } from 'rxjs';
import { ScanDetail } from '../../models/scan.model';
import { ScanService } from '../../services/scan.service';
import { SocketService } from '../../services/socket.service';
import { ScanDetailComponent } from './scan-detail.component';

describe('ScanDetailComponent navigation and completion', () => {
  let component: ScanDetailComponent;
  let params: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  let requests: Subject<ScanDetail>[];
  let scan: jasmine.SpyObj<ScanService>;
  let onProgress: jasmine.Spy;
  let removeListener: jasmine.Spy;
  let progress: (event: unknown) => void;

  const item = { id: 1, imageUrl: 'https://example.com/a.jpg', label: 'nsfw', score: 0.8, provider: 'test' };
  const detail = (id = 7, status = 'finished'): ScanDetail => ({
    id, siteUrl: 'https://example.com', status, items: [item]
  });

  beforeEach(() => {
    params = new BehaviorSubject(convertToParamMap({ id: '7' }));
    requests = [];
    scan = jasmine.createSpyObj<ScanService>('ScanService', ['getDetail']);
    scan.getDetail.and.callFake(() => {
      const request = new Subject<ScanDetail>();
      requests.push(request);
      return request.asObservable();
    });
    removeListener = jasmine.createSpy('removeListener');
    onProgress = jasmine.createSpy('onProgress').and.callFake((cb) => {
      progress = cb;
      return removeListener;
    });
    component = new ScanDetailComponent(
      { paramMap: params.asObservable(), snapshot: { paramMap: params.value } } as ActivatedRoute,
      scan,
      { onProgress } as unknown as SocketService
    );
  });

  afterEach(() => component.ngOnDestroy?.());

  it('loads an already completed scan immediately without a socket event', () => {
    component.ngOnInit();
    expect(scan.getDetail).toHaveBeenCalledOnceWith(7);
    expect(component.status()).toBe('loading');
    requests[0].next(detail());
    expect(component.items()).toEqual([item]);
    expect(component.status()).toBe('finished');
    expect(component.stage()).toBe('finished');
    expect(component.progress()).toBe(100);
  });

  it('loads a running scan and refreshes only when that scan completes', () => {
    component.ngOnInit();
    requests[0].next(detail(7, 'running'));
    expect(component.status()).toBe('running');
    expect(component.progress()).toBe(0);
    progress({ stage: 'finished', scanId: 7 });
    expect(scan.getDetail).toHaveBeenCalledTimes(2);
    requests[1].next(detail());
    expect(component.status()).toBe('finished');
  });

  it('ignores global progress and other scans instead of corrupting this page', () => {
    component.ngOnInit();
    requests[0].next(detail());
    for (const event of [
      { stage: 'start', url: 'https://elsewhere.example' },
      { stage: 'moderation', progress: 50 },
      { stage: 'finished', scanId: 8 },
      { stage: 'finished', scanId: '7' },
      null,
    ]) progress(event);
    expect(scan.getDetail).toHaveBeenCalledTimes(1);
    expect(component.status()).toBe('finished');
    expect(component.stage()).toBe('finished');
    expect(component.progress()).toBe(100);
    expect(component.items()).toEqual([item]);
  });

  it('reloads when Angular reuses the component for another scan ID', () => {
    component.ngOnInit();
    requests[0].next(detail());
    params.next(convertToParamMap({ id: '8' }));
    expect(scan.getDetail.calls.allArgs()).toEqual([[7], [8]]);
    expect(component.items()).toEqual([]);
    expect(component.status()).toBe('loading');
    expect(component.progress()).toBe(0);
    requests[1].next({ ...detail(8), items: [] });
    expect(component.status()).toBe('finished');
    expect(component.items()).toEqual([]);
  });

  it('cancels the old route request and ignores its delayed response', () => {
    component.ngOnInit();
    const previous = requests[0];
    params.next(convertToParamMap({ id: '8' }));
    expect(previous.observed).toBeFalse();
    requests[1].next({ ...detail(8), items: [] });
    previous.next(detail());
    expect(component.items()).toEqual([]);
    expect(component.status()).toBe('finished');
  });

  it('ignores the prior scan completion after changing routes', () => {
    component.ngOnInit();
    params.next(convertToParamMap({ id: '8' }));
    progress({ stage: 'finished', scanId: 7 });
    expect(scan.getDetail.calls.allArgs()).toEqual([[7], [8]]);
    progress({ stage: 'finished', scanId: 8 });
    expect(scan.getDetail.calls.allArgs()).toEqual([[7], [8], [8]]);
  });

  it('cancels a pending initial read before a completion refresh', () => {
    component.ngOnInit();
    const initial = requests[0];
    progress({ stage: 'finished', scanId: 7 });
    expect(initial.observed).toBeFalse();
    requests[1].next(detail());
    initial.next(detail(7, 'running'));
    expect(component.status()).toBe('finished');
  });

  it('keeps only the latest of repeated completion refreshes', () => {
    component.ngOnInit();
    progress({ stage: 'finished', scanId: 7 });
    progress({ stage: 'finished', scanId: 7 });
    expect(requests[0].observed).toBeFalse();
    expect(requests[1].observed).toBeFalse();
    expect(requests[2].observed).toBeTrue();
    requests[2].next(detail());
    expect(component.items()).toEqual([item]);
  });

  it('reports a failed read and clears the error on a successful retry', () => {
    component.ngOnInit();
    requests[0].error(new Error('offline'));
    expect(component.error()).toBe('Server xatosi');
    component.loadDetail();
    expect(component.error()).toBe('');
    requests[1].next(detail());
    expect(component.error()).toBe('');
    expect(component.status()).toBe('finished');
  });

  it('reports a missing scan instead of dereferencing a null response', () => {
    component.ngOnInit();
    requests[0].next(null as unknown as ScanDetail);
    expect(component.error()).toBe('Scan topilmadi');
    expect(component.items()).toEqual([]);
  });

  it('clears the previous route error when navigating to a valid scan', () => {
    component.ngOnInit();
    requests[0].error(new Error('offline'));
    params.next(convertToParamMap({ id: '8' }));
    expect(component.error()).toBe('');
    requests[1].next(detail(8));
    expect(component.status()).toBe('finished');
  });

  for (const id of ['', '0', '-1', '1.5', 'invalid', '9007199254740992']) {
    it(`does not request an invalid scan ID: ${JSON.stringify(id)}`, () => {
      params.next(convertToParamMap({ id }));
      component.ngOnInit();
      expect(scan.getDetail).not.toHaveBeenCalled();
      expect(component.error()).toBe('Scan ID noto‘g‘ri');
    });
  }

  it('cancels reads and route/socket listeners on destruction', () => {
    component.ngOnInit();
    component.ngOnDestroy();
    expect(requests[0].observed).toBeFalse();
    expect(params.observed).toBeFalse();
    expect(removeListener).toHaveBeenCalledTimes(1);
    progress({ stage: 'finished', scanId: 7 });
    params.next(convertToParamMap({ id: '8' }));
    component.loadDetail();
    expect(scan.getDetail).toHaveBeenCalledTimes(1);
  });

  it('retains the existing score threshold filtering on loaded results', () => {
    component.ngOnInit();
    requests[0].next({ ...detail(), items: [item, { ...item, id: 2, score: null }] });
    expect(component.filteredItems()).toEqual([item]);
    component.threshold.set(0);
    expect(component.filteredItems().length).toBe(2);
  });
});

describe('SocketService progress listener disposal', () => {
  it('removes only the registered callback without disconnecting the shared socket', () => {
    const callback = () => {};
    const socket = jasmine.createSpyObj('socket', ['on', 'off', 'disconnect']);
    const dispose = SocketService.prototype.onProgress.call({ socket } as SocketService, callback);
    expect(socket.on).toHaveBeenCalledOnceWith('scan-progress', callback);
    expect(socket.off).not.toHaveBeenCalled();
    dispose();
    expect(socket.off).toHaveBeenCalledOnceWith('scan-progress', callback);
    expect(socket.disconnect).not.toHaveBeenCalled();
  });
});
