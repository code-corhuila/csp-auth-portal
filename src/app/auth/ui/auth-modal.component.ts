import { afterNextRender, Component, ElementRef, HostListener, inject, input, output } from '@angular/core';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])';

/**
 * The modal of the mockup (overlay, card, title, close button) with the dialog behaviour a modal needs.
 * The first input takes the focus when it opens, unless a projected element carries `data-initial-focus`.
 */
@Component({
  selector: 'app-auth-modal',
  standalone: true,
  styleUrl: './auth-modal.css',
  template: `
    <div class="auth-backdrop">
      <div class="auth-dialog" role="dialog" aria-modal="true" [attr.aria-labelledby]="titleId()"
           [style.max-width.px]="maxWidth()" (keydown.tab)="trapFocus($event, false)" (keydown.shift.tab)="trapFocus($event, true)">
        <header class="auth-header">
          <h1 [id]="titleId()">{{ title() }}</h1>
          <button type="button" class="auth-close" [attr.aria-label]="closeLabel()" (click)="closed.emit()">×</button>
        </header>
        <ng-content />
      </div>
    </div>
  `,
})
export class AuthModalComponent {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly title = input.required<string>();
  readonly titleId = input.required<string>();
  readonly maxWidth = input(420);
  readonly closeLabel = input('Cerrar');
  readonly closed = output<void>();

  constructor() {
    afterNextRender(() => {
      const root = this.host.nativeElement;
      (root.querySelector<HTMLElement>('[data-initial-focus]') ?? root.querySelector<HTMLElement>('input'))?.focus();
    });
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.closed.emit();
  }

  protected trapFocus(event: Event, backwards: boolean): void {
    const items = Array.from(this.host.nativeElement.querySelectorAll<HTMLElement>(FOCUSABLE));
    const edge = backwards ? items[0] : items[items.length - 1];
    if (items.length > 0 && document.activeElement === edge) {
      event.preventDefault();
      (backwards ? items[items.length - 1] : items[0]).focus();
    }
  }
}
