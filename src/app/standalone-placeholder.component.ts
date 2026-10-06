import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

/** Stands in for a route another portal owns, so the portal can be tried on its own. */
@Component({
  selector: 'app-standalone-placeholder',
  standalone: true,
  template: `
    <section>
      <h1>{{ title }}</h1>
      <p>Esta pantalla la entrega otro portal; aquí solo confirma que la navegación llegó.</p>
    </section>
  `,
})
export class StandalonePlaceholderComponent {
  protected readonly title = inject(ActivatedRoute).snapshot.data['title'] as string;
}
