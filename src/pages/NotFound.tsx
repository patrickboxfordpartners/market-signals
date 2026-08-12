import { Link } from "react-router-dom";
import { usePageMeta } from "../hooks/usePageMeta";
import logoIcon from "../assets/logo-icon.png";

export function NotFound() {
  usePageMeta({
    title: "Page Not Found | Street Insights",
    description: "The page you were looking for does not exist.",
  });

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <img
          src={logoIcon}
          alt="Street Insights logo"
          className="h-14 w-auto mx-auto mb-6 opacity-60"
        />
        <h1 className="text-5xl font-bold tracking-tight text-foreground mb-2">
          404
        </h1>
        <p className="text-lg text-muted-foreground mb-8">
          This page does not exist or has been moved.
        </p>
        <nav className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/"
            className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg font-semibold text-sm hover:bg-primary/90 transition-colors"
          >
            Back to home
          </Link>
          <Link
            to="/pricing"
            className="px-5 py-2.5 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-accent transition-colors"
          >
            View pricing
          </Link>
          <Link
            to="/blog"
            className="px-5 py-2.5 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-accent transition-colors"
          >
            Read blog
          </Link>
        </nav>
        <p className="mt-8 text-xs text-muted-foreground">
          Need help?{" "}
          <a
            href="mailto:hello@getstreetinsights.com"
            className="text-primary hover:underline"
          >
            Contact support
          </a>
        </p>
      </div>
    </div>
  );
}
