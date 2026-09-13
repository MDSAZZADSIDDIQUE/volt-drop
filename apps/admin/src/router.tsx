import { createRootRoute, createRoute, createRouter, Outlet } from '@tanstack/react-router';
import { HomePage } from './pages/home.js';

const rootRoute = createRootRoute({ component: Outlet });

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomePage,
});

export const router = createRouter({ routeTree: rootRoute.addChildren([homeRoute]) });

// Registers the route tree, so links and navigation are type-checked.
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
