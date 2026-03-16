import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import Layout from "@/components/layout/Layout";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  // If attempting to access /p/* routes without auth, show a generic denial
  if (location.pathname.startsWith("/p")) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Page not available</p>
      </div>
    );
  }

  return (
    <Layout>
      <div className="container py-20 text-center">
        <h1 className="font-display text-5xl font-bold text-foreground">404</h1>
        <p className="mt-3 text-lg text-muted-foreground">This page doesn't exist.</p>
        <Link to="/" className="mt-6 inline-block text-sm font-medium text-primary hover:underline">
          ← Back to home
        </Link>
      </div>
    </Layout>
  );
};

export default NotFound;
