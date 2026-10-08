import { AUTH_ROUTES } from './auth.routes';

describe('AUTH_ROUTES', () => {
  const paths = AUTH_ROUTES.map(route => route.path);

  it('exposes login, register and forgot-password', () => {
    expect(paths).toEqual(jasmine.arrayContaining(['login', 'register', 'forgot-password']));
  });

  it('redirects the empty path to login', () => {
    const root = AUTH_ROUTES.find(route => route.path === '');
    expect(root?.redirectTo).toBe('login');
    expect(root?.pathMatch).toBe('full');
  });

  it('loads the page component of each route on demand', async () => {
    const loaded = await Promise.all(
      AUTH_ROUTES.filter(route => route.loadComponent).map(route => route.loadComponent!()),
    );
    expect(loaded.length).toBe(3);
    loaded.forEach(component => expect(component).toBeDefined());
  });
});
