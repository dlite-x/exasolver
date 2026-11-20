// The "Inside an AI data center" block: parts list, detail card and the 3D scene. Needs three.js (window.THREE),
// dcscene.js (window.createDataCenterScene) and data.js (window.VC).
window.VCDC = (() => {
  const host = document.getElementById("dcStage");
  const listEl = document.getElementById("dcList"), card = document.getElementById("dcCard");
  if (!host) return { mount() {}, pause() {} };
  const VC = window.VC || { companies: [], stages: [] };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const coName = Object.fromEntries(VC.companies.map(c => [c.id, c.name]));
  const stageTitle = Object.fromEntries(VC.stages.map(s => [s.id, s.title]));
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ── What each part is ──
  const COMPS = {
    grid: { name: "Grid connection", group: "Power", stage: "power",
      what: "High-voltage transmission lines bring power from the grid, typically at 115–500 kV.",
      ai: "A big AI campus draws as much power as a city, so getting a grid connection is now the slowest step. Some operators build their own gas turbines or sign deals with nuclear plants instead.",
      fact: "Utility connection queues in many US markets run several years.",
      who: ["gevernova", "siemensenergy", "constellation", "vistra", "nextera"] },
    substation: { name: "Substation", group: "Power", stage: "electrical",
      what: "Transformers step grid voltage down to the medium voltage used across the campus.",
      ai: "Large power transformers are custom-built, and delivery times have stretched to years.",
      fact: "Often the campus owns its substation outright.",
      who: ["hitachi", "siemensenergy", "gevernova", "abb", "eaton"] },
    switchgear: { name: "Switchgear", group: "Power", stage: "electrical",
      what: "Breakers and switches route power around the site and isolate faults, so one failure doesn't take down a whole hall.",
      ai: "Higher rack power means more and bigger switchgear lineups per building.",
      fact: "Electrical gear is usually the largest slice of a building's non-IT cost.",
      who: ["schneider", "eaton", "abb", "vertiv", "siemensenergy"] },
    generators: { name: "Backup generators", group: "Power", stage: "electrical",
      what: "Diesel or gas generators, each the size of a shipping container, start within seconds if the grid fails. Fuel tanks on site keep them running for a day or more.",
      ai: "Training runs can tolerate short outages better than banking systems, so some AI sites use less backup than classic data centers.",
      fact: "A large campus can have dozens of 2–3 MW units.",
      who: ["Cummins", "Caterpillar", "Rolls-Royce (mtu)", "bloom"] },
    ups: { name: "UPS & batteries", group: "Power", stage: "electrical",
      what: "Uninterruptible power supplies bridge the seconds between a grid failure and the generators starting, using battery banks.",
      ai: "GPU clusters swing their power draw sharply as training steps start and stop. Batteries now also smooth those swings so they don't upset the grid.",
      fact: "Lithium-ion has largely replaced lead-acid in new builds.",
      who: ["vertiv", "schneider", "eaton", "delta"] },
    busway: { name: "Power distribution", group: "Power", stage: "electrical",
      what: "Overhead busways and power distribution units carry power the last few metres into each rack.",
      ai: "An AI rack draws 100–130 kW, roughly ten times an ordinary server rack, so the cabling and busbars are much heavier.",
      fact: "Next-generation racks are moving to 800-volt DC power.",
      who: ["schneider", "vertiv", "eaton", "Legrand", "delta"] },
    racks: { name: "AI server racks", group: "Compute", stage: "servers",
      what: "The reason the building exists. Each rack holds GPU servers, for example an Nvidia GB200 NVL72 with 72 GPUs wired together as one machine.",
      ai: "The chips cost far more than the building around them.",
      fact: "≈$3–4M per 72-GPU rack (research decks).",
      who: ["nvidia", "foxconn", "quanta", "wiwynn", "supermicro", "dell", "hpe"] },
    network: { name: "Network & fibre", group: "Compute", stage: "network",
      what: "Switches and fibre link every GPU to every other GPU, and connect the site to the outside world through a fibre entry room.",
      ai: "Training spreads one model over tens of thousands of GPUs, so the network between them limits speed as much as the chips do.",
      fact: "A large cluster uses tens of thousands of optical transceivers.",
      who: ["nvidia", "arista", "broadcom", "cisco", "corning", "coherent", "innolight"] },
    cdu: { name: "Liquid cooling (CDUs)", group: "Cooling", stage: "electrical",
      what: "Coolant distribution units pump liquid through cold plates fixed directly onto the chips, then pass the heat to the building's water loop.",
      ai: "Air can't carry heat away from a 120 kW rack fast enough. Direct-to-chip liquid cooling is now standard for top-end GPUs.",
      fact: "Blue pipes carry cool supply water; red pipes carry the warm return.",
      who: ["vertiv", "coolit", "boyd", "liquidstack", "schneider", "submer"] },
    chillers: { name: "Heat rejection", group: "Cooling", stage: "electrical",
      what: "Dry coolers and chillers in the yard dump the heat into the outside air. The fans run day and night.",
      ai: "Warmer liquid loops let many AI sites skip energy-hungry chillers for most of the year and use only fans.",
      fact: "Nearly every watt the chips use ends up as heat here.",
      who: ["jci", "carrier", "Trane", "vertiv", "munters", "stulz"] },
    shell: { name: "Building shell", group: "Building", stage: "construction",
      what: "The concrete slab, steel frame, walls and roof. Simple by industry standards, but built on very tight schedules.",
      ai: "AI halls need stronger floors for heavy liquid-cooled racks and taller ceilings for pipes and cable trays.",
      fact: "Contractors now build campuses in phases, opening the first hall while later ones are still going up.",
      who: ["turner", "dpr", "holder", "hitt", "mortenson", "fluor"] },
    ops: { name: "Operations & security", group: "Building", stage: "developers",
      what: "A control room watches power, cooling and security around the clock. Fences, gates and guards keep people out.",
      ai: "The owner might be a cloud company or a developer that leases the building out.",
      fact: "Some campuses run with only a few dozen staff once they are built.",
      who: ["equinix", "digitalrealty", "qts", "vantage", "crusoe"] },
  };
  const GROUPS = ["Power", "Compute", "Cooling", "Building"];

  // Side list + detail card (works even without WebGL)
  listEl.innerHTML = GROUPS.map(g => `<div class="dc-group"><p class="eyebrow">${g}</p>${Object.entries(COMPS).filter(([, c]) => c.group === g)
    .map(([id, c]) => `<button type="button" class="dc-item" data-comp="${id}" aria-pressed="false"><i class="g-${g.toLowerCase()}"></i>${esc(c.name)}</button>`).join("")}</div>`).join("");
  listEl.querySelectorAll(".dc-item").forEach(b => {
    b.addEventListener("click", () => select(b.dataset.comp));
    b.addEventListener("mouseenter", () => setHover(b.dataset.comp));
    b.addEventListener("mouseleave", () => setHover(null));
  });
  let selected = null, ready = false;
  function select(id) {
    selected = id; const c = COMPS[id];
    listEl.querySelectorAll(".dc-item").forEach(b => b.setAttribute("aria-pressed", b.dataset.comp === id));
    card.innerHTML = `
      <p class="eyebrow">${c.group} · on the chain: ${esc(stageTitle[c.stage] || c.stage)}</p>
      <h3>${esc(c.name)}</h3>
      <p>${esc(c.what)}</p>
      <p><b>What AI changes.</b> ${esc(c.ai)}</p>
      <p class="dc-fact">${esc(c.fact)}</p>
      <p class="dc-who"><b>Who makes it</b><span>${c.who.map(w => `<em>${esc(coName[w] || w)}</em>`).join("")}</span></p>
      <a href="#map">Find it on the value chain map →</a>`;
    if (ready) paintHighlight();
  }

  // ── 3D scene ──
  // The scene itself lives in dcscene.js (designed with Lovable, plain three.js). This file wires it to the page:
  // the parts list, the detail card, floating labels, the hover tooltip, the flow buttons and the site theme.
  const tip = document.getElementById("ctip");
  let scene3d = null, hovered = null;
  try {
    if (!window.THREE || !window.createDataCenterScene) throw new Error("3D libraries did not load");
    scene3d = window.createDataCenterScene(host, { dark: isDark() });
  } catch (e) {
    host.innerHTML = `<p class="dc-fallback">The 3D model needs WebGL, which isn't available in this browser. The list of parts still works.</p>`;
    select("racks");
    return { mount() {}, pause() {} };
  }
  function isDark() { const t = document.documentElement.getAttribute("data-theme"); return t ? t === "dark" : matchMedia("(prefers-color-scheme: dark)").matches; }
  const retheme = () => scene3d.setTheme(isDark());
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", retheme);
  new MutationObserver(retheme).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

  function paintHighlight() {
    scene3d.setSelected(selected);
    labels.forEach(l => l.b.classList.toggle("on", l.id === hovered || l.id === selected));
    listEl.querySelectorAll(".dc-item").forEach(b => b.classList.toggle("hl", b.dataset.comp === hovered));
  }
  // Hover coming from the list or a label: light the part up in the scene too.
  function setHover(id) { if (hovered === id) return; hovered = id; scene3d.setHover(id); paintHighlight(); }

  // Hover and click coming from the scene.
  let px = 0, py = 0;
  host.addEventListener("pointermove", e => { px = e.clientX; py = e.clientY; if (hovered && !tip.hidden) placeTip(); });
  host.addEventListener("pointerleave", () => (tip.hidden = true));
  function placeTip() { const t = tip.getBoundingClientRect(); tip.style.left = Math.max(8, Math.min(px + 14, innerWidth - t.width - 8)) + "px"; tip.style.top = Math.max(8, Math.min(py + 14, innerHeight - t.height - 8)) + "px"; }
  scene3d.onHover(id => {
    hovered = id; paintHighlight();
    if (!id) { tip.hidden = true; return; }
    tip.innerHTML = `<b>${esc(COMPS[id].name)}</b>${esc(COMPS[id].what)}<br><span style="color:var(--muted)">Click for details</span>`;
    tip.hidden = false; placeTip();
  });
  scene3d.onSelect(id => { if (id) select(id); });

  // Floating labels, positioned from the scene's camera every frame.
  const ANCHORS = {
    grid: [-56, 15.5, 0], substation: [-41, 6.2, 0], switchgear: [-28, 4.6, 2], generators: [-41, 4, 20], ups: [-17, 5, -9],
    busway: [8, 5, -9], racks: [0, 3.2, 8], network: [-10.2, 6.5, 3], cdu: [13, 6.6, 4], chillers: [38, 4.4, -6],
    shell: [4, 10.6, -11.8], ops: [0, 5.4, 21],
  };
  const labelLayer = document.createElement("div"); labelLayer.className = "dc-labels"; host.appendChild(labelLayer);
  const labels = Object.entries(ANCHORS).map(([id, p]) => {
    const b = document.createElement("button"); b.type = "button"; b.className = "dc-label"; b.textContent = COMPS[id].name;
    b.addEventListener("click", () => select(id)); b.addEventListener("mouseenter", () => setHover(id)); b.addEventListener("mouseleave", () => setHover(null));
    labelLayer.appendChild(b); return { id, b, p };
  });
  scene3d.onFrame(() => {
    if (labelLayer.hidden) return;
    labels.forEach(l => {
      const [x, y, vis] = scene3d.project(l.p[0], l.p[1], l.p[2]);
      l.b.style.display = vis ? "" : "none";
      if (vis) l.b.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%)`;
    });
  });
  const labelBtn = document.getElementById("dcLabels");
  labelBtn.addEventListener("click", () => { const on = labelBtn.getAttribute("aria-pressed") !== "true"; labelBtn.setAttribute("aria-pressed", on); labelLayer.hidden = !on; });

  // Flows and view controls.
  document.querySelectorAll("[data-flow]").forEach(b => b.addEventListener("click", () => {
    const on = b.getAttribute("aria-pressed") !== "true"; b.setAttribute("aria-pressed", on); scene3d.setFlow(b.dataset.flow, on);
  }));
  document.getElementById("dcReset").addEventListener("click", () => scene3d.resetView());

  ready = true; select("racks");
  scene3d.setRunning(false); // the page router starts it when the model is on screen
  return {
    mount() { scene3d.setRunning(true); },
    pause() { scene3d.setRunning(false); tip.hidden = true; },
  };
})();
