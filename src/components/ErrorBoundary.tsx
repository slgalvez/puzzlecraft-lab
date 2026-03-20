import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div style={{ padding: "2rem", textAlign: "center", fontFamily: "system-ui, sans-serif" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.5rem" }}>
            Something went wrong
          </h2>
          <p style={{ color: "#888", fontSize: "0.875rem", marginBottom: "1rem" }}>
            {this.state.error?.message || "An unexpected error occurred."}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "0.5rem 1.25rem",
              borderRadius: "0.5rem",
              border: "1px solid #ddd",
              background: "transparent",
              cursor: "pointer",
              fontSize: "0.875rem",
            }}
          >
            Refresh Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
