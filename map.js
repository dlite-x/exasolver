// AI value chain map. Needs data.js loaded first and the map markup in the page; call VCMap.mount() once visible.
window.VCMap = (() => {
  const { stages, edges, companies, regions, phases, columns } = window.VC;
  const NS = "http://www.w3.org/2000/svg";
  const COLX = [20, 196, 372, 548, 770, 962, 1138, 1314, 1490, 1670];
  const NODE_W = 136, VIEW_W = 1780, VIEW_H = 760;
  const LEVELS = ["open", "some friction", "tight", "severe", "single point of failure"];

  const st = { companies: false, choke: false, money: false, zoom: 1, userZoomed: false,
               hoverNode: null, selNode: null, hoverCo: null, pinCo: null };

  const byId = Object.fromEntries(stages.map(s => [s.id, s]));
  const coById = Object.fromEntries(companies.map(c => [c.id, c]));
  stages.forEach(s => (s.cos = []));
  const regionOrder = Object.keys(regions);
  companies.forEach(c => Object.keys(c.at).forEach(sid => {
    if (byId[sid]) byId[sid].cos.push(c); else console.warn(`Unknown stage "${sid}" for ${c.name}`);
  }));
  stages.forEach(s => s.cos.sort((a, b) => regionOrder.indexOf(a.region) - regionOrder.indexOf(b.region) || a.name.localeCompare(b.name)));

  // An edge can be goods-only (pay: "none" in money mode), money-only (only: "money"), or paid by its first stage (pay: "from").
  const shown = e => (st.money ? e.pay !== "none" : e.only !== "money");
  const payer = e => (e.pay === "from" ? e.from : e.to), payee = e => (e.pay === "from" ? e.to : e.from);
  const graphs = {};
  const graph = () => {
    const k = st.money ? "money" : "goods";
    if (!graphs[k]) { const fwd = {}, rev = {}; edges.filter(shown).forEach(e => { (fwd[e.from] ??= []).push(e.to); (rev[e.to] ??= []).push(e.from); }); graphs[k] = { fwd, rev }; }
    return graphs[k];
  };
  const reach = (id, g) => { const seen = new Set(), q = [id]; while (q.length) for (const m of g[q.pop()] || []) if (!seen.has(m)) { seen.add(m); q.push(m); } return seen; };

  const $ = s => document.querySelector(s);
  const svg = $("#map"), wrap = $("#wrap"), tip = $("#tip"), drawer = $("#drawer"), panel = $("#panel");
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const el = (tag, attrs = {}, parent) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  };
  const chokeVar = lv => `var(--c${lv})`;

  // ── Legend & search list ──────────────────────
  const legReg = $("#legReg");
  for (const k of regionOrder) legReg.insertAdjacentHTML("beforeend", `<span class="sw"><i style="background:${regions[k].color}"></i>${esc(regions[k].label)}</span>`);
  $("#colist").innerHTML = companies.map(c => `<option value="${esc(c.name)}">`).join("");

  // ── Layout ────────────────────────────────────
  function layout() {
    for (const s of stages) {
      s.x = COLX[s.col];
      s.w = s.kind === "sink" ? 88 : NODE_W;
      s.h = s.kind === "sink" ? 340 : (st.companies && s.kind !== "process" ? 82 : 52);
      s.cy = s.y + s.h / 2;
    }
  }

  function ports() {
    // Spread multiple wires on the same side of a node so they don't stack.
    const out = {}, inn = {};
    edges.forEach((e, i) => {
      const a = byId[e.from], b = byId[e.to];
      e.vertical = a.col === b.col && !e.side;
      if (e.vertical || e.side || (e.only === "money" && !st.money)) return;
      (out[e.from] ??= []).push(i); (inn[e.to] ??= []).push(i);
    });
    const spread = (list, node, other) => {
      list.sort((i, j) => byId[edges[i][other]].cy - byId[edges[j][other]].cy);
      const n = list.length, gap = Math.min(9, (node.h - 16) / Math.max(1, n - 1));
      list.forEach((i, k) => (edges[i][other === "to" ? "sy" : "ty"] = node.cy + (k - (n - 1) / 2) * gap));
    };
    for (const id in out) spread(out[id], byId[id], "to");
    for (const id in inn) {
      const node = byId[id];
      if (node.kind === "sink") inn[id].forEach(i => (edges[i].ty = byId[edges[i].from].cy));
      else spread(inn[id], node, "from");
    }
  }

  function edgeD(e) {
    if (!shown(e) && e.only === "money") return ""; // money-only wires have no ports in the goods view
    const a = byId[e.from], b = byId[e.to];
    let p1, p2, d;
    const flip = st.money && e.pay !== "from";
    if (e.side) { // same column, routed round the right-hand side so it doesn't cross the stage between
      p1 = [a.x + a.w, a.cy]; p2 = [b.x + b.w + 2, b.cy];
      if (flip) [p1, p2] = [[p2[0] - 2, p2[1]], [p1[0] + 2, p1[1]]];
      return `M${p1[0]},${p1[1]} C${p1[0] + 34},${p1[1]} ${p2[0] + 34},${p2[1]} ${p2[0]},${p2[1]}`;
    }
    if (e.vertical) {
      p1 = [a.x + a.w / 2, a.y + a.h]; p2 = [b.x + b.w / 2, b.y - 2];
      if (flip) [p1, p2] = [[p2[0], p2[1] + 2], [p1[0], p1[1] + 2]];
      const my = (p1[1] + p2[1]) / 2;
      d = `M${p1[0]},${p1[1]} C${p1[0]},${my} ${p2[0]},${my} ${p2[0]},${p2[1]}`;
    } else {
      p1 = [a.x + a.w, e.sy]; p2 = [b.x - 2, e.ty];
      if (flip) [p1, p2] = [[p2[0] + 2, p2[1]], [p1[0] + 2, p1[1]]];
      const mx = (p1[0] + p2[0]) / 2;
      d = `M${p1[0]},${p1[1]} C${mx},${p1[1]} ${mx},${p2[1]} ${p2[0]},${p2[1]}`;
    }
    return d;
  }

  // ── Render ────────────────────────────────────
  let edgeEls = [], labelEls = [], nodeEls = {}, dotEls = [], trailG;

  function render() {
    layout(); ports();
    svg.innerHTML = "";
    svg.setAttribute("viewBox", `0 0 ${VIEW_W} ${VIEW_H}`);
    applyZoom();

    const defs = el("defs", {}, svg);
    for (const [id, color] of [["ah", "var(--edge)"], ["ah-hi", "var(--accent)"], ["ah-money", "var(--money)"]]) {
      const m = el("marker", { id, viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto-start-reverse" }, defs);
      el("path", { d: "M0,1 L10,5 L0,9 z", style: `fill:${color}` }, m);
    }

    // Phase bands & column labels
    const bands = el("g", {}, svg);
    for (const p of phases) {
      const x1 = COLX[p.from], x2 = COLX[p.to] + (p.to === 9 ? 88 : NODE_W);
      const g = el("g", { class: "band" }, bands);
      el("rect", { x: x1, y: 10, width: x2 - x1, height: 22, rx: 6 }, g);
      el("text", { x: (x1 + x2) / 2, y: 25, "text-anchor": "middle" }, g).textContent = p.title;
    }
    columns.forEach((c, i) => { if (c) el("text", { class: "collabel", x: COLX[i] + 2, y: 56 }, bands).textContent = c; });
    el("line", { class: "track", x1: 20, x2: COLX[3] + NODE_W, y1: 510, y2: 510 }, bands);
    el("text", { class: "tracklabel", x: 22, y: 503 }, bands).textContent = "▲ Silicon";
    el("text", { class: "tracklabel", x: 22, y: 527 }, bands).textContent = "▼ Buildings & power";
    const note = el("text", { class: "note", x: 22, y: 600 }, bands);
    ["Two supply chains —", "chips, and the buildings", "and power to run them —", "meet in the data center →"]
      .forEach((line, i) => (el("tspan", { x: 22, dy: i ? 16 : 0 }, note).textContent = line));

    // Edges
    const eg = el("g", {}, svg), lg = el("g", {}, svg);
    const kind = e => (e.pay === "none" ? " nopay" : "") + (e.only === "money" ? " monly" : "");
    edgeEls = edges.map(e => el("path", { class: "edge" + kind(e), d: edgeD(e) }, eg));
    labelEls = edges.map((e, i) => {
      const g = el("g", { class: "elabel" + kind(e) }, lg);
      if (!edgeEls[i].getAttribute("d")) return g; // hidden wire: an empty label keeps the indexes aligned
      const path = edgeEls[i], L = path.getTotalLength(), p = path.getPointAtLength(L / 2);
      const r = el("rect", { rx: 5 }, g);
      const t = el("text", { x: p.x, y: p.y + 3.5, "text-anchor": "middle" }, g);
      t.textContent = st.money ? e.money : e.goods;
      const w = t.getComputedTextLength() + 12;
      r.setAttribute("x", p.x - w / 2); r.setAttribute("y", p.y - 9); r.setAttribute("width", w); r.setAttribute("height", 18);
      return g;
    });
    // Raise labels above nodes
    const ng = el("g", {}, svg);
    svg.appendChild(lg);
    trailG = el("g", {}, svg);

    // Nodes
    nodeEls = {}; dotEls = [];
    for (const s of stages) {
      const lv = s.choke ? s.choke.level : 0;
      const g = el("g", {
        class: `node ${s.kind || "market"} lv${lv}`, tabindex: 0, role: "button",
        "aria-label": `${s.title}: ${s.sub}`, style: `--cc:${chokeVar(lv)}`, "data-id": s.id,
      }, ng);
      el("rect", { class: "box", x: s.x, y: s.y, width: s.w, height: s.h, rx: s.kind === "sink" ? 44 : 10 }, g);
      if (s.kind === "sink") {
        const t = el("text", { class: "t", x: s.x + s.w / 2, y: s.cy - 14, "text-anchor": "middle" }, g);
        ["Businesses", "& people"].forEach((w, i) => (el("tspan", { x: s.x + s.w / 2, dy: i ? 16 : 0 }, t).textContent = w));
        const sub = el("text", { class: "s", x: s.x + s.w / 2, y: s.cy + 22, "text-anchor": "middle" }, g);
        ["where the", "money", "comes from"].forEach((w, i) => (el("tspan", { x: s.x + s.w / 2, dy: i ? 13 : 0 }, sub).textContent = w));
      } else {
        if (s.choke) el("rect", { class: "cbar", x: s.x, y: s.y + 8, width: 4, height: s.h - 16, rx: 2, style: `fill:${chokeVar(lv)}` }, g);
        el("text", { class: "t", x: s.x + 12, y: s.y + 21 }, g).textContent = s.title;
        el("text", { class: "s sub", x: s.x + 12, y: s.y + 37 }, g).textContent = s.sub;
        if (s.choke) el("text", { class: "s ctag", x: s.x + 12, y: s.y + 37, style: `fill:${lv ? chokeVar(lv) : "var(--muted)"}` }, g).textContent = s.choke.tag;
        if (s.kind !== "process") drawDots(s, g);
      }
      g.addEventListener("mouseenter", () => { st.hoverNode = s.id; applyFocus(); });
      g.addEventListener("mouseleave", () => { st.hoverNode = null; applyFocus(); });
      g.addEventListener("click", ev => { ev.stopPropagation(); if (!dragMoved) selectStage(s.id); });
      g.addEventListener("keydown", ev => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); selectStage(s.id); } });
      nodeEls[s.id] = g;
    }
    applyFocus();
  }

  function drawDots(s, g) {
    const dg = el("g", { class: "dots" }, g);
    const PER_ROW = 10, MAX = 20, R = 4.3, GAP = 12.4;
    const shown = s.cos.slice(0, s.cos.length > MAX ? MAX - 1 : MAX);
    shown.forEach((c, i) => {
      const cx = s.x + 14 + (i % PER_ROW) * GAP, cy = s.y + 54 + Math.floor(i / PER_ROW) * 13;
      const d = el("circle", { class: "dot", cx, cy, r: R, style: `fill:${regions[c.region].color}` }, dg);
      d.dataset.co = c.id; d.dataset.stage = s.id;
      d.addEventListener("mouseenter", ev => { st.hoverCo = c.id; showTip(c, s, ev); applyFocus(); });
      d.addEventListener("mousemove", moveTip);
      d.addEventListener("mouseleave", () => { st.hoverCo = null; hideTip(); applyFocus(); });
      d.addEventListener("click", ev => { ev.stopPropagation(); if (!dragMoved) pinCompany(c.id); });
      dotEls.push(d);
    });
    if (s.cos.length > shown.length) {
      el("text", { class: "more", x: s.x + 14 + (shown.length % PER_ROW) * GAP - 3, y: s.y + 71 }, dg).textContent = `+${s.cos.length - shown.length}`;
    }
    if (!s.cos.length) el("text", { class: "more", x: s.x + 12, y: s.y + 60 }, dg).textContent = "not populated yet";
  }

  // ── Focus / highlight ─────────────────────────
  function applyFocus() {
    if (!trailG) return; // not rendered yet
    const co = st.hoverCo || st.pinCo;
    const n = st.hoverNode || st.selNode;
    let nodeOn = null, edgeOn = new Set(), direct = new Set();
    if (co) {
      nodeOn = new Set(Object.keys(coById[co].at));
    } else if (n) {
      const { fwd, rev } = graph(), up = reach(n, rev), down = reach(n, fwd);
      nodeOn = new Set([n, ...up, ...down]);
      const U = new Set([n, ...up]), D = new Set([n, ...down]);
      edges.forEach((e, i) => {
        if (!shown(e)) return;
        if ((U.has(e.from) && U.has(e.to)) || (D.has(e.from) && D.has(e.to))) edgeOn.add(i);
        if (e.from === n || e.to === n) direct.add(i);
      });
    }
    for (const id in nodeEls) {
      nodeEls[id].classList.toggle("dim", !!nodeOn && !nodeOn.has(id));
      nodeEls[id].classList.toggle("sel", id === st.selNode && !co);
    }
    edgeEls.forEach((p, i) => { p.classList.toggle("dim", !!nodeOn && !edgeOn.has(i)); p.classList.toggle("hi", edgeOn.has(i)); });
    labelEls.forEach((g, i) => g.classList.toggle("show", direct.has(i)));
    dotEls.forEach(d => { d.classList.toggle("on", d.dataset.co === co); d.classList.toggle("dim", !!co && d.dataset.co !== co); });
    drawTrail(co);
  }

  function drawTrail(co) {
    trailG.innerHTML = "";
    if (!co || !st.companies) return;
    const pts = dotEls.filter(d => d.dataset.co === co)
      .map(d => ({ x: +d.getAttribute("cx"), y: +d.getAttribute("cy"), col: byId[d.dataset.stage].col }))
      .sort((a, b) => a.col - b.col || a.y - b.y);
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i];
      const mx = (a.x + b.x) / 2, my = Math.min(a.y, b.y) - 24 - Math.abs(b.x - a.x) * 0.08;
      el("path", { class: "trail", d: `M${a.x},${a.y} Q${mx},${my} ${b.x},${b.y}` }, trailG);
    }
  }

  // ── Tooltip ───────────────────────────────────
  function showTip(c, s, ev) {
    const others = Object.keys(c.at).filter(k => k !== s.id).map(k => byId[k].title);
    tip.innerHTML = `<div class="n">${esc(c.name)}</div>
      <div class="r"><span class="sw"><i style="background:${regions[c.region].color}"></i></span>${esc(placeOf(c))}</div>
      <div class="role"><b>${esc(s.title)}:</b> ${esc(c.at[s.id])}</div>
      ${c.rev ? `<div class="rev">${esc(c.rev)}</div>` : ""}
      ${others.length ? `<div class="also">Also in: ${others.map(esc).join(" · ")}</div>` : ""}`;
    tip.classList.add("show"); moveTip(ev);
  }
  function moveTip(ev) {
    const r = tip.getBoundingClientRect();
    let x = ev.clientX + 14, y = ev.clientY + 14;
    if (x + r.width > innerWidth - 8) x = ev.clientX - r.width - 14;
    if (y + r.height > innerHeight - 8) y = ev.clientY - r.height - 14;
    tip.style.left = x + "px"; tip.style.top = y + "px";
  }
  const hideTip = () => tip.classList.remove("show");
  const placeOf = c => c.country || regions[c.region].label;
  const research = window.VC.research || {};
  const sourceNote = c => c.src === "research"
    ? `Source: ${esc(research.credit || "Cx Bio research")}.`
    : "Seed data: role is illustrative and not yet verified.";

  // ── Panel ─────────────────────────────────────
  const phaseOf = s => (phases.find(p => s.col >= p.from && s.col <= p.to) || {}).title || "";
  const coButton = (c, role) => `<button class="co" data-co="${c.id}"><i style="background:${regions[c.region].color}"></i><span>${esc(c.name)}</span><small>${esc(role)}</small></button>`;
  const stageButton = (s, label) => `<button class="link" data-stage="${s.id}"><span>${esc(s.title)}</span><small>${esc(label)}</small></button>`;

  function stagePanel(s) {
    // In money mode, "Pays" lists who this stage pays, and "Gets paid by" who pays it.
    const ins = st.money ? edges.filter(e => shown(e) && payer(e) === s.id).map(e => ({ ...e, from: payee(e) })) : edges.filter(e => shown(e) && e.to === s.id);
    const outs = st.money ? edges.filter(e => shown(e) && payee(e) === s.id).map(e => ({ ...e, to: payer(e) })) : edges.filter(e => shown(e) && e.from === s.id);
    const lab = e => (st.money ? e.money : e.goods);
    const lv = s.choke ? s.choke.level : null;
    panel.innerHTML = `
      <div class="kicker">${esc(phaseOf(s))}</div>
      <h2>${esc(s.title)}</h2>
      <p>${esc(s.desc)}</p>
      ${s.choke ? `<h3>Chokepoint · ${LEVELS[lv]}</h3>
        <div class="meter">${[1, 2, 3, 4].map(k => `<i style="${k <= lv ? `background:${chokeVar(lv)}` : ""}"></i>`).join("")}</div>
        <p>${esc(s.choke.note)}</p>` : ""}
      ${ins.length ? `<h3>${st.money ? "Pays" : "Gets from"}</h3><div class="links">${ins.map(e => stageButton(byId[e.from], lab(e))).join("")}</div>` : ""}
      ${outs.length ? `<h3>${st.money ? "Gets paid by" : "Supplies"}</h3><div class="links">${outs.map(e => stageButton(byId[e.to], lab(e))).join("")}</div>` : ""}
      ${s.kind === "sink" ? "" : `<h3>Companies · ${s.cos.length}</h3>
        ${s.cos.length ? `<div class="colist">${s.cos.map(c => coButton(c, c.at[s.id])).join("")}</div>`
          : `<p>${s.kind === "process" ? "This is an activity rather than a market. It is done by the model labs on compute rented from or owned by the clouds." : "Not populated yet."}</p>`}`}`;
    openDrawer();
  }

  function companyPanel(c) {
    const where = Object.keys(c.at).map(id => byId[id]).sort((a, b) => a.col - b.col);
    panel.innerHTML = `
      <div class="kicker">Company · ${esc(placeOf(c))}</div>
      <h2>${esc(c.name)}</h2>
      ${where.length >= 3 ? `<p><span class="pill">Vertically integrated · ${where.length} stages</span></p>` : ""}
      ${c.rev ? `<h3>Scale</h3><p>${esc(c.rev)}</p>` : ""}
      <h3>Where it plays</h3>
      <div class="links">${where.map(s => stageButton(s, c.at[s.id])).join("")}</div>
      <p style="margin-top:14px;font-size:12px;color:var(--muted)">${sourceNote(c)}</p>`;
    openDrawer();
  }

  function aboutPanel() {
    panel.innerHTML = `
      <div class="kicker">About</div>
      <h2>How to read this map</h2>
      <p>Each box is a stage of the AI industry. Wires show what flows from one stage to the next, starting with the machines that print chips on the left and ending with the apps people pay for on the right.</p>
      <h3>Three ways to look</h3>
      <ul>
        <li><b>Companies</b>: dots are companies, colored by where they're headquartered. Hover one to see what it does and where else it appears. Companies that show up in many stages are vertically integrated.</li>
        <li><b>Chokepoints</b>: where one or a few suppliers, or a physical limit like grid power, constrain everything downstream.</li>
        <li><b>Follow the money</b>: flips the wires. Money starts with end users and flows back upstream. Each stage's spending is the next stage's revenue. On the chip side the money skips stages: the chip designer pays the foundry, the memory makers and the packagers directly, and buyers pay the designer for the finished chips.</li>
      </ul>
      <h3>Try</h3>
      <ul>
        <li>Hover <b>Lithography</b> and watch how much of the chain depends on it.</li>
        <li>Turn on Companies and hover <b>Google</b>'s dot. It appears in five stages.</li>
      </ul>
      <h3>Sources</h3>
      <p>${esc(research.credit || "")}. ${companies.filter(c => c.src === "research").length} companies have profiles or revenue figures from that research. The others are seed data that hasn't been verified yet; each company's panel says which it is.</p>
      <p style="font-size:12px;color:var(--muted)">${stages.length} stages · ${edges.length} links · ${companies.length} companies</p>`;
    openDrawer();
  }

  function openDrawer() { drawer.classList.add("open"); drawer.scrollTop = 0; }
  function closeDrawer() { drawer.classList.remove("open"); st.selNode = null; st.pinCo = null; applyFocus(); }

  function selectStage(id) { st.selNode = id; st.pinCo = null; stagePanel(byId[id]); applyFocus(); }
  function pinCompany(id) {
    if (!st.companies) setLayer("companies", true);
    st.pinCo = id; st.selNode = null; companyPanel(coById[id]); applyFocus();
  }

  panel.addEventListener("click", ev => {
    const b = ev.target.closest("[data-stage],[data-co]");
    if (!b) return;
    if (b.dataset.stage) selectStage(b.dataset.stage); else pinCompany(b.dataset.co);
  });
  // Preview a company or stage when hovering it in the panel
  panel.addEventListener("mouseover", ev => {
    const b = ev.target.closest("[data-co]");
    st.hoverCo = b ? b.dataset.co : null; applyFocus();
  });
  panel.addEventListener("mouseleave", () => { st.hoverCo = null; applyFocus(); });
  $("#close").addEventListener("click", closeDrawer);
  $("#about").addEventListener("click", aboutPanel);

  // ── Layers ────────────────────────────────────
  function setLayer(name, on) {
    st[name] = on;
    document.body.classList.toggle(name, on);
    document.querySelector(`.toggle[data-layer="${name}"]`).setAttribute("aria-pressed", on);
    render();
    if (drawer.classList.contains("open")) {
      if (st.selNode) stagePanel(byId[st.selNode]);
      else if (st.pinCo) companyPanel(coById[st.pinCo]);
    }
  }
  document.querySelectorAll(".toggle").forEach(b => b.addEventListener("click", () => setLayer(b.dataset.layer, !st[b.dataset.layer])));

  // ── Search ────────────────────────────────────
  const q = $("#q");
  const findCo = v => { v = v.trim().toLowerCase(); return v && (companies.find(c => c.name.toLowerCase() === v) || companies.find(c => c.name.toLowerCase().startsWith(v))); };
  q.addEventListener("change", () => { const c = findCo(q.value); if (c) { pinCompany(c.id); q.blur(); } });
  q.addEventListener("keydown", ev => { if (ev.key === "Enter") { const c = findCo(q.value); if (c) { pinCompany(c.id); q.blur(); } } });

  // ── Zoom & pan ────────────────────────────────
  function fitZoom() { return Math.max(0.55, Math.min(1.25, (wrap.clientWidth - 4) / VIEW_W)); }
  function applyZoom() { svg.setAttribute("width", VIEW_W * st.zoom); svg.setAttribute("height", VIEW_H * st.zoom); }
  function setZoom(z, user = true) { st.zoom = Math.max(0.4, Math.min(2, z)); st.userZoomed = user; applyZoom(); }
  $("#zin").onclick = () => setZoom(st.zoom * 1.15);
  $("#zout").onclick = () => setZoom(st.zoom / 1.15);
  $("#zfit").onclick = () => setZoom(fitZoom(), false);
  addEventListener("resize", () => { if (mounted && wrap.clientWidth && !st.userZoomed) setZoom(fitZoom(), false); });

  let drag = null, dragMoved = false;
  wrap.addEventListener("mousedown", ev => {
    if (ev.button !== 0) return;
    drag = { x: ev.clientX, y: ev.clientY, sl: wrap.scrollLeft, st: wrap.scrollTop }; dragMoved = false;
  });
  addEventListener("mousemove", ev => {
    if (!drag) return;
    const dx = ev.clientX - drag.x, dy = ev.clientY - drag.y;
    if (!dragMoved && Math.hypot(dx, dy) > 4) { dragMoved = true; wrap.classList.add("dragging"); hideTip(); }
    if (dragMoved) { wrap.scrollLeft = drag.sl - dx; wrap.scrollTop = drag.st - dy; }
  });
  addEventListener("mouseup", () => { drag = null; wrap.classList.remove("dragging"); setTimeout(() => (dragMoved = false), 0); });
  svg.addEventListener("click", () => { if (!dragMoved && (st.selNode || st.pinCo)) closeDrawer(); });
  addEventListener("keydown", ev => { if (ev.key === "Escape") closeDrawer(); });

  // Render on first show (the map needs to be visible to measure text), refit afterwards.
  let mounted = false;
  function mount() {
    if (!wrap.clientWidth) return;
    if (!mounted) { mounted = true; st.zoom = fitZoom(); render(); }
    else if (!st.userZoomed) setZoom(fitZoom(), false);
  }
  return { mount, closeDrawer };
})();
