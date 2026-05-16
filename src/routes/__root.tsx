import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { AuthProvider } from "@/lib/auth";
import { ToastProvider } from "@/lib/toast";

function NotFoundComponent() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[#FBFBFD]">
      <div className="text-center bk-fade">
        <h1 className="text-[64px] font-light text-[#1D1D1F]">404</h1>
        <p className="text-[13px] text-[#86868B] mt-2">This page does not exist.</p>
        <div className="mt-6">
          <Link to="/dashboard" className="bk-btn bk-btn-primary">Go home</Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error }: { error: Error }) {
  console.error(error);
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[#FBFBFD]">
      <div className="text-center bk-fade max-w-sm">
        <h1 className="text-[16px] font-medium text-[#1D1D1F]">Something went wrong</h1>
        <p className="text-[13px] text-[#86868B] mt-2">{error.message}</p>
        <div className="mt-6">
          <a href="/" className="bk-btn bk-btn-primary">Go home</a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#FBFBFD" },
      { title: "BillKar — Billing, simplified." },
      { name: "description", content: "A minimal billing app for small shop owners." },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { name: "apple-mobile-web-app-title", content: "BillKar" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.json" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <Outlet />
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
