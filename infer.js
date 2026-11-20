// Inference page: what each host charges for the same model. Reads inference-data.js (window.VC_INFER),
// which collector/collect.py writes from OpenRouter's public API.
(() => {
  const D = window.VC_INFER, root = document.getElementById("v-inference");
  if (!D || !root || !D.models.length) return;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const tip = document.getElementById("ctip");
  const showTip = (html, x, y) => { tip.innerHTML = html; tip.hidden = false; const r = tip.getBoundingClientRect(); tip.style.left = Math.max(8, Math.min(x + 14, innerWidth - r.width - 8)) + "px"; tip.style.top = Math.max(8, Math.min(y + 14, innerHeight - r.height - 8)) + "px"; };
  const hideTip = () => (tip.hidden = true);
  const bindTip = (el, html) => { el.addEventListener("mousemove", e => showTip(html(), e.clientX, e.clientY)); el.addEventListener("mouseleave", hideTip); el.addEventListener("focus", () => { const r = el.getBoundingClientRect(); showTip(html(), r.left + 40, r.bottom - 4); }); el.addEventListener("blur", hideTip); };
  const usd = v => v == null ? "n/a" : v >= 10 ? `$${v.toFixed(v % 1 ? 1 : 0)}` : v >= 1 ? `$${v.toFixed(2)}` : `$${v.toFixed(3).replace(/0$/, "")}`;
  const day = s => new Date(s + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
  const COLOR = { open: "var(--s3)", closed: "var(--s1)" };
  let region; try { region = new Intl.DisplayNames(["en"], { type: "region" }); } catch (e) { region = null; }
  const country = c => { try { return region ? region.of(c) : c; } catch (e) { return c; } };

  // One label per endpoint: the provider, plus its tag when a provider lists several.
  D.models.forEach(m => {
    const count = {}; m.hosts.forEach(h => (count[h.provider] = (count[h.provider] || 0) + 1));
    m.hosts.forEach(h => { const extra = (h.tag || "").split("/").slice(1).join("/"); h.label = count[h.provider] > 1 && extra ? `${h.provider} (${extra})` : h.provider; });
    m.priced = m.hosts.filter(h => h.pout > 0).sort((a, b) => a.pout - b.pout);
    m.min = m.priced.length ? m.priced[0].pout : null; m.max = m.priced.length ? m.priced[m.priced.length - 1].pout : null;
    m.med = m.priced.length ? m.priced[Math.floor((m.priced.length - 1) / 2)].pout : null;
    m.spread = m.min ? m.max / m.min : 1;
    m.nProv = new Set(m.hosts.map(h => h.provider)).size;
  });
  const models = D.models.filter(m => m.priced.length);

  // ── Headline numbers ──
  const allHosts = models.flatMap(m => m.hosts), widest = models.slice().sort((a, b) => b.spread - a.spread)[0];
  const zdrKnown = allHosts.filter(h => h.zdr != null), openM = models.filter(m => m.open), closedM = models.filter(m => !m.open);
  const avg = a => a.reduce((s, x) => s + x, 0) / (a.length || 1);
  document.getElementById("infStats").innerHTML = `
    <div class="stat"><span class="v">${allHosts.length}</span><span class="k">Endpoints tracked, across ${models.length} models and ${new Set(allHosts.map(h => h.provider)).size} hosting companies</span></div>
    <div class="stat"><span class="v">×${widest.spread.toFixed(0)}</span><span class="k">Widest price gap for one model: ${esc(widest.name)}, from ${usd(widest.min)} to ${usd(widest.max)} per million output tokens</span></div>
    <div class="stat"><span class="v">${avg(openM.map(m => m.nProv)).toFixed(0)} vs ${avg(closedM.map(m => m.nProv)).toFixed(0)}</span><span class="k">Average number of companies hosting an open-weight model, against a closed one</span></div>
    <div class="stat"><span class="v">${Math.round(zdrKnown.filter(h => h.zdr).length / (zdrKnown.length || 1) * 100)}%</span><span class="k">Of endpoints on OpenRouter's zero data retention list</span></div>`;
  document.getElementById("infStamp").textContent = `Prices collected ${new Date(D.updated).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} from OpenRouter's public API. Prices are US dollars per million tokens.`;

  // ── Price range per model (log scale) ──
  const LO = 0.05, HI = 100, TICKS = [0.1, 1, 10, 100];
  const P = v => Math.max(0, Math.min(100, (Math.log10(Math.max(v, LO)) - Math.log10(LO)) / (Math.log10(HI) - Math.log10(LO)) * 100));
  const axisRow = (l, r) => `<div class="dp-axis" aria-hidden="true"><div class="dp-unit">${l}</div><div class="dp-trk">${TICKS.map((t, i) => `<span class="dp-tick${i === TICKS.length - 1 ? " last" : ""}" style="left:${P(t)}%">$${t}</span>`).join("")}</div><div class="dp-unit r">${r}</div></div>`;
  const gl = TICKS.map(t => `<i class="dp-gl" style="left:${P(t)}%"></i>`).join("");
  const byGroup = [["Open-weight models", "anyone with the hardware can host them", models.filter(m => m.open)], ["Closed models", "sold by their maker and a few cloud partners", models.filter(m => !m.open)]];
  const rangeHost = document.getElementById("infRange");
  rangeHost.innerHTML = axisRow("output price per million tokens, log scale", "gap") + byGroup.map(([t, note, ms]) =>
    `<div class="dp-grp">${t} <small>· ${note}</small></div>` + ms.sort((a, b) => b.spread - a.spread).map(m => {
      const c = COLOR[m.open ? "open" : "closed"];
      return `<div class="dp-row inf-pick" tabindex="0" role="button" data-m="${esc(m.id)}" aria-label="${esc(`${m.name}: ${usd(m.min)} to ${usd(m.max)} per million output tokens across ${m.priced.length} endpoints`)}">
        <div class="dp-lab"><span class="dp-nm">${esc(m.name)}</span><span class="dp-sub">${m.nProv} ${m.nProv === 1 ? "company" : "companies"} · ${m.priced.length} endpoints</span></div>
        <div class="dp-trk">${gl}<i class="rg-bar" style="left:${P(m.min)}%;width:${Math.max(0.6, P(m.max) - P(m.min))}%;background:${c}"></i><i class="rg-med" style="left:${P(m.med)}%"></i></div>
        <div class="dp-val">${m.spread >= 1.05 ? "×" + (m.spread >= 10 ? m.spread.toFixed(0) : m.spread.toFixed(1)) : "none"}</div></div>`;
    }).join("")).join("");
  rangeHost.querySelectorAll(".inf-pick").forEach(row => {
    const m = models.find(x => x.id === row.dataset.m);
    bindTip(row, () => `<b>${esc(m.name)}</b><span class="num">${usd(m.min)} to ${usd(m.max)}</span><br>Median ${usd(m.med)} per million output tokens, across ${m.priced.length} endpoints. Click to see every host.`);
    const go = () => { select(m.id); document.getElementById("infDetail").scrollIntoView({ behavior: "smooth", block: "start" }); };
    row.addEventListener("click", go); row.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } });
  });
  document.getElementById("infRangeTable").innerHTML = `<table><thead><tr><th>Model</th><th>Type</th><th class="r">Companies</th><th class="r">Endpoints</th><th class="r">Cheapest</th><th class="r">Median</th><th class="r">Dearest</th><th class="r">Gap</th></tr></thead><tbody>${models.slice().sort((a, b) => b.spread - a.spread).map(m =>
    `<tr><td>${esc(m.name)}</td><td>${m.open ? "Open-weight" : "Closed"}</td><td class="r">${m.nProv}</td><td class="r">${m.priced.length}</td><td class="r">${usd(m.min)}</td><td class="r">${usd(m.med)}</td><td class="r">${usd(m.max)}</td><td class="r">×${m.spread.toFixed(1)}</td></tr>`).join("")}</tbody></table>`;

  // ── One model in detail ──
  const sel = document.getElementById("infModel");
  sel.innerHTML = byGroup.map(([t, , ms]) => `<optgroup label="${t}">${ms.map(m => `<option value="${esc(m.id)}">${esc(m.name)} (${m.priced.length})</option>`).join("")}</optgroup>`).join("");
  sel.addEventListener("change", () => select(sel.value));
  let showAll = false, zdrOnly = false, current = null;
  document.getElementById("infZdr").addEventListener("click", e => { zdrOnly = !zdrOnly; e.currentTarget.setAttribute("aria-pressed", zdrOnly); drawHosts(); });
  document.getElementById("infAll").addEventListener("click", () => { showAll = !showAll; drawHosts(); });
  const hostTip = (m, h) => { const p = D.providers[h.provider] || {}; return `<b>${esc(h.label)}</b><span class="num">${usd(h.pout)} out · ${usd(h.pin)} in</span><br>
    ${h.quant && h.quant !== "unknown" ? `Quantization ${esc(h.quant)}. ` : ""}${h.zdr ? "Zero data retention. " : h.zdr === false ? "Not on the zero data retention list. " : ""}${h.uptime != null ? `Uptime ${h.uptime}% over the last day. ` : ""}${p.dcs && p.dcs.length ? `Data centers: ${p.dcs.map(country).join(", ")}.` : ""}`; };
  function drawHosts() {
    const m = current, list = m.priced.filter(h => !zdrOnly || h.zdr), shown = showAll ? list : list.slice(0, 14), max = m.max;
    const host = document.getElementById("infHosts");
    host.innerHTML = shown.length ? shown.map((h, i) => `<span class="lab" title="${esc(h.label)}">${esc(h.label)}</span>
      <span class="btrack" tabindex="0" data-i="${m.priced.indexOf(h)}"><span class="bfill" style="background:${COLOR[m.open ? "open" : "closed"]};width:calc(${(h.pout / max * 100).toFixed(2)}% - ${(h.pout / max * 132).toFixed(0)}px)"></span>
      <span class="val">${usd(h.pout)}</span>${h.zdr ? `<span class="tagx" title="Zero data retention">ZDR</span>` : ""}${h.quant && h.quant !== "unknown" ? `<span class="tagx q">${esc(h.quant)}</span>` : ""}</span>`).join("")
      : `<p class="keynote">No endpoint for this model is on the zero data retention list.</p>`;
    host.querySelectorAll(".btrack").forEach(t => bindTip(t, () => hostTip(m, m.priced[t.dataset.i])));
    const btn = document.getElementById("infAll"); btn.hidden = list.length <= 14; btn.textContent = showAll ? "Show the 14 cheapest" : `Show all ${list.length} endpoints`;
  }
  function select(id) {
    const m = current = models.find(x => x.id === id) || models[0]; sel.value = m.id; showAll = false;
    const quants = [...new Set(m.priced.map(h => h.quant).filter(q => q && q !== "unknown"))];
    document.getElementById("infTitle").textContent = `${m.name}: output price by host`;
    document.getElementById("infNote").textContent = `${m.priced.length} endpoints from ${m.nProv} ${m.nProv === 1 ? "company" : "companies"}, collected ${day(m.day)}. ${quants.length > 1 ? `Hosts run it at different precision (${quants.join(", ")}), so they are not selling exactly the same thing.` : m.open ? "" : "A closed model is sold by its maker and through cloud partners, so the list price barely varies; higher prices are faster or priority tiers."}`;
    drawHosts();
    document.getElementById("infHostTable").innerHTML = `<table><thead><tr><th>Host</th><th>Data centers</th><th>Precision</th><th class="r">Input</th><th class="r">Output</th><th>ZDR</th><th class="r">Uptime, 1 day</th><th class="r">Context</th></tr></thead><tbody>${m.priced.map(h => { const p = D.providers[h.provider] || {}; return `<tr><td>${esc(h.label)}</td><td>${(p.dcs || []).map(country).join(", ") || "not listed"}</td><td>${h.quant === "unknown" ? "not stated" : esc(h.quant)}</td><td class="r">${usd(h.pin)}</td><td class="r">${usd(h.pout)}</td><td>${h.zdr ? "Yes" : h.zdr === false ? "No" : "Unknown"}</td><td class="r">${h.uptime != null ? h.uptime + "%" : "n/a"}</td><td class="r">${h.ctx ? h.ctx.toLocaleString("en-US") : "n/a"}</td></tr>`; }).join("")}</tbody></table>`;
    drawHistory(m); drawSpeed(m);
  }

  // ── Price over time (needs at least two days) ──
  function drawHistory(m) {
    const box = document.getElementById("infHist"), s = m.series || [];
    if (s.length < 2) { box.innerHTML = `<p class="keynote">Tracking of ${esc(m.name)} started on ${day(m.day)}. A price history will appear here once there are at least two days of data.</p>`; return; }
    const W = 640, H = 220, L = 46, R = 96, T = 14, B = 30, t0 = Date.parse(s[0].d), t1 = Date.parse(s[s.length - 1].d);
    const ymax = Math.max(...s.map(p => p.max)) * 1.08, X = d => L + (Date.parse(d) - t0) / (t1 - t0 || 1) * (W - L - R), Y = v => T + (1 - v / ymax) * (H - T - B);
    const step = ymax > 2 ? Math.ceil(ymax / 4) : ymax > 0.8 ? 0.25 : 0.1, yt = []; for (let v = 0; v <= ymax; v += step) yt.push(+v.toFixed(2));
    const LINES = [["max", "Dearest", "var(--s2)"], ["med", "Median", "var(--s1)"], ["min", "Cheapest", "var(--s3)"]];
    // keep the three end labels at least a line apart
    const last = s[s.length - 1], ly = {}; let prev = -99;
    LINES.forEach(([k]) => { ly[k] = Math.max(Y(last[k]) + 4, prev + 14); prev = ly[k]; });
    box.innerHTML = `<div class="figscroll"><svg class="inf-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Cheapest, median and dearest output price for ${esc(m.name)} on each day checked">
      ${yt.map(v => `<line class="grid" x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}"></line><text class="tk" x="${L - 6}" y="${Y(v) + 4}" text-anchor="end">$${v}</text>`).join("")}
      ${s.map(p => `<text class="tk" x="${X(p.d)}" y="${H - 10}" text-anchor="middle">${day(p.d)}</text>`).join("")}
      ${LINES.map(([k, name, c]) => `<path class="ln" stroke="${c}" d="${s.map((p, i) => `${i ? "L" : "M"}${X(p.d).toFixed(1)},${Y(p[k]).toFixed(1)}`).join("")}"></path>${s.map(p => `<circle class="pt" cx="${X(p.d)}" cy="${Y(p[k])}" r="4" fill="${c}" data-k="${k}" data-d="${p.d}" tabindex="0"></circle>`).join("")}<text class="endlab" x="${W - R + 8}" y="${ly[k]}">${name} ${usd(last[k])}</text>`).join("")}
    </svg></div>`;
    box.querySelectorAll(".pt").forEach(c => { const p = s.find(x => x.d === c.dataset.d); bindTip(c, () => `<b>${day(p.d)}</b><span class="num">${usd(p.min)} · ${usd(p.med)} · ${usd(p.max)}</span><br>Cheapest, median and dearest of ${p.n} endpoints.`); });
  }

  // ── Price against speed (needs a signed run) ──
  function drawSpeed(m) {
    const box = document.getElementById("infSpeed"), sp = m.speed;
    if (!sp || sp.hosts.length < 3) { box.innerHTML = `<p class="keynote">No speed figures for ${esc(m.name)} yet. OpenRouter only returns latency and throughput to signed requests, so they appear once the collector runs with an API key.</p>`; return; }
    const W = 640, H = 260, L = 46, R = 16, T = 14, B = 40, hs = sp.hosts;
    const xmax = Math.max(...hs.map(h => h.pout)) * 1.1, ymax = Math.max(...hs.map(h => h.thr)) * 1.12, X = v => L + v / xmax * (W - L - R), Y = v => T + (1 - v / ymax) * (H - T - B);
    const xs = xmax > 2 ? Math.ceil(xmax / 5) : 0.1, ys = ymax > 200 ? 50 : 25, xt = [], yt = [];
    for (let v = 0; v <= xmax; v += xs) xt.push(+v.toFixed(2)); for (let v = 0; v <= ymax; v += ys) yt.push(v);
    const named = new Set([...hs].sort((a, b) => b.thr - a.thr).slice(0, 3).concat([...hs].sort((a, b) => a.pout - b.pout).slice(0, 1)));
    box.innerHTML = `<div class="figscroll"><svg class="inf-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Each host of ${esc(m.name)} plotted by output price and output speed">
      ${yt.map(v => `<line class="grid" x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}"></line><text class="tk" x="${L - 6}" y="${Y(v) + 4}" text-anchor="end">${v}</text>`).join("")}
      ${xt.map(v => `<text class="tk" x="${X(v)}" y="${H - B + 16}" text-anchor="middle">$${v}</text>`).join("")}
      <text class="tk" x="${W - R}" y="${H - 6}" text-anchor="end">output price per million tokens →</text><text class="tk" x="${L}" y="10">tokens per second ↑</text>
      ${hs.map((h, i) => `<circle class="pt ring" cx="${X(h.pout)}" cy="${Y(h.thr)}" r="6" fill="${COLOR[m.open ? "open" : "closed"]}" data-i="${i}" tabindex="0"></circle>${named.has(h) ? `<text class="endlab" x="${X(h.pout) + 9}" y="${Y(h.thr) + 4}">${esc(h.provider)}</text>` : ""}`).join("")}
    </svg></div><p class="keynote">Speed as OpenRouter measured it over 30 minutes on ${day(sp.d)}. Up and to the left is better: faster and cheaper.</p>`;
    box.querySelectorAll(".pt").forEach(c => { const h = hs[c.dataset.i]; bindTip(c, () => `<b>${esc(h.provider)}</b><span class="num">${usd(h.pout)} · ${Math.round(h.thr)} tokens/s</span><br>${h.lat != null ? `First token after ${(h.lat / 1000).toFixed(2)} s (median).` : ""}`); });
  }

  // ── Where the hosts' data centers are ──
  const byC = {}; Object.entries(D.providers).forEach(([name, p]) => (p.dcs || []).forEach(c => (byC[c] = byC[c] || []).push(name)));
  const cs = Object.entries(byC).sort((a, b) => b[1].length - a[1].length), cmax = cs.length ? cs[0][1].length : 1, nNone = Object.values(D.providers).filter(p => !(p.dcs || []).length).length;
  const whereHost = document.getElementById("infWhere");
  whereHost.innerHTML = cs.map(([c, names]) => `<span class="lab">${esc(country(c))}</span><span class="btrack" tabindex="0" data-c="${c}"><span class="bfill s2" style="width:calc(${(names.length / cmax * 100).toFixed(1)}% - ${(names.length / cmax * 40).toFixed(0)}px)"></span><span class="val">${names.length}</span></span>`).join("");
  whereHost.querySelectorAll(".btrack").forEach(t => bindTip(t, () => `<b>${esc(country(t.dataset.c))}</b>${esc(byC[t.dataset.c].join(", "))}`));
  document.getElementById("infWhereNote").textContent = `Countries where the ${Object.keys(D.providers).length} hosting companies above list a data center, according to OpenRouter's provider directory. A company can appear in several countries; ${nNone} list none.`;
  document.getElementById("infWhereTable").innerHTML = `<table><thead><tr><th>Country</th><th class="r">Companies</th><th>Who</th></tr></thead><tbody>${cs.map(([c, names]) => `<tr><td>${esc(country(c))}</td><td class="r">${names.length}</td><td>${esc(names.join(", "))}</td></tr>`).join("")}</tbody></table>`;

  select((models.find(m => m.series && m.series.length > 1) || widest).id);
})();
