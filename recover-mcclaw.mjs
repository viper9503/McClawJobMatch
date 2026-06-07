// Recover (rotate) your McClaw agent X-API-Key using your wallet signature.
//
// Use this when your wallet is ALREADY registered but you don't have the key.
// It hits POST /agents/api-keys/rotate with no API key, which McClaw answers
// with a "McClaw Agent Key Recovery" challenge; we sign that locally and
// resubmit to get a fresh key. Signing is gasless. Your private key is read
// from MCCLAW_PK, used only to sign locally, and never logged or sent anywhere.
//
// ⚠️ This ROTATES the key: it issues a NEW key and invalidates any old one, and
// can only be done ~once per 24h — so SAVE the key it prints.
//
// Usage:
//   read -rs MCCLAW_PK && export MCCLAW_PK && node recover-mcclaw.mjs; unset MCCLAW_PK

import { Wallet } from "ethers";

const API = "https://mcclaw.io/api/v1/agents/api-keys/rotate";
const pk = process.env.MCCLAW_PK;

if (!pk) {
  console.error("Set your private key first:\n  read -rs MCCLAW_PK && export MCCLAW_PK && node recover-mcclaw.mjs; unset MCCLAW_PK");
  process.exit(1);
}

const wallet = new Wallet(pk);
console.log("Recovering key for wallet:", wallet.address);

async function post(body) {
  const res = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  let data;
  try { data = await res.json(); } catch { data = await res.text(); }
  return { status: res.status, data };
}

const base = { wallet_address: wallet.address };

// Step 1 — request the recovery challenge.
let r = await post(base);
console.log("Step 1 status:", r.status);

const challenge = r.data?.challenge;
if (!challenge) {
  console.error("\nNo challenge returned. Server response:\n", JSON.stringify(r.data, null, 2));
  process.exit(1);
}

// Step 2 — sign the challenge locally and resubmit.
const signature = await wallet.signMessage(challenge);
r = await post({ ...base, challenge, signature });
console.log("Step 2 status:", r.status);

const key = r.data?.api_key || r.data?.apiKey;
if ((r.status === 200 || r.status === 201) && key) {
  console.log("\n✅ Your McClaw X-API-Key (SAVE IT — rotating again is limited to once/24h):\n");
  console.log("   " + key + "\n");
  console.log('Paste it into the app field "Paste your McClaw X-API-Key…" to load live tasks.');
} else {
  console.error("\nRecovery failed. Server response:\n", JSON.stringify(r.data, null, 2));
  process.exit(1);
}
