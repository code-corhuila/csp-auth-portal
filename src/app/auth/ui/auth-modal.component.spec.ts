import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthModalComponent } from './auth-modal.component';

@Component({
  standalone: true,
  imports: [AuthModalComponent],
  template: `
    <app-auth-modal title="Iniciar sesión" titleId="t" (closed)="closes = closes + 1">
      <input id="first" /><button id="last" type="button">Ir</button>
    </app-auth-modal>
  `,
})
class HostComponent {
  closes = 0;
}

describe('AuthModalComponent', () => {
  function create() {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('is a labelled modal dialog with its title', () => {
    const root: HTMLElement = create().nativeElement;
    const dialog = root.querySelector('[role="dialog"]')!;
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBe('t');
    expect(root.querySelector('#t')!.textContent).toContain('Iniciar sesión');
  });

  it('closes from the close button', () => {
    const fixture = create();
    (fixture.nativeElement.querySelector('.auth-close') as HTMLButtonElement).click();
    expect(fixture.componentInstance.closes).toBe(1);
  });

  it('closes with Escape', () => {
    const fixture = create();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(fixture.componentInstance.closes).toBe(1);
  });

  it('moves focus to the first field when it opens', async () => {
    const fixture = create();
    await fixture.whenStable();
    expect(document.activeElement).toBe(fixture.nativeElement.querySelector('#first'));
  });

  it('keeps Tab inside the dialog', () => {
    const fixture = create();
    const root: HTMLElement = fixture.nativeElement;
    const last = root.querySelector<HTMLElement>('#last')!;
    last.focus();
    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    last.dispatchEvent(event);
    expect(event.defaultPrevented).toBeTrue();
    expect(document.activeElement).toBe(root.querySelector('.auth-close'));
  });
});
