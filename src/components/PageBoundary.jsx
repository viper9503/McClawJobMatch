import React from "react";

// A render error anywhere below should show a recoverable message instead of
// unmounting the whole app to a blank white screen. Keyed by tab in the tree so
// switching tabs clears a caught error. The usual cause is a stale saved profile
// from an older build, so recovery clears it and reloads.
export default class PageBoundary extends React.Component {
  constructor(props) { super(props); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err, info) { console.error("Page crashed:", err, info); }
  render() {
    if (this.state.err) {
      return (
        <div className="empty">
          <div style={{ marginBottom: 6, color: "var(--txt)", fontWeight: 700 }}>Something went wrong loading this page.</div>
          <div style={{ marginBottom: 16, fontSize: 13 }}>It's usually a saved profile from an older version. Resetting it fixes this.</div>
          <div className="inline" style={{ justifyContent: "center" }}>
            <button className="btn" onClick={this.props.onReset}>Reset profile &amp; reload</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
