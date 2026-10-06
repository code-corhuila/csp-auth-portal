import { ApplicationRef, Component, createComponent, DOCUMENT, EnvironmentInjector, inject, Injectable, signal } from '@angular/core';

export type ToastType = 'info' | 'success';

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

const TOAST_LIFETIME_MS = 4000;

/** Short messages at the bottom right, like the mockup's showToast. They outlive the route that raised them. */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly appRef = inject(ApplicationRef);
  private readonly injector = inject(EnvironmentInjector);
  private readonly document = inject(DOCUMENT);
  private readonly list = signal<Toast[]>([]);
  private nextId = 0;
  private attached = false;

  readonly toasts = this.list.asReadonly();

  show(message: string, type: ToastType = 'info'): void {
    this.attachContainer();
    const toast: Toast = { id: this.nextId++, message, type };
    this.list.update(current => [...current, toast]);
    setTimeout(() => this.list.update(current => current.filter(t => t.id !== toast.id)), TOAST_LIFETIME_MS);
  }

  /** The container lives on the page body, so a toast raised just before a navigation is still shown. */
  private attachContainer(): void {
    if (this.attached) {
      return;
    }
    const container = createComponent(ToastContainerComponent, { environmentInjector: this.injector });
    this.appRef.attachView(container.hostView);
    this.document.body.appendChild(container.location.nativeElement);
    this.attached = true;
  }
}

@Component({
  selector: 'app-toast-container',
  standalone: true,
  styles: `
    :host {
      position: fixed;
      right: 24px;
      bottom: 24px;
      z-index: 1000;
      display: flex;
      flex-direction: column;
      gap: 12px;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .toast {
      min-width: 280px;
      max-width: 420px;
      padding: 14px 20px;
      border-radius: 8px;
      background: #13172A;
      border: 1px solid rgba(139, 92, 246, 0.4);
      color: #F1F5F9;
      box-shadow: 0 5px 20px rgba(0, 0, 0, 0.5);
      font-size: 0.875rem;
      animation: slide-in 0.3s ease-out forwards;
    }
    .toast-info { border-left: 4px solid #38BDF8; }
    .toast-success { border-left: 4px solid #10B981; }
    @keyframes slide-in {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @media (prefers-reduced-motion: reduce) {
      .toast { animation: none; }
    }
  `,
  template: `
    <div role="status" aria-live="polite">
      @for (toast of service.toasts(); track toast.id) {
        <div class="toast toast-{{ toast.type }}">{{ toast.message }}</div>
      }
    </div>
  `,
})
export class ToastContainerComponent {
  protected readonly service = inject(ToastService);
}
