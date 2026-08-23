import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    // SPA / client-only rendering: this app is wrapped with Capacitor, so no
    // route may render on the server. Every route inherits ssr: false.
    defaultSsr: false,
  });

  return router;
};
