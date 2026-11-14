import { TestBed } from '@angular/core/testing';
import { ToastService } from './toast.service';

describe('ToastService', () => {
  let toasts: ToastService;

  beforeEach(() => {
    jasmine.clock().install();
    TestBed.configureTestingModule({});
    toasts = TestBed.inject(ToastService);
  });

  afterEach(() => {
    jasmine.clock().uninstall();
    document.querySelectorAll('app-toast-container').forEach(el => el.remove());
  });

  it('shows a message with its type', () => {
    toasts.show('Sesión iniciada correctamente.', 'success');
    expect(toasts.toasts().map(t => [t.message, t.type])).toEqual([['Sesión iniciada correctamente.', 'success']]);
  });

  it('announces an error as an alert inside the status container', () => {
    toasts.show('No se pudo.', 'error');
    TestBed.tick();
    const toast = document.body.querySelector('app-toast-container .toast-error')!;
    expect(toast.getAttribute('role')).toBe('alert');
    expect(document.body.querySelector('app-toast-container .toast-success')).toBeNull();
  });

  it('removes the message after 4 seconds', () => {
    toasts.show('Hola');
    jasmine.clock().tick(3999);
    expect(toasts.toasts().length).toBe(1);
    jasmine.clock().tick(1);
    expect(toasts.toasts().length).toBe(0);
  });

  it('renders in a container attached to the page body, outside any route', () => {
    toasts.show('Registro exitoso.', 'success');
    TestBed.tick();
    const container = document.body.querySelector('app-toast-container');
    expect(container).not.toBeNull();
    expect(container!.querySelector('.toast-success')!.textContent).toContain('Registro exitoso.');
    expect(container!.querySelector('[role="status"]')).not.toBeNull();
  });

  it('attaches a single container however many messages are shown', () => {
    toasts.show('Uno');
    toasts.show('Dos', 'success');
    TestBed.tick();
    expect(document.body.querySelectorAll('app-toast-container').length).toBe(1);
    expect(document.body.querySelectorAll('app-toast-container .toast').length).toBe(2);
  });
});
