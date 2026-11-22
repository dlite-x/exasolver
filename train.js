// Training page: two models that really train in the browser.
//  1. A 2-6-1 neural network learning to separate two groups of dots (full-batch gradient descent).
//  2. A tiny next-word model (3 words of context, about 6,000 weights) trained on a few dozen sentences with Adam.
// Nothing here is recorded or faked: reloading and pressing Train repeats the same run because the random seed is fixed.
(() => {
  if (!document.getElementById("nnNet")) return;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  function rng(seed) { let s = seed >>> 0; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }
  const gauss = r => Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());
  const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const press = (sel, attr, val) => document.querySelectorAll(sel).forEach(b => b.setAttribute("aria-pressed", b.getAttribute(attr) === val));
  const NS = "http://www.w3.org/2000/svg";

  // ══ 1. A small network learning a pattern ══
  const HN = 6, RATES = { slow: 0.08, normal: 0.3, fast: 6 };
  let pts = [], net, hist = [], nStep = 0, run1 = false, rate = "normal", shape = "ring";
  function makeData(kind) {
    const r = rng(11), out = [];
    while (out.length < 140) {
      const x = r() * 2 - 1, y = r() * 2 - 1, d = Math.hypot(x, y);
      if (kind === "ring") { if (d < 0.38) out.push([x, y, 1]); else if (d > 0.62 && d < 0.98) out.push([x, y, 0]); }
      else if (kind === "blobs") { const c = out.length % 2; out.push([(c ? 0.45 : -0.45) + gauss(r) * 0.22, (c ? 0.35 : -0.35) + gauss(r) * 0.22, c]); }
      else { if (Math.abs(x) > 0.12 && Math.abs(y) > 0.12) out.push([x, y, x * y > 0 ? 1 : 0]); }
    }
    return out;
  }
  function initNet() { const r = rng(5); net = { w1: Float64Array.from({ length: HN * 2 }, () => (r() * 2 - 1) * 1.4), b1: Float64Array.from({ length: HN }, () => (r() * 2 - 1) * 0.5), w2: Float64Array.from({ length: HN }, () => (r() * 2 - 1) * 1.2), b2: 0 }; hist = []; nStep = 0; }
  const hbuf = new Float64Array(HN);
  function fwd(x, y) { let z = net.b2; for (let i = 0; i < HN; i++) { const a = Math.tanh(net.w1[2 * i] * x + net.w1[2 * i + 1] * y + net.b1[i]); hbuf[i] = a; z += net.w2[i] * a; } return 1 / (1 + Math.exp(-z)); }
  function measure() { let loss = 0, ok = 0; for (const [x, y, l] of pts) { const p = Math.min(1 - 1e-7, Math.max(1e-7, fwd(x, y))); loss -= l ? Math.log(p) : Math.log(1 - p); if ((p > 0.5) === !!l) ok++; } return [loss / pts.length, ok / pts.length]; }
  function trainStep() {
    const g1 = new Float64Array(HN * 2), gb1 = new Float64Array(HN), g2 = new Float64Array(HN); let gb2 = 0;
    for (const [x, y, l] of pts) { const d = fwd(x, y) - l; gb2 += d; for (let i = 0; i < HN; i++) { const a = hbuf[i], dh = d * net.w2[i] * (1 - a * a); g2[i] += d * a; g1[2 * i] += dh * x; g1[2 * i + 1] += dh * y; gb1[i] += dh; } }
    const k = RATES[rate] / pts.length;
    for (let i = 0; i < HN; i++) { net.w2[i] -= k * g2[i]; net.b1[i] -= k * gb1[i]; net.w1[2 * i] -= k * g1[2 * i]; net.w1[2 * i + 1] -= k * g1[2 * i + 1]; }
    net.b2 -= k * gb2; nStep++;
  }
  // network drawing
  const netSvg = document.getElementById("nnNet"), IN = [[46, 78], [46, 152]], HID = Array.from({ length: HN }, (_, i) => [160, 28 + i * 35]), OUT = [274, 115];
  const mk = (tag, attrs, parent) => { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); (parent || netSvg).appendChild(n); return n; };
  netSvg.setAttribute("viewBox", "0 0 320 232");
  const e1 = [], e2 = [];
  for (let i = 0; i < HN; i++) { for (let j = 0; j < 2; j++) e1.push(mk("line", { x1: IN[j][0], y1: IN[j][1], x2: HID[i][0], y2: HID[i][1], class: "nn-edge" })); e2.push(mk("line", { x1: HID[i][0], y1: HID[i][1], x2: OUT[0], y2: OUT[1], class: "nn-edge" })); }
  IN.forEach((p, j) => { mk("circle", { cx: p[0], cy: p[1], r: 13, class: "nn-node" }); mk("text", { x: p[0], y: p[1] + 4, class: "nn-t" }).textContent = j ? "y" : "x"; });
  HID.forEach(p => mk("circle", { cx: p[0], cy: p[1], r: 10, class: "nn-node" }));
  mk("circle", { cx: OUT[0], cy: OUT[1], r: 14, class: "nn-node" }); mk("text", { x: OUT[0], y: OUT[1] + 4, class: "nn-t" }).textContent = "?";
  [["position of a dot", 46, 222], ["6 hidden units", 160, 222], ["blue or orange", 274, 222]].forEach(([t, x, y]) => (mk("text", { x, y, class: "nn-cap" }).textContent = t));
  function drawNet() {
    const sty = (el, w) => { el.style.stroke = w >= 0 ? "var(--s1)" : "var(--s2)"; el.style.strokeWidth = Math.min(7, 0.5 + Math.abs(w) * 1.3); };
    for (let i = 0; i < HN; i++) { sty(e1[2 * i], net.w1[2 * i]); sty(e1[2 * i + 1], net.w1[2 * i + 1]); sty(e2[i], net.w2[i]); }
  }
  // decision map
  const cvs = document.getElementById("nnMap"), ctx = cvs.getContext("2d"), G = 48, CS = 264;
  const toRgb = c => { const d = document.createElement("i"); d.style.color = c; document.body.appendChild(d); const m = getComputedStyle(d).color.match(/[\d.]+/g).map(Number); d.remove(); return m; };
  let cA, cB, cBg, cInk;
  const readColors = () => { cA = toRgb(css("--s2")); cB = toRgb(css("--s1")); cBg = toRgb(css("--surface")); cInk = css("--surface"); };
  function drawMap() {
    const dpr = Math.min(2, devicePixelRatio || 1); if (cvs.width !== CS * dpr) { cvs.width = cvs.height = CS * dpr; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); const cell = CS / G;
    for (let i = 0; i < G; i++) for (let j = 0; j < G; j++) {
      const p = fwd(-1 + (i + 0.5) * 2 / G, 1 - (j + 0.5) * 2 / G), t = Math.abs(p - 0.5) * 2, c = p > 0.5 ? cB : cA, a = 0.12 + 0.5 * t;
      ctx.fillStyle = `rgb(${c.map((v, k) => Math.round(cBg[k] + (v - cBg[k]) * a)).join(",")})`; ctx.fillRect(i * cell, j * cell, cell + 0.6, cell + 0.6);
    }
    for (const [x, y, l] of pts) { ctx.beginPath(); ctx.arc((x + 1) / 2 * CS, (1 - y) / 2 * CS, 3.6, 0, 7); ctx.fillStyle = `rgb(${(l ? cB : cA).join(",")})`; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = cInk; ctx.stroke(); }
  }
  // loss chart (shared by both demos)
  function drawLoss(svg, h, yMax, label) {
    const W = 320, H = 130, L = 34, B = 20, T = 8, n = h.length, step = Math.max(1, Math.ceil(n / 240));
    let d = ""; for (let i = 0; i < n; i += step) d += `${d ? "L" : "M"}${(L + (W - L - 6) * (n > 1 ? i / (n - 1) : 0)).toFixed(1)},${(T + (H - B - T) * (1 - Math.min(1, h[i] / yMax))).toFixed(1)}`;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.innerHTML = `<line class="lc-ax" x1="${L}" y1="${T}" x2="${L}" y2="${H - B}"></line><line class="lc-ax" x1="${L}" y1="${H - B}" x2="${W - 6}" y2="${H - B}"></line>
      <line class="lc-grid" x1="${L}" y1="${T + (H - B - T) / 2}" x2="${W - 6}" y2="${T + (H - B - T) / 2}"></line>
      <text class="lc-t" x="${L - 5}" y="${T + 4}" text-anchor="end">${yMax.toFixed(1)}</text><text class="lc-t" x="${L - 5}" y="${H - B + 3}" text-anchor="end">0</text>
      <text class="lc-t" x="${L}" y="${H - 5}">0</text><text class="lc-t" x="${W - 6}" y="${H - 5}" text-anchor="end">${label}</text>${n > 1 ? `<path class="lc-line" d="${d}"></path>` : ""}`;
  }
  const lossSvg1 = document.getElementById("nnLoss");
  function show1() {
    const [loss, acc] = measure();
    drawNet(); drawMap(); drawLoss(lossSvg1, hist, 0.8, `step ${nStep}`);
    document.getElementById("nnStats").innerHTML = `<div class="stat"><span class="v">${nStep}</span><span class="k">Training steps taken</span></div><div class="stat"><span class="v">${loss.toFixed(3)}</span><span class="k">Error (loss). Lower is better.</span></div><div class="stat"><span class="v">${Math.round(acc * 100)}%</span><span class="k">Dots coloured correctly</span></div>`;
    document.getElementById("nnRun").textContent = run1 ? "Pause" : nStep ? "Keep training" : "Train";
    document.getElementById("nnRun").setAttribute("aria-pressed", run1);
  }
  function reset1() { run1 = false; pts = makeData(shape); initNet(); hist.push(measure()[0]); show1(); }
  function loop1() { if (!run1) return; trainStep(); hist.push(measure()[0]); show1(); if (nStep >= 3000) { run1 = false; show1(); return; } requestAnimationFrame(loop1); }
  document.getElementById("nnRun").addEventListener("click", () => { run1 = !run1; show1(); if (run1) requestAnimationFrame(loop1); });
  document.getElementById("nnStep").addEventListener("click", () => { run1 = false; trainStep(); hist.push(measure()[0]); show1(); });
  document.getElementById("nnReset").addEventListener("click", reset1);
  document.querySelectorAll("[data-shape]").forEach(b => b.addEventListener("click", () => { shape = b.dataset.shape; press("[data-shape]", "data-shape", shape); reset1(); }));
  document.querySelectorAll("[data-rate]").forEach(b => b.addEventListener("click", () => { rate = b.dataset.rate; press("[data-rate]", "data-rate", rate); }));

  // ══ 2. A tiny language model ══
  const TEXT = `chips are designed by nvidia . chips are made by tsmc in taiwan . tsmc prints chips with machines from asml . memory chips come from korea .
a gpu does the math for ai . a gpu needs fast memory next to it . a rack holds many gpus . a data center holds many racks .
a data center needs power and cooling . power comes from the grid . heat leaves through the cooling system . clouds rent gpus by the hour .
labs rent gpus to train models . a model is made of numbers called weights . training changes the weights a little at a time . training needs data and many gpus .
the model learns to predict the next word . a good model makes small errors . a bad model makes large errors . the loss measures the errors .
training makes the loss go down . inference is when the model answers a question . people pay for the answers . money flows back to the labs .
the labs pay the clouds . the clouds pay nvidia for chips . nvidia pays tsmc to make the chips . tsmc pays asml for machines .
the chain starts with sand and light . the chain ends with a chat window .`;
  const sents = TEXT.split(".").map(s => s.trim().split(/\s+/).filter(Boolean)).filter(s => s.length);
  const vocab = ["<s>", "."]; sents.forEach(s => s.forEach(w => { if (!vocab.includes(w)) vocab.push(w); }));
  const id = Object.fromEntries(vocab.map((w, i) => [w, i])), V = vocab.length, CTX = 3, D = 12, HL = 32;
  const EX = []; sents.forEach(s => { const t = [0, 0, 0, ...s.map(w => id[w]), 1]; for (let i = CTX; i < t.length; i++) EX.push([t[i - 3], t[i - 2], t[i - 1], t[i]]); });
  const oE = 0, oW1 = oE + V * D, oB1 = oW1 + HL * CTX * D, oW2 = oB1 + HL, oB2 = oW2 + V * HL, NP = oB2 + V;
  let Wt, mA, vA, tA, lmHist = [], lmStep = 0, run2 = false, rr;
  const xb = new Float32Array(CTX * D), hb = new Float32Array(HL), pb = new Float32Array(V), dh = new Float32Array(HL), gr = new Float32Array(NP);
  function initLM() { const r = rng(21); Wt = new Float32Array(NP); for (let i = 0; i < oB1; i++) Wt[i] = gauss(r) * 0.25; for (let i = oW2; i < oB2; i++) Wt[i] = gauss(r) * 0.25; mA = new Float32Array(NP); vA = new Float32Array(NP); tA = 0; lmHist = []; lmStep = 0; rr = rng(77); }
  function lmFwd(c) { // fills xb, hb, pb
    for (let k = 0; k < CTX; k++) for (let d = 0; d < D; d++) xb[k * D + d] = Wt[oE + c[k] * D + d];
    for (let j = 0; j < HL; j++) { let a = Wt[oB1 + j]; const o = oW1 + j * CTX * D; for (let i = 0; i < CTX * D; i++) a += Wt[o + i] * xb[i]; hb[j] = Math.tanh(a); }
    let mx = -1e9; for (let v = 0; v < V; v++) { let z = Wt[oB2 + v]; const o = oW2 + v * HL; for (let j = 0; j < HL; j++) z += Wt[o + j] * hb[j]; pb[v] = z; if (z > mx) mx = z; }
    let sum = 0; for (let v = 0; v < V; v++) { pb[v] = Math.exp(pb[v] - mx); sum += pb[v]; } for (let v = 0; v < V; v++) pb[v] /= sum;
  }
  function lmTrain() {
    gr.fill(0); const B = 16;
    for (let b = 0; b < B; b++) {
      const ex = EX[Math.floor(rr() * EX.length)]; lmFwd(ex); dh.fill(0);
      for (let v = 0; v < V; v++) { const dz = (pb[v] - (v === ex[3] ? 1 : 0)) / B; if (Math.abs(dz) < 1e-9) continue; gr[oB2 + v] += dz; const o = oW2 + v * HL; for (let j = 0; j < HL; j++) { gr[o + j] += dz * hb[j]; dh[j] += dz * Wt[o + j]; } }
      for (let j = 0; j < HL; j++) { const dp = dh[j] * (1 - hb[j] * hb[j]); gr[oB1 + j] += dp; const o = oW1 + j * CTX * D; for (let i = 0; i < CTX * D; i++) { gr[o + i] += dp * xb[i]; gr[oE + ex[Math.floor(i / D)] * D + (i % D)] += dp * Wt[o + i]; } }
    }
    tA++; const lr = 0.004, b1 = 0.9, b2 = 0.999, c1 = 1 - Math.pow(b1, tA), c2 = 1 - Math.pow(b2, tA);
    for (let i = 0; i < NP; i++) { const g = gr[i]; mA[i] = b1 * mA[i] + (1 - b1) * g; vA[i] = b2 * vA[i] + (1 - b2) * g * g; Wt[i] -= lr * (mA[i] / c1) / (Math.sqrt(vA[i] / c2) + 1e-8); }
    lmStep++;
  }
  function lmLoss() { let l = 0; for (const ex of EX) { lmFwd(ex); l -= Math.log(Math.max(1e-9, pb[ex[3]])); } return l / EX.length; }
  const toks = s => s.toLowerCase().replace(/[^a-z\s]/g, " ").trim().split(/\s+/).filter(Boolean);
  function complete(words) {
    const known = words.filter(w => id[w] !== undefined), t = [0, 0, 0, ...known.map(w => id[w])], out = [];
    for (let n = 0; n < 11; n++) { lmFwd(t.slice(-3)); let best = 0; for (let v = 1; v < V; v++) if (pb[v] > pb[best]) best = v; if (best === 1 || best === 0) break; out.push(vocab[best]); t.push(best); }
    lmFwd([0, 0, 0, ...known.map(w => id[w])].slice(-3));
    const top = Array.from(pb).map((p, v) => [p, v]).filter(x => x[1] !== 0).sort((a, b) => b[0] - a[0]).slice(0, 5);
    return { out, top, unknown: words.filter(w => id[w] === undefined) };
  }
  let prompt = "a data center needs";
  const lmIn = document.getElementById("lmPrompt"), lossSvg2 = document.getElementById("lmLoss");
  function show2() {
    const loss = lmHist[lmHist.length - 1], { out, top, unknown } = complete(toks(prompt));
    document.getElementById("lmOut").innerHTML = `<span class="lm-p">${esc(toks(prompt).join(" "))}</span> <span class="lm-g">${out.length ? esc(out.join(" ")) : "…"}</span>`;
    document.getElementById("lmNote").textContent = unknown.length ? `The model has never seen: ${unknown.join(", ")}. It skips words it doesn't know.` : lmStep === 0 ? "Untrained, the model strings together random words." : loss < 0.6 ? "It now finishes the sentence the way the training text does." : "Real words are settling into place as the error falls.";
    document.getElementById("lmTop").innerHTML = top.map(([p, v]) => `<span class="lab">${esc(vocab[v] === "." ? "(end of sentence)" : vocab[v])}</span><span class="btrack"><span class="bfill s3" style="width:calc(${(p * 100).toFixed(1)}% - ${(p * 52).toFixed(0)}px)"></span><span class="val">${(p * 100).toFixed(0)}%</span></span>`).join("");
    drawLoss(lossSvg2, lmHist, 5, `step ${lmStep}`);
    document.getElementById("lmStats").innerHTML = `<div class="stat"><span class="v">${lmStep}</span><span class="k">Training steps, 16 examples each</span></div><div class="stat"><span class="v">${loss.toFixed(2)}</span><span class="k">Error (loss). Guessing at random scores ${Math.log(V).toFixed(1)}.</span></div><div class="stat"><span class="v">${NP.toLocaleString("en-US")}</span><span class="k">Weights in this model</span></div><div class="stat"><span class="v">${V - 2}</span><span class="k">Different words it knows</span></div>`;
    document.getElementById("lmRun").textContent = run2 ? "Pause" : lmStep ? "Keep training" : "Train the model";
    document.getElementById("lmRun").setAttribute("aria-pressed", run2);
  }
  function reset2() { run2 = false; initLM(); lmHist.push(lmLoss()); show2(); }
  function loop2() { if (!run2) return; lmTrain(); if (lmStep % 2 === 0) { lmHist.push(lmLoss()); show2(); } if (lmStep >= 1200) { run2 = false; show2(); return; } requestAnimationFrame(loop2); }
  document.getElementById("lmRun").addEventListener("click", () => { run2 = !run2; show2(); if (run2) requestAnimationFrame(loop2); });
  document.getElementById("lmReset").addEventListener("click", reset2);
  document.querySelectorAll("[data-lmp]").forEach(b => b.addEventListener("click", () => { prompt = b.dataset.lmp; lmIn.value = prompt; press("[data-lmp]", "data-lmp", prompt); show2(); }));
  lmIn.addEventListener("input", () => { prompt = lmIn.value; press("[data-lmp]", "data-lmp", prompt); show2(); });
  document.getElementById("lmText").textContent = sents.map(s => s.join(" ") + ".").join(" ");
  document.getElementById("lmCount").textContent = `${sents.length} sentences, ${EX.length - sents.length} words`;

  const recolor = () => { readColors(); drawMap(); };
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", recolor);
  new MutationObserver(recolor).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  readColors(); reset1(); reset2();
  window.VCTrain = {
    pause() { run1 = run2 = false; show1(); show2(); },
    // Jump ahead n steps without animating; handy for checking how a run ends.
    advance(which, n) { if (which === "net") { for (let i = 0; i < n; i++) trainStep(); hist.push(measure()[0]); show1(); } else { for (let i = 0; i < n; i++) lmTrain(); lmHist.push(lmLoss()); show2(); } },
  };
})();
