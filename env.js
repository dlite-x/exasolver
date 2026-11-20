// Environment page: energy and water per prompt and per token.
// Figures and derivations come from the "Joules per Token" analysis (compiled 19 Nov 2026); sources are listed on the page.
(() => {
  if (!document.getElementById("envEnergy")) return;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const tip = document.getElementById("ctip");

  // ── Source data (raw values as published) ──
  const SIZES = {
    short: { inTok: 100, outTok: 300, name: "short prompt (100 in, 300 out)" },
    medium: { inTok: 1000, outTok: 1000, name: "medium prompt (1,000 in, 1,000 out)" },
    long: { inTok: 10000, outTok: 1500, name: "long prompt (10,000 in, 1,500 out)" },
  };
  // Jegham et al. v5, Table 1: PUE, on-site and off-site water (L/kWh)
  const HOSTS = {
    azure: { name: "Azure", pue: 1.12, on: 0.30, off: 4.35 },
    aws: { name: "AWS", pue: 1.14, on: 0.18, off: 5.11 },
    ds: { name: "DeepSeek's own servers", pue: 1.27, on: 1.20, off: 6.016 },
  };
  // Jegham et al. v5, Table 4: Wh per query, [mean, std] for short / medium / long
  const JEGHAM = [
    { name: "LLaMA 3.1 8B", host: "aws", wh: { short: [0.052, 0.008], medium: [0.172, 0.015], long: [0.443, 0.028] } },
    { name: "GPT-4.1 nano", host: "azure", wh: { short: [0.207, 0.047], medium: [0.575, 0.108], long: [0.827, 0.094] } },
    { name: "LLaMA 3.3 70B", host: "aws", wh: { short: [0.237, 0.023], medium: [0.760, 0.079], long: [1.447, 0.188] } },
    { name: "GPT-4o (March 2025)", host: "azure", wh: { short: [0.423, 0.085], medium: [1.215, 0.241], long: [2.875, 0.421] } },
    { name: "GPT-4.1", host: "azure", wh: { short: [0.871, 0.302], medium: [3.161, 0.515], long: [4.833, 0.650] } },
    { name: "Claude 3.7 Sonnet", host: "aws", wh: { short: [0.950, 0.040], medium: [2.989, 0.201], long: [5.671, 0.302] } },
    { name: "o3", host: "azure", reasoning: true, wh: { short: [1.177, 0.224], medium: [5.153, 2.107], long: [12.222, 1.082] } },
    { name: "LLaMA 3.1 405B", host: "aws", wh: { short: [2.226, 0.142], medium: [9.042, 0.385], long: [25.202, 0.526] } },
    { name: "DeepSeek-R1 on Azure", host: "azure", reasoning: true, wh: { short: [2.353, 1.129], medium: [4.331, 1.695], long: [7.410, 2.159] } },
    { name: "DeepSeek-V3 on DeepSeek's servers", host: "ds", wh: { short: [2.777, 0.223], medium: [8.864, 0.724], long: [13.162, 1.126] } },
    { name: "DeepSeek-R1 on DeepSeek's servers", host: "ds", reasoning: true, wh: { short: [19.251, 9.449], medium: [24.596, 9.4], long: [29.078, 9.725] } },
  ];
  const ASSUMED = 300, J_PER_WH = 3600, PROMPT = 0.3;
  const sig = v => v >= 100 ? String(Math.round(v / 10) * 10) : v >= 10 ? String(Math.round(v)) : v >= 1 ? v.toFixed(1) : v.toFixed(2);
  const n = v => v.toLocaleString("en-US");

  function energyGroups(size) {
    const s = SIZES[size], per = (wh, tok) => wh * J_PER_WH / tok;
    return [
      { title: "Measured on the GPU, open-weight models", note: "GPU energy only", rows: [
        { name: "Qwen 3 32B, chat", sub: "One B200 GPU, batch 512 · ML.ENERGY", cls: "k1", v: 0.151, basis: "Stated directly: 0.151 J per token at steady state." },
        { name: "Qwen 3 32B, chat", sub: "One B200 GPU, batch 128 · ML.ENERGY", cls: "k1", v: 0.209, basis: "Stated directly: 0.209 J per token; mean response 627 tokens." },
        { name: "Qwen 3 32B, reasoning tasks", sub: "One B200 GPU, batch 128 · ML.ENERGY", cls: "k1", v: 0.312, basis: "Stated directly: 0.312 J per token; mean response 7,035 tokens." },
        { name: "Qwen 3 235B (22B active), reasoning", sub: "Four B200 GPUs · ML.ENERGY", cls: "k1", v: 0.4, text: "~0.4", basis: "Stated as approximately 0.4 J per token." },
        { name: "LLaMA 65B", sub: "2023-era GPUs · Samsi et al.", cls: "k1", v: 3.5, lo: 3, hi: 4, text: "3–4", basis: "Stated as roughly 3 to 4 J per output token." },
      ] },
      { title: "Modelled by Microsoft for frontier-scale models", note: "above 200B parameters, H100 nodes", rows: [
        { name: "Typical query", sub: "Median 0.31 Wh at about 300 output tokens", cls: "k2", v: per(0.31, 300), lo: per(0.16, 300), hi: per(0.60, 300), basis: "0.31 Wh ÷ 300 output tokens. Range is the interquartile range, 0.16 to 0.60 Wh." },
        { name: "Long query", sub: "Median 3.91 Wh at about 5,000 output tokens", cls: "k2", v: per(3.91, 5000), lo: per(2.15, 5000), hi: per(7.05, 5000), basis: "3.91 Wh ÷ 5,000 output tokens. Range is the interquartile range, 2.15 to 7.05 Wh." },
      ] },
      { title: "Reported per prompt by the provider", note: "no token count published; plotted at an assumed 300 output tokens", rows: [
        { name: "Google Gemini, accelerators only", sub: "0.14 Wh of the median prompt", cls: "k2", hol: true, v: per(0.14, ASSUMED), basis: "0.14 Wh ÷ 300 output tokens (assumed). The active-accelerator share of Google's 0.24 Wh." },
        { name: "Google Gemini, full stack", sub: "0.24 Wh per median text prompt, May 2025", cls: "k2", hol: true, v: per(0.24, ASSUMED), basis: "0.24 Wh ÷ 300 output tokens (assumed). Includes host, idle machines and PUE 1.09." },
        { name: "ChatGPT average query", sub: "0.34 Wh · Altman, June 2025", cls: "k2", hol: true, v: per(0.34, ASSUMED), basis: "0.34 Wh ÷ 300 output tokens (assumed). No methodology published." },
      ] },
      { title: "Estimated from API speed and assumed hardware", note: "Jegham et al., includes PUE · " + s.name, rows: JEGHAM.map(m => {
        const w = m.wh[size];
        return { name: m.name, sub: "Hosted on " + HOSTS[m.host].name + (m.reasoning ? " · reasoning tokens not counted as output" : ""), cls: "k3",
          v: per(w[0], s.outTok), lo: per(w[0] - w[1], s.outTok), hi: per(w[0] + w[1], s.outTok),
          basis: `${w[0]} Wh per query ÷ ${n(s.outTok)} output tokens. Range is ± one standard deviation.` };
      }) },
    ];
  }
  function waterGroups(size) {
    const s = SIZES[size], per = (ml, tok) => ml * 1000 / tok;
    return [
      { title: "Cooling water at the data center only", note: "", rows: [
        { name: "Microsoft, typical query", sub: "0.0 to 0.067 mL at about 300 output tokens", cls: "k2", v: per(0.067, 300), lo: 0, hi: per(0.067, 300), text: "≤ " + sig(per(0.067, 300)), basis: "Upper bound: 0.067 mL ÷ 300 output tokens. The reported range starts at zero." },
        { name: "Google Gemini, median prompt", sub: "0.26 mL at 1.15 L/kWh on site", cls: "k2", hol: true, v: per(0.26, ASSUMED), basis: "0.26 mL ÷ 300 output tokens (assumed)." },
      ] },
      { title: "Boundary not stated", note: "", rows: [
        { name: "ChatGPT average query", sub: "0.000085 gallons (0.32 mL) · Altman, June 2025", cls: "k2", hol: true, v: per(0.3218, ASSUMED), basis: "0.32 mL ÷ 300 output tokens (assumed)." },
      ] },
      { title: "Cooling plus electricity-generation water", note: "derived here from Jegham et al. · " + s.name, rows: JEGHAM.map(m => {
        const w = m.wh[size], h = HOSTS[m.host], f = h.on / h.pue + h.off; // mL per Wh
        return { name: m.name, sub: `${h.name}: ${h.on} L/kWh on site, ${h.off} off site`, cls: "k3",
          v: per(w[0] * f, s.outTok), lo: per((w[0] - w[1]) * f, s.outTok), hi: per((w[0] + w[1]) * f, s.outTok),
          basis: `${w[0]} Wh × (${h.on} ÷ ${h.pue} + ${h.off}) L/kWh = ${sig(w[0] * f)} mL, ÷ ${n(s.outTok)} output tokens.` };
      }) },
      { title: "Life-cycle method, marginal inference", note: "", rows: [
        { name: "Mistral Large 2", sub: "45 mL for a 400-token response", cls: "k2", v: per(45, 400), basis: "45 mL ÷ 400 output tokens. Stated by Mistral with Carbone 4 and ADEME." },
      ] },
    ];
  }
  const eq = wh => { const r = wh / PROMPT; return r < 0.75 ? `about 1/${Math.round(1 / r)} of a typical prompt` : r < 1.5 ? "about 1 typical prompt" : `about ${r >= 30 ? Math.round(r / 10) * 10 : Math.round(r)} typical prompts`; };
  const VID = 0.077 * 1000 / 6; // Wh for 10 minutes at the IEA's 0.077 kWh per hour
  function compareGroups() {
    const g = [
      { title: "One web search", note: "", rows: [
        { name: "Google search, 2024 recalculation", sub: "Google's 2009 figure adjusted for 15 years of hardware gains", cls: "k0", v: 0.04, basis: "About 0.00004 kWh per search, an independent estimate (arXiv 2407.16894)." },
        { name: "Google search, Google's 2009 figure", sub: "0.0003 kWh, about 1 kJ, per search", cls: "k0", v: 0.3, basis: "Stated by Google in 2009. Google has published no newer figure for plain search." },
      ] },
      { title: "One AI prompt", note: "data center only", rows: [
        { name: "Google Gemini, median text prompt", sub: "May 2025, full stack", cls: "k1", v: 0.24, basis: "Stated by Google: 0.24 Wh including host, idle machines and PUE." },
        { name: "Microsoft, typical frontier-scale query", sub: "About 300 output tokens", cls: "k1", v: 0.31, lo: 0.16, hi: 0.60, basis: "Median 0.31 Wh; range is the interquartile range, 0.16 to 0.60 Wh." },
        { name: "ChatGPT average query", sub: "Altman, June 2025", cls: "k1", v: 0.34, basis: "Stated as about 0.34 Wh. No methodology published." },
        { name: "Microsoft, long query", sub: "About 5,000 output tokens", cls: "k1", v: 3.91, lo: 2.15, hi: 7.05, basis: "Median 3.91 Wh; range is the interquartile range, 2.15 to 7.05 Wh." },
        { name: "DeepSeek-R1, long prompt", sub: "On DeepSeek's servers · Jegham et al. estimate", cls: "k1", v: 29.078, lo: 29.078 - 9.725, hi: 29.078 + 9.725, basis: "29.078 Wh ± 9.725 for 10,000 input and 1,500 output tokens, the highest value in Jegham et al." },
      ] },
      { title: "Ten minutes of streaming video", note: "IEA, 2019 data", rows: [
        { name: "Data centers only", sub: "5% of the total", cls: "k0", v: VID * 0.05, basis: "0.077 kWh per hour × 10/60 × 5%." },
        { name: "Data centers and networks", sub: "28% of the total, no screen", cls: "k0", v: VID * 0.28, basis: "0.077 kWh per hour × 10/60 × (5% + 23%)." },
        { name: "On a phone over Wi-Fi, everything", sub: "IEA scenario: 0.037 kWh per hour, SD video", cls: "k0", v: 37 / 6, basis: "0.037 kWh per hour × 10/60. More than 80% of this is the network." },
        { name: "Average device mix, everything", sub: "Mostly TVs, plus laptops, tablets and phones", cls: "k0", v: VID, basis: "0.077 kWh per hour × 10/60. Devices are 72%, networks 23%, data centers 5%." },
      ] },
      { title: "Your own device", note: "illustration, not a measurement", rows: [
        { name: "Laptop on for one minute", sub: "Assumed 20 W, roughly the time to read an answer", cls: "k0", v: 20 / 60, basis: "20 W × 1 minute. An assumed typical draw, shown for scale." },
      ] },
    ];
    g.forEach(grp => grp.rows.forEach(r => { r.sub += " · " + eq(r.v); r.basis += ` Equal to ${eq(r.v)} (0.3 Wh).`; }));
    return g;
  }

  // ── Log dot plot ──
  const logScale = (lo, hi) => { const a = Math.log10(lo), b = Math.log10(hi); return v => Math.max(0, Math.min(100, (Math.log10(Math.max(v, lo)) - a) / (b - a) * 100)); };
  const fmtTick = t => t >= 1 ? n(t) : String(t);
  const glines = (ticks, P) => ticks.map((t, i) => `<i class="dp-gl${i === 0 ? " base" : ""}" style="${i === ticks.length - 1 ? "right:0" : `left:${P(t)}%`}"></i>`).join("");
  const axis = (ticks, P, fmt, left, right) => `<div class="dp-axis" aria-hidden="true"><div class="dp-unit">${esc(left)}</div><div class="dp-trk">${ticks.map((t, i) =>
    `<span class="dp-tick${i === 0 ? " first" : i === ticks.length - 1 ? " last" : ""}" style="left:${P(t)}%">${fmt(t)}</span>`).join("")}</div><div class="dp-unit r">${esc(right)}</div></div>`;
  const tips = new WeakMap();
  function renderDots(hostId, tableId, groups, unit, axisLabel, dom, ticks) {
    const P = logScale(dom[0], dom[1]), host = document.getElementById(hostId);
    host.innerHTML = axis(ticks, P, fmtTick, axisLabel, unit) + groups.map((g, gi) =>
      `<div class="dp-grp">${esc(g.title)}${g.note ? ` <small>· ${esc(g.note)}</small>` : ""}</div>` + g.rows.map((r, ri) => {
        const val = r.text || sig(r.v);
        return `<div class="dp-row" tabindex="0" role="img" data-k="${gi}-${ri}" aria-label="${esc(`${r.name}, ${r.sub}: ${val} ${unit}. ${r.basis}`)}">
          <div class="dp-lab"><span class="dp-nm">${esc(r.name)}</span><span class="dp-sub">${esc(r.sub)}</span></div>
          <div class="dp-trk">${glines(ticks, P)}${r.lo != null && r.hi != null ? `<i class="dp-whk ${r.cls}" style="left:${P(r.lo)}%;width:${Math.max(0, P(r.hi) - P(r.lo))}%"></i>` : ""}<i class="dp-dot ${r.cls}${r.hol ? " hol" : ""}" style="left:${P(r.v)}%"></i></div>
          <div class="dp-val">${esc(val)}</div></div>`;
      }).join("")).join("") + axis(ticks, P, fmtTick, "", "");
    host.querySelectorAll(".dp-row").forEach(row => { const [gi, ri] = row.dataset.k.split("-"), r = groups[gi].rows[ri]; tips.set(row, { title: r.name, value: `${r.text || sig(r.v)} ${unit}`, basis: r.basis }); });
    document.getElementById(tableId).innerHTML = `<table><thead><tr><th>Group</th><th>Item</th><th class="r">${esc(unit)}</th><th>Basis</th></tr></thead><tbody>${groups.map(g => g.rows.map(r =>
      `<tr><td>${esc(g.title)}</td><td>${esc(r.name)} (${esc(r.sub)})</td><td class="r">${esc(r.text || sig(r.v))}</td><td>${esc(r.basis)}</td></tr>`).join("")).join("")}</tbody></table>`;
  }

  // ── Facility chart (linear stacked bars) ──
  const SITES = [
    { name: "Google fleet", sub: "PUE 1.09 · 1.15 L/kWh on site · off-site water not reported", pue: 1.09, on: 1.15, off: null },
    { name: "Azure, as assumed by Jegham et al.", sub: "PUE 1.12 · 0.30 L/kWh on site · 4.35 off site", pue: 1.12, on: 0.30, off: 4.35 },
    { name: "AWS, as assumed by Jegham et al.", sub: "PUE 1.14 · 0.18 L/kWh on site · 5.11 off site", pue: 1.14, on: 0.18, off: 5.11 },
    { name: "DeepSeek's own data centers", sub: "PUE 1.27 · 1.20 L/kWh on site · 6.016 off site", pue: 1.27, on: 1.20, off: 6.016 },
  ];
  function niceMax(v) { const p = Math.pow(10, Math.floor(Math.log10(v))), m = v / p, step = (m <= 1 ? 0.25 : m <= 2 ? 0.5 : m <= 4 ? 1 : m <= 8 ? 2 : 2.5) * p; return { step, max: Math.ceil(v / step) * step }; }
  function renderSites(j) {
    const host = document.getElementById("envSites");
    const data = SITES.map(s => { const on = j * s.on / 3.6, off = s.off == null ? null : j * s.pue * s.off / 3.6; return { s, on, off, total: on + (off || 0) }; });
    const nm = niceMax(Math.max(...data.map(d => d.total)) * 1.02), ticks = [];
    for (let t = 0; t <= nm.max + nm.step / 2; t += nm.step) ticks.push(Number(t.toPrecision(6)));
    const P = v => v / nm.max * 100, fmt = v => String(Number(v.toPrecision(3)));
    host.innerHTML = axis(ticks, P, fmt, "microlitres per token", "µL/token") + data.map((d, i) => {
      const basis = `Cooling: ${sig(d.on)} µL. Electricity generation: ${d.off == null ? "not reported" : sig(d.off) + " µL"}. Equal to litres per million tokens.`;
      return `<div class="dp-row" tabindex="0" role="img" data-i="${i}" aria-label="${esc(`${d.s.name}: ${sig(d.total)} microlitres per token. ${basis}`)}">
        <div class="dp-lab"><span class="dp-nm">${esc(d.s.name)}</span><span class="dp-sub">${esc(d.s.sub)}</span></div>
        <div class="dp-trk">${glines(ticks, P)}<i class="dp-seg a${d.off == null ? " end" : ""}" style="left:0;width:${P(d.on)}%"></i>${d.off != null ? `<i class="dp-seg b" style="left:calc(${P(d.on)}% + 2px);width:calc(${P(d.off)}% - 2px)"></i>` : ""}</div>
        <div class="dp-val">${d.off == null ? "≥ " : ""}${sig(d.total)}</div></div>`;
    }).join("");
    host.querySelectorAll(".dp-row").forEach(row => { const d = data[row.dataset.i]; tips.set(row, { title: d.s.name, value: `${sig(d.total)} µL/token at ${j} J/token`, basis: `Cooling: ${sig(d.on)} µL. Electricity generation: ${d.off == null ? "not reported" : sig(d.off) + " µL"}.` }); });
    document.getElementById("envSitesTable").innerHTML = `<table><thead><tr><th>Facility profile</th><th class="r">Cooling, µL/token</th><th class="r">Electricity generation, µL/token</th><th class="r">Total, µL/token</th></tr></thead><tbody>${data.map(d =>
      `<tr><td>${esc(d.s.name)}</td><td class="r">${sig(d.on)}</td><td class="r">${d.off == null ? "not reported" : sig(d.off)}</td><td class="r">${d.off == null ? "≥ " : ""}${sig(d.total)}</td></tr>`).join("")}</tbody></table>`;
  }

  // ── Tooltip (shared #ctip) ──
  const root = document.getElementById("v-environment");
  function showTip(row, x, y) {
    const d = tips.get(row); if (!d) return;
    tip.innerHTML = `<b>${esc(d.title)}</b><span class="num">${esc(d.value)}</span><br>${esc(d.basis)}`; tip.hidden = false;
    const r = tip.getBoundingClientRect();
    tip.style.left = Math.max(8, Math.min(x + 14, innerWidth - r.width - 8)) + "px";
    tip.style.top = Math.max(8, y + 18 + r.height > innerHeight ? y - r.height - 12 : y + 18) + "px";
  }
  root.addEventListener("pointermove", e => { const r = e.target.closest && e.target.closest(".dp-row"); if (r) showTip(r, e.clientX, e.clientY); else tip.hidden = true; });
  root.addEventListener("pointerleave", () => (tip.hidden = true));
  root.addEventListener("focusin", e => { if (e.target.classList && e.target.classList.contains("dp-row")) { const b = e.target.getBoundingClientRect(); showTip(e.target, b.left + b.width / 2, b.bottom - 14); } });
  root.addEventListener("focusout", () => (tip.hidden = true));

  // ── Controls ──
  let size = "short";
  const drawTop = () => {
    renderDots("envEnergy", "envEnergyTable", energyGroups(size), "J/token", "joules per output token, log scale", [0.1, 1000], [0.1, 1, 10, 100, 1000]);
    renderDots("envWater", "envWaterTable", waterGroups(size), "µL/token", "microlitres per output token, log scale", [0.1, 1000], [0.1, 1, 10, 100, 1000]);
  };
  document.querySelectorAll("[data-size]").forEach(b => b.addEventListener("click", () => {
    size = b.dataset.size; document.querySelectorAll("[data-size]").forEach(x => x.setAttribute("aria-pressed", x === b)); drawTop();
  }));
  const jpt = document.getElementById("envJ");
  const syncJ = () => { const j = parseFloat(jpt.value); if (!(j > 0)) return; document.querySelectorAll("[data-j]").forEach(x => x.setAttribute("aria-pressed", parseFloat(x.dataset.j) === j)); renderSites(j); };
  jpt.addEventListener("input", syncJ);
  document.querySelectorAll("[data-j]").forEach(b => b.addEventListener("click", () => { jpt.value = b.dataset.j; syncJ(); }));

  // ── Your own use (arithmetic on the figures above) ──
  const range = document.getElementById("envN"), outN = document.getElementById("envNOut"), you = document.getElementById("envYou");
  let kind = "typical";
  const KIND = { typical: { wh: 0.3, ml: 0.26, label: "typical prompts (0.3 Wh, 0.26 mL of cooling water each)" }, long: { wh: 3.91, ml: null, label: "long queries (3.91 Wh each, Microsoft's median)" } };
  function drawYou() {
    const per = +range.value, k = KIND[kind], kwh = per * 365 * k.wh / 1000;
    outN.textContent = per;
    const laptopH = kwh * 1000 / 20, streamH = kwh / 0.077;
    you.innerHTML = `
      <div class="stat"><span class="v">${kwh >= 10 ? kwh.toFixed(0) : kwh.toFixed(1)} kWh</span><span class="k">Data center energy per year for ${per} ${esc(k.label.split(" (")[0])} a day</span></div>
      <div class="stat"><span class="v">${laptopH >= 100 ? n(Math.round(laptopH)) : laptopH.toFixed(0)} h</span><span class="k">The same energy as running a 20 W laptop for this long</span></div>
      <div class="stat"><span class="v">${streamH >= 10 ? streamH.toFixed(0) : streamH.toFixed(1)} h</span><span class="k">The same energy as this much streaming video, counting screen and network (IEA, 2019)</span></div>
      <div class="stat"><span class="v">${k.ml == null ? "n/a" : (per * 365 * k.ml / 1000).toFixed(1) + " L"}</span><span class="k">${k.ml == null ? "No per-query water figure is published for long queries" : "Cooling water per year at Google's 0.26 mL per prompt"}</span></div>`;
  }
  range.addEventListener("input", drawYou);
  document.querySelectorAll("[data-kind]").forEach(b => b.addEventListener("click", () => { kind = b.dataset.kind; document.querySelectorAll("[data-kind]").forEach(x => x.setAttribute("aria-pressed", x === b)); drawYou(); }));

  drawTop(); syncJ(); drawYou();
  renderDots("envCompare", "envCompareTable", compareGroups(), "Wh", "watt-hours per activity, log scale", [0.01, 100], [0.01, 0.1, 1, 10, 100]);
})();
