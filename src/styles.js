// All app CSS. STYLE + QUIZ_CSS are injected via <style> tags. The bulk is the
// McMatcher design; the StageTrack + AI/ConnectBar blocks at the end are the
// additions that wire the resume/Claude/McClaw features into the same look.
export const STYLE = `
@import url('https://fonts.googleapis.com/css2?family=Anton&family=Hanken+Grotesk:wght@400;500;600;800&family=Jersey+25&family=JetBrains+Mono:wght@400;500;700&family=Pixelify+Sans:wght@400;500;600;700&display=swap');
.root{ --bg:#08120d; --bg2:#0e1f17; --surf:#102a1f; --line:#1d3a2c; --em:#2fd286; --teal:#34d0c4; --gold:#ffd27a; --txt:#eaf3ee; --mut:#8fae9f; --red:#ff8a72;
  background:var(--bg); color:var(--txt); min-height:100vh; font-family:'Hanken Grotesk',system-ui,sans-serif; }

/* hero */
.hero{ position:relative; height:100vh; min-height:560px; overflow:hidden; display:flex; flex-direction:column; background:#04100b;
  background-image:radial-gradient(80% 70% at 70% 18%, #0a2418, transparent 60%), linear-gradient(160deg,#04100b,#06140d 60%,#040f0a); }
.aurora-bg{ position:absolute; inset:0; width:100%; height:100%; z-index:1; pointer-events:none; }
.hero-scrim{ position:absolute; inset:0; z-index:2; pointer-events:none; background:linear-gradient(90deg, rgba(4,12,8,.82) 0%, rgba(4,12,8,.42) 34%, rgba(4,12,8,0) 62%), linear-gradient(0deg, rgba(4,12,8,.55), transparent 42%); }
.hero-reveal{ position:absolute; inset:0; z-index:2; pointer-events:none; overflow:hidden; }
.hr-msg{ position:absolute; transform:translate(-50%,-50%); font-family:'JetBrains Mono',monospace; font-size:13px; letter-spacing:.5px; color:var(--em); white-space:nowrap; text-shadow:0 0 14px rgba(47,210,134,.5); transition:opacity .1s linear; }
.hr-glow{ position:absolute; width:170px; height:170px; transform:translate(-50%,-50%); border-radius:50%; background:radial-gradient(circle, rgba(47,210,134,.09), transparent 70%); }
.hero-art{ position:absolute; inset:0; width:100%; height:100%; }
.hero-grain{ position:absolute; inset:0; opacity:.06; pointer-events:none;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.8' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"); }
.hero-nav{ position:relative; z-index:3; display:flex; align-items:center; gap:24px; padding:24px 36px; }
.hero-logo{ font-family:'Anton'; font-size:24px; letter-spacing:1px; display:flex; align-items:center; gap:9px; }
.hero-logo .lf{ width:16px; height:16px; border-radius:0 50% 50% 50%; background:var(--em); transform:rotate(45deg); }
.hero-links{ display:flex; gap:26px; margin-left:18px; color:#cfe6da; font-size:14px; font-weight:500; }
.hero-links span{ cursor:pointer; opacity:.85; } .hero-links span:hover{ opacity:1; }
@media(max-width:720px){ .hero-links{ display:none; } }
.hero-auth{ margin-left:auto; display:flex; align-items:center; gap:12px; }
.ln{ background:none; border:none; color:#eaf3ee; font-size:14px; font-weight:600; cursor:pointer; }
.su{ background:#eaf3ee; color:#08120d; border:none; border-radius:22px; padding:9px 20px; font-weight:700; font-size:14px; cursor:pointer; }
.su:hover{ background:#fff; }
.hero-logo.mono{ font-family:'JetBrains Mono',monospace !important; font-size:20px; letter-spacing:1px !important; font-weight:700 !important; }
.hero-links.mono span{ font-family:'JetBrains Mono',monospace; font-size:14px; letter-spacing:1px; color:var(--mut); }
.hero-links.mono span:hover{ color:var(--em); opacity:1; }
.hero-links.mono button{ font-family:'JetBrains Mono',monospace; font-size:14px; letter-spacing:1px; color:var(--mut); background:none; border:none; padding:0; cursor:pointer; }
.hero-links.mono button:hover{ color:var(--em); }
.navmodal{ position:fixed; inset:0; z-index:60; background:rgba(4,12,9,.72); backdrop-filter:blur(6px); display:flex; align-items:center; justify-content:center; padding:24px; animation:nmfade .18s ease; }
@keyframes nmfade{ from{ opacity:0; } to{ opacity:1; } }
.navmodal-card{ position:relative; width:min(560px,100%); max-height:86vh; overflow:auto; background:linear-gradient(180deg, rgba(11,33,24,.95), #0a1c14); border:1px solid #244c3a; border-radius:20px; padding:30px; box-shadow:0 40px 90px rgba(0,0,0,.6); animation:nmpop .2s ease; }
@keyframes nmpop{ from{ opacity:0; transform:translateY(10px) scale(.98); } to{ opacity:1; transform:none; } }
.navmodal-x{ position:absolute; top:16px; right:16px; background:var(--surf); border:1px solid var(--line); color:var(--mut); width:34px; height:34px; border-radius:9px; display:grid; place-items:center; cursor:pointer; }
.navmodal-x:hover{ color:var(--txt); border-color:#2b5141; }
.navmodal-tag{ font-family:'JetBrains Mono',monospace; font-size:11px; letter-spacing:2px; color:var(--em); }
.navmodal-h{ font-family:'Jersey 25','Anton',sans-serif; font-weight:400; font-size:40px; letter-spacing:1px; margin:8px 0; }
.navmodal-lead{ color:#c7dcd0; font-size:16px; line-height:1.55; margin:0 0 22px; max-width:46ch; }
.navmodal-body{ display:flex; flex-direction:column; gap:14px; margin-bottom:24px; }
.nm-step{ display:flex; gap:14px; }
.nm-num{ font-family:'JetBrains Mono',monospace; font-size:12px; color:var(--em); padding-top:3px; flex:none; }
.nm-step b{ display:block; font-size:15px; margin-bottom:3px; }
.nm-step .nm-code{ font-family:'JetBrains Mono',monospace; color:var(--em); }
.nm-step span{ color:var(--mut); font-size:14px; line-height:1.5; }
.ln.mono{ font-family:'JetBrains Mono',monospace; font-size:13px; letter-spacing:1px; color:var(--txt); background:none; border:1px solid rgba(255,255,255,.42); border-radius:6px; padding:11px 16px; cursor:pointer; }
.ln.mono:hover{ color:#fff; border-color:#fff; background:rgba(255,255,255,.1); }
.su.mono{ font-family:'JetBrains Mono',monospace; font-size:13px; letter-spacing:1px; background:var(--em); color:#06100b; border:none; border-radius:6px; padding:11px 17px; box-shadow:3px 3px 0 rgba(6,16,11,.55); cursor:pointer; }
.su.mono:hover{ background:#4ce39a; }
.hero-live{ display:inline-flex; align-items:center; gap:9px; font-family:'JetBrains Mono',monospace; font-size:14px; color:#eaf3ee; background:rgba(47,210,134,.12); border:1px solid rgba(47,210,134,.45); border-radius:6px; padding:11px 16px; white-space:nowrap; }
.hero-live b{ color:var(--em); font-weight:700; }
.hl-dot{ width:8px; height:8px; border-radius:50%; background:var(--em); box-shadow:0 0 10px var(--em); animation:hlpulse 1.4s infinite; }
@keyframes hlpulse{ 50%{ opacity:.35; } }
@media(max-width:820px){ .hero-live{ display:none; } }
.hero-body{ position:relative; z-index:3; padding:0 36px; max-width:1240px; margin:0 auto; width:100%; flex:1; display:grid; grid-template-columns:1.05fr .95fr; gap:48px; align-items:start; align-content:center; }
.hero-copy{ min-width:0; }
.hero-term{ min-width:0; }
@media(max-width:900px){ .hero-body{ grid-template-columns:1fr; gap:26px; align-content:start; padding-top:3vh; } .hero-term{ display:none; } }
.hero-kicker{ font-family:'JetBrains Mono',monospace; font-size:12px; letter-spacing:4px; text-transform:uppercase; color:var(--mut); }
.hero-h1{ font-family:'Anton'; font-size:clamp(46px,6.4vw,92px); line-height:.9; margin:14px 0 0; letter-spacing:1px; text-shadow:0 8px 40px rgba(0,0,0,.5); }
.hero-p{ font-size:17px; line-height:1.6; color:#d4e7dd; max-width:520px; margin:22px 0 0; }
.hero-cta{ display:flex; gap:14px; margin-top:30px; flex-wrap:wrap; }
.cta-main{ background:var(--em); color:#06100b; border:none; border-radius:26px; padding:14px 26px; font-family:'JetBrains Mono',monospace; text-transform:uppercase; letter-spacing:1px; font-weight:700; font-size:14px; cursor:pointer; display:inline-flex; align-items:center; gap:8px; box-shadow:0 10px 30px -8px rgba(47,210,134,.5); }
.cta-main:hover{ background:#4ce39a; }
.cta-ghost{ background:rgba(255,255,255,.08); color:#eaf3ee; border:1px solid rgba(255,255,255,.25); border-radius:26px; padding:14px 24px; font-family:'JetBrains Mono',monospace; text-transform:uppercase; letter-spacing:1px; font-weight:700; font-size:14px; cursor:pointer; }
.cta-ghost:hover{ background:rgba(255,255,255,.16); }
.cta-login{ background:transparent; color:#eaf3ee; border:1px solid rgba(255,255,255,.45); border-radius:26px; padding:14px 24px; font-family:'JetBrains Mono',monospace; text-transform:uppercase; letter-spacing:1px; font-weight:700; font-size:14px; cursor:pointer; }
.cta-login:hover{ background:rgba(255,255,255,.1); border-color:#eaf3ee; }
.terminal{ background:rgba(6,16,11,.82); border:1px solid #1c3a2c; border-radius:14px; overflow:hidden; box-shadow:0 30px 70px rgba(0,0,0,.5); backdrop-filter:blur(4px); }
.term-bar{ display:flex; align-items:center; gap:7px; padding:11px 14px; background:rgba(11,27,20,.9); border-bottom:1px solid #173026; }
.term-bar span{ width:11px; height:11px; border-radius:50%; background:#27452f; }
.term-bar span:first-child{ background:#e06c5a; } .term-bar span:nth-child(2){ background:#e0b85a; } .term-bar span:nth-child(3){ background:var(--em); }
.term-bar em{ margin-left:auto; font-style:normal; font-family:'JetBrains Mono',monospace; font-size:11px; color:var(--mut); }
.term-body{ padding:16px 18px 20px; font-family:'JetBrains Mono',monospace; font-size:13px; line-height:1.85; min-height:330px; }
.tl{ white-space:pre-wrap; }
.prompt{ color:var(--em); margin-right:8px; }
.t-cmd{ color:#dbefe4; }
.t-dim{ color:#5c7d6d; }
.t-out{ color:var(--mut); }
.t-cand{ color:#9bd0ff; padding-left:14px; }
.t-ok{ color:var(--em); }
.cursor{ display:inline-block; color:var(--em); animation:tblink 1s steps(1) infinite; }
@keyframes tblink{ 50%{ opacity:0; } }
.board{ background:rgba(6,16,11,.82); border:1px solid #1c3a2c; border-radius:14px; padding:16px; box-shadow:0 30px 70px rgba(0,0,0,.5); backdrop-filter:blur(4px); }
.board-head{ display:flex; align-items:baseline; justify-content:space-between; margin-bottom:12px; }
.bh-title{ display:inline-flex; align-items:center; gap:8px; font-family:'JetBrains Mono',monospace; font-size:11px; letter-spacing:1.5px; color:var(--mut); }
.bh-eq{ display:inline-flex; align-items:flex-end; gap:2px; height:14px; }
.bh-eq i{ width:3px; background:var(--em); border-radius:1px; animation:bheq 5.6s ease-in-out infinite; }
.bh-eq i:nth-child(1){ animation-delay:0s; }
.bh-eq i:nth-child(2){ animation-delay:1.2s; }
.bh-eq i:nth-child(3){ animation-delay:2.4s; }
@keyframes bheq{ 0%,100%{ height:4px; } 50%{ height:14px; } }
.bh-sub{ font-family:'JetBrains Mono',monospace; font-size:10px; color:var(--mut); }
.board-list{ display:flex; flex-direction:column; gap:9px; }
.bcard{ background:#0e1f17; border:1px solid var(--line); border-radius:12px; padding:12px 13px; animation:bslide .4s ease; cursor:pointer; transition:border-color .15s; }
.bcard:hover{ border-color:#2b5141; }
@keyframes bslide{ from{ opacity:0; transform:translateY(-10px); } to{ opacity:1; transform:none; } }
.bc-top{ display:flex; align-items:center; justify-content:space-between; }
.bc-agent{ display:inline-flex; align-items:center; gap:6px; font-family:'JetBrains Mono',monospace; font-size:11px; color:var(--mut); }
.bc-match{ font-family:'JetBrains Mono',monospace; font-size:11px; color:#06100b; background:var(--em); border-radius:20px; padding:2px 9px; font-weight:700; }
.bc-match.t-mid{ background:#9bd0ff; color:#06223a; }
.bc-match.t-lo{ background:#ffd27a; color:#3a2a06; }
.bc-title{ font-size:15px; font-weight:700; margin:9px 0 10px; }
.bc-bot{ display:flex; align-items:center; gap:10px; }
.bc-pay{ font-family:'JetBrains Mono',monospace; font-size:12px; color:var(--gold); }
.bc-cat{ font-family:'JetBrains Mono',monospace; font-size:10px; color:var(--mut); border:1px solid var(--line); border-radius:20px; padding:2px 8px; }
.bc-arrow{ margin-left:auto; color:var(--mut); }
.bcard:hover .bc-arrow{ color:var(--em); }

/* app shell */
.appbar{ position:sticky; top:0; z-index:20; display:flex; align-items:center; gap:6px; padding:0 28px; height:60px; background:rgba(8,18,13,.92); backdrop-filter:blur(8px); border-bottom:1px solid var(--line); }
.ab-logo{ font-family:'Anton'; font-size:21px; letter-spacing:1px; display:flex; align-items:center; gap:8px; margin-right:18px; }
.ab-logo .lf{ width:13px; height:13px; border-radius:0 50% 50% 50%; background:var(--em); transform:rotate(45deg); }
.tab{ background:none; border:none; color:var(--mut); font-size:14.5px; font-weight:600; padding:20px 14px; cursor:pointer; position:relative; }
.tab:hover{ color:var(--txt); }
.tab.on{ color:var(--txt); }
.tab.on::after{ content:''; position:absolute; left:14px; right:14px; bottom:0; height:3px; background:var(--em); border-radius:3px; }
.ab-prof{ margin-left:auto; font-family:'JetBrains Mono',monospace; font-size:12px; color:var(--mut); }
.fgroup-pay{ gap:16px; }
.pay-val{ font-family:'JetBrains Mono',monospace; font-size:13px; color:var(--em); min-width:120px; text-align:right; flex:none; }
.ab-gear{ margin-left:16px; width:34px; height:34px; border-radius:9px; background:transparent; border:1px solid var(--line); color:var(--mut); display:grid; place-items:center; cursor:pointer; flex:none; }
.ab-gear:hover{ color:var(--txt); border-color:#2b5141; }
.ab-gear.on{ color:var(--em); border-color:var(--em); }
.ab-logo.mono{ font-family:'JetBrains Mono',monospace !important; font-size:17px; letter-spacing:1px !important; font-weight:700 !important; }
.appbar.bitmap .tab{ font-family:'JetBrains Mono',monospace; font-size:12px; letter-spacing:1px; padding:20px 10px; }
.appbar.bitmap .tab:hover{ color:var(--em); }
.appbar.bitmap .tab.on{ color:var(--em); }
.appbar.bitmap .tab.on::after{ display:none; }
.tmk{ margin-right:6px; }
.page{ padding:26px 28px 70px; max-width:1180px; margin:0 auto; }
.page-h{ font-family:'Anton'; font-size:30px; letter-spacing:.5px; margin:0 0 18px; text-transform:uppercase; }

/* grid + cards */
.grid{ display:grid; grid-template-columns:repeat(auto-fill,minmax(248px,1fr)); gap:16px; }
.tc{ background:var(--surf); border:1px solid var(--line); border-radius:16px; overflow:hidden; }
.tc.refuse{ opacity:.92; border-color:#5a241c; }
.tc-thumb{ position:relative; aspect-ratio:16/9; display:grid; place-items:center; overflow:hidden; }
.tc-photo{ position:absolute; inset:0; width:100%; height:100%; object-fit:cover; z-index:0; }
.tc-tint{ position:absolute; inset:0; z-index:1; opacity:.45; mix-blend-mode:overlay; }
.tc-scrim{ position:absolute; inset:0; z-index:2; background:linear-gradient(to top, rgba(4,12,8,.72), rgba(4,12,8,.1) 45%, rgba(4,12,8,.28)); }
.tc-ic{ position:absolute; top:9px; left:10px; z-index:3; opacity:.92; filter:drop-shadow(0 1px 4px rgba(0,0,0,.6)); }
.tc-mp{ position:absolute; z-index:3; top:8px; right:8px; background:rgba(0,0,0,.55); color:var(--gold); font-weight:700; font-size:12px; padding:2px 8px; border-radius:7px; }
.tc-tier{ position:absolute; z-index:3; bottom:8px; left:8px; font-family:'JetBrains Mono',monospace; font-size:9.5px; letter-spacing:1px; text-transform:uppercase; padding:2px 7px; border-radius:6px; background:rgba(0,0,0,.5); }
.tc.clickable{ cursor:pointer; transition:transform .12s ease, border-color .12s ease; }
.tc.clickable:hover{ transform:translateY(-2px); border-color:#2b5141; }
.tmodal{ position:fixed; inset:0; z-index:200; background:rgba(2,8,5,.72); backdrop-filter:blur(4px); display:grid; place-items:center; padding:24px; animation:nmpop .18s ease; }
.tmodal-card{ position:relative; width:min(560px,100%); max-height:90vh; overflow:auto; background:#0c1a13; border:1px solid #244c3a; border-radius:20px; box-shadow:0 40px 90px rgba(0,0,0,.6); }
.tmodal-x{ position:absolute; top:12px; right:12px; z-index:5; width:34px; height:34px; border-radius:50%; background:rgba(4,12,8,.6); border:1px solid var(--line); color:var(--txt); display:grid; place-items:center; cursor:pointer; }
.tm-hero{ position:relative; aspect-ratio:21/9; overflow:hidden; display:grid; place-items:center; border-radius:20px 20px 0 0; }
.tm-body{ padding:20px 22px 22px; }
.tm-top{ display:flex; align-items:flex-start; justify-content:space-between; gap:14px; }
.tm-title{ font-size:22px; font-weight:800; margin:0; line-height:1.15; }
.tm-agent{ font-family:'JetBrains Mono',monospace; font-size:13px; color:var(--mut); display:flex; align-items:center; gap:6px; margin-top:7px; }
.tm-match{ font-family:'JetBrains Mono',monospace; font-size:12px; font-weight:700; color:#06100b; background:var(--em); border-radius:20px; padding:4px 10px; white-space:nowrap; flex:none; }
.tm-stats{ display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin:18px 0; }
.tm-stats > div{ background:#0a1a12; border:1px solid var(--line); border-radius:11px; padding:11px 10px; display:flex; flex-direction:column; gap:4px; color:var(--em); }
.tm-stats b{ color:var(--txt); font-size:14px; font-family:'JetBrains Mono',monospace; }
.tm-stats span{ color:var(--mut); font-size:11px; font-family:'JetBrains Mono',monospace; letter-spacing:.5px; text-transform:uppercase; }
.tm-sec{ margin-top:18px; }
.tm-sec h4{ font-family:'JetBrains Mono',monospace; font-size:11px; letter-spacing:1.5px; text-transform:uppercase; color:var(--mut); margin:0 0 9px; }
.tm-sec p{ font-size:14.5px; line-height:1.6; color:#d4e7dd; margin:0 0 8px; }
.tm-skills{ display:flex; flex-wrap:wrap; gap:7px; }
.tm-skill{ font-family:'JetBrains Mono',monospace; font-size:12px; color:var(--mut); background:var(--surf); border:1px solid var(--line); border-radius:20px; padding:4px 11px; }
.tm-req{ font-family:'JetBrains Mono',monospace; font-size:12.5px; color:var(--mut); margin-top:10px; }
.tm-caution{ display:flex; align-items:center; gap:6px; font-size:12.5px; color:var(--red); margin-top:8px; }
.tm-warn{ background:rgba(255,138,114,.08); border:1px solid rgba(255,138,114,.4); border-radius:12px; padding:14px 16px; margin-top:18px; }
.tm-warn b{ display:flex; align-items:center; gap:7px; color:var(--red); font-size:15px; }
.tm-warn p{ font-size:14px; line-height:1.6; color:#d4e7dd; margin:9px 0 0; }
.tc-apply.lg{ width:100%; margin-top:22px; padding:14px; font-size:15px; }
.tier-likely{ color:#2fd286; } .tier-reach{ color:#ffd27a; } .tier-stretch{ color:#9bd0ff; }
.tc-body{ padding:13px 14px 14px; }
.tc-body h3{ font-size:15px; font-weight:800; margin:0 0 5px; line-height:1.25; }
.tc-agent{ font-family:'JetBrains Mono',monospace; font-size:11px; color:var(--mut); display:flex; align-items:center; gap:5px; }
.tc-meta{ display:flex; gap:11px; flex-wrap:wrap; margin:10px 0; font-family:'JetBrains Mono',monospace; font-size:11px; color:var(--mut); }
.tc-meta span{ display:inline-flex; align-items:center; gap:4px; }
.tc-gate{ font-size:11px; color:#9bd0ff; margin-bottom:8px; }
.tc-flag{ font-size:12px; color:var(--red); margin-top:8px; font-weight:600; }
.tc-apply{ width:100%; background:var(--em); color:#06100b; border:none; border-radius:9px; padding:9px; font-weight:800; font-size:13px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; }
.tc-apply:hover{ background:#4ce39a; }
.tc-apply.done{ background:var(--bg2); color:var(--em); border:1px solid var(--line); cursor:default; }

/* tier sections */
.tier-sec{ margin-bottom:30px; }
.tier-head{ display:flex; align-items:center; gap:10px; margin:6px 0 14px; }
.tier-head h2{ font-family:'Anton'; font-size:22px; letter-spacing:.5px; margin:0; }
.ti-likely{ color:#2fd286; } .ti-reach{ color:#ffd27a; } .ti-stretch{ color:#9bd0ff; }
.tier-blurb{ font-size:13px; color:var(--mut); }
.tier-count{ margin-left:auto; font-family:'JetBrains Mono',monospace; font-size:12px; color:var(--mut); }

.filterpanel{ background:linear-gradient(180deg, rgba(16,42,31,.55), rgba(16,42,31,.18)); border:1px solid var(--line); border-radius:18px; padding:16px 16px 18px; margin-bottom:24px; }
.searchrow{ display:flex; align-items:center; gap:10px; background:var(--bg2); border:1px solid var(--line); border-radius:26px; padding:11px 16px; margin-bottom:16px; color:var(--mut); transition:border-color .15s, box-shadow .15s; }
.searchrow:focus-within{ border-color:var(--em); box-shadow:0 0 0 3px rgba(47,210,134,.14); }
.searchrow .s-ic{ flex:none; }
.searchrow input{ background:none; border:none; outline:none; color:var(--txt); flex:1; font-family:'JetBrains Mono',monospace; font-size:14px; letter-spacing:.2px; }
.searchrow input::placeholder{ color:var(--mut); letter-spacing:.2px; }
.s-clear{ background:none; border:none; color:var(--mut); cursor:pointer; display:grid; padding:5px; border-radius:50%; flex:none; }
.s-clear:hover{ color:var(--txt); background:var(--surf); }
.s-mic{ background:var(--surf); border:1px solid var(--line); color:var(--mut); width:34px; height:34px; border-radius:50%; display:grid; place-items:center; cursor:pointer; flex:none; }
.s-mic:hover{ color:var(--em); border-color:var(--em); }
.s-samples{ display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin:11px 0 13px; }
.ss-lbl{ font-family:'JetBrains Mono',monospace; font-size:11px; letter-spacing:1.5px; color:var(--mut); text-transform:uppercase; }
.ss-chip{ background:var(--surf); border:1px solid var(--line); color:var(--mut); border-radius:20px; padding:5px 13px; font-size:13px; cursor:pointer; font-family:'JetBrains Mono',monospace; transition:.12s; }
.ss-chip:hover{ border-color:var(--em); color:var(--em); }
.ss-chip.on{ background:var(--em); color:#06100b; border-color:var(--em); font-weight:600; }
.fgroups{ display:flex; flex-direction:column; gap:13px; overflow:hidden; max-height:520px; margin-top:12px; transition:max-height .3s ease, opacity .25s ease, margin-top .25s ease; }
.fgroups.collapsed{ max-height:0; opacity:0; margin-top:0; }
.filt-toggle{ display:flex; align-items:center; gap:9px; width:100%; background:var(--surf); border:1px solid var(--line); border-radius:12px; padding:11px 15px; color:var(--txt); font-weight:700; cursor:pointer; }
.filt-toggle:hover{ border-color:#2b5141; }
.filt-lbl{ font-family:'JetBrains Mono',monospace; letter-spacing:1px; text-transform:uppercase; font-size:12px; }
.filt-count{ background:var(--em); color:#06100b; border-radius:20px; font-size:10px; padding:1px 7px; font-weight:800; font-family:'JetBrains Mono',monospace; }
.filt-chev{ color:var(--em); margin-left:auto; transition:transform .22s ease; }
.filt-chev.up{ transform:rotate(180deg); }
.fgroup{ display:flex; align-items:center; gap:14px; flex-wrap:wrap; }
.fglabel{ font-family:'JetBrains Mono',monospace; font-size:10px; letter-spacing:1.5px; text-transform:uppercase; color:var(--mut); width:72px; flex:none; }
.fgroup .fbar{ margin-bottom:0; }
.schint{ font-family:'JetBrains Mono',monospace; font-size:10px; color:var(--mut); }
.fbar{ display:flex; gap:9px; margin-bottom:20px; flex-wrap:wrap; }
.fchip{ font-family:'JetBrains Mono',monospace; text-transform:uppercase; letter-spacing:.5px; background:#0d211a; border:1px solid var(--line); color:var(--mut); border-radius:3px; padding:9px 13px; font-size:12px; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:7px; transition:.12s; }
.fchip:hover{ color:var(--em); border-color:var(--em); }
.fchip.on{ background:var(--em); color:#06100b; border-color:var(--em); box-shadow:3px 3px 0 rgba(6,16,11,.55); }
.fchip.f-easy.on{ background:#2fd286; color:#06100b; border-color:#2fd286; }
.fchip.f-mid.on{ background:#ffd27a; color:#3a2a06; border-color:#ffd27a; }
.fchip.f-hard.on{ background:#9bd0ff; color:#06223a; border-color:#9bd0ff; }
.fchip.f-all.on{ background:var(--txt); color:#06100b; border-color:var(--txt); }
.schedrow{ display:flex; gap:14px; align-items:center; flex-wrap:wrap; margin-bottom:20px; }
.switchbar{ display:inline-flex; gap:9px; flex-wrap:wrap; }
.seg{ font-family:'JetBrains Mono',monospace; text-transform:uppercase; letter-spacing:.5px; background:#0d211a; border:1px solid var(--line); color:var(--mut); border-radius:3px; padding:9px 13px; font-size:12px; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:7px; transition:.12s; }
.seg:hover:not(:disabled){ color:var(--em); border-color:var(--em); }
.seg.on{ background:var(--em); color:#06100b; border-color:var(--em); box-shadow:3px 3px 0 rgba(6,16,11,.55); }
.seg:disabled{ opacity:.4; cursor:not-allowed; }

.empty{ background:var(--bg2); border:1px dashed var(--line); border-radius:16px; padding:34px; text-align:center; color:var(--mut); font-size:15px; }
.link{ background:none; border:none; color:var(--em); font-weight:700; cursor:pointer; font-size:15px; }
.empty-or{ color:var(--mut); margin:0 4px; }
.quiz-banner{ display:flex; align-items:center; justify-content:space-between; gap:16px; background:linear-gradient(100deg, rgba(47,210,134,.14), rgba(47,210,134,.04)); border:1px solid rgba(47,210,134,.4); border-radius:14px; padding:14px 16px; margin-bottom:16px; flex-wrap:wrap; }
.qb-left{ display:flex; align-items:center; gap:12px; }
.qb-ic{ color:var(--em); flex:none; }
.qb-left b{ display:block; font-size:15px; }
.qb-left span{ display:block; font-size:13px; color:var(--mut); margin-top:2px; }
.qb-btn{ display:inline-flex; align-items:center; gap:7px; background:var(--em); color:#06100b; border:none; border-radius:22px; padding:11px 18px; font-family:'JetBrains Mono',monospace; text-transform:uppercase; letter-spacing:.5px; font-weight:700; font-size:13px; cursor:pointer; white-space:nowrap; }
.qb-btn:hover{ background:#4ce39a; }

.applied-list{ display:flex; flex-direction:column; gap:10px; }
.db-stats{ display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-bottom:16px; }
.db-stats > div{ background:var(--bg2); border:1px solid var(--line); border-radius:12px; padding:14px 16px; }
.db-stats b{ font-family:'JetBrains Mono',monospace; font-size:26px; display:block; }
.db-stats span{ font-size:12px; color:var(--mut); }
.db-table{ background:var(--bg2); border:1px solid var(--line); border-radius:14px; overflow:hidden; }
.db-th,.db-tr{ display:grid; grid-template-columns:2.2fr 1.3fr .9fr 1fr .8fr 22px; gap:12px; padding:13px 18px; align-items:center; }
.db-th{ font-family:'JetBrains Mono',monospace; font-size:11px; letter-spacing:1px; text-transform:uppercase; color:var(--mut); border-bottom:1px solid var(--line); }
.db-tr{ border-top:1px solid var(--line); font-size:14px; cursor:pointer; transition:background .12s, box-shadow .12s; }
.db-tr:first-of-type{ border-top:none; }
.db-tr:hover{ background:var(--surf); box-shadow:inset 3px 0 0 var(--em); }
.db-tr:focus-visible{ outline:none; background:var(--surf); box-shadow:inset 3px 0 0 var(--em); }
.db-go{ color:var(--mut); opacity:0; transform:translateX(-4px); transition:opacity .14s, transform .14s; justify-self:end; display:flex; }
.db-tr:hover .db-go,.db-tr:focus-visible .db-go{ opacity:1; transform:translateX(0); color:var(--em); }
.db-task{ font-weight:600; }
.db-mut{ font-family:'JetBrains Mono',monospace; font-size:12px; color:var(--mut); }
.db-pay{ font-family:'JetBrains Mono',monospace; font-size:12px; color:var(--gold); }
.db-st{ font-family:'JetBrains Mono',monospace; font-size:12px; display:inline-flex; align-items:center; gap:7px; }
.db-dot{ width:8px; height:8px; border-radius:50%; flex:none; }
@media(max-width:680px){ .db-stats{ grid-template-columns:repeat(3,1fr); } .db-th{ display:none; } .db-tr{ grid-template-columns:1fr auto; gap:4px 12px; } .db-go{ display:none; } .db-tr .db-mut:nth-of-type(2){ display:none; } }
.jobs{ display:flex; flex-direction:column; gap:14px; }
.job{ background:var(--bg2); border:1px solid var(--line); border-radius:16px; padding:18px 20px; }
.job-top{ display:flex; align-items:flex-start; justify-content:space-between; gap:14px; }
.job-title{ font-size:18px; font-weight:800; margin:0; }
.job-agent{ font-family:'JetBrains Mono',monospace; font-size:12.5px; color:var(--mut); display:flex; align-items:center; gap:6px; margin-top:6px; }
.job-status{ font-family:'JetBrains Mono',monospace; font-size:11px; letter-spacing:.5px; text-transform:uppercase; border:1px solid; border-radius:20px; padding:4px 11px; white-space:nowrap; flex:none; }
.job-bar{ height:6px; background:#0a1a12; border-radius:4px; overflow:hidden; margin:14px 0; }
.job-bar span{ display:block; height:100%; border-radius:4px; transition:width .3s ease; }
.job-meta{ display:flex; flex-wrap:wrap; gap:16px; font-family:'JetBrains Mono',monospace; font-size:12.5px; color:var(--mut); margin-bottom:16px; }
.job-meta span{ display:inline-flex; align-items:center; gap:6px; }
.job-meta span:first-child{ color:var(--gold); }
.job-actions{ display:flex; align-items:center; gap:12px; flex-wrap:wrap; }
.job-go{ background:var(--em); color:#06100b; border:none; border-radius:22px; padding:11px 20px; font-weight:700; font-size:14px; cursor:pointer; }
.job-go:hover{ background:#4ce39a; }
.job-paid{ display:inline-flex; align-items:center; gap:7px; color:var(--em); font-family:'JetBrains Mono',monospace; font-size:13px; }
.job-msg{ display:inline-flex; align-items:center; gap:7px; background:var(--surf); color:var(--txt); border:1px solid var(--line); border-radius:22px; padding:11px 16px; font-size:13px; font-weight:600; cursor:pointer; }
.job-msg:hover{ border-color:#2b5141; }
.ap-row{ display:flex; align-items:center; gap:14px; background:var(--surf); border:1px solid var(--line); border-radius:14px; padding:14px 16px; }
.ap-ic{ width:42px; height:42px; border-radius:11px; display:grid; place-items:center; flex:none; }
.ap-main b{ font-size:15px; } .ap-main span{ display:block; font-family:'JetBrains Mono',monospace; font-size:11px; color:var(--mut); margin-top:3px; }
.ap-status{ margin-left:auto; font-family:'JetBrains Mono',monospace; font-size:12px; color:var(--gold); }

/* profile */
.prof-h{ font-family:'Anton'; font-size:32px; letter-spacing:.5px; margin:0; text-transform:uppercase; }
.prof-sub{ color:var(--mut); font-size:14px; margin:6px 0 22px; }
.prof-grid{ display:grid; grid-template-columns:1fr 1fr; gap:26px; }
@media(max-width:780px){ .prof-grid{ grid-template-columns:1fr; } }

/* ---------- responsive pass ---------- */
/* hidden lore only shows on the wide two-column hero, where the top/bottom bands are reliably empty */
@media(max-width:900px){ .hero-reveal{ display:none; } }
@media(max-width:820px){
  .appbar{ padding:0 12px; gap:0; overflow-x:auto; -webkit-overflow-scrolling:touch; }
  .appbar::-webkit-scrollbar{ display:none; }
  .ab-prof{ display:none; }
  .ab-gear{ margin-left:auto; }
  .appbar.bitmap .tab{ padding:18px 8px; font-size:11px; letter-spacing:.5px; white-space:nowrap; }
  .ab-logo{ white-space:nowrap; flex:none; }
  .page{ padding:20px 16px 64px; }
  .tm-stats{ grid-template-columns:repeat(2,1fr); }
}
@media(max-width:640px){
  .hero-nav{ padding:16px 18px; gap:10px; }
  .hero-body{ padding:0 20px; }
  .hero-p{ font-size:16px; }
  .hero-cta{ gap:10px; }
  .cta-main,.cta-login,.cta-ghost{ padding:13px 18px; font-size:13px; }
  .su.mono{ padding:10px 13px; font-size:12px; }
  .ln.mono{ padding:10px 13px; font-size:12px; }
  .frow{ flex-direction:column; align-items:stretch; gap:8px; }
  .frow-lbl{ width:auto; }
  .fgroup-pay{ flex-direction:column; align-items:stretch; gap:8px; }
  .pay-val{ text-align:left; min-width:0; }
  .sc-row{ flex-wrap:wrap; }
  .sc-row > div{ min-width:0; }
  .prof-head{ top:0; }
  .tm-top{ flex-direction:column; }
  .page-h{ font-size:26px; }
}
@media(max-width:380px){
  .hero-auth{ gap:8px; }
  .ln.mono{ display:none; }
  .tm-stats{ grid-template-columns:1fr 1fr; }
}
.lbl{ font-family:'JetBrains Mono',monospace; font-size:10px; letter-spacing:1.5px; text-transform:uppercase; color:var(--mut); margin:18px 0 7px; }
.prof-col > .lbl:first-child{ margin-top:0; }
.ta{ width:100%; box-sizing:border-box; min-height:150px; background:var(--bg2); border:1px solid var(--line); border-radius:11px; padding:12px; color:var(--txt); font-family:'JetBrains Mono',monospace; font-size:12.5px; resize:vertical; }
.inp{ width:100%; box-sizing:border-box; background:var(--bg2); border:1px solid var(--line); border-radius:9px; padding:9px 12px; color:var(--txt); font-size:14px; }
.inline{ display:flex; gap:9px; align-items:center; }
.toggle{ display:inline-flex; align-items:center; gap:8px; font-size:14px; margin-top:12px; }
.pillrow{ display:flex; flex-wrap:wrap; gap:8px; }
.pill{ background:var(--bg2); border:1px solid var(--line); color:var(--mut); border-radius:10px; padding:9px 14px; font-size:13px; font-weight:600; cursor:pointer; display:inline-flex; flex-direction:column; align-items:center; gap:1px; min-width:46px; }
.pill small{ font-family:'JetBrains Mono',monospace; font-size:9px; opacity:.7; font-weight:400; }
.pill:hover{ color:var(--txt); border-color:#2b5141; }
.pill.on{ background:var(--em); color:#06100b; border-color:var(--em); }
.pill.on small{ opacity:.85; }
.pill.cat{ flex-direction:row; gap:7px; min-width:auto; padding:9px 13px; }
.cat-tag{ display:inline-block; margin-top:8px; font-family:'JetBrains Mono',monospace; font-size:9px; letter-spacing:1px; text-transform:uppercase; color:var(--mut); border:1px solid var(--line); border-radius:5px; padding:2px 7px; }
.cgp{ margin:4px 0 10px; }
.cgp-desc{ font-size:14px; line-height:1.55; color:var(--mut); max-width:66ch; margin:6px 0 16px; }
.cgp-topbar{ display:flex; align-items:center; gap:9px; flex-wrap:wrap; margin-bottom:16px; }
.cgp-toplbl{ font-family:'JetBrains Mono',monospace; font-size:10px; letter-spacing:1.5px; text-transform:uppercase; color:var(--gold); display:inline-flex; align-items:center; gap:5px; }
.cgp-topchip{ display:inline-flex; align-items:center; gap:6px; background:rgba(255,210,122,.08); border:1px solid rgba(255,210,122,.32); color:var(--gold); border-radius:20px; padding:6px 12px; font-size:13px; font-weight:600; cursor:pointer; }
.cgp-topchip i{ font-style:normal; font-family:'JetBrains Mono',monospace; font-size:10px; opacity:.8; }
.cgp-topchip.on{ background:var(--em); border-color:var(--em); color:#06100b; }
.cgp-grid{ display:grid; grid-template-columns:repeat(auto-fill,minmax(228px,1fr)); gap:12px; }
.cgp-card{ position:relative; text-align:left; background:var(--surf); border:1px solid var(--line); border-radius:14px; padding:15px; cursor:pointer; transition:.15s; }
.cgp-card:hover{ border-color:#2b5141; }
.cgp-card.on{ border-color:var(--em); box-shadow:0 0 0 1px var(--em) inset; }
.cgp-h{ display:flex; justify-content:space-between; align-items:center; color:var(--em); }
.cgp-open{ font-family:'JetBrains Mono',monospace; font-size:10px; color:var(--mut); }
.cgp-card.on .cgp-open{ visibility:hidden; }
.cgp-card b{ display:block; font-size:16px; margin:10px 0 5px; }
.cgp-card p{ font-size:12.5px; line-height:1.5; color:var(--mut); margin:0; }
.cgp-check{ position:absolute; top:12px; right:12px; background:var(--em); color:#06100b; border-radius:50%; width:22px; height:22px; display:grid; place-items:center; }
.cgp-free{ width:100%; box-sizing:border-box; min-height:84px; background:var(--bg2); border:1px solid var(--line); border-radius:12px; padding:12px 14px; color:var(--txt); font-family:'Hanken Grotesk',system-ui,sans-serif; font-size:14px; resize:vertical; }
.cgp-free::placeholder{ color:var(--mut); }
.cgp-free:focus{ outline:none; border-color:var(--em); }
.cgp-topbar.bottom{ margin:18px 0 0; }
.whenhint{ font-size:12px; color:var(--mut); margin-bottom:10px; }
.wg{ display:grid; grid-template-columns:34px repeat(7,1fr); gap:3px; user-select:none; touch-action:none; max-width:560px; }
.wg-h{ font-family:'JetBrains Mono',monospace; font-size:10px; color:var(--mut); text-align:center; padding-bottom:3px; }
.wg-hr{ font-family:'JetBrains Mono',monospace; font-size:9px; color:var(--mut); display:flex; align-items:center; justify-content:flex-end; padding-right:5px; }
.wg-cell{ height:15px; background:var(--bg2); border:1px solid var(--line); border-radius:3px; cursor:pointer; }
.wg-cell:hover{ border-color:#2b5141; }
.wg-cell.on{ background:var(--em); border-color:var(--em); }
.chips2{ display:flex; flex-wrap:wrap; gap:6px; margin-top:9px; }
.chip2{ background:var(--bg2); border:1px solid var(--line); border-radius:8px; padding:4px 9px; font-family:'JetBrains Mono',monospace; font-size:12px; color:#cfe6da; display:inline-flex; gap:6px; align-items:center; }
.chip2 button{ background:none; border:none; cursor:pointer; color:var(--mut); display:grid; padding:0; }
.btn{ background:var(--em); color:#06100b; border:none; border-radius:10px; padding:10px 16px; font-weight:800; font-size:14px; cursor:pointer; display:inline-flex; align-items:center; gap:7px; }
.btn:hover{ background:#4ce39a; } .btn:disabled{ opacity:.45; cursor:default; }
.btn-ghost{ background:var(--bg2); color:var(--txt); border:1px solid var(--line); border-radius:10px; padding:9px 14px; font-weight:700; font-size:14px; cursor:pointer; display:inline-flex; align-items:center; gap:7px; }
.settings{ max-width:1040px; }
.settings-grid{ display:grid; grid-template-columns:1fr 1fr; gap:14px; align-items:start; }
.settings-grid .sc{ margin-bottom:0; }
.sc.danger{ grid-column:1 / -1; }
@media(max-width:760px){ .settings-grid{ grid-template-columns:1fr; } }
.sc{ background:var(--bg2); border:1px solid var(--line); border-radius:16px; padding:18px 20px; margin-bottom:14px; }
.sc-head{ display:flex; align-items:center; gap:9px; font-family:'JetBrains Mono',monospace; font-size:12px; letter-spacing:1.5px; text-transform:uppercase; color:var(--em); margin-bottom:14px; }
.sc-row{ display:flex; align-items:center; justify-content:space-between; gap:16px; padding:12px 0; border-top:1px solid var(--line); }
.sc-row:first-of-type{ border-top:none; padding-top:0; }
.sc-row b{ display:block; font-size:15px; }
.sc-row span{ display:block; font-size:13px; color:var(--mut); margin-top:2px; }
.sc-field{ padding:12px 0; border-top:1px solid var(--line); }
.sc-field label{ display:block; font-family:'JetBrains Mono',monospace; font-size:11px; letter-spacing:1px; text-transform:uppercase; color:var(--mut); margin-bottom:7px; }
.sc-field input{ width:100%; background:#0a1a12; border:1px solid var(--line); border-radius:10px; padding:11px 13px; color:var(--txt); font-size:15px; font-family:'Hanken Grotesk',sans-serif; }
.sc-field input:focus{ outline:none; border-color:var(--em); }
.sc-tag{ font-family:'JetBrains Mono',monospace; font-size:11px; color:var(--em); border:1px solid rgba(47,210,134,.4); border-radius:20px; padding:3px 10px; }
.btn-ghost.sm{ padding:7px 13px; font-size:13px; }
.tgl{ width:46px; height:26px; border-radius:20px; background:#23402f; border:1px solid var(--line); position:relative; cursor:pointer; flex:none; transition:.18s; }
.tgl.on{ background:var(--em); border-color:var(--em); }
.tgl-knob{ position:absolute; top:2px; left:2px; width:20px; height:20px; border-radius:50%; background:#eaf3ee; transition:.18s; }
.tgl.on .tgl-knob{ left:22px; background:#06100b; }
.sc.danger{ border-color:rgba(255,138,114,.35); }
.sc.danger .sc-head{ color:var(--red); }
.btn-danger{ background:rgba(255,138,114,.12); color:var(--red); border:1px solid rgba(255,138,114,.45); border-radius:10px; padding:9px 16px; font-weight:700; font-size:14px; cursor:pointer; }
.btn-danger:hover{ background:rgba(255,138,114,.2); }
.note{ font-family:'JetBrains Mono',monospace; font-size:10.5px; color:var(--mut); margin-top:8px; }
.prof-foot{ display:flex; align-items:center; gap:14px; margin-top:26px; }
.save{ padding:12px 26px; }
/* bitmap/LED display layer — display elements only, body stays legible */
.hero-logo, .hero-h1, .ab-logo, .page-h, .prof-h, .tier-head h2{ font-family:'Jersey 25','Anton',sans-serif !important; letter-spacing:1.5px; font-weight:400 !important; }
.hero-h1{ line-height:.92 !important; }
.prof-head{ display:flex; justify-content:space-between; align-items:flex-start; gap:16px; position:sticky; top:60px; background:var(--bg); z-index:10; padding:12px 0 14px; border-bottom:1px solid var(--line); margin-bottom:10px; }
.save-top{ padding:12px 24px; font-size:15px; white-space:nowrap; box-shadow:0 8px 24px -10px rgba(47,210,134,.5); }
.save-wrap{ display:flex; flex-direction:column; align-items:flex-end; gap:6px; }
.save-top.req{ animation:savepulse 1.8s ease-in-out infinite; }
@keyframes savepulse{ 0%,100%{ box-shadow:0 8px 24px -10px rgba(47,210,134,.5); } 50%{ box-shadow:0 0 0 4px rgba(47,210,134,.22), 0 8px 24px -10px rgba(47,210,134,.7); } }
.save-note{ display:inline-flex; align-items:center; gap:7px; font-family:'JetBrains Mono',monospace; font-size:11px; letter-spacing:.5px; color:var(--gold); }
.sn-dot{ width:7px; height:7px; border-radius:50%; background:var(--gold); box-shadow:0 0 8px var(--gold); animation:savepulse 1.8s ease-in-out infinite; }
.btn-ghost.connected{ border-color:var(--em); color:var(--em); }

/* ===== StageTrack (job progress in Working on) ===== */
.db-none{ padding:22px 18px; color:var(--mut); font-size:14px; }
.job-note{ font-size:12.5px; color:var(--mut); display:flex; align-items:center; gap:7px; margin-bottom:16px; }
.stages{ display:flex; align-items:flex-start; margin:18px 2px 14px; }
.stage-node{ display:flex; flex-direction:column; align-items:center; flex:0 0 auto; width:64px; }
.stage-dot{ width:18px; height:18px; border-radius:50%; box-sizing:border-box; border:2px solid #2b4638; background:transparent; display:flex; align-items:center; justify-content:center; transition:all .25s ease; }
.stage-dot.done{ background:var(--em); border-color:var(--em); }
.stage-dot.on{ border:none; }
.stage-node em{ font-style:normal; font-size:10.5px; line-height:1.2; color:#5e7a6c; margin-top:7px; text-align:center; transition:color .25s ease; }
.stage-node em.cur{ color:var(--txt); font-weight:600; }
.stage-link{ flex:1; height:2px; background:rgba(255,255,255,.08); margin-top:8px; transition:background .25s ease; }
.stage-link.fill{ background:var(--em); }

/* ===== ConnectBar (Claude + McClaw keys) and AI card content ===== */
.page-sub{ font-family:'JetBrains Mono',monospace; font-size:13px; color:var(--mut); margin-left:10px; letter-spacing:0; }
.matchbar{ display:flex; align-items:center; gap:12px; flex-wrap:wrap; padding:12px 28px; background:rgba(14,31,23,.6); border-bottom:1px solid var(--line); }
.mb-status{ font-family:'JetBrains Mono',monospace; font-size:12px; color:var(--em); display:inline-flex; align-items:center; gap:6px; white-space:nowrap; }
.mb-status.off{ color:var(--mut); }
.mb-key{ flex:1; min-width:200px; max-width:520px; }
.mb-sep{ width:1px; align-self:stretch; background:var(--line); margin:0 4px; }
.mb-select{ background:var(--bg2); border:1px solid var(--line); color:var(--txt); border-radius:9px; padding:8px 10px; font-size:13px; cursor:pointer; }
.mb-prog{ height:6px; background:var(--bg2); border:1px solid var(--line); border-radius:99px; overflow:hidden; width:160px; }
.mb-prog > div{ height:100%; background:var(--em); transition:width .2s; }
.tc-ai-badge{ position:absolute; z-index:3; top:8px; left:8px; background:rgba(0,0,0,.55); color:#9bd0ff; font-family:'JetBrains Mono',monospace; font-size:9px; letter-spacing:1px; padding:2px 7px; border-radius:6px; }
.tc-ai{ margin:8px 0 2px; }
.tc-oneliner{ font-size:12.5px; font-weight:700; color:var(--txt); margin:0 0 4px; }
.tc-rationale{ font-size:11.5px; line-height:1.5; color:#cfe6da; margin:0; }
.tc-chips{ display:flex; flex-wrap:wrap; gap:5px; margin-top:8px; }
.tc-chip{ font-family:'JetBrains Mono',monospace; font-size:10px; padding:2px 6px; border-radius:6px; display:inline-flex; align-items:center; gap:3px; }
.tc-chip.have{ background:rgba(47,210,134,.14); color:var(--em); border:1px solid #1f5a40; }
.tc-chip.miss{ background:rgba(255,255,255,.04); color:var(--mut); border:1px solid var(--line); }
.tm-ai{ background:rgba(155,208,255,.06); border:1px solid rgba(155,208,255,.28); border-radius:12px; padding:13px 15px; margin-top:18px; }
.tm-ai b{ display:flex; align-items:center; gap:7px; color:#9bd0ff; font-size:13px; font-family:'JetBrains Mono',monospace; letter-spacing:.5px; text-transform:uppercase; margin-bottom:8px; }
.tm-ai p{ font-size:14px; line-height:1.6; color:#d4e7dd; margin:0; }
.spin{ animation:spin 1s linear infinite; }
@keyframes spin{ to{ transform:rotate(360deg); } }
@media(max-width:640px){ .matchbar{ padding:12px 16px; } }
`;

export const QUIZ_CSS = `
.quiz-wrap{ min-height:100vh; display:flex; flex-direction:column; background:radial-gradient(70% 60% at 50% 0%, #0a2418, transparent 60%), linear-gradient(160deg,#04100b,#06140d); color:var(--txt); }
.quiz-top{ display:flex; align-items:center; justify-content:space-between; padding:22px 36px; }
.quiz-logo{ font-family:'JetBrains Mono',monospace; font-size:19px; font-weight:700; letter-spacing:1px; }
.quiz-skip{ display:inline-flex; align-items:center; gap:7px; background:none; border:none; color:var(--mut); font-family:'JetBrains Mono',monospace; font-size:13px; letter-spacing:.5px; cursor:pointer; }
.quiz-skip:hover{ color:var(--txt); }
.quiz-stage{ flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:10px 20px 50px; }
.quiz-card{ width:100%; max-width:680px; background:rgba(6,16,11,.7); border:1px solid var(--line); border-radius:18px; padding:30px 32px 26px; box-shadow:0 30px 80px rgba(0,0,0,.45); }
.quiz-progress{ height:5px; border-radius:4px; background:#143226; overflow:hidden; margin-bottom:18px; }
.quiz-progress span{ display:block; height:100%; background:var(--em); border-radius:4px; transition:width .35s ease; }
.quiz-step{ font-family:'JetBrains Mono',monospace; font-size:12px; letter-spacing:2px; color:var(--em); }
.quiz-q{ font-family:'Jersey 25',sans-serif; font-weight:400; text-transform:uppercase; letter-spacing:.5px; font-size:30px; line-height:1.05; margin:10px 0 6px; }
.quiz-sub{ color:var(--mut); font-size:15px; margin:0 0 22px; }
.quiz-rate{ display:flex; flex-direction:column; gap:9px; }
.qr-row{ display:flex; align-items:center; justify-content:space-between; gap:14px; background:#0e1f17; border:1px solid var(--line); border-radius:11px; padding:10px 13px; }
.qr-cat{ font-size:15px; font-weight:600; }
.qr-dots{ display:flex; gap:6px; }
.qr-dot{ width:34px; height:34px; border-radius:9px; border:1px solid var(--line); background:#0a1a12; color:var(--mut); font-family:'JetBrains Mono',monospace; font-size:13px; cursor:pointer; transition:.12s; }
.qr-dot:hover{ border-color:var(--em); }
.qr-dot.on{ background:var(--em); color:#06100b; border-color:var(--em); font-weight:700; }
.quiz-chips{ display:flex; flex-wrap:wrap; gap:9px; }
.quiz-chip{ background:#0e1f17; border:1px solid var(--line); border-radius:10px; padding:10px 14px; font-size:14px; color:var(--txt); cursor:pointer; transition:.12s; font-family:'JetBrains Mono',monospace; }
.quiz-chip:hover{ border-color:var(--em); }
.quiz-chip.on{ background:var(--em); color:#06100b; border-color:var(--em); box-shadow:3px 3px 0 rgba(6,16,11,.4); font-weight:600; }
.quiz-opts{ display:flex; flex-direction:column; gap:10px; }
.quiz-opt{ display:flex; align-items:center; gap:13px; text-align:left; background:#0e1f17; border:1px solid var(--line); border-radius:12px; padding:15px 16px; font-size:16px; color:var(--txt); cursor:pointer; transition:.12s; }
.quiz-opt:hover{ border-color:var(--em); }
.quiz-opt.on{ border-color:var(--em); background:rgba(47,210,134,.1); }
.qo-dot{ width:16px; height:16px; border-radius:50%; border:2px solid var(--mut); flex:none; }
.quiz-opt.on .qo-dot{ border-color:var(--em); background:var(--em); box-shadow:inset 0 0 0 3px #0e1f17; }
.quiz-input{ width:100%; background:#0e1f17; border:1px solid var(--line); border-radius:12px; padding:15px 16px; font-size:16px; color:var(--txt); font-family:'Hanken Grotesk',sans-serif; }
.quiz-input:focus{ outline:none; border-color:var(--em); }
.quiz-nav{ display:flex; align-items:center; justify-content:space-between; margin-top:26px; }
.quiz-back{ background:none; border:none; color:var(--mut); font-size:14px; cursor:pointer; }
.quiz-back:hover{ color:var(--txt); }
.quiz-next{ background:var(--em); color:#06100b; border:none; border-radius:24px; padding:13px 26px; font-family:'JetBrains Mono',monospace; text-transform:uppercase; letter-spacing:1px; font-weight:700; font-size:14px; cursor:pointer; box-shadow:0 10px 30px -8px rgba(47,210,134,.5); }
.quiz-next:hover{ background:#4ce39a; }
.quiz-foot{ color:var(--mut); font-size:13px; margin-top:18px; text-align:center; }
@media(max-width:560px){ .qr-dot{ width:28px; height:28px; } .quiz-card{ padding:24px 18px; } }
`;
