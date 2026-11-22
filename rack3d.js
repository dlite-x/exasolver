// "Inside an AI rack" on the Chips page: three 3D views (rack, compute tray, GPU package) showing how the chips fit together.
// Needs three.js r128 (window.THREE) and data.js (window.VC). The layout follows a 72-GPU liquid-cooled rack in outline; it is a schematic.
window.VCRack = (() => {
  const host = document.getElementById("rkStage"), listEl = document.getElementById("rkList"), card = document.getElementById("rkCard");
  if (!host) return { mount() {}, pause() {} };
  const VC = window.VC || { companies: [], stages: [] };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const coName = Object.fromEntries(VC.companies.map(c => [c.id, c.name]));
  const stageTitle = Object.fromEntries(VC.stages.map(s => [s.id, s.title]));
  const tip = document.getElementById("ctip");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ── Content ──
  const VIEWS = {
    rack: { name: "The rack", intro: "One rack is a single computer the size of a wardrobe. Everything in it exists to keep 72 GPUs fed with data, power and coolant.", parts: {
      compute: { name: "Compute trays", what: "Eighteen slim trays, each holding 4 GPUs and 2 CPUs. That makes 72 GPUs and 36 CPUs in one rack.", fit: "This is where the math happens. Everything else in the rack serves these trays.", stage: "servers", who: ["nvidia", "foxconn", "quanta", "wiwynn", "supermicro"] },
      nvswitch: { name: "GPU switch trays", what: "Nine trays of switch chips in the middle of the rack. They connect every GPU to every other GPU.", fit: "With these links the 72 GPUs behave like one very large GPU. A model too big for one chip is spread across all of them.", stage: "network", who: ["nvidia", "broadcom", "astera", "credo"] },
      spine: { name: "Cable spine", what: "Thousands of copper cables running up the back, joining the compute trays to the switch trays.", fit: "Copper is used because the distances are short. It costs less and uses less power than optical links.", stage: "network", who: ["Amphenol", "Molex", "credo"] },
      power: { name: "Power shelves and busbar", what: "Shelves at the top and bottom turn the building's AC power into DC and feed a thick copper bar that runs up the back.", fit: "One rack draws 100–130 kW, about what a hundred homes use. Trays clip onto the bar instead of using cables.", stage: "electrical", who: ["delta", "vertiv", "schneider", "eaton", "infineon"] },
      cooling: { name: "Liquid manifolds", what: "Two pipes down the back: one brings cool liquid to every tray, the other carries the heated liquid away.", fit: "Air cannot remove this much heat from such a small space, so liquid runs right over the chips.", stage: "electrical", who: ["vertiv", "coolit", "boyd", "liquidstack"] },
      tor: { name: "Network switches", what: "Switches at the top connect the rack to the rest of the data center and to storage.", fit: "A big model is trained across hundreds of racks, so each rack needs fast links to its neighbours.", stage: "network", who: ["arista", "nvidia", "cisco", "broadcom"] },
      frame: { name: "Rack frame", what: "A steel cabinet about 2.2 metres tall. Fully loaded it weighs more than a tonne.", fit: "The weight is one reason AI halls need stronger floors than ordinary data centers.", stage: "servers", who: ["foxconn", "quanta", "rittal", "vertiv"] },
    } },
    tray: { name: "Inside a tray", intro: "Slide one compute tray out and take the lid off. Each kind of chip has one job, and they hand work to each other.", parts: {
      gpu: { name: "GPUs", what: "Four graphics processors. Each one does trillions of simple calculations a second, all at once.", fit: "The GPUs do the actual training and answering. The rest of the tray keeps them busy.", stage: "design", who: ["nvidia", "amd", "broadcom"] },
      cpu: { name: "CPUs", what: "Two general-purpose processors. They run the operating system, prepare data and hand jobs to the GPUs.", fit: "A CPU is the manager and the GPUs are the workforce. One CPU can direct two GPUs.", stage: "design", who: ["nvidia", "amd", "intel"] },
      cpumem: { name: "System memory", what: "Ordinary memory beside each CPU. It holds data that is waiting to be sent to the GPUs.", fit: "Slower than the memory inside a GPU package, but much cheaper per gigabyte.", stage: "memory", who: ["skhynix", "samsung", "micron"] },
      dpu: { name: "Network cards", what: "Cards at the front that connect the tray to the data center network and to shared storage.", fit: "Training data arrives through these, and results leave through them.", stage: "network", who: ["nvidia", "broadcom", "marvell"] },
      ssd: { name: "Solid-state drives", what: "Fast local storage for the operating system, checkpoints and data being worked on.", fit: "Keeping a copy of data close by avoids waiting on the network.", stage: "memory", who: ["samsung", "skhynix", "micron", "sandisk"] },
      coldplate: { name: "Cold plates", what: "Metal plates bolted onto every hot chip, with liquid flowing through them.", fit: "They carry the heat straight from the chip to the pipes at the back of the rack.", stage: "electrical", who: ["boyd", "coolit", "vertiv"] },
      vrm: { name: "Power delivery", what: "Rows of small regulators that step the rack's DC power down to under one volt for the chips.", fit: "A GPU needs hundreds of amps at a very low, very steady voltage.", stage: "electrical", who: ["infineon", "delta", "Monolithic Power"] },
      nvlink: { name: "GPU link connectors", what: "Connectors at the back that plug into the cable spine.", fit: "They join this tray's GPUs to the switch trays, and through them to every other GPU in the rack.", stage: "network", who: ["nvidia", "Amphenol", "astera"] },
    } },
    chip: { name: "Inside a GPU", intro: "Take the lid off one GPU. It is several chips from different companies, joined into one package.", parts: {
      die: { name: "GPU logic", what: "The chip that does the calculations: tens of billions of transistors on silicon about the size of a postage stamp.", fit: "Designed by one company and manufactured by another, on the most advanced production lines in the world.", stage: "foundry", who: ["nvidia", "tsmc", "asml"] },
      hbm: { name: "High-bandwidth memory", what: "Eight towers of memory chips stacked on top of each other, placed right beside the logic.", fit: "A model's weights live here while it runs. Being millimetres from the logic lets data move fast enough to keep up.", stage: "memory", who: ["skhynix", "samsung", "micron"] },
      interposer: { name: "Silicon interposer", what: "A slab of silicon with extremely fine wiring that links the logic to the memory.", fit: "Joining chips this way is called advanced packaging. Capacity for it has been one of the tightest bottlenecks in AI.", stage: "packaging", who: ["tsmc", "amkor", "ase"] },
      substrate: { name: "Package substrate", what: "A stiff board under everything, with solder balls underneath that attach it to the tray.", fit: "It fans thousands of tiny connections out to a size a circuit board can use, and brings power in.", stage: "packaging", who: ["Ibiden", "Unimicron", "amkor"] },
      caps: { name: "Capacitors", what: "Tiny components around the edge that smooth out the power supply.", fit: "They hold a small reserve of charge for the instant the chip's demand jumps.", stage: "materials", who: ["Murata", "Samsung Electro-Mechanics"] },
    } },
  };
  const ORDER = ["rack", "tray", "chip"];
  let view = "rack", selected = { rack: "compute", tray: "gpu", chip: "hbm" }, hovered = null, ready = false;

  function drawList() {
    const V = VIEWS[view];
    document.getElementById("rkIntro").textContent = V.intro;
    listEl.innerHTML = Object.entries(V.parts).map(([id, p]) => `<button type="button" class="dc-item" data-part="${id}" aria-pressed="${selected[view] === id}"><i class="g-compute"></i>${esc(p.name)}</button>`).join("");
    listEl.querySelectorAll(".dc-item").forEach(b => { b.addEventListener("click", () => select(b.dataset.part)); b.addEventListener("mouseenter", () => setHover(b.dataset.part)); b.addEventListener("mouseleave", () => setHover(null)); });
    document.querySelectorAll("[data-rkview]").forEach(b => b.setAttribute("aria-pressed", b.dataset.rkview === view));
  }
  function select(id) {
    selected[view] = id; const p = VIEWS[view].parts[id];
    listEl.querySelectorAll(".dc-item").forEach(b => b.setAttribute("aria-pressed", b.dataset.part === id));
    const next = view === "rack" && id === "compute" ? `<button type="button" class="chip" data-go="tray">Open a tray →</button>` : view === "tray" && id === "gpu" ? `<button type="button" class="chip" data-go="chip">Look inside a GPU →</button>` : "";
    card.innerHTML = `<p class="eyebrow">${esc(VIEWS[view].name)} · on the chain: ${esc(stageTitle[p.stage] || p.stage)}</p><h3>${esc(p.name)}</h3><p>${esc(p.what)}</p>
      <p><b>How it fits.</b> ${esc(p.fit)}</p><p class="dc-who"><b>Who makes it</b><span>${p.who.map(w => `<em>${esc(coName[w] || w)}</em>`).join("")}</span></p>${next}`;
    const go = card.querySelector("[data-go]"); if (go) go.addEventListener("click", () => setView(go.dataset.go));
    if (ready) paint();
  }
  function setHover(id) { if (hovered === id) return; hovered = id; if (ready) paint(); }
  document.querySelectorAll("[data-rkview]").forEach(b => b.addEventListener("click", () => setView(b.dataset.rkview)));

  const THREE = window.THREE;
  let renderer;
  try { if (!THREE) throw new Error("no three"); renderer = new THREE.WebGLRenderer({ antialias: true }); }
  catch (e) { host.innerHTML = `<p class="dc-fallback">The 3D model needs WebGL, which isn't available in this browser. The list of parts still works.</p>`; drawList(); select(selected[view]); return { mount() {}, pause() {} }; }

  // ── Scene ──
  const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  function palette() {
    const bg = new THREE.Color(css("--bg") || "#f2f4f7"), dark = bg.r + bg.g + bg.b < 1.2;
    return { dark, bg: css("--canvas"), floor: dark ? "#1d2228" : "#e3e6ea", steel: dark ? "#5d6671" : "#b9c0c9", frame: dark ? "#3a424c" : "#8b949f", tray: dark ? "#2b3038" : "#3b424c",
      face: dark ? "#4a525d" : "#69727e", sw: dark ? "#274a78" : "#2f65ad", psu: css("--c1"), copper: dark ? "#c98a4b" : "#b87333", cool: css("--s1"), hot: css("--c3"), fibre: css("--s3"),
      led: "#45d08f", pcb: dark ? "#1f5b46" : "#2c7a5c", chip: dark ? "#15181d" : "#23272e", lid: dark ? "#9099a4" : "#c9cfd6", mem: dark ? "#3b4350" : "#566070", plate: dark ? "#5b8fd0" : "#7fb0ea",
      inter: dark ? "#7c8794" : "#aab3bd", die: dark ? "#b9a26a" : "#d8be7e", hbm: dark ? "#6d5fb0" : "#7a69c9", sub: dark ? "#2a6a4f" : "#3a8a66", gold: "#d4a94a", glass: dark ? "#6f8fb3" : "#9fc0e3", hl: css("--accent") };
  }
  let P = palette();
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(30, 1, 0.5, 2000);
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  host.appendChild(renderer.domElement);
  const cv = renderer.domElement; cv.style.touchAction = "none"; cv.setAttribute("role", "img"); cv.setAttribute("aria-label", "3D model. Drag to rotate, scroll to zoom.");
  const hemi = new THREE.HemisphereLight(0xffffff, 0x777777, 0.8); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 0.75); sun.position.set(30, 60, 45); sun.castShadow = true;
  Object.assign(sun.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 5, far: 200 }); sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0006; scene.add(sun);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(60, 48), new THREE.MeshStandardMaterial({ roughness: 1 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);

  const groups = { rack: new THREE.Group(), tray: new THREE.Group(), chip: new THREE.Group() }, picks = { rack: [], tray: [], chip: [] }, mats = [];
  ORDER.forEach(k => scene.add(groups[k]));
  let cur = "rack"; // view being built
  function mat(part, key, o = {}) {
    const m = new THREE.MeshStandardMaterial({ color: P[key], roughness: o.rough ?? 0.7, metalness: o.metal ?? 0.1, transparent: o.opacity != null, opacity: o.opacity ?? 1 });
    if (o.glow) { m.emissive.set(P[key]); m.emissiveIntensity = 0.9; }
    mats.push({ m, key, part, view: cur, glow: !!o.glow }); return m;
  }
  function box(part, m, w, h, d, x, y, z, noShadow) {
    const me = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); me.position.set(x, y + h / 2, z); me.castShadow = !noShadow; me.receiveShadow = true;
    if (part) { me.userData.part = part; picks[cur].push(me); } groups[cur].add(me); return me;
  }
  function cyl(part, m, r, h, x, y, z, axis) {
    const me = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 14), m); me.position.set(x, y, z); if (axis === "z") me.rotation.x = Math.PI / 2; if (axis === "x") me.rotation.z = Math.PI / 2;
    me.castShadow = true; if (part) { me.userData.part = part; picks[cur].push(me); } groups[cur].add(me); return me;
  }

  // View 1: the rack. Units are roughly decimetres: 6 wide, 21 tall, 10 deep. Front faces +z.
  cur = "rack";
  {
    const fr = mat("frame", "frame", { metal: 0.4, rough: 0.5 }), glass = mat("frame", "glass", { opacity: 0.14, rough: 0.2 });
    [[-3.1, 5.1], [3.1, 5.1], [-3.1, -5.1], [3.1, -5.1]].forEach(([x, z]) => box("frame", fr, 0.3, 21, 0.3, x, 0.3, z));
    box("frame", fr, 6.5, 0.3, 10.5, 0, 0, 0); box("frame", fr, 6.5, 0.3, 10.5, 0, 21.3, 0);
    box("frame", glass, 0.05, 20.4, 9.9, -3.2, 0.6, 0, true); box("frame", glass, 0.05, 20.4, 9.9, 3.2, 0.6, 0, true);
    const tray = mat("compute", "tray", { metal: 0.3, rough: 0.5 }), face = mat("compute", "face", { metal: 0.3 }), led = mat("compute", "led", { glow: true });
    const swT = mat("nvswitch", "tray", { metal: 0.3, rough: 0.5 }), swF = mat("nvswitch", "sw", { metal: 0.2 }), swL = mat("nvswitch", "cool", { glow: true });
    const psu = mat("power", "psu", { rough: 0.6 }), psuB = mat("power", "tray", { metal: 0.3 }), torM = mat("tor", "steel", { metal: 0.4 }), torP = mat("tor", "fibre", { glow: true });
    let y = 0.6;
    const shelf = () => { box("power", psuB, 5.6, 0.72, 9, 0, y, 0); for (let i = 0; i < 6; i++) box("power", psu, 0.8, 0.5, 0.08, -2.25 + i * 0.9, y + 0.11, 4.54, true); y += 0.8; };
    const comp = pulled => { const dz = pulled ? 2.6 : 0; box("compute", tray, 5.6, 0.4, 9, 0, y, dz); box("compute", face, 5.6, 0.4, 0.06, 0, y, 4.53 + dz, true); for (let i = 0; i < 5; i++) box("compute", led, 0.16, 0.07, 0.03, -2.3 + i * 0.34, y + 0.16, 4.57 + dz, true); y += 0.48; };
    const sw = () => { box("nvswitch", swT, 5.6, 0.4, 9, 0, y, 0); box("nvswitch", swF, 5.6, 0.4, 0.06, 0, y, 4.53, true); for (let i = 0; i < 12; i++) box("nvswitch", swL, 0.12, 0.07, 0.03, -2.3 + i * 0.42, y + 0.16, 4.57, true); y += 0.48; };
    for (let i = 0; i < 3; i++) shelf();
    for (let i = 0; i < 8; i++) comp(i === 5);
    for (let i = 0; i < 9; i++) sw();
    for (let i = 0; i < 10; i++) comp(false);
    for (let i = 0; i < 3; i++) shelf();
    for (let i = 0; i < 2; i++) { box("tor", torM, 5.6, 0.44, 7, 0, y, 1); for (let k = 0; k < 16; k++) box("tor", torP, 0.2, 0.12, 0.03, -2.4 + k * 0.32, y + 0.16, 4.52, true); y += 0.52; }
    box("power", mat("power", "copper", { metal: 0.7, rough: 0.35 }), 0.5, 19.6, 0.25, 0, 0.9, -4.75);
    box("spine", mat("spine", "chip", { rough: 0.6 }), 1.5, 14, 0.5, 1.5, 3.6, -4.8); box("spine", mat("spine", "chip", { rough: 0.6 }), 1.5, 14, 0.5, -1.5, 3.6, -4.8);
    cyl("cooling", mat("cooling", "cool", { metal: 0.3, rough: 0.4 }), 0.26, 19.6, -2.65, 10.7, -4.85); cyl("cooling", mat("cooling", "hot", { metal: 0.3, rough: 0.4 }), 0.26, 19.6, 2.65, 10.7, -4.85);
  }
  // View 2: one compute tray, lid off. About 18 wide (x) and 30 deep (z); front faces +z.
  cur = "tray";
  {
    const ch = mat(null, "frame", { metal: 0.4, rough: 0.5 }), pcb = mat(null, "pcb", { rough: 0.8 });
    box(null, ch, 19, 0.3, 31, 0, 0, 0); box(null, pcb, 17.6, 0.15, 24, 0, 0.3, -1.5, true);
    [[-9.4, 0, 0.25, 31], [9.4, 0, 0.25, 31]].forEach(([x, z, w, d]) => box(null, ch, w, 1.6, d, x, 0.3, z)); box(null, ch, 19, 1.6, 0.25, 0, 0.3, -15.4);
    const sub = mat("gpu", "sub"), lid = mat("gpu", "lid", { metal: 0.6, rough: 0.35 }), plate = mat("coldplate", "plate", { opacity: 0.55, metal: 0.4, rough: 0.2 });
    const csub = mat("cpu", "sub"), clid = mat("cpu", "lid", { metal: 0.6, rough: 0.35 }), mem = mat("cpumem", "mem", { rough: 0.6 }), vr = mat("vrm", "chip", { rough: 0.5 }), vrc = mat("vrm", "copper", { metal: 0.6, rough: 0.4 });
    const pipeC = mat("coldplate", "cool", { metal: 0.3, rough: 0.4 }), pipeH = mat("coldplate", "hot", { metal: 0.3, rough: 0.4 });
    [-6.3, -2.1, 2.1, 6.3].forEach(x => {
      box("gpu", sub, 3.4, 0.2, 3.4, x, 0.45, -5.5); box("gpu", lid, 2.8, 0.35, 2.8, x, 0.65, -5.5); box("coldplate", plate, 3.1, 0.3, 3.1, x, 1.05, -5.5, true);
      cyl("coldplate", pipeC, 0.16, 8, x - 0.8, 1.25, -10.6, "z"); cyl("coldplate", pipeH, 0.16, 8, x + 0.8, 1.25, -10.6, "z");
      for (let k = 0; k < 5; k++) { box("vrm", vr, 0.5, 0.4, 0.5, x - 1.3 + k * 0.65, 0.45, -2.9); box("vrm", vrc, 0.5, 0.25, 0.3, x - 1.3 + k * 0.65, 0.45, -8.1, true); }
    });
    [-4.2, 4.2].forEach(x => {
      box("cpu", csub, 3, 0.2, 3, x, 0.45, 2.2); box("cpu", clid, 2.4, 0.3, 2.4, x, 0.65, 2.2); box("coldplate", plate, 2.7, 0.3, 2.7, x, 1.0, 2.2, true);
      for (let k = 0; k < 4; k++) { box("cpumem", mem, 0.5, 0.35, 2.6, x - 2.9 + (k < 2 ? k * 0.7 : 4.4 + (k - 2) * 0.7), 0.45, 2.2); }
      cyl("coldplate", pipeC, 0.13, 5.6, x - 0.6, 1.2, -1.6, "z"); cyl("coldplate", pipeH, 0.13, 5.6, x + 0.6, 1.2, -1.6, "z");
    });
    const ssd = mat("ssd", "steel", { metal: 0.5, rough: 0.4 }), ssdL = mat("ssd", "led", { glow: true });
    for (let k = 0; k < 8; k++) { box("ssd", ssd, 0.55, 1.1, 5.2, -8.2 + k * 0.85, 0.3, 12.2); box("ssd", ssdL, 0.12, 0.12, 0.04, -8.2 + k * 0.85, 1.1, 14.83, true); }
    const nic = mat("dpu", "pcb", { rough: 0.7 }), nicC = mat("dpu", "chip"), port = mat("dpu", "fibre", { glow: true });
    [3.2, 6.6].forEach(x => { box("dpu", nic, 2.6, 0.15, 6, x, 0.6, 11.8); box("dpu", nicC, 1.3, 0.3, 1.3, x, 0.75, 10.6); for (let k = 0; k < 2; k++) box("dpu", port, 0.9, 0.5, 0.5, x - 0.6 + k * 1.2, 0.5, 14.9, true); });
    const nv = mat("nvlink", "sw", { metal: 0.2 }), nvp = mat("nvlink", "gold", { metal: 0.8, rough: 0.3 });
    [-6.6, -3.6, 3.6, 6.6].forEach(x => { box("nvlink", nv, 2.2, 1.1, 1.4, x, 0.3, -14.5); box("nvlink", nvp, 1.8, 0.5, 0.2, x, 0.6, -15.3, true); });
    box("vrm", mat("vrm", "copper", { metal: 0.7, rough: 0.35 }), 1.6, 1.1, 1.6, 0, 0.3, -14.4);
    cyl("coldplate", pipeC, 0.3, 1.4, -1.6, 0.9, -15, "z"); cyl("coldplate", pipeH, 0.3, 1.4, 1.6, 0.9, -15, "z");
    cyl("coldplate", pipeC, 0.2, 16.4, 0, 1.25, -14.3, "x").position.y = 1.5; cyl("coldplate", pipeH, 0.2, 16.4, 0, 1.25, -13.6, "x").position.y = 1.9;
  }
  // View 3: one GPU package with the lid off. About 12 across.
  cur = "chip";
  {
    box("substrate", mat("substrate", "sub", { rough: 0.8 }), 12, 0.5, 12, 0, 0, 0);
    const ball = mat("substrate", "lid", { metal: 0.8, rough: 0.3 });
    for (let i = 0; i < 14; i++) for (let j = 0; j < 14; j++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), ball); b.position.set(-5.2 + i * 0.8, -0.12, -5.2 + j * 0.8); b.userData.part = "substrate"; picks.chip.push(b); groups.chip.add(b); }
    box("interposer", mat("interposer", "inter", { metal: 0.5, rough: 0.35 }), 9.6, 0.22, 8.4, 0, 0.5, 0);
    const die = mat("die", "die", { metal: 0.6, rough: 0.3 });
    box("die", die, 2.5, 0.3, 5.4, -1.35, 0.72, 0); box("die", die, 2.5, 0.3, 5.4, 1.35, 0.72, 0);
    const hA = mat("hbm", "hbm", { metal: 0.3, rough: 0.4 }), hB = mat("hbm", "mem", { metal: 0.3, rough: 0.4 });
    [-3.75, 3.75].forEach(x => [-3, -1, 1, 3].forEach(z => { for (let l = 0; l < 8; l++) box("hbm", l % 2 ? hB : hA, 1.5, 0.14, 1.6, x, 0.72 + l * 0.14, z, l > 0); }));
    const cap = mat("caps", "gold", { metal: 0.6, rough: 0.4 });
    for (let i = 0; i < 12; i++) { const t = -5 + i * 0.9; box("caps", cap, 0.4, 0.22, 0.25, t, 0.5, 5.3, true); box("caps", cap, 0.4, 0.22, 0.25, t, 0.5, -5.3, true); }
  }
  // Labels
  const ANCH = {
    rack: { compute: [3.3, 16.4, 5], nvswitch: [-3.3, 10.2, 5], power: [3.3, 2, 5], cooling: [-2.7, 21.4, -4.9], spine: [1.6, 18.2, -5], tor: [-3.3, 20.9, 5], frame: [3.3, 21.8, -5] },
    tray: { gpu: [-2.1, 2, -5.5], cpu: [4.2, 1.8, 2.2], cpumem: [-7.2, 1.3, 2.2], dpu: [5, 1.6, 13], ssd: [-5.2, 2, 13], coldplate: [6.3, 2.2, -10.5], vrm: [-6.3, 1.2, -2.6], nvlink: [-6.6, 2, -14.6] },
    chip: { die: [0, 1.5, 0], hbm: [-3.75, 2.4, -1], interposer: [2.6, 1, 3.9], substrate: [5, 0.9, -5.4], caps: [-3, 1, 5.4] },
  };
  const labelLayer = document.createElement("div"); labelLayer.className = "dc-labels"; host.appendChild(labelLayer);
  let labels = [];
  function buildLabels() {
    labelLayer.innerHTML = "";
    labels = Object.entries(ANCH[view]).map(([id, p]) => { const b = document.createElement("button"); b.type = "button"; b.className = "dc-label"; b.textContent = VIEWS[view].parts[id].name;
      b.addEventListener("click", () => select(id)); b.addEventListener("mouseenter", () => setHover(id)); b.addEventListener("mouseleave", () => setHover(null)); labelLayer.appendChild(b); return { id, b, v: new THREE.Vector3(...p) }; });
  }
  function paint() {
    const hl = new THREE.Color(P.hl), off = new THREE.Color(0);
    mats.forEach(({ m, part, view: v, glow }) => { if (glow) return; const on = v === view && part && (part === hovered || part === selected[view]); m.emissive.copy(on ? hl : off); m.emissiveIntensity = on ? (part === hovered ? 0.55 : 0.3) : 0; });
    labels.forEach(l => l.b.classList.toggle("on", l.id === hovered || l.id === selected[view]));
    listEl.querySelectorAll(".dc-item").forEach(b => b.classList.toggle("hl", b.dataset.part === hovered));
    cv.style.cursor = hovered ? "pointer" : "grab"; kick();
  }
  function retheme() {
    P = palette(); scene.background = new THREE.Color(P.bg); floor.material.color.set(P.floor);
    hemi.intensity = P.dark ? 0.95 : 0.8; sun.intensity = P.dark ? 0.85 : 0.75;
    mats.forEach(o => { o.m.color.set(P[o.key]); if (o.glow) o.m.emissive.set(P[o.key]); }); paint();
  }
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", retheme);
  new MutationObserver(retheme).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

  // Camera: one preset per view; drag to orbit, wheel or pinch to zoom.
  const CAM = { rack: { t: [0, 10.8, 0], theta: 0.62, phi: 1.3, r: 47 }, tray: { t: [0, 0.5, 0], theta: 0.5, phi: 0.82, r: 64 }, chip: { t: [0, 0.6, 0], theta: 0.6, phi: 0.85, r: 30 } };
  const cam = { theta: 0, phi: 1, r: 60 }, target = new THREE.Vector3();
  let userMoved = false, over = false;
  function place() { cam.phi = Math.min(1.5, Math.max(0.2, cam.phi)); cam.r = Math.min(CAM[view].r * 2.2, Math.max(CAM[view].r * 0.3, cam.r));
    camera.position.set(target.x + cam.r * Math.sin(cam.phi) * Math.sin(cam.theta), target.y + cam.r * Math.cos(cam.phi), target.z + cam.r * Math.sin(cam.phi) * Math.cos(cam.theta)); camera.lookAt(target); }
  function setView(v) {
    if (!ready) { view = v; drawList(); select(selected[v]); return; } // no WebGL: the list and card still work
    view = v; ORDER.forEach(k => (groups[k].visible = k === v)); floor.position.y = v === "chip" ? -0.4 : 0;
    const c = CAM[v]; target.set(...c.t); cam.theta = c.theta; cam.phi = c.phi; cam.r = c.r; userMoved = false; hovered = null;
    drawList(); buildLabels(); select(selected[v]); place(); paint();
  }
  const ptrs = new Map(); let moved = false, pinch0 = 0;
  cv.addEventListener("pointerenter", () => (over = true));
  cv.addEventListener("pointerdown", e => { ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); moved = false; cv.setPointerCapture(e.pointerId); if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); } });
  cv.addEventListener("pointermove", e => {
    const p = ptrs.get(e.pointerId); if (!p) { pick(e); return; }
    const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
    if (ptrs.size === 1) { if (Math.abs(dx) + Math.abs(dy) > 2) moved = true; cam.theta -= dx * 0.006; cam.phi -= dy * 0.005; }
    else { const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch0) cam.r *= pinch0 / d; pinch0 = d; moved = true; }
    userMoved = true; place(); kick();
  });
  const up = e => { const was = ptrs.has(e.pointerId); ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch0 = 0; if (was && !moved && e.type === "pointerup") { pick(e); if (hovered) select(hovered); } };
  cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);
  cv.addEventListener("pointerleave", () => { over = false; if (!ptrs.size) { setHover(null); tip.hidden = true; } });
  cv.addEventListener("wheel", e => { e.preventDefault(); cam.r *= Math.exp(e.deltaY * 0.0012); userMoved = true; place(); kick(); }, { passive: false });
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function pick(e) {
    const r = cv.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(picks[view], false)[0], id = hit ? hit.object.userData.part : null; setHover(id);
    if (id) { const p = VIEWS[view].parts[id]; tip.innerHTML = `<b>${esc(p.name)}</b>${esc(p.what)}<br><span style="color:var(--muted)">Click for details</span>`; tip.hidden = false; const t = tip.getBoundingClientRect();
      tip.style.left = Math.max(8, Math.min(e.clientX + 14, innerWidth - t.width - 8)) + "px"; tip.style.top = Math.max(8, Math.min(e.clientY + 14, innerHeight - t.height - 8)) + "px"; } else tip.hidden = true;
  }

  // Render only while the Chips page is open.
  let running = false, raf = 0, last = 0;
  function kick() { if (running && !raf) raf = requestAnimationFrame(frame); }
  function resize() { const w = host.clientWidth, h = host.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); cv.style.width = w + "px"; cv.style.height = h + "px"; camera.aspect = w / h; camera.updateProjectionMatrix(); kick(); }
  new ResizeObserver(resize).observe(host);
  const tmp = new THREE.Vector3();
  function frame(now) {
    raf = 0; if (!running) return;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0; last = now;
    if (!reduce && !userMoved && !over && !ptrs.size) { cam.theta += dt * 0.05; place(); }
    renderer.render(scene, camera);
    const w = host.clientWidth, h = host.clientHeight;
    labels.forEach(l => { tmp.copy(l.v).project(camera); const vis = tmp.z < 1 && Math.abs(tmp.x) < 1.05 && Math.abs(tmp.y) < 1.05; l.b.style.display = vis ? "" : "none"; if (vis) l.b.style.transform = `translate(${((tmp.x + 1) / 2 * w).toFixed(1)}px, ${((1 - tmp.y) / 2 * h).toFixed(1)}px) translate(-50%, -100%)`; });
    if (!reduce) raf = requestAnimationFrame(frame);
  }
  ready = true; retheme(); setView("rack");
  return { mount() { running = true; resize(); last = 0; kick(); }, pause() { running = false; cancelAnimationFrame(raf); raf = 0; tip.hidden = true; } };
})();
