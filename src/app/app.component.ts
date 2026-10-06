import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet />`,
  // Background of the mockup (design-system.md): cinema black with the violet and cyan glows of the hero.
  // Only the standalone app mounts this component; inside the shell the shell owns the page background.
  styles: `
    :host {
      display: block;
      min-height: 100vh;
      background:
        radial-gradient(circle at 75% 40%, rgba(139, 92, 246, 0.22), transparent 35%),
        radial-gradient(circle at 90% 80%, rgba(56, 189, 248, 0.12), transparent 30%),
        #0B0D17;
      color: #F1F5F9;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
  `,
})
export class AppComponent {
  // Root component: routes are loaded through Native Federation from the shell
}
