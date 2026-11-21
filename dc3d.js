// 3D model of an AI data centre campus. Needs three.js r128 (window.THREE) and data.js (window.VC).
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

  const THREE = window.THREE;
  let renderer;
  try {
    if (!THREE) throw new Error("three.js did not load");
    renderer = new THREE.WebGLRenderer({ antialias: true });
  } catch (e) {
    host.innerHTML = `<p class="dc-fallback">The 3D model needs WebGL, which isn't available in this browser. The list of parts still works.</p>`;
    select("racks");
    return { mount() {}, pause() {} };
  }

  // ── Theme palette (read from CSS tokens) ──
  const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  function palette() {
    const bg = new THREE.Color(css("--bg") || "#f2f4f7"), dark = bg.r + bg.g + bg.b < 1.2;
    return {
      dark, bg: css("--canvas"),
      ground: dark ? "#20252c" : "#dfe3e8", pad: dark ? "#323943" : "#c8cdd5", wall: dark ? "#55606d" : "#f3f4f6",
      slab: dark ? "#3a424c" : "#d4d8de", metal: dark ? "#8f99a5" : "#9aa3ae", steel: dark ? "#6c7682" : "#c3c9d1",
      rack: dark ? "#14171c" : "#2a2f37", led: "#45d08f", power: css("--c1"), cool: css("--s1"), hot: css("--c3"),
      fiber: css("--s3"), glass: dark ? "#6f8fb3" : "#9fc0e3", fence: dark ? "#58606b" : "#8e97a2", hl: css("--accent"),
    };
  }
  let P = palette();

  // ── Scene ──
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 1, 2000);
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  host.appendChild(renderer.domElement);
  renderer.domElement.setAttribute("aria-label", "3D model of an AI data center campus. Drag to rotate, scroll to zoom.");
  renderer.domElement.setAttribute("role", "img");
  const hemi = new THREE.HemisphereLight(0xffffff, 0x666666, 0.75); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 0.75);
  sun.position.set(-60, 110, 70); sun.castShadow = true;
  Object.assign(sun.shadow.camera, { left: -110, right: 110, top: 90, bottom: -90, near: 10, far: 320 });
  sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0005; scene.add(sun);

  // Materials are keyed by component + palette colour, so highlight and theme changes are cheap.
  const mats = []; // {m, key, comp, emissiveKey?}
  function mat(comp, key, opts = {}) {
    const m = new THREE.MeshStandardMaterial({ color: P[key], roughness: opts.rough ?? 0.75, metalness: opts.metal ?? 0.05, transparent: !!opts.opacity, opacity: opts.opacity ?? 1, side: opts.side || THREE.FrontSide });
    if (opts.glow) { m.emissive.set(P[key]); m.emissiveIntensity = 0.9; }
    mats.push({ m, key, comp, glow: !!opts.glow }); return m;
  }
  const pickables = [];
  function box(comp, key, w, h, d, x, y, z, opts) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), opts && opts.material || mat(comp, key, opts));
    m.position.set(x, y + h / 2, z); m.castShadow = !(opts && opts.noShadow); m.receiveShadow = true;
    if (comp) { m.userData.comp = comp; pickables.push(m); }
    scene.add(m); return m;
  }
  function cyl(comp, key, rTop, rBot, h, x, y, z, opts = {}) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, opts.seg || 16), opts.material || mat(comp, key, opts));
    m.position.set(x, y + h / 2, z); m.castShadow = true; m.receiveShadow = true;
    if (opts.rotZ) m.rotation.z = opts.rotZ; if (opts.rotX) m.rotation.x = opts.rotX;
    if (comp) { m.userData.comp = comp; pickables.push(m); }
    scene.add(m); return m;
  }
  function pipe(comp, key, pts, r, opts = {}) {
    const curve = new THREE.CurvePath();
    for (let i = 0; i < pts.length - 1; i++) curve.add(new THREE.LineCurve3(new THREE.Vector3(...pts[i]), new THREE.Vector3(...pts[i + 1])));
    const m = new THREE.Mesh(new THREE.TubeGeometry(curve, pts.length * 12, r, 8, false), opts.material || mat(comp, key, { rough: 0.4, metal: 0.2, ...opts }));
    m.castShadow = true; if (comp) { m.userData.comp = comp; pickables.push(m); }
    scene.add(m); return m;
  }

  // Ground and site
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 300), mat(null, "ground", { rough: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  box(null, "pad", 150, 0.3, 96, 2, 0, 2, { rough: 1, noShadow: true }); // campus pad
  // road
  box(null, "slab", 8, 0.32, 140, -84, 0, 10, { rough: 1, noShadow: true });
  box(null, "slab", 22, 0.33, 6, -71, 0, 44, { rough: 1, noShadow: true });

  // ── Building shell: slab, back walls full height, front walls cut away ──
  const BX0 = -20, BX1 = 30, BZ0 = -18, BZ1 = 18, WH = 8;
  const shellWall = mat("shell", "wall", { rough: 0.9 }), shellSlab = mat("shell", "slab", { rough: 0.9 });
  box("shell", null, BX1 - BX0, 0.5, BZ1 - BZ0, (BX0 + BX1) / 2, 0.3, 0, { material: shellSlab });
  box("shell", null, BX1 - BX0, WH, 0.6, (BX0 + BX1) / 2, 0.3, BZ0, { material: shellWall });          // north
  box("shell", null, 0.6, WH, BZ1 - BZ0, BX0, 0.3, 0, { material: shellWall });                        // west
  box("shell", null, BX1 - BX0, 1.4, 0.6, (BX0 + BX1) / 2, 0.3, BZ1, { material: shellWall });         // south, cut
  box("shell", null, 0.6, 1.4, BZ1 - BZ0, BX1, 0.3, 0, { material: shellWall });                       // east, cut
  box("shell", null, 0.5, WH, BZ1 - BZ0, -8, 0.3, 0, { material: shellWall });                         // electrical room partition
  for (let x = BX0 + 5; x < BX1; x += 5) box("shell", "steel", 0.4, 0.5, BZ1 - BZ0, x, WH + 0.1, 0, { metal: 0.4 }); // roof beams

  // ── Power: grid, substation, switchgear, generators, UPS, busway ──
  const towerMat = mat("grid", "metal", { metal: 0.5, rough: 0.5 });
  [[-110, -30], [-90, -30]].forEach(([x, z]) => {
    cyl("grid", null, 0.4, 2.2, 26, x, 0, z, { seg: 4, material: towerMat });
    box("grid", null, 0.6, 0.5, 9, x, 22, z, { material: towerMat });
    box("grid", null, 0.6, 0.5, 6, x, 25, z, { material: towerMat });
  });
  [-3.8, 0, 3.8].forEach(dx => pipe("grid", "metal", [[-122, 22.6, -30 + dx], [-110, 22.1, -30 + dx], [-90, 22.1, -30 + dx], [-64, 9, -26 + dx * 0.4]], 0.12, { material: towerMat }));
  // substation yard
  box("substation", "pad", 22, 0.4, 18, -56, 0.3, -24, { rough: 1 });
  const trMat = mat("substation", "steel", { metal: 0.3, rough: 0.6 });
  [-62, -56, -50].forEach(x => {
    box("substation", null, 4, 4.5, 5, x, 0.7, -26, { material: trMat });
    for (let i = -1; i <= 1; i++) box("substation", null, 0.3, 3.4, 5.4, x + i * 1.5, 0.9, -26, { material: trMat });
    [-1.2, 0, 1.2].forEach(dx => cyl("substation", "metal", 0.18, 0.28, 3, x + dx, 5.2, -27, { material: trMat }));
  });
  for (let x = -66; x <= -46; x += 4) cyl("substation", "metal", 0.15, 0.15, 7, x, 0.7, -32, { material: trMat });
  // switchgear building
  box("switchgear", "wall", 16, 5, 7, -38, 0.3, -24, { rough: 0.85 });
  box("switchgear", "steel", 16.4, 0.5, 7.4, -38, 5.3, -24, { metal: 0.3 });
  for (let x = -44; x <= -32; x += 3) box("switchgear", "power", 1.6, 2.6, 0.2, x, 1.2, -20.4, { rough: 0.6 });
  pipe("switchgear", "power", [[-46, 3.5, -24], [-48, 3.5, -24]], 0.35, { rough: 0.5 });
  pipe("switchgear", "power", [[-30, 3.5, -24], [-24, 3.5, -24], [-24, 3.5, -12], [-20.2, 3.5, -12]], 0.35, { rough: 0.5 });
  // generator row with fuel tanks
  const genMat = mat("generators", "steel", { metal: 0.25, rough: 0.6 }), stackMat = mat("generators", "metal", { metal: 0.6, rough: 0.4 });
  for (let i = 0; i < 6; i++) {
    const x = -54 + i * 7.4;
    box("generators", null, 6, 3.2, 3, x, 0.3, 30, { material: genMat });
    cyl("generators", null, 0.35, 0.35, 2.4, x + 2, 3.5, 30, { material: stackMat });
  }
  const tankMat = mat("generators", "wall", { metal: 0.2, rough: 0.5 });
  [[-62, 22], [-62, 26.5]].forEach(([x, z]) => cyl("generators", null, 1.6, 1.6, 9, x, 1.8, z, { material: tankMat, rotZ: Math.PI / 2 }));
  // UPS & batteries inside the electrical room
  const upsMat = mat("ups", "steel", { metal: 0.2, rough: 0.5 }), batMat = mat("ups", "rack", { rough: 0.6 });
  for (let i = 0; i < 4; i++) box("ups", null, 1.6, 2.4, 6, -17 + i * 2.2, 0.55, -11, { material: upsMat });
  for (let r = 0; r < 3; r++) for (let i = 0; i < 5; i++) {
    box("ups", null, 1.4, 2, 0.9, -17.5 + i * 1.8, 0.55, 2 + r * 3.6, { material: batMat });
    box("ups", "led", 1.2, 0.08, 0.1, -17.5 + i * 1.8, 2.2, 2.5 + r * 3.6, { glow: true, noShadow: true });
  }

  // ── Data hall: four rows of racks with hot-aisle containment ──
  const rackMat = mat("racks", "rack", { rough: 0.45, metal: 0.3 }), ledMat = mat("racks", "led", { glow: true }), ledMat2 = mat("racks", "cool", { glow: true });
  const ROWS = [-11.5, -5.5, 4.5, 10.5], RX0 = -4, NRACK = 14, RW = 1.6;
  ROWS.forEach((z, ri) => {
    for (let i = 0; i < NRACK; i++) {
      const x = RX0 + i * (RW + 0.12);
      box("racks", null, RW, 3.2, 2.2, x, 0.55, z, { material: rackMat });
      const face = ri % 2 ? -1.12 : 1.12; // LEDs on the cold-aisle side
      box("racks", null, RW * 0.7, 0.07, 0.05, x, 1.4 + (i % 3) * 0.45, z - face, { material: i % 4 ? ledMat : ledMat2, noShadow: true });
      box("racks", null, RW * 0.4, 0.07, 0.05, x, 2.6, z - face, { material: ledMat, noShadow: true });
    }
  });
  // hot-aisle containment roofs between paired rows
  const contMat = mat("racks", "glass", { opacity: 0.35, rough: 0.2, side: THREE.DoubleSide });
  [[-8.5], [7.5]].forEach(([z]) => {
    box("racks", null, NRACK * (RW + 0.12), 0.12, 4, RX0 - RW / 2 + NRACK * (RW + 0.12) / 2 - 0.06, 3.75, z, { material: contMat, noShadow: true });
    box("racks", null, 0.12, 3.2, 3.8, RX0 - RW / 2 - 0.2, 0.55, z, { material: contMat, noShadow: true });
  });
  // network: spine racks and overhead fibre trays
  const netMat = mat("network", "rack", { rough: 0.45, metal: 0.3 }), fibMat = mat("network", "fiber", { rough: 0.5 });
  for (let i = 0; i < 4; i++) {
    box("network", null, RW, 3.2, 2.2, 22 + i * 1.75, 0.55, -1, { material: netMat });
    box("network", null, RW * 0.8, 0.1, 0.05, 22 + i * 1.75, 2.2, -2.12, { material: fibMat, glow: true, noShadow: true });
  }
  ROWS.forEach(z => box("network", null, NRACK * (RW + 0.12) + 6, 0.25, 0.6, RX0 + NRACK * (RW + 0.12) / 2 + 2, 5.6, z, { material: fibMat }));
  box("network", null, 0.6, 0.25, 24, 26.6, 5.6, -0.5, { material: fibMat });
  pipe("network", "fiber", [[26.6, 5.7, -12], [26.6, 5.7, -17], [26.6, 0.6, -17.5], [26.6, 0.4, -40], [-84, 0.4, -40]], 0.22, { material: fibMat });
  box("network", "slab", 2.4, 0.6, 2.4, 26.6, 0.3, -40, { rough: 0.9 }); // fibre vault
  // power distribution: busways above each row, fed from the electrical room
  const busMat = mat("busway", "power", { rough: 0.5, metal: 0.3 });
  ROWS.forEach(z => {
    box("busway", null, NRACK * (RW + 0.12) + 2, 0.35, 0.35, RX0 + NRACK * (RW + 0.12) / 2 - 1.5, 4.6, z, { material: busMat });
    for (let i = 0; i < NRACK; i += 2) box("busway", null, 0.18, 0.85, 0.18, RX0 + i * (RW + 0.12), 3.75, z, { material: busMat, noShadow: true });
  });
  box("busway", null, 0.4, 0.35, 23, -7, 4.6, -0.5, { material: busMat });
  [-11.5, -5.5, 4.5, 10.5].forEach(z => box("busway", null, 3, 0.35, 0.35, -5.6, 4.6, z, { material: busMat }));

  // ── Cooling: CDUs, pipe loops, dry coolers ──
  const cduMat = mat("cdu", "cool", { rough: 0.5, metal: 0.2 });
  ROWS.forEach(z => box("cdu", null, 2, 3.2, 2.2, RX0 + NRACK * (RW + 0.12) + 0.6, 0.55, z, { material: cduMat }));
  const supMat = mat("cdu", "cool", { rough: 0.35, metal: 0.3 }), retMat = mat("cdu", "hot", { rough: 0.35, metal: 0.3 });
  const XE = RX0 + NRACK * (RW + 0.12) + 0.6;
  pipe("cdu", null, [[XE, 3.8, -11.5], [XE, 6.6, -11.5], [XE, 6.6, 10.5], [XE, 3.8, 10.5]], 0.28, { material: supMat });
  pipe("cdu", null, [[XE + 0.8, 3.8, -5.5], [XE + 0.8, 7.2, -5.5], [XE + 0.8, 7.2, 4.5], [XE + 0.8, 3.8, 4.5]], 0.28, { material: retMat });
  pipe("cdu", null, [[XE, 6.6, 0], [31, 6.6, 0], [31, 2, 0], [38, 2, 0], [38, 2, -12]], 0.45, { material: supMat });
  pipe("cdu", null, [[XE + 0.8, 7.2, 2], [32, 7.2, 2], [32, 2.8, 2], [40, 2.8, 2], [40, 2.8, 12]], 0.45, { material: retMat });
  // dry coolers with fans (fans spin)
  const dcMat = mat("chillers", "steel", { rough: 0.55, metal: 0.3 }), fanMat = mat("chillers", "metal", { rough: 0.4, metal: 0.5 });
  const fans = [];
  for (let c = 0; c < 2; c++) for (let r = 0; r < 4; r++) {
    const x = 46 + c * 9, z = -12 + r * 7.4;
    box("chillers", null, 7, 2.6, 5.6, x, 0.3, z, { material: dcMat });
    [-1.6, 1.6].forEach(dx => {
      const f = new THREE.Group(); f.position.set(x + dx, 3, z);
      for (let b = 0; b < 3; b++) { const blade = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.08, 0.5), fanMat); blade.rotation.y = b * Math.PI / 3; blade.userData.comp = "chillers"; pickables.push(blade); f.add(blade); }
      scene.add(f); fans.push(f);
    });
  }
  pipe("chillers", "cool", [[38, 2, -12], [42, 2, -12], [42, 2, 12], [40, 2.8, 12]], 0.4, { material: dcMat });
  cyl("chillers", "wall", 4, 4, 9, 58, 0.3, 26, { rough: 0.6, metal: 0.2 }); // water tank

  // ── Operations & security: office, guardhouse, gate ──
  box("ops", "wall", 14, 6, 9, -34, 0.3, 4, { rough: 0.85 });
  const glassMat = mat("ops", "glass", { rough: 0.15, metal: 0.4 });
  for (let i = 0; i < 4; i++) box("ops", null, 2.2, 1.4, 0.15, -39.5 + i * 3.6, 2.6, 8.55, { material: glassMat, noShadow: true });
  box("ops", "steel", 14.4, 0.4, 9.4, -34, 6.3, 4, { metal: 0.3 });
  box("ops", "wall", 4, 3, 4, -66, 0.3, 40, { rough: 0.85 });
  box("ops", "power", 10, 0.3, 0.3, -60, 1.4, 44, { rough: 0.6 });
  // perimeter fence (posts + rails)
  const fenceMat = mat("ops", "fence", { metal: 0.5, rough: 0.5 });
  const FX0 = -74, FX1 = 76, FZ0 = -47, FZ1 = 49;
  [[FX0, FZ0, FX1, FZ0], [FX1, FZ0, FX1, FZ1], [FX1, FZ1, -54, FZ1], [-66, FZ1, FX0, FZ1], [FX0, FZ1, FX0, FZ0]].forEach(([x0, z0, x1, z1]) => {
    const len = Math.hypot(x1 - x0, z1 - z0), n = Math.ceil(len / 6);
    for (let i = 0; i <= n; i++) cyl("ops", null, 0.12, 0.12, 2.4, x0 + (x1 - x0) * i / n, 0, z0 + (z1 - z0) * i / n, { material: fenceMat, seg: 6 });
    const rail = new THREE.Mesh(new THREE.BoxGeometry(len, 0.1, 0.1), fenceMat);
    rail.position.set((x0 + x1) / 2, 2.3, (z0 + z1) / 2); rail.rotation.y = -Math.atan2(z1 - z0, x1 - x0);
    rail.userData.comp = "ops"; pickables.push(rail); scene.add(rail);
  });

  // ── Flows: power in, heat out ──
  const FLOWS = {
    power: { key: "power", pts: [[-118, 22, -30], [-90, 21.6, -30], [-64, 8, -26], [-56, 6, -26], [-46, 3.5, -24], [-30, 3.5, -24], [-24, 3.5, -24], [-24, 3.5, -12], [-15, 3.5, -11], [-7, 4.6, -11], [-7, 4.6, -11.5], [20, 4.6, -11.5]] },
    heat: { key: "hot", pts: [[6, 3.9, -8.5], [XE + 0.8, 7.2, -5.5], [XE + 0.8, 7.2, 2], [32, 7.2, 2], [32, 2.8, 2], [40, 2.8, 2], [40, 2.8, 12], [42, 2, 12], [46, 3.5, 6], [50, 6, 0], [50, 14, -2]] },
  };
  const flowState = { power: false, heat: false };
  Object.values(FLOWS).forEach(f => {
    const v = f.pts.map(p => new THREE.Vector3(...p)); const segs = []; let L = 0;
    for (let i = 0; i < v.length - 1; i++) { const l = v[i].distanceTo(v[i + 1]); segs.push({ a: v[i], b: v[i + 1], l, s: L }); L += l; }
    f.segs = segs; f.L = L; f.group = new THREE.Group(); f.group.visible = false; scene.add(f.group);
    f.mat = new THREE.MeshBasicMaterial({ color: P[f.key] });
    f.dots = []; const n = Math.round(L / 5);
    for (let i = 0; i < n; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(0.75, 12, 8), f.mat); f.group.add(d); f.dots.push(d); }
  });
  function placeFlow(f, t) {
    f.dots.forEach((d, i) => {
      let s = ((i / f.dots.length) * f.L + t * 9) % f.L;
      const seg = f.segs.find(g => s >= g.s && s <= g.s + g.l) || f.segs[f.segs.length - 1];
      d.position.lerpVectors(seg.a, seg.b, (s - seg.s) / seg.l);
    });
  }
  document.querySelectorAll("[data-flow]").forEach(b => b.addEventListener("click", () => {
    const k = b.dataset.flow; flowState[k] = !flowState[k]; b.setAttribute("aria-pressed", flowState[k]);
    FLOWS[k].group.visible = flowState[k]; placeFlow(FLOWS[k], clock); kick();
  }));

  // ── Labels (HTML overlay) ──
  const ANCHORS = {
    grid: [-100, 28, -30], substation: [-56, 9, -26], switchgear: [-38, 7, -24], generators: [-36, 5.5, 30], ups: [-14, 4, -4],
    busway: [4, 6.2, -11.5], racks: [8, 4.2, 4.5], network: [24.5, 5, -1], cdu: [XE + 0.4, 8, 0], chillers: [50, 5, -2],
    shell: [-2, 9.5, -18], ops: [-34, 8, 4],
  };
  const labelLayer = document.createElement("div"); labelLayer.className = "dc-labels"; host.appendChild(labelLayer);
  const labels = Object.entries(ANCHORS).map(([id, p]) => {
    const b = document.createElement("button"); b.type = "button"; b.className = "dc-label"; b.textContent = COMPS[id].name;
    b.addEventListener("click", () => select(id)); b.addEventListener("mouseenter", () => setHover(id)); b.addEventListener("mouseleave", () => setHover(null));
    labelLayer.appendChild(b); return { id, b, v: new THREE.Vector3(...p) };
  });
  const labelBtn = document.getElementById("dcLabels");
  labelBtn.addEventListener("click", () => { const on = labelBtn.getAttribute("aria-pressed") !== "true"; labelBtn.setAttribute("aria-pressed", on); labelLayer.hidden = !on; kick(); });

  // ── Highlight ──
  let hovered = null;
  function setHover(id) { if (hovered === id) return; hovered = id; if (ready) paintHighlight(); }
  function paintHighlight() {
    const hl = new THREE.Color(P.hl);
    mats.forEach(({ m, comp, glow, key }) => {
      if (glow) return;
      const on = comp && (comp === hovered || comp === selected);
      m.emissive.copy(on ? hl : new THREE.Color(0x000000)); m.emissiveIntensity = on ? (comp === hovered ? 0.55 : 0.32) : 0;
    });
    labels.forEach(l => l.b.classList.toggle("on", l.id === hovered || l.id === selected));
    listEl.querySelectorAll(".dc-item").forEach(b => b.classList.toggle("hl", b.dataset.comp === hovered));
    renderer.domElement.style.cursor = hovered ? "pointer" : "grab";
    kick();
  }

  // ── Theme ──
  function retheme() {
    P = palette(); scene.background = new THREE.Color(P.bg);
    hemi.color.set(P.dark ? 0xc8d4ff : 0xffffff); hemi.groundColor.set(P.dark ? 0x202020 : 0x8a8f96); hemi.intensity = P.dark ? 0.95 : 0.75;
    sun.intensity = P.dark ? 0.85 : 0.8;
    mats.forEach(o => { if (o.key) o.m.color.set(P[o.key]); if (o.glow) o.m.emissive.set(P[o.key]); });
    Object.values(FLOWS).forEach(f => f.mat.color.set(P[f.key]));
    paintHighlight();
  }
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", retheme);
  new MutationObserver(retheme).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

  // ── Camera controls: drag to orbit, wheel or pinch to zoom ──
  const DEF = { theta: 0.5, phi: 0.92, r: 165 };
  const cam = { ...DEF }, target = new THREE.Vector3(-24, 0, 4);
  function placeCamera() {
    cam.phi = Math.min(1.42, Math.max(0.25, cam.phi)); cam.r = Math.min(420, Math.max(45, cam.r));
    camera.position.set(target.x + cam.r * Math.sin(cam.phi) * Math.sin(cam.theta), target.y + cam.r * Math.cos(cam.phi), target.z + cam.r * Math.sin(cam.phi) * Math.cos(cam.theta));
    camera.lookAt(target);
  }
  const ptrs = new Map(); let dragMoved = false, pinch0 = 0;
  const cv = renderer.domElement;
  cv.style.touchAction = "none";
  cv.addEventListener("pointerdown", e => { ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); dragMoved = false; cv.setPointerCapture(e.pointerId); if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); } });
  cv.addEventListener("pointermove", e => {
    const p = ptrs.get(e.pointerId);
    if (!p) { pick(e); return; }
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    if (ptrs.size === 1) {
      if (Math.abs(dx) + Math.abs(dy) > 2) dragMoved = true;
      cam.theta -= dx * 0.006; cam.phi -= dy * 0.005; userMoved = true;
    } else if (ptrs.size === 2) {
      p.x = e.clientX; p.y = e.clientY; const [a, b] = [...ptrs.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch0) cam.r *= pinch0 / d; pinch0 = d; dragMoved = true; userMoved = true;
    }
    p.x = e.clientX; p.y = e.clientY; placeCamera(); kick();
  });
  const up = e => { const was = ptrs.has(e.pointerId); ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch0 = 0; if (was && !dragMoved && e.type === "pointerup") { pick(e); if (hovered) select(hovered); } };
  cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);
  cv.addEventListener("pointerleave", () => { if (!ptrs.size) { setHover(null); hideTip(); } });
  cv.addEventListener("wheel", e => { e.preventDefault(); cam.r *= Math.exp(e.deltaY * 0.0012); userMoved = true; placeCamera(); kick(); }, { passive: false });
  document.getElementById("dcReset").addEventListener("click", () => { Object.assign(cam, DEF); userMoved = false; placeCamera(); kick(); });

  // ── Picking + tooltip ──
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const tip = document.getElementById("ctip");
  function pick(e) {
    const r = cv.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(pickables, false)[0];
    const id = hit ? hit.object.userData.comp : null;
    setHover(id);
    if (id) {
      tip.innerHTML = `<b>${esc(COMPS[id].name)}</b>${esc(COMPS[id].what)}<br><span style="color:var(--muted)">Click for details</span>`;
      tip.hidden = false; const t = tip.getBoundingClientRect();
      tip.style.left = Math.min(e.clientX + 14, innerWidth - t.width - 8) + "px"; tip.style.top = Math.min(e.clientY + 14, innerHeight - t.height - 8) + "px";
    } else hideTip();
  }
  function hideTip() { tip.hidden = true; }

  // ── Render loop (runs only while the page is visible) ──
  let running = false, raf = 0, clock = 0, last = 0, dirty = true, userMoved = false, overCanvas = false;
  cv.addEventListener("pointerenter", () => (overCanvas = true));
  cv.addEventListener("pointerleave", () => (overCanvas = false));
  function kick() { dirty = true; if (running && !raf) raf = requestAnimationFrame(frame); }
  function resize() {
    const w = host.clientWidth, h = host.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); cv.style.width = w + "px"; cv.style.height = h + "px";
    camera.aspect = w / h; camera.updateProjectionMatrix(); kick();
  }
  new ResizeObserver(resize).observe(host);
  const tmp = new THREE.Vector3();
  function frame(now) {
    raf = 0; if (!running) return;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0; last = now;
    const animate = !reduce;
    if (animate) {
      clock += dt; fans.forEach((f, i) => (f.rotation.y += dt * (5 + (i % 3))));
      Object.entries(FLOWS).forEach(([k, f]) => { if (flowState[k]) placeFlow(f, clock); });
      if (!userMoved && !ptrs.size && !overCanvas) { cam.theta += dt * 0.03; placeCamera(); }
    }
    renderer.render(scene, camera);
    if (!labelLayer.hidden) {
      const w = host.clientWidth, h = host.clientHeight;
      labels.forEach(l => {
        tmp.copy(l.v).project(camera);
        const vis = tmp.z < 1 && Math.abs(tmp.x) < 1.05 && Math.abs(tmp.y) < 1.05;
        l.b.style.display = vis ? "" : "none";
        if (vis) l.b.style.transform = `translate(${((tmp.x + 1) / 2 * w).toFixed(1)}px, ${((1 - tmp.y) / 2 * h).toFixed(1)}px) translate(-50%, -100%)`;
      });
    }
    dirty = false;
    if (animate || dirty) raf = requestAnimationFrame(frame);
  }

  ready = true; retheme(); placeCamera(); select("racks");
  return {
    mount() { running = true; resize(); last = 0; kick(); },
    pause() { running = false; cancelAnimationFrame(raf); raf = 0; hideTip(); },
  };
})();
