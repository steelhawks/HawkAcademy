import React from 'react';

interface Props {
  fallback: (error: Error) => React.ReactNode;
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Generic error boundary used to catch GLTF load failures (bad URL, corrupt
 * file, network error) thrown inside the <Suspense> boundary by drei's
 * useGLTF loader, and show a friendly message instead of crashing the page.
 */
export default class CadErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidUpdate(prevProps: Props) {
    // Allow retrying by clearing the error when the children change (new url).
    if (prevProps.children !== this.props.children && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    if (this.state.error) {
      return this.props.fallback(this.state.error);
    }
    return this.props.children;
  }
}
