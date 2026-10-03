import { NEVER } from 'rxjs';
import { Router } from '@angular/router';
import { ScanService } from '../../services/scan.service';
import { HomeComponent } from './home.component';

describe('HomeComponent URL validation', () => {
  let component: HomeComponent;
  let scan: jasmine.SpyObj<ScanService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    scan = jasmine.createSpyObj<ScanService>('ScanService', ['startScan']);
    scan.startScan.and.returnValue(NEVER);
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    component = new HomeComponent(scan, router);
  });

  for (const url of ['', '   ', 'http', 'https://', 'http://bad host', 'https://example.com:invalid']) {
    it(`rejects the invalid URL ${JSON.stringify(url)} without starting a scan`, () => {
      component.url.set(url);

      component.start();

      expect(scan.startScan).not.toHaveBeenCalled();
      expect(router.navigate).not.toHaveBeenCalled();
      expect(component.error()).not.toBe('');
      expect(component.loading()).toBeFalse();
    });
  }

  for (const url of ['httpx://example.com', 'httpsomething://example.com', 'ftp://example.com']) {
    it(`rejects the unsupported protocol in ${url}`, () => {
      component.url.set(url);

      component.start();

      expect(scan.startScan).not.toHaveBeenCalled();
      expect(component.error()).toBe('URL http yoki https bilan boshlanishi kerak');
      expect(component.loading()).toBeFalse();
    });
  }

  for (const url of ['http://example.com', 'https://example.com/path?q=one#section', 'HTTPS://example.com']) {
    it(`starts a scan for ${url} and trims surrounding whitespace`, () => {
      component.error.set('Previous validation error');
      component.url.set(`  ${url}  `);

      component.start();

      expect(scan.startScan).toHaveBeenCalledOnceWith(url);
      expect(component.error()).toBe('');
      expect(component.loading()).toBeTrue();
    });
  }
});
