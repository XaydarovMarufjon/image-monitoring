import { Component, provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { App } from './app';

@Component({ template: '<p>Route content</p>' })
class TestPage {}

describe('App', () => {
  let fixture: ComponentFixture<App>;
  let element: HTMLElement;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([
          { path: '', component: TestPage },
          { path: 'history', component: TestPage }
        ])
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(App);
    element = fixture.nativeElement;
    router = TestBed.inject(Router);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create the app', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the Image Monitor heading', () => {
    expect(element.querySelector('h1')?.textContent).toBe('Image Monitor');
  });

  it('should render Home and History links with their route destinations', () => {
    const links = Array.from(element.querySelectorAll<HTMLAnchorElement>('nav a'));
    expect(links.map(link => link.textContent?.trim())).toEqual(['Home', 'History']);
    expect(links.map(link => link.getAttribute('href'))).toEqual(['/', '/history']);
  });

  it('should navigate to History and back Home using the header links', async () => {
    await router.navigateByUrl('/');
    await fixture.whenStable();
    const links = element.querySelectorAll<HTMLAnchorElement>('nav a');

    links[1].click();
    await fixture.whenStable();
    expect(router.url).toBe('/history');
    expect(element.querySelector('main')?.textContent).toContain('Route content');

    links[0].click();
    await fixture.whenStable();
    expect(router.url).toBe('/');
    expect(element.querySelector('main')?.textContent).toContain('Route content');
  });
});
