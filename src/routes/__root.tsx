import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  useRouterState,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Home, CalendarDays, GraduationCap, BarChart3, Trophy } from "lucide-react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { useRealtimeSync } from "../lib/use-realtime-sync";
import { useTempTimetableSync } from "../lib/temp-timetable";
import { TempBanner } from "../components/TempBanner";
import { Toaster } from "@/components/ui/sonner";


function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error as Error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong. Try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-2xl border border-input bg-background px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
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
      { name: "theme-color", content: "#1F4E79" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "Malja'a TT" },
      { title: "Malja'a Teachers Timetable" },
      { name: "description", content: "Modern timetable app for Malja'a Shareeath & Arts College — teachers, classes and live periods." },
      { property: "og:title", content: "Malja'a Teachers Timetable" },
      { property: "og:description", content: "Modern timetable app for Malja'a Shareeath & Arts College — teachers, classes and live periods." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Malja'a Teachers Timetable" },
      { name: "twitter:description", content: "Modern timetable app for Malja'a Shareeath & Arts College — teachers, classes and live periods." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/802aaab4-09b0-4220-ad1c-fad63192e75c/id-preview-92ac4558--215f55b6-9e8b-4082-b683-31680a8092c2.lovable.app-1782665060779.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/802aaab4-09b0-4220-ad1c-fad63192e75c/id-preview-92ac4558--215f55b6-9e8b-4082-b683-31680a8092c2.lovable.app-1782665060779.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" },
      { rel: "manifest", href: "/manifest-v3.webmanifest" },
      { rel: "icon", type: "image/png", sizes: "64x64", href: "/maljaa-favicon-v3.png" },
      { rel: "icon", type: "image/png", sizes: "192x192", href: "/maljaa-icon-192-v3.png" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/maljaa-apple-touch-v3.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
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

const NAV = [
  { to: "/timetable", label: "Overall", icon: CalendarDays, exact: false },
  { to: "/teachers", label: "Teachers", icon: Home, exact: false },
  { to: "/classes", label: "Classes", icon: GraduationCap, exact: false },
  { to: "/rankings", label: "Ranks", icon: Trophy, exact: false },
  { to: "/stats", label: "Stats", icon: BarChart3, exact: false },
] as const;

function BottomNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto grid max-w-3xl grid-cols-5">

        {NAV.map((item) => {
          const active = item.exact ? path === item.to : path.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center justify-center gap-1 py-2.5 text-xs font-medium transition-colors ${
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className={`h-5 w-5 ${active ? "scale-110" : ""} transition-transform`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function TopBar() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card/85 backdrop-blur supports-[backdrop-filter]:bg-card/70">
      <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
        <img
          src="/maljaa-icon-192-v3.png"
          alt="Malja'a College"
          className="h-10 w-10 shrink-0 rounded-lg object-cover"
          width={40}
          height={40}
        />
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold leading-tight text-foreground">Malja'a College</div>
          <div className="truncate text-xs text-muted-foreground">Shareeath &amp; Arts · Teachers Timetable</div>
        </div>
      </div>
    </header>
  );
}

function RealtimeBridge() {
  useRealtimeSync();
  useTempTimetableSync();
  return null;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <RealtimeBridge />
      <div className="min-h-screen bg-background">
        <TopBar />
        <TempBanner />
        <main className="mx-auto max-w-3xl px-4 pb-28 pt-4">
          <Outlet />
        </main>
        <BottomNav />
        <Toaster position="top-center" />
      </div>
    </QueryClientProvider>
  );
}

