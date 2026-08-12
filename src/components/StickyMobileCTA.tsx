import { Link, useLocation } from "react-router-dom";

const HIDDEN_PATHS = ["/dashboard", "/login", "/sign-up", "/forgot-password", "/reset-password"];

export function StickyMobileCTA() {
  const { pathname } = useLocation();
  const hidden = HIDDEN_PATHS.some((p) => pathname.startsWith(p));

  if (hidden) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background/95 backdrop-blur-sm border-t border-border px-4 py-3 flex items-center justify-between gap-3">
      <p className="text-xs text-muted-foreground font-medium truncate">
        AI stock sentiment tracking
      </p>
      <Link
        to="/sign-up"
        className="flex-shrink-0 px-4 py-2 bg-primary text-primary-foreground rounded-md text-xs font-semibold hover:bg-primary/90 transition-colors"
      >
        Start free trial
      </Link>
    </div>
  );
}
