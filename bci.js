// Brain-computer interfaces page. Content adapted from the draft commentary "Brains connecting to the Future"
// and its LinkedIn version (2025). Figures are redrawn here from the draft's figures; company logos are replaced by names.
(() => {
  const fig1 = document.getElementById("bciWhere");
  if (!fig1) return;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const tip = document.getElementById("ctip");
  function rng(seed) { let s = seed >>> 0; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }
  const showTip = (html, x, y) => { tip.innerHTML = html; tip.hidden = false; const r = tip.getBoundingClientRect(); tip.style.left = Math.max(8, Math.min(x + 14, innerWidth - r.width - 8)) + "px"; tip.style.top = Math.max(8, Math.min(y + 14, innerHeight - r.height - 8)) + "px"; };

  // Three categories, coloured the same way in every figure on the page.
  const CATS = {
    ext: { name: "Non-invasive", sub: "EEG and fNIRS headsets, ultrasound", color: "var(--s3)", res: "100,000 to 1 million neurons per electrode" },
    min: { name: "Minimally invasive", sub: "ECoG and vascular", color: "var(--s1)", res: "Hundreds to thousands of neurons per electrode" },
    tis: { name: "In brain tissue", sub: "Microelectrodes and threads", color: "var(--s2)", res: "Down to single neurons" },
  };

  // ── Figure 1: where the electrodes sit ──
  const DEVS = {
    eeg: { cat: "ext", name: "EEG sensors", where: "On the scalp, outside the head.", hears: "About 100,000 to 1 million neurons per electrode. The skull blurs the signal.", surgery: "None.", use: "Gaming, brain-health monitoring and steering drones or robots by thought. Neurolutions sells a medical EEG system for recovering movement after a stroke.", who: "OpenBCI, Emotiv, Neurable, Neurolutions, MindMaze, Bitbrain, NeuroSky",
      zones: [[220, 232, 150, 66]] },
    ecog: { cat: "min", name: "ECoG grid", where: "Under the skull, lying on the surface of the brain. It does not pierce brain tissue.", hears: "Hundreds to thousands of neurons per electrode.", surgery: "An opening in the skull.", use: "Clinical use, such as decoding intended speech or movement.", who: "Precision Neuroscience, Inbrain Neuroelectronics, Neurosoft Bioelectronics",
      zones: [[355, 190, 62, 30]] },
    stent: { cat: "min", name: "Endovascular stent", where: "Inside a blood vessel beside the motor cortex, delivered through the veins like a cardiac stent.", hears: "Hundreds to thousands of neurons, through the vessel wall.", surgery: "No opening in the skull.", use: "Letting paralysed people text and control devices by imagining movements.", who: "Synchron (the Stentrode)",
      zones: [[490, 190, 56, 32]] },
    micro: { cat: "tis", name: "Microelectrodes and threads", where: "Pushed into the brain tissue itself, within micrometres of neurons.", hears: "Small groups of neurons, down to a single one.", surgery: "The most involved: the skull is opened and electrodes are inserted, sometimes by robot.", use: "The most precise decoding of speech and movement. Neuralink is also working on restoring vision.", who: "Blackrock Neurotech, Neuralink, Paradromics, StairMed, NeuroXess",
      zones: [[612, 222, 9, 9], [632, 222, 9, 9], [652, 222, 9, 9]] },
  };
  const BANDS = [["Scalp", 50, 82, "--an-skin"], ["Skull", 82, 128, "--an-bone"], ["Dura", 128, 138, "--an-dura"], ["Fluid and vessels", 138, 164, "--an-csf"], ["Cortex", 164, 292, "--an-cortex"], ["White matter", 292, 360, "--an-wm"]];
  const r1 = rng(7), neurons = [];
  [[612, 224], [633, 219], [651, 226]].forEach(p => neurons.push(p)); // three that sit at the needle tips
  while (neurons.length < 86) { const p = [136 + r1() * 610, 178 + r1() * 104]; if (neurons.every(q => Math.hypot(q[0] - p[0], q[1] - p[1]) > 15)) neurons.push(p); }
  const inZone = (p, z) => ((p[0] - z[0]) / z[2]) ** 2 + ((p[1] - z[1]) / z[3]) ** 2 <= 1;
  const tri = ([x, y]) => `M${x},${y - 5}L${x + 4.5},${y + 3.5}L${x - 4.5},${y + 3.5}Z`;
  const devG = (id, label, lx, inner) => `<g class="dev" data-dev="${id}" tabindex="0" role="button" aria-label="${esc(DEVS[id].name)}" style="--dc:${CATS[DEVS[id].cat].color}">
      <line class="lead" x1="${lx}" y1="30" x2="${lx}" y2="${id === "eeg" ? 40 : 146}"></line>${inner}
      <text class="devlab" x="${lx}" y="22">${esc(label)}</text><rect class="hit" x="${lx - 62}" y="4" width="124" height="${id === "micro" ? 232 : 162}"></rect></g>`;
  fig1.innerHTML = `<svg viewBox="0 0 760 360" role="group" aria-label="Cross-section of the head showing where each kind of electrode sits">
    ${BANDS.map(([n, y0, y1, c]) => `<rect x="0" y="${y0}" width="760" height="${y1 - y0}" fill="var(${c})"></rect><text class="band" x="10" y="${(y0 + y1) / 2 + 4}">${n}</text>`).join("")}
    <g class="zones">${Object.entries(DEVS).map(([id, d]) => d.zones.map(z => `<ellipse class="zone" data-z="${id}" cx="${z[0]}" cy="${z[1]}" rx="${z[2]}" ry="${z[3]}" fill="${CATS[d.cat].color}"></ellipse>`).join("")).join("")}</g>
    <g class="neurons">${neurons.map((p, i) => `<path class="neu" data-n="${i}" d="${tri(p)}"></path>`).join("")}</g>
    ${devG("eeg", "EEG sensors", 220, `<rect class="body" x="188" y="40" width="26" height="10" rx="3"></rect><rect class="body" x="226" y="40" width="26" height="10" rx="3"></rect>`)}
    ${devG("ecog", "ECoG grid", 355, `<rect class="body" x="302" y="157" width="106" height="6" rx="2"></rect>${[0, 1, 2, 3, 4, 5, 6].map(i => `<circle class="contact" cx="${313 + i * 14}" cy="164" r="2.6"></circle>`).join("")}`)}
    ${devG("stent", "Endovascular stent", 490, `<ellipse class="vessel" cx="490" cy="151" rx="52" ry="11"></ellipse><path class="mesh" d="M446,151 ${[0, 1, 2, 3, 4, 5, 6, 7].map(i => `L${452 + i * 11},${i % 2 ? 157 : 145}`).join(" ")} L534,151 M446,151 ${[0, 1, 2, 3, 4, 5, 6, 7].map(i => `L${452 + i * 11},${i % 2 ? 145 : 157}`).join(" ")} L534,151"></path>`)}
    ${devG("micro", "Microelectrodes", 632, `<rect class="body" x="598" y="150" width="68" height="9" rx="2"></rect>${[0, 1, 2, 3, 4, 5].map(i => `<line class="needle" x1="${607 + i * 10}" y1="159" x2="${607 + i * 10}" y2="${i % 2 ? 214 : 222}"></line>`).join("")}`)}
  </svg>`;
  const card1 = document.getElementById("bciWhereCard");
  function pickDev(id) {
    const d = DEVS[id], c = CATS[d.cat];
    fig1.querySelectorAll(".dev").forEach(g => g.classList.toggle("on", g.dataset.dev === id));
    fig1.querySelectorAll(".zone").forEach(z => z.classList.toggle("on", z.dataset.z === id));
    let heard = 0;
    fig1.querySelectorAll(".neu").forEach(n => { const on = d.zones.some(z => inZone(neurons[n.dataset.n], z)); n.classList.toggle("on", on); n.style.fill = on ? c.color : ""; heard += on; });
    document.querySelectorAll("[data-devbtn]").forEach(b => b.setAttribute("aria-pressed", b.dataset.devbtn === id));
    card1.innerHTML = `<p class="eyebrow"><i style="background:${c.color}"></i>${esc(c.name)}</p><h3>${esc(d.name)}</h3>
      <dl><dt>Where</dt><dd>${esc(d.where)}</dd><dt>Hears</dt><dd>${esc(d.hears)}</dd><dt>Surgery</dt><dd>${esc(d.surgery)}</dd><dt>Used for</dt><dd>${esc(d.use)}</dd><dt>Who</dt><dd>${esc(d.who)}</dd></dl>
      <p class="keynote">In this sketch its electrodes pick up ${heard} of the ${neurons.length} neurons drawn. Real numbers are far larger.</p>`;
  }
  fig1.querySelectorAll(".dev").forEach(g => { g.addEventListener("click", () => pickDev(g.dataset.dev)); g.addEventListener("mouseenter", () => pickDev(g.dataset.dev)); g.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pickDev(g.dataset.dev); } }); });
  document.querySelectorAll("[data-devbtn]").forEach(b => b.addEventListener("click", () => pickDev(b.dataset.devbtn)));
  pickDev("micro");

  // ── Figure 2: spike sorting ──
  const NEU = [
    { name: "Neuron A", note: "closest to the electrode, so its spikes are tallest", color: "var(--s5)", amp: 1.0, w: 5, rate: 0.021 },
    { name: "Neuron B", note: "further away, with a wider spike", color: "var(--s4)", amp: 0.62, w: 9, rate: 0.017 },
    { name: "Neuron C", note: "furthest away, so its spikes are small", color: "var(--accent)", amp: 0.36, w: 4, rate: 0.024 },
  ];
  const N = 720, sortHost = document.getElementById("bciSort");
  const shape = (k, t) => { const n = NEU[k], u = t / n.w; return n.amp * (Math.exp(-u * u * 2.2) - (k === 1 ? 0.45 : 0.3) * Math.exp(-((u - 1.5) ** 2) * 1.4)); };
  // Spikes are spaced so they never overlap; real recordings are messier.
  const r2 = rng(42), spikes = NEU.map(() => []);
  for (let t = 34, last = -1; t < N - 30; t += 40 + r2() * 26) { let k = Math.floor(r2() * 3); if (k === last && r2() < 0.6) k = (k + 1) % 3; spikes[k].push(Math.round(t)); last = k; }
  const noiseBase = Array.from({ length: N }, () => (r2() + r2() + r2() - 1.5) * 0.9);
  const trains = NEU.map((n, k) => { const a = new Float32Array(N); spikes[k].forEach(s => { for (let t = -3 * n.w; t <= 4 * n.w; t++) { const i = s + t; if (i >= 0 && i < N) a[i] += shape(k, t); } }); return a; });
  let sorted = false, noise = 0.06;
  function drawSort() {
    const W = 720, H0 = 170, mid = 112, sc = 80;
    const mix = Array.from({ length: N }, (_, i) => trains[0][i] + trains[1][i] + trains[2][i] + noiseBase[i] * noise);
    const path = (arr, y0, s, from = 0, to = N - 1) => { let d = ""; for (let i = from; i <= to; i++) d += `${i === from ? "M" : "L"}${i},${(y0 - arr[i] * s).toFixed(1)}`; return d; };
    const overlays = sorted ? NEU.map((n, k) => spikes[k].map(s => `<path class="sp" d="${path(mix, mid, sc, Math.max(0, s - 2 * n.w), Math.min(N - 1, s + 3 * n.w))}" stroke="${n.color}"></path>`).join("")).join("") : "";
    const rows = sorted ? NEU.map((n, k) => `<g transform="translate(0,${H0 + 10 + k * 58})"><line class="base" x1="0" x2="${W}" y1="46" y2="46"></line><path class="sp" d="${path(trains[k], 46, 28)}" stroke="${n.color}"></path><text class="rowlab" x="4" y="9">${n.name}: ${spikes[k].length} spikes</text></g>`).join("") : "";
    sortHost.innerHTML = `<svg viewBox="0 0 ${W} ${sorted ? H0 + 190 : H0}" role="img" aria-label="${sorted ? "The recording with each spike coloured by the neuron that fired it, and one row per neuron below" : "A single voltage recording that mixes the spikes of three neurons"}">
      <text class="rowlab" x="4" y="12">What the electrode records</text><line class="base" x1="0" x2="${W}" y1="${mid}" y2="${mid}"></line>
      <path class="raw${sorted ? " dim" : ""}" d="${path(mix, mid, sc)}"></path>${overlays}${rows}</svg>`;
    document.getElementById("bciSortBtn").textContent = sorted ? "Show the raw recording" : "Sort the spikes";
    document.getElementById("bciSortNote").textContent = sorted
      ? (noise > 0.2 ? "With this much noise, Neuron C's small spikes are hard to tell from the background. A real sorter would start missing them." : "Each spike is assigned to a neuron by its height and shape. The three rows show each neuron's firing on its own.")
      : "One wire, three neurons. Every spike looks like a blip, but they differ in height and shape.";
  }
  document.getElementById("bciSortBtn").addEventListener("click", () => { sorted = !sorted; drawSort(); });
  document.getElementById("bciNoise").addEventListener("input", e => { noise = +e.target.value / 100; drawSort(); });
  document.getElementById("bciSortKey").innerHTML = NEU.map(n => `<span><i style="background:${n.color}"></i><b>${n.name}</b> ${esc(n.note)}</span>`).join("");
  drawSort();

  // ── Figure 3: milestones ──
  const ERAS = [
    { name: "Discovery", items: [[1875, "Richard Caton measures electrical signals in animal brains with a galvanometer."], [1924, "Hans Berger records the first human EEG, the basis of non-invasive interfaces."]] },
    { name: "Lab research", items: [[1973, "Jacques Vidal coins the term \"brain-computer interface\" and goes on to show EEG cursor control."], [1990, "The Utah Array and other early implants make higher-resolution recording possible."], [2006, "The BrainGate trial shows paralysed people can move a cursor with an implant in the cortex."]] },
    { name: "Companies", items: [[2015, "Semi-invasive systems such as the Stentrode and ECoG offer a middle path between safety and signal quality."], [2020, "The FDA grants Breakthrough Device status to Neuralink and to Synchron's Stentrode."], [2021, "Neuralink shows a monkey playing a game wirelessly. The Stentrode is implanted in ALS patients for communication."], [2023, "More patients receive Stentrodes; safety and long-term results are reported."], [2024, "Neuralink performs its first human implant. The user controls a computer by thought."], [2025, "Precision Neuroscience receives FDA clearance and expands human trials to 37+ patients."]] },
  ];
  document.getElementById("bciTime").innerHTML = ERAS.map(e => `<div class="tl-era"><h3>${e.name}</h3><ol>${e.items.map(([y, t]) => `<li><span class="num">${y}</span><p>${esc(t)}</p></li>`).join("")}</ol></div>`).join("");

  // ── Figure 4: company landscape ──
  // Companies and patient counts follow the 2025 LinkedIn version of the landscape figure, updated where 2026 news changed them.
  // people: humans implanted. rs: radar stage, 1 to 4 (see Figure 5). added: not in the 2025 figure.
  const COS = [
    { n: "Blackrock Neurotech", cat: "tis", people: 38, approx: "38", rs: 3, note: "Partner of the BrainGate research group. The most human experience of any company; its longest-running Utah Array implant has lasted 8.5 years." },
    { n: "Neuralink", cat: "tis", people: 7, approx: "7+", rs: 3, note: "First human implant in 2024 and 7 participants in the 2025 figure. Trials now run in the US, Canada and the UK, so the true number is higher." },
    { n: "Paradromics", cat: "tis", people: 1, approx: "1+", rs: 2, note: "High-channel-count microelectrodes. The 2025 figure showed no implants; its first long-term human implant was reported in June 2026." },
    { n: "StairMed", cat: "tis", people: 1, approx: "1", rs: 2, place: "China", note: "Flexible electrodes; one patient in the 2025 figure." },
    { n: "NeuroXess", cat: "tis", people: 3, approx: ">2", rs: 2, place: "China", note: "More than two patients in the 2025 figure." },
    { n: "Synchron", cat: "min", people: 10, approx: "10", rs: 3, note: "Ten participants with the vascular Stentrode; several can text and control devices. Partnered with Apple on direct brain control of its devices." },
    { n: "Precision Neuroscience", cat: "min", people: 100, approx: "100+", rs: 4, note: "Thin-film surface arrays. Cleared by the FDA in 2025 for use of up to 30 days, such as mapping the brain during surgery. The 2025 figure showed more than 50 patients; the company reported over 100 procedures in September 2026. These are temporary placements." },
    { n: "Neuracle", cat: "min", people: 36, approx: "36", rs: 4, place: "China", added: true, note: "Its NEO system sits on the membrane over the brain and drives a robotic glove. Tested in 36 patients and approved in China in March 2026. Not in the 2025 figure." },
    { n: "PMT Corporation", cat: "min", people: 7, approx: "7", rs: 3, note: "Cortical electrode grids; seven patients in the 2025 figure." },
    { n: "Neurosoft Bioelectronics", cat: "min", people: 3, approx: "≥3", rs: 2, place: "Switzerland", note: "Soft surface electrodes; at least three patients in the 2025 figure." },
    { n: "Inbrain Neuroelectronics", cat: "min", people: 1, approx: "1", rs: 2, place: "Spain", note: "First implant of a graphene-based cortical interface; preparing a multi-patient trial." },
    { n: "CorTec", cat: "min", people: 1, approx: "≥1", rs: 2, place: "Germany", note: "At least one patient in the 2025 figure." },
    { n: "NeuCyber", cat: "min", people: null, rs: 1, place: "China", note: "Listed in the 2025 figure without a patient count." },
    { n: "OpenBCI", cat: "ext", rs: 4, note: "The most flexible EEG research platform, used in gaming, research and AR/VR." },
    { n: "Neurable", cat: "ext", rs: 4, note: "EEG built into headphones." },
    { n: "Emotiv", cat: "ext", rs: 4, note: "EEG headsets." },
    { n: "Neurolutions", cat: "ext", rs: 4, note: "A medical EEG system for restoring movement after a stroke." },
    { n: "MindMaze", cat: "ext", rs: 4, note: "EEG headsets." }, { n: "Bitbrain", cat: "ext", rs: 4, note: "EEG headsets." }, { n: "NeuroSky", cat: "ext", rs: 4, note: "Consumer EEG." },
    { n: "Advanced Brain Monitoring", cat: "ext", rs: 4, note: "EEG monitoring." }, { n: "Brain Products", cat: "ext", rs: 4, note: "Research EEG." },
    { n: "Kernel", cat: "ext", rs: 4, note: "fNIRS: measures blood flow with light, not electrical signals." },
    { n: "Merge Labs", cat: "ext", rs: 1, added: true, note: "Sam Altman's company. A research lab working on a non-invasive link using ultrasound and engineered molecules. No published results or trial timeline yet. Not in the 2025 figure." },
    { n: "Meta", cat: "ext", rs: 1, added: true, note: "Research only: decoding typed sentences from MEG and EEG recordings. Not in the 2025 figure." },
  ];

  // Big news, newest first. Checked by web search on 20 Nov 2026; several items come from trade press.
  const NEWS = [
    { d: "2026-10", cat: "tis", co: "Neuralink", t: "Elon Musk says the Blindsight vision implant is ready and waiting for approval. No vision trial was registered as of early November.", url: "https://drug-dev.com/neuralinks-blindsight-vision-implant-faces-questions-over-clinical-readiness-and-human-trials/", src: "Drug Development & Delivery" },
    { d: "2026-07", cat: "tis", co: "Science Corp", t: "Launches its PRIMA retinal implant in Europe after a CE mark covering 30 countries, following a $230M Series C in March. The implant sits in the eye, not the brain.", url: "https://www.mobihealthnews.com/news/science-corp-launches-vision-restoring-prima-implant-europe", src: "MobiHealthNews" },
    { d: "2026-06", cat: "tis", co: "Paradromics", t: "Completes its first long-term human implant. The FDA also lets it recruit trial participants nationwide.", url: "https://mobihealthnews.com/news/paradromics-gets-fda-nod-expand-brain-implant-study-recruitment", src: "MobiHealthNews" },
    { d: "2025-12", cat: "tis", co: "Neuralink", t: "Seven patients join its UK study, GB-PRIME, with surgeries between October and December 2025.", url: "https://www.uclhospitals.brc.nihr.ac.uk/news/seven-patients-now-participating-neuralink-trial", src: "UCLH Biomedical Research Centre" },
    { d: "2025-11", cat: "tis", co: "Paradromics", t: "Receives FDA approval to begin a clinical study of its Connexus implant.", url: "https://mobihealthnews.com/news/paradromics-gets-fda-nod-expand-brain-implant-study-recruitment", src: "MobiHealthNews" },
    { d: "2025-06", cat: "tis", co: "Neuralink", t: "Raises $650M in a Series E round.", url: "https://sacra.com/c/neuralink/", src: "Sacra" },
    { d: "2026-09", cat: "min", co: "Precision Neuroscience", t: "Raises $250M, bringing its total to $430M, and reports more than 100 patient procedures at 18 institutions.", url: "https://www.massdevice.com/precision-neuroscience-raises-250m-in-series-d-for-its-bci/", src: "MassDevice" },
    { d: "2026-03", cat: "min", co: "Neuracle", t: "China approves its NEO system for people paralysed by spinal cord injury, the first implanted BCI cleared for routine use. A reimbursement code followed within two days.", url: "https://en.people.cn/n3/2026/0314/c90000-20436044.html", src: "People's Daily" },
    { d: "2025-11", cat: "min", co: "Synchron", t: "Raises $200M in a Series D round, for about $345M in total.", url: "https://sacra.com/c/synchron/", src: "Sacra" },
    { d: "2025-05", cat: "min", co: "Synchron", t: "Partners with Apple on a way to control Apple devices directly from brain signals.", url: "https://www.patentlyapple.com/2025/05/apple-and-neurotechnology-startup-synchron-are-collaborating-on-a-brain-computer-and-interface-for-those-with-disabilities.html", src: "Patently Apple" },
    { d: "2026-10", cat: "ext", co: "Neurable", t: "Launches its Neurable One EEG headphones, after starting to license its brain-sensing technology to other device makers in April.", url: "https://rossdawson.com/futurist/companies-creating-future/leading-brain-computer-interface-companies-bci/", src: "Ross Dawson roundup" },
    { d: "2026-07", cat: "ext", co: "Meta", t: "Open-sources Brain2Qwerty v2, which decodes sentences without surgery at 61% word accuracy. It works best with MEG, a room-sized scanner.", url: "https://www.infoq.com/news/2026/07/meta-brain-interface/", src: "InfoQ" },
    { d: "2026-01", cat: "ext", co: "Merge Labs", t: "Sam Altman's company launches with about $250M, with OpenAI as the largest investor.", url: "https://www.techcrunch.com/2026/01/15/openai-invests-in-sam-altmans-brain-computer-interface-startup-merge-labs/", src: "TechCrunch" },
    { d: "2026-08", cat: "pol", co: "Council of Europe", t: "Publishes draft guidelines on protecting neural data.", url: "https://rm.coe.int/t-pd-2025-1-rev6-draft-guidelines-neuroscience-26-august-2026-/48802d37cb", src: "Council of Europe" },
    { d: "2026-06", cat: "pol", co: "China", t: "The 2026–2030 Five-Year Plan names BCI among six industries to build up. Chinese BCI companies raised about 7.25 billion yuan in the first half of 2026.", url: "https://bciintel.com/news/bci-sector-7-billion-yuan-h1-2026-china-investment/", src: "BCI Intel" },
    { d: "2026-02", cat: "pol", co: "US states", t: "California and Montana now protect neural data in law; Minnesota, Vermont and Illinois have proposed their own rules.", url: "https://www.rmmagazine.com/articles/article/2026/02/24/state-of-mind--the-new-landscape-of-neural-data-privacy-laws", src: "Risk Management Magazine" },
    { d: "2025-11", cat: "pol", co: "UNESCO", t: "Adopts a Recommendation on the Ethics of Neurotechnology covering mental privacy and freedom of thought. It is not binding.", url: "https://law.stanford.edu/2026/03/30/who-owns-digital-thoughts-the-limits-of-property-law-and-the-2025-unesco-recommendation-on-the-ethics-of-neurotechnology/", src: "Stanford Law School" },
    { d: "2025-09", cat: "pol", co: "US Senate", t: "Senators introduce the MIND Act, which would have the FTC study how to protect neural data. It is a bill, not law.", url: "https://www.csis.org/analysis/when-thought-becomes-data-mind-act-and-coming-debate-over-neurotechnology", src: "CSIS" },
  ];
  document.getElementById("bciLand").innerHTML = ["tis", "min", "ext"].map(k => { const c = CATS[k]; return `<div class="land-col" style="--dc:${c.color}"><h3>${c.name}</h3><p class="land-sub">${c.sub} · ${c.res.toLowerCase()}</p>
      <ul>${COS.filter(x => x.cat === k).map(x => `<li tabindex="0" data-co="${esc(x.n)}"><span class="co">${esc(x.n)}${x.place ? ` <small>${x.place}</small>` : ""}</span>${x.people != null ? `<span class="ppl num">${x.approx}</span>` : ""}</li>`).join("")}</ul></div>`; }).join("");
  document.getElementById("bciLand").querySelectorAll("li").forEach(li => {
    const x = COS.find(c => c.n === li.dataset.co), html = `<b>${esc(x.n)}</b>${x.people != null ? `<span class="num">${x.approx} people implanted</span><br>` : ""}${esc(x.note)}`;
    li.addEventListener("mousemove", e => showTip(html, e.clientX, e.clientY)); li.addEventListener("mouseleave", () => (tip.hidden = true));
    li.addEventListener("focus", () => { const r = li.getBoundingClientRect(); showTip(html, r.left + 30, r.bottom - 6); }); li.addEventListener("blur", () => (tip.hidden = true));
  });
  // people implanted, as a bar chart
  const ppl = COS.filter(x => x.people).sort((a, b) => b.people - a.people), maxP = ppl[0].people;
  document.getElementById("bciPeople").innerHTML = ppl.map(x => `<span class="lab">${esc(x.n)}</span><span class="btrack" tabindex="0" data-co="${esc(x.n)}"><span class="bfill" style="background:${CATS[x.cat].color};width:calc(${(x.people / maxP * 100).toFixed(1)}% - ${(x.people / maxP * 48).toFixed(0)}px)"></span><span class="val">${x.approx}</span></span>`).join("");
  document.getElementById("bciPeople").querySelectorAll(".btrack").forEach(t => {
    const x = COS.find(c => c.n === t.dataset.co), html = `<b>${esc(x.n)}</b><span class="num">${x.approx} people</span><br>${esc(x.note)}`;
    t.addEventListener("mousemove", e => showTip(html, e.clientX, e.clientY)); t.addEventListener("mouseleave", () => (tip.hidden = true));
    t.addEventListener("focus", () => { const r = t.getBoundingClientRect(); showTip(html, r.left + 30, r.bottom); }); t.addEventListener("blur", () => (tip.hidden = true));
  });
  document.getElementById("bciPeopleTable").innerHTML = `<table><thead><tr><th>Company</th><th>Type</th><th class="r">People implanted</th><th>Note</th></tr></thead><tbody>${COS.filter(x => x.people != null).sort((a, b) => b.people - a.people).map(x => `<tr><td>${esc(x.n)}</td><td>${CATS[x.cat].name}</td><td class="r">${x.approx}</td><td>${esc(x.note)}</td></tr>`).join("")}</tbody></table>`;

  // ── Figure 5: precision against invasiveness ──
  const MAP = [
    { cat: "tis", rx: 700, ry: 420, lx: 430, ly: 110, cos: ["Blackrock Neurotech", "Neuralink", "Paradromics"], res: "Single neurons" },
    { cat: "min", rx: 400, ry: 230, lx: 262, ly: 238, cos: ["Synchron", "Precision", "Inbrain"], res: "100s to 1,000s of neurons" },
    { cat: "ext", rx: 190, ry: 120, lx: 72, ly: 272, cos: ["OpenBCI", "Emotiv", "Neurable"], res: "100k to 1M neurons" },
  ];
  document.getElementById("bciMap").innerHTML = `<svg viewBox="0 0 640 380" role="img" aria-label="Three nested zones. External headsets are the least invasive and least precise; minimally invasive implants sit in the middle; electrodes in brain tissue are the most invasive and the most precise.">
    <defs><clipPath id="bciClip"><rect x="60" y="16" width="566" height="324"></rect></clipPath></defs>
    <g clip-path="url(#bciClip)">${MAP.map(m => `<ellipse cx="60" cy="340" rx="${m.rx}" ry="${m.ry}" fill="${CATS[m.cat].color}" class="mapzone"></ellipse><ellipse cx="60" cy="340" rx="${m.rx}" ry="${m.ry}" class="mapring" stroke="${CATS[m.cat].color}"></ellipse>`).join("")}</g>
    ${MAP.map(m => `<text class="mz-t" x="${m.lx}" y="${m.ly}">${CATS[m.cat].name}</text><text class="mz-r" x="${m.lx}" y="${m.ly + 16}">${m.res}</text>${m.cos.map((c, i) => `<text class="mz-c" x="${m.lx}" y="${m.ly + 33 + i * 14}">${c}</text>`).join("")}`).join("")}
    <path class="ax" d="M60,16V340H626"></path><path class="axh" d="M55,24L60,14L65,24M618,335L628,340L618,345"></path>
    <text class="axl" x="626" y="362" text-anchor="end">signal precision →</text><text class="axl" transform="translate(44,340) rotate(-90)">invasiveness and cost →</text></svg>`;
  // ── Figure 5: company radar and big news ──
  // Stage is read from public reports: 1 = lab (no people yet, or not disclosed), 2 = first in human (1–5 people),
  // 3 = clinical trials (more than 5 people), 4 = approved, cleared or on sale.
  const STAGES = [["Lab", "No people yet, or not disclosed"], ["First in human", "1 to 5 people"], ["Clinical trials", "More than 5 people"], ["Cleared or on sale", "Approved, cleared or sold"]];
  const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const mon = d => `${MON[+d.slice(5) - 1]} ${d.slice(0, 4)}`, fresh = d => d >= "2025-11"; // the last 12 months
  const newsOf = n => NEWS.filter(x => x.co === n).sort((a, b) => b.d.localeCompare(a.d));
  const radar = document.getElementById("bciRadar"), rcard = document.getElementById("bciRadarCard");
  if (radar) {
    const RW = 900, colW = 218, x0 = 16, rowH = 23, top = 74;
    const cols = STAGES.map((_, i) => ["tis", "min", "ext"].flatMap(k => COS.filter(c => c.rs === i + 1 && c.cat === k)));
    const boardH = Math.max(...cols.map(c => c.length)) * rowH + 30, RH = top + boardH + 22;
    radar.innerHTML = `<svg viewBox="0 0 ${RW} ${RH}" role="group" aria-label="Companies as dots in four columns, from lab work on the left to products on sale on the right">
      <polygon class="board" points="6,${top - 8} ${RW - 6},${top + 10} ${RW - 6},${top + boardH - 10} 6,${top + boardH + 8}"></polygon>
      ${STAGES.map(([t, s], i) => `${i ? `<line class="sep" x1="${x0 + i * colW}" x2="${x0 + i * colW}" y1="${top}" y2="${top + boardH}"></line>` : ""}
        <text class="st" x="${x0 + i * colW + 16}" y="26">${t} <tspan class="stn">${cols[i].length}</tspan></text><text class="sts" x="${x0 + i * colW + 16}" y="43">${s}</text>`).join("")}
      <text class="prog" x="${RW - 16}" y="${top + boardH - 16}" text-anchor="end">Further along →</text>
      ${cols.map((list, i) => list.map((c, j) => { const x = x0 + i * colW + 28, y = top + (boardH - list.length * rowH) / 2 + j * rowH + rowH / 2, hot = newsOf(c.n).some(n => fresh(n.d));
        return `<g class="rdot" data-co="${esc(c.n)}" data-cat="${c.cat}" tabindex="0" role="button" aria-label="${esc(c.n)}, ${STAGES[i][0].toLowerCase()}${hot ? ", big news in the last 12 months" : ""}" style="--dc:${CATS[c.cat].color}">
          <rect class="hit" x="${x - 14}" y="${y - rowH / 2 + 1}" width="${colW - 20}" height="${rowH - 2}" rx="5"></rect>${hot ? `<circle class="ring" cx="${x}" cy="${y}" r="10.5"></circle>` : ""}<circle class="d" cx="${x}" cy="${y}" r="6"></circle><text x="${x + 17}" y="${y + 4}">${esc(c.n)}</text></g>`; }).join("")).join("")}
    </svg>`;
    function pickCo(n) {
      const c = COS.find(x => x.n === n), cat = CATS[c.cat], ns = newsOf(n);
      radar.querySelectorAll(".rdot").forEach(g => g.classList.toggle("on", g.dataset.co === n));
      rcard.innerHTML = `<p class="eyebrow"><i style="background:${cat.color}"></i>${esc(cat.name)}</p><h3>${esc(c.n)}${c.place ? ` <small>${c.place}</small>` : ""}</h3>
        <dl><dt>Stage</dt><dd>${STAGES[c.rs - 1][0]}</dd>${c.people != null ? `<dt>People</dt><dd class="num">${c.approx} implanted</dd>` : ""}</dl><p>${esc(c.note)}</p>
        ${ns.length ? `<ul class="cardnews">${ns.map(x => `<li><span class="num">${mon(x.d)}</span>${esc(x.t)} <a href="${x.url}" target="_blank" rel="noopener">${esc(x.src)}</a></li>`).join("")}</ul>` : `<p class="keynote">No item for this company in the news list below.</p>`}`;
    }
    radar.querySelectorAll(".rdot").forEach(g => {
      const c = COS.find(x => x.n === g.dataset.co), ns = newsOf(c.n), html = `<b>${esc(c.n)}</b>${STAGES[c.rs - 1][0]}${c.people != null ? ` · ${c.approx} people` : ""}${ns[0] ? `<br><span class="num">${mon(ns[0].d)}</span> ${esc(ns[0].t)}` : ""}<br><span style="color:var(--muted)">Click for details</span>`;
      g.addEventListener("click", () => pickCo(c.n)); g.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pickCo(c.n); } });
      g.addEventListener("mousemove", e => showTip(html, e.clientX, e.clientY)); g.addEventListener("mouseleave", () => (tip.hidden = true));
    });
    document.querySelectorAll("[data-rcat]").forEach(b => b.addEventListener("click", () => {
      const k = b.dataset.rcat; document.querySelectorAll("[data-rcat]").forEach(x => x.setAttribute("aria-pressed", x === b));
      radar.querySelectorAll(".rdot").forEach(g => g.classList.toggle("dim", k !== "all" && g.dataset.cat !== k));
    }));
    pickCo("Neuracle");

    const NCATS = { tis: CATS.tis.name, min: CATS.min.name, ext: CATS.ext.name, pol: "Rules and policy" };
    document.getElementById("bciNews").innerHTML = Object.entries(NCATS).map(([k, name]) => `<div class="news-col" style="--dc:${k === "pol" ? "var(--ink-2)" : CATS[k].color}"><h3>${name}</h3>
      <ol>${NEWS.filter(x => x.cat === k).sort((a, b) => b.d.localeCompare(a.d)).map(x => `<li><span class="num">${mon(x.d)}</span><p><b>${esc(x.co)}.</b> ${esc(x.t)} <a href="${x.url}" target="_blank" rel="noopener">${esc(x.src)}</a></p></li>`).join("")}</ol></div>`).join("");
  }
})();
