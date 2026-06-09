// Anthropic browser client factory.
//
// SECURITY NOTE: dangerouslyAllowBrowser ships the API key to the browser. That
// is acceptable for a local hackathon demo where each user pastes their OWN key,
// but for production you'd proxy these calls through a tiny backend so the key
// stays server-side. The flag name is Anthropic's deliberate red flag.

import Anthropic from "@anthropic-ai/sdk";

let cached = { key: null, client: null };

/** Get (or lazily build) a client for the given key. Re-uses the instance. */
export function getClient(apiKey) {
  if (!apiKey) throw new Error("Missing Anthropic API key.");
  if (cached.client && cached.key === apiKey) return cached.client;
  const client = new Anthropic({
    apiKey,
    dangerouslyAllowBrowser: true,
    maxRetries: 2, // SDK auto-backs-off on 429/5xx
  });
  cached = { key: apiKey, client };
  return client;
}

/** Pull the single forced-tool-use block's input out of a Messages response. */
export function toolInputFromResponse(response, toolName) {
  const block = response?.content?.find(
    (b) => b.type === "tool_use" && (!toolName || b.name === toolName),
  );
  if (!block) {
    throw new Error("Model did not return the expected tool call.");
  }
  return block.input;
}
