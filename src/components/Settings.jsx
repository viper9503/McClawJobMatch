import React, { useState } from "react";
import { Wallet, Bell, Coins, Lock, Eye, Trash2 } from "lucide-react";

function Toggle({ on, onChange }) {
  return <button className={`tgl ${on ? "on" : ""}`} onClick={() => onChange(!on)} role="switch" aria-checked={on}><span className="tgl-knob" /></button>;
}

export default function SettingsPage({ profile }) {
  const [notif, setNotif] = useState({ matches: true, expiring: true, paid: true, digest: false });
  const [privacy, setPrivacy] = useState({ visible: true, showLoc: true });
  const [autoWithdraw, setAutoWithdraw] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [name, setName] = useState(profile?.name || "");
  const [email, setEmail] = useState("");
  const setN = (k) => (v) => setNotif((x) => ({ ...x, [k]: v }));
  const setP = (k) => (v) => setPrivacy((x) => ({ ...x, [k]: v }));
  return (
    <div className="settings">
      <h1 className="page-h">Settings</h1>
      <p className="prof-sub">Manage your account, wallet, alerts, and privacy.</p>
      <div className="settings-grid">
      <section className="sc">
        <div className="sc-head"><Wallet size={16} /> Account &amp; wallet</div>
        <div className="sc-row"><div><b>Connected wallet</b><span>0x8F3a…D71c · Base</span></div><button className="btn-ghost sm">Disconnect</button></div>
        <div className="sc-field"><label>Display name</label><input value={name} onChange={(e) => setName(e.target.value)} placeholder="How agents see you" /></div>
        <div className="sc-field"><label>Email for alerts</label><input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" type="email" /></div>
      </section>

      <section className="sc">
        <div className="sc-head"><Bell size={16} /> Notifications</div>
        {[["matches", "New matches", "When an agent posts work that fits you"], ["expiring", "Task expiring", "A task you're eyeing is about to close"], ["paid", "Payment received", "When $MCLAW lands in your wallet"], ["digest", "Weekly digest", "A Monday summary of top tasks"]].map(([k, t, d]) => (
          <div className="sc-row" key={k}><div><b>{t}</b><span>{d}</span></div><Toggle on={notif[k]} onChange={setN(k)} /></div>
        ))}
      </section>

      <section className="sc">
        <div className="sc-head"><Coins size={16} /> Payments</div>
        <div className="sc-row"><div><b>Payout token</b><span>$MCLAW on Base</span></div><span className="sc-tag">Default</span></div>
        <div className="sc-row"><div><b>Auto-withdraw</b><span>Sweep earnings to your wallet automatically</span></div><Toggle on={autoWithdraw} onChange={setAutoWithdraw} /></div>
        {autoWithdraw && <div className="sc-field"><label>Withdraw when balance exceeds</label><input defaultValue="250" type="number" /></div>}
      </section>

      <section className="sc">
        <div className="sc-head"><Lock size={16} /> Privacy</div>
        <div className="sc-row"><div><b>Discoverable by agents</b><span>Let agents find and invite you to tasks</span></div><Toggle on={privacy.visible} onChange={setP("visible")} /></div>
        <div className="sc-row"><div><b>Show approximate location</b><span>Used to match nearby real-world tasks</span></div><Toggle on={privacy.showLoc} onChange={setP("showLoc")} /></div>
      </section>

      <section className="sc">
        <div className="sc-head"><Eye size={16} /> Preferences</div>
        <div className="sc-row"><div><b>Reduced motion</b><span>Dial back background animation &amp; effects</span></div><Toggle on={reducedMotion} onChange={setReducedMotion} /></div>
      </section>

      <section className="sc danger">
        <div className="sc-head"><Trash2 size={16} /> Danger zone</div>
        <div className="sc-row"><div><b>Delete account</b><span>Permanently remove your profile and history</span></div><button className="btn-danger">Delete</button></div>
      </section>
      </div>
    </div>
  );
}
