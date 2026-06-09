// Thin, crash-proof localStorage helpers. This is the app's entire "backend":
// keys, profile, and resume text live in the browser. Nothing is sent anywhere
// except (a) the McClaw API and (b) the Anthropic API.

export function load(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private mode / quota — non-fatal, the app still works for this session.
  }
}

export function remove(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}
