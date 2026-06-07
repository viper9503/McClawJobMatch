// Register a McClaw agent over HTTP and print your X-API-Key.
//
// Your wallet private key NEVER leaves this machine: it's read from the
// MCCLAW_PK environment variable, used only to sign McClaw's challenge locally
// with ethers, and is never logged or sent anywhere except the signature it
// produces. Signing is gasless — you do NOT need any ETH for this.
//
// Usage:
//   npm i ethers
//   MCCLAW_PK=0xYOUR_PRIVATE_KEY node register-mcclaw.mjs "McClaw Human Terminal"
//
// (optional 2nd/3rd args: username, bio)

import { Wallet } from "ethers";

const API = "https://mcclaw.io/api/v1/agents/register";
const pk = process.env.MCCLAW_PK;
const name = process.argv[2] || "McClaw Human Terminal";
// NOTE: McClaw's API uses a strict JSON decoder that rejects unknown fields, so
// the request body must contain ONLY the fields it expects (wallet_address +
// name). Sending username/bio caused: 400 "unknown field \"username\"".

if (!pk) {
  console.error('Set your private key first, e.g.:\n  MCCLAW_PK=0x... node register-mcclaw.mjs "McClaw Human Terminal"');
  process.exit(1);
}

const wallet = new Wallet(pk);
console.log("Registering wallet:", wallet.address);

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

const base = { wallet_address: wallet.address, name };

// Step 1 — request the challenge to sign.
let r = await post(base);
console.log("Step 1 status:", r.status);

if (r.status === 201 && r.data?.api_key) {
  printKey(r.data.api_key);
  process.exit(0);
}

const challenge = r.data?.challenge;
if (!challenge) {
  console.error("\nNo challenge returned. Server response:\n", JSON.stringify(r.data, null, 2));
  console.error("\nIf it says this wallet is already registered, you need the recover-key flow instead — tell Claude and it'll get you that.");
  process.exit(1);
}

// Step 2 — sign the challenge locally and resubmit.
const signature = await wallet.signMessage(challenge);
r = await post({ ...base, challenge, signature });
console.log("Step 2 status:", r.status);

if (r.status === 201 && r.data?.api_key) {
  printKey(r.data.api_key);
} else {
  console.error("\nRegistration failed. Server response:\n", JSON.stringify(r.data, null, 2));
  process.exit(1);
}

function printKey(key) {
  console.log("\n✅ Your McClaw X-API-Key (save it — shown only once):\n");
  console.log("   " + key + "\n");
  console.log('Paste it into the app field "Paste your McClaw X-API-Key…" to load live tasks.');
}
