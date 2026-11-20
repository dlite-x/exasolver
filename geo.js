// World map of AI data centres. Needs world.js (window.WORLD, TopoJSON), sites-data.js (window.VC_SITES) and data.js (window.VC).
window.VCGeo = (() => {
  const D = window.VC_SITES, VC = window.VC || { companies: [] };
  const svg = document.getElementById("geoMap");
  if (!svg || !D || !window.WORLD) return { mount() {} };
  const NS = "http://www.w3.org/2000/svg";
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const coName = Object.fromEntries(VC.companies.map(c => [c.id, c.name]));
  const opsText = s => s.ops.map(o => coName[o] || o).join(", ");
  const STATUS = { operating: "Operating", building: "Under construction", planned: "Planned" };
  const fmtMW = mw => mw == null ? "Not disclosed" : mw >= 1000 ? `${(mw / 1000).toFixed(mw % 1000 ? 1 : 0)} GW` : `${mw} MW`;

  // ── Equal Earth projection ──
  const S = 160, A1 = 1.340264, A2 = -0.081106, A3 = 0.000893, A4 = 0.003796, M = Math.sqrt(3) / 2;
  function proj(lon, lat) {
    const l = lon * Math.PI / 180, t = Math.asin(M * Math.sin(lat * Math.PI / 180)), t2 = t * t, t6 = t2 * t2 * t2;
    const x = l * Math.cos(t) / (M * (A1 + 3 * A2 * t2 + t6 * (7 * A3 + 9 * A4 * t2)));
    const y = t * (A1 + A2 * t2 + t6 * (A3 + A4 * t2));
    return [x * S, -y * S];
  }
  const minX = proj(-180, 0)[0], maxX = proj(180, 0)[0];
  const minY = proj(0, 80)[1], maxY = proj(0, -57)[1];
  const W = maxX - minX, H = maxY - minY;
  svg.setAttribute("viewBox", `${minX} ${minY} ${W} ${H}`);

  // ── TopoJSON decode (countries) ──
  const topo = window.WORLD, [sx, sy] = topo.transform.scale, [tx, ty] = topo.transform.translate;
  const arcs = topo.arcs.map(a => { let x = 0, y = 0; return a.map(([dx, dy]) => { x += dx; y += dy; return [x * sx + tx, y * sy + ty]; }); });
  const arc = i => i < 0 ? arcs[~i].slice().reverse() : arcs[i];
  const ringPath = r => {
    const pts = []; r.forEach((i, k) => { const a = arc(i); pts.push(...(k ? a.slice(1) : a)); });
    return "M" + pts.map(([lo, la]) => proj(lo, la).map(v => v.toFixed(1)).join(",")).join("L") + "Z";
  };
  const CC = { US: "840", GB: "826", FR: "250", DE: "276", NO: "578", PT: "620", MY: "458", ID: "360", IN: "356", AU: "036", SA: "682", AE: "784", KR: "410", SG: "702" };
  const hasSite = new Set(D.campuses.map(c => CC[c.cc]));

  const el = (tag, attrs = {}, parent) => { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); if (parent) parent.appendChild(n); return n; };
  const root = el("g", {}, svg);
  const gLand = el("g", { class: "g-land" }, root);
  topo.objects.countries.geometries.forEach(g => {
    if (g.id === "010") return; // Antarctica
    const polys = g.type === "Polygon" ? [g.arcs] : g.type === "MultiPolygon" ? g.arcs : [];
    if (!polys.length) return;
    const p = el("path", { d: polys.map(poly => poly.map(ringPath).join("")).join(""), class: "land" + (hasSite.has(g.id) ? " has" : "") }, gLand);
    el("title", {}, p).textContent = g.properties.name;
  });
  const gHubs = el("g", { class: "g-hubs" }, root);
  const gHubLab = el("g", { class: "g-hublab" }, root);
  const gSites = el("g", { class: "g-sites" }, root);

  // ── Marks ──
  const maxMW = Math.max(...D.campuses.map(c => c.mw || 0));
  const baseR = c => c.mw == null ? 4.5 : Math.max(3.5, 17 * Math.sqrt(c.mw / maxMW)); // area ∝ MW
  D.campuses.forEach(c => (c.xy = proj(c.lon, c.lat)));
  D.hubs.forEach(h => (h.xy = proj(h.lon, h.lat)));

  const hubEls = D.hubs.map(h => {
    const n = el("circle", { cx: h.xy[0], cy: h.xy[1], class: "hub", tabindex: "-1" }, gHubs);
    const t = el("text", { x: h.xy[0], y: h.xy[1], class: "hublab" }, gHubLab); t.textContent = h.name;
    n.addEventListener("mousemove", e => tipHub(h, e.clientX, e.clientY));
    n.addEventListener("mouseleave", hideTip);
    return { h, n, t };
  });

  const order = D.campuses.slice().sort((a, b) => (b.mw || 0) - (a.mw || 0));
  const siteEls = {};
  order.forEach(c => {
    const shape = c.mw == null
      ? el("rect", { class: `site ${c.status} unk`, tabindex: "0", role: "button" }, gSites)
      : el("circle", { cx: c.xy[0], cy: c.xy[1], class: `site ${c.status}`, tabindex: "0", role: "button" }, gSites);
    shape.setAttribute("aria-label", `${c.name}, ${c.place}. ${fmtMW(c.mw)}, ${STATUS[c.status].toLowerCase()}.`);
    shape.addEventListener("mousemove", e => { tipSite(c, e.clientX, e.clientY); hover(c.id); });
    shape.addEventListener("mouseleave", () => { hideTip(); hover(null); });
    shape.addEventListener("click", () => select(c.id));
    shape.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(c.id); } });
    shape.addEventListener("focus", () => { const r = shape.getBoundingClientRect(); tipSite(c, r.right, r.top); hover(c.id); });
    shape.addEventListener("blur", () => { hideTip(); hover(null); });
    siteEls[c.id] = shape;
  });

  // ── Zoom & pan ──
  const z = { k: 1, x: 0, y: 0 };
  function clampZ() {
    z.k = Math.min(14, Math.max(1, z.k));
    z.x = Math.min(minX - minX * z.k, Math.max(maxX - maxX * z.k, z.x));
    z.y = Math.min(minY - minY * z.k, Math.max(maxY - maxY * z.k, z.y));
  }
  function apply() {
    root.setAttribute("transform", `translate(${z.x.toFixed(2)},${z.y.toFixed(2)}) scale(${z.k.toFixed(4)})`);
    const grow = Math.pow(z.k, 0.3) / z.k; // marks grow a little as you zoom in, but much less than the map
    order.forEach(c => {
      const r = baseR(c) * grow, n = siteEls[c.id];
      if (c.mw == null) { const s = r * 1.6; n.setAttribute("x", c.xy[0] - s / 2); n.setAttribute("y", c.xy[1] - s / 2); n.setAttribute("width", s); n.setAttribute("height", s); n.setAttribute("transform", `rotate(45 ${c.xy[0]} ${c.xy[1]})`); }
      else n.setAttribute("r", r);
    });
    hubEls.forEach(({ h, n, t }) => {
      n.setAttribute("r", 12 * grow);
      t.setAttribute("font-size", 11 / z.k);
      t.setAttribute("y", h.xy[1] - 14 * grow - 3 / z.k);
    });
    svg.classList.toggle("zoomed", z.k >= 2.4);
  }
  function svgPt(cx, cy) { const p = svg.createSVGPoint(); p.x = cx; p.y = cy; return p.matrixTransform(svg.getScreenCTM().inverse()); }
  function zoomAt(px, py, f) { const k2 = Math.min(14, Math.max(1, z.k * f)), r = k2 / z.k; z.x = px - (px - z.x) * r; z.y = py - (py - z.y) * r; z.k = k2; clampZ(); apply(); }
  let anim = 0;
  function flyTo(target) {
    cancelAnimationFrame(anim);
    const from = { ...z }, t0 = performance.now(), dur = reduce ? 0 : 520;
    const step = now => {
      const t = dur ? Math.min(1, (now - t0) / dur) : 1, e = t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      z.k = from.k + (target.k - from.k) * e; z.x = from.x + (target.x - from.x) * e; z.y = from.y + (target.y - from.y) * e;
      apply(); if (t < 1) anim = requestAnimationFrame(step);
    };
    anim = requestAnimationFrame(step);
  }
  function viewFor([lo0, la0, lo1, la1]) {
    const pts = []; for (let i = 0; i <= 4; i++) for (let j = 0; j <= 4; j++) pts.push(proj(lo0 + (lo1 - lo0) * i / 4, la0 + (la1 - la0) * j / 4));
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    const bx0 = Math.min(...xs), bx1 = Math.max(...xs), by0 = Math.min(...ys), by1 = Math.max(...ys);
    const k = Math.min(W / (bx1 - bx0), H / (by1 - by0));
    const t = { k, x: minX + W / 2 - k * (bx0 + bx1) / 2, y: minY + H / 2 - k * (by0 + by1) / 2 };
    const save = { ...z }; Object.assign(z, t); clampZ(); const out = { ...z }; Object.assign(z, save); return out;
  }
  const REGIONS = {
    world: [-180, -57, 180, 80], na: [-126, 23, -68, 52], eu: [-12, 35, 30, 70],
    me: [32, 5, 92, 37], ap: [95, -44, 152, 40],
  };
  svg.addEventListener("wheel", e => { e.preventDefault(); const p = svgPt(e.clientX, e.clientY); zoomAt(p.x, p.y, Math.exp(-e.deltaY * 0.0018)); }, { passive: false });
  let drag = null;
  svg.addEventListener("pointerdown", e => { if (e.button !== 0 || e.target.closest(".site")) return; drag = { p: svgPt(e.clientX, e.clientY), x: z.x, y: z.y, moved: false }; svg.setPointerCapture(e.pointerId); });
  svg.addEventListener("pointermove", e => {
    if (!drag) return; const p = svgPt(e.clientX, e.clientY);
    // svgPt depends on the current transform only through the viewBox, so deltas stay in viewBox units
    z.x = drag.x + (p.x - drag.p.x); z.y = drag.y + (p.y - drag.p.y); clampZ(); apply(); svg.classList.add("panning");
  });
  const endDrag = () => { drag = null; svg.classList.remove("panning"); };
  svg.addEventListener("pointerup", endDrag); svg.addEventListener("pointercancel", endDrag);
  document.getElementById("geoIn").addEventListener("click", () => zoomAt(minX + W / 2, minY + H / 2, 1.6));
  document.getElementById("geoOut").addEventListener("click", () => zoomAt(minX + W / 2, minY + H / 2, 1 / 1.6));
  document.querySelectorAll("[data-region]").forEach(b => b.addEventListener("click", () => {
    document.querySelectorAll("[data-region]").forEach(x => x.setAttribute("aria-pressed", x === b));
    flyTo(viewFor(REGIONS[b.dataset.region]));
  }));

  // ── Filters ──
  const show = { operating: true, building: true, planned: true };
  document.querySelectorAll("[data-status]").forEach(b => b.addEventListener("click", () => {
    const s = b.dataset.status; show[s] = !show[s]; b.setAttribute("aria-pressed", show[s]); refilter();
  }));
  document.getElementById("geoHubs").addEventListener("click", e => {
    const on = e.currentTarget.getAttribute("aria-pressed") !== "true";
    e.currentTarget.setAttribute("aria-pressed", on); svg.classList.toggle("nohubs", !on);
  });
  function refilter() {
    D.campuses.forEach(c => { siteEls[c.id].style.display = show[c.status] ? "" : "none"; });
    rank.querySelectorAll("[data-id]").forEach(n => { const c = byId[n.dataset.id]; n.hidden = !show[c.status]; });
  }

  // ── Tooltip (shared #ctip) ──
  const tip = document.getElementById("ctip");
  function place(x, y) { tip.hidden = false; const r = tip.getBoundingClientRect(); tip.style.left = Math.min(x + 14, innerWidth - r.width - 8) + "px"; tip.style.top = Math.min(y + 14, innerHeight - r.height - 8) + "px"; }
  function tipSite(c, x, y) {
    tip.innerHTML = `<b>${esc(c.name)}</b><span class="num">${esc(c.mwNote || fmtMW(c.mw))}</span><br>${esc(c.place)} · ${esc(opsText(c))}<br><span style="color:var(--muted)">${STATUS[c.status]}</span>`;
    place(x, y);
  }
  function tipHub(h, x, y) { tip.innerHTML = `<b>${esc(h.name)}</b><span style="color:var(--muted)">Established hub</span><br>${esc(h.why)}`; place(x, y); }
  function hideTip() { tip.hidden = true; }

  // ── Side panel: selection + ranking ──
  const byId = Object.fromEntries(D.campuses.map(c => [c.id, c]));
  const selBox = document.getElementById("geoSel"), rank = document.getElementById("geoRank");
  const known = order.filter(c => c.mw != null);
  rank.innerHTML = known.slice(0, 10).map(c => `
    <span class="lab" data-id="${c.id}" title="${esc(c.name)}">${esc(c.name)}</span>
    <span class="btrack" data-id="${c.id}" tabindex="0" role="button" aria-label="${esc(c.name)}, ${fmtMW(c.mw)}">
      <span class="bfill s2 st-${c.status}" style="width:calc(${(c.mw / maxMW * 100).toFixed(2)}% - ${(c.mw / maxMW * 64).toFixed(1)}px)"></span>
      <span class="val">${fmtMW(c.mw)}</span>
    </span>`).join("");
  rank.querySelectorAll(".btrack").forEach(n => {
    const c = byId[n.dataset.id];
    n.addEventListener("mouseenter", () => hover(c.id)); n.addEventListener("mouseleave", () => hover(null));
    n.addEventListener("focus", () => hover(c.id)); n.addEventListener("blur", () => hover(null));
    const go = () => { select(c.id); const v = { k: Math.max(z.k, 3.2) }; v.x = minX + W / 2 - v.k * c.xy[0]; v.y = minY + H / 2 - v.k * c.xy[1]; const s = { ...z }; Object.assign(z, v); clampZ(); const t = { ...z }; Object.assign(z, s); flyTo(t); };
    n.addEventListener("click", go);
    n.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } });
  });
  function hover(id) {
    svg.classList.toggle("hovering", !!id);
    order.forEach(c => siteEls[c.id].classList.toggle("hl", c.id === id));
    rank.querySelectorAll("[data-id]").forEach(n => n.classList.toggle("hl", n.dataset.id === id));
  }
  function select(id) {
    const c = byId[id]; if (!c) return;
    order.forEach(o => siteEls[o.id].classList.toggle("sel", o.id === id));
    const n = siteEls[id]; n.parentNode.appendChild(n); // draw on top
    selBox.innerHTML = `
      <p class="eyebrow">${STATUS[c.status]} · ${c.src === "research" ? "From the research decks" : "Public reports, not yet verified"}</p>
      <h3>${esc(c.name)}</h3>
      <p class="geo-place">${esc(c.place)}</p>
      <dl><dt>Capacity</dt><dd class="num">${esc(c.mwNote || fmtMW(c.mw))}</dd><dt>Who</dt><dd>${esc(opsText(c))}</dd></dl>
      <p>${esc(c.note)}</p>`;
  }

  // ── Stats ──
  const totMW = known.reduce((s, c) => s + c.mw, 0), usMW = known.filter(c => c.cc === "US").reduce((s, c) => s + c.mw, 0);
  const nCountries = new Set(D.campuses.map(c => c.cc)).size;
  document.getElementById("geoStats").innerHTML = `
    <div class="stat"><span class="v">${D.campuses.length}</span><span class="k">AI campuses mapped, in ${nCountries} countries</span></div>
    <div class="stat"><span class="v">${(totMW / 1000).toFixed(1)} GW</span><span class="k">Combined capacity of the ${known.length} sites that disclose a size</span></div>
    <div class="stat"><span class="v">${Math.round(usMW / totMW * 100)}%</span><span class="k">Share of that capacity in the United States</span></div>
    <div class="stat"><span class="v">${fmtMW(known[0].mw)}</span><span class="k">${esc(known[0].name)} (${esc(known[0].place)}), the largest site listed</span></div>`;

  // ── Table view ──
  document.getElementById("geoTable").innerHTML = `<table><thead><tr><th>Site</th><th>Where</th><th>Who</th><th class="r">Capacity</th><th>Status</th><th>Source</th></tr></thead><tbody>${order.map(c => `<tr><td>${esc(c.name)}</td><td>${esc(c.place)}</td><td>${esc(opsText(c))}</td><td class="r">${fmtMW(c.mw)}</td><td>${STATUS[c.status]}</td><td>${c.src === "research" ? "Research" : "Public"}</td></tr>`).join("")}</tbody></table>`;

  apply(); select(known[0].id);
  return { mount() {} };
})();
