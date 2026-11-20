// 3D scene of an AI data center campus: plain three.js, procedural geometry, no loaders.
// Designed with Lovable (project "AI Campus Diorama") and converted from its TypeScript source,
// src/scene/dataCenterScene.ts. Needs a modern three.js global (r152 or later); the site loads r158.
// Parts carry userData.comp ids that match COMPS in dc3d.js.
(() => {
const THREE = window.THREE;
const COMP_LABELS = {
  grid: "Grid connection",
  substation: "Substation",
  switchgear: "Switchgear",
  generators: "Backup generators",
  ups: "UPS & batteries",
  busway: "Power distribution",
  racks: "AI server racks",
  network: "Network & fibre",
  cdu: "Liquid cooling (CDUs)",
  chillers: "Heat rejection",
  shell: "Building shell",
  ops: "Operations & security"
};
const COL = { power: 14723072, supply: 2783446, ret: 14767642, fibre: 1814394, rack: 1908773 };
function createDataCenterScene(container, opts) {
  const reduced = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const canvas = renderer.domElement;
  canvas.style.display = "block";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.touchAction = "none";
  container.appendChild(canvas);
  const scene = new THREE.Scene();
  const root = new THREE.Group();
  scene.add(root);
  const geoCache = /* @__PURE__ */ new Map();
  const edgeCache = /* @__PURE__ */ new Map();
  const matCache = /* @__PURE__ */ new Map();
  const compMats = /* @__PURE__ */ new Map();
  const themed = [];
  const glows = [];
  const pickables = [];
  const fans = [];
  const edgeMat = new THREE.LineBasicMaterial({ color: 2764598, transparent: true, opacity: 0.45 });
  const latticeMat = new THREE.LineBasicMaterial({ color: 7042176 });
  themed.push({ m: latticeMat, l: 7042176, d: 11186877 });
  function mat(comp, color, o = {}) {
    const key2 = `${comp}|${color}|${JSON.stringify(o)}`;
    const hit = matCache.get(key2);
    if (hit) return hit;
    const m = new THREE.MeshStandardMaterial({ color, roughness: o.rough ?? 0.85, metalness: o.metal ?? 0.05 });
    if (o.opacity !== void 0) {
      m.transparent = true;
      m.opacity = o.opacity;
      m.depthWrite = false;
    }
    if (o.emissive !== void 0) m.emissive.setHex(o.emissive);
    if (o.glow) {
      m.emissiveIntensity = o.glow[1];
      m.userData["glow"] = true;
      glows.push({ m, l: o.glow[0], d: o.glow[1], cur: o.glow[1], tw: !!o.twinkle, ph: glows.length * 1.7 });
    }
    m.userData["baseEmissive"] = m.emissive.clone();
    m.userData["baseEI"] = m.emissiveIntensity;
    if (o.dark !== void 0) themed.push({ m, l: color, d: o.dark });
    if (comp) {
      let s = compMats.get(comp);
      if (!s) {
        s = /* @__PURE__ */ new Set();
        compMats.set(comp, s);
      }
      s.add(m);
    }
    matCache.set(key2, m);
    return m;
  }
  function cached(key2, make) {
    let g = geoCache.get(key2);
    if (!g) {
      g = make();
      geoCache.set(key2, g);
    }
    return g;
  }
  const bgeo = (w, h, d) => cached(`b${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d).translate(0, h / 2, 0));
  const cgeo = (rt, rb, h, seg = 16) => cached(`c${rt},${rb},${h},${seg}`, () => new THREE.CylinderGeometry(rt, rb, h, seg).translate(0, h / 2, 0));
  function add(m, comp, o = {}) {
    m.castShadow = o.shadow !== false;
    m.receiveShadow = true;
    if (comp) {
      m.userData["comp"] = comp;
      pickables.push(m);
    }
    if (o.edges) {
      let eg = edgeCache.get(m.geometry.uuid);
      if (!eg) {
        eg = new THREE.EdgesGeometry(m.geometry, 25);
        edgeCache.set(m.geometry.uuid, eg);
      }
      const e = new THREE.LineSegments(eg, edgeMat);
      e.raycast = () => {
      };
      m.add(e);
    }
    (o.parent ?? root).add(m);
    return m;
  }
  function box(comp, w, h, d, x, y, z, m, o = {}) {
    const me = new THREE.Mesh(bgeo(w, h, d), m);
    me.position.set(x, y, z);
    return add(me, comp, o);
  }
  function cyl(comp, r, h, x, y, z, m, seg = 16, o = {}) {
    const me = new THREE.Mesh(cgeo(r, r, h, seg), m);
    me.position.set(x, y, z);
    return add(me, comp, o);
  }
  function inst(comp, geo, m, items, shadow = true) {
    const im = new THREE.InstancedMesh(geo, m, items.length);
    const o = new THREE.Object3D();
    items.forEach((p, i) => {
      o.position.set(p[0], p[1], p[2]);
      o.updateMatrix();
      im.setMatrixAt(i, o.matrix);
    });
    im.instanceMatrix.needsUpdate = true;
    return add(im, comp, { shadow });
  }
  const UP = new THREE.Vector3(0, 1, 0);
  function pipe(comp, pts, r, m) {
    for (let i = 1; i < pts.length; i++) {
      const a = new THREE.Vector3(...pts[i - 1]), b = new THREE.Vector3(...pts[i]);
      const len = a.distanceTo(b);
      const g = cached(`p${r},${len.toFixed(3)}`, () => new THREE.CylinderGeometry(r, r, len, 10));
      const me = new THREE.Mesh(g, m);
      me.position.copy(a).add(b).multiplyScalar(0.5);
      me.quaternion.setFromUnitVectors(UP, b.clone().sub(a).normalize());
      add(me, comp);
    }
    const jg = cached(`j${r}`, () => new THREE.SphereGeometry(r * 1.15, 10, 8));
    for (let i = 1; i < pts.length - 1; i++) {
      const j = new THREE.Mesh(jg, m);
      j.position.set(...pts[i]);
      add(j, comp);
    }
  }
  function fence(comp, x0, z0, x1, z1, h, postM, panelM) {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const n = Math.max(1, Math.round(len / 3));
    const posts = [];
    for (let i = 0; i <= n; i++) posts.push([x0 + (x1 - x0) * i / n, 0, z0 + (z1 - z0) * i / n]);
    inst(comp, bgeo(0.12, h, 0.12), postM, posts, false);
    const p = new THREE.Mesh(bgeo(len, h * 0.9, 0.03), panelM);
    p.position.set((x0 + x1) / 2, 0.05, (z0 + z1) / 2);
    p.rotation.y = -Math.atan2(z1 - z0, x1 - x0);
    add(p, comp, { shadow: false });
  }
  const M = {
    plinth: mat(null, 15527666, { dark: 2303789, rough: 0.95 }),
    road: mat(null, 13883357, { dark: 3027770 }),
    mark: mat(null, 16777215, { dark: 7173504 }),
    gravel: mat(null, 14276303, { dark: 3816253 }),
    leaf: mat(null, 9678991, { dark: 5073495 }),
    leaf2: mat(null, 8364426, { dark: 4152908 }),
    trunk: mat(null, 9205091, { dark: 6049347 })
  };
  const SX = 66, SZ = 36;
  {
    const r = 5, s = new THREE.Shape();
    s.moveTo(-SX + r, -SZ);
    s.lineTo(SX - r, -SZ);
    s.quadraticCurveTo(SX, -SZ, SX, -SZ + r);
    s.lineTo(SX, SZ - r);
    s.quadraticCurveTo(SX, SZ, SX - r, SZ);
    s.lineTo(-SX + r, SZ);
    s.quadraticCurveTo(-SX, SZ, -SX, SZ - r);
    s.lineTo(-SX, -SZ + r);
    s.quadraticCurveTo(-SX, -SZ, -SX + r, -SZ);
    const g = new THREE.ExtrudeGeometry(s, { depth: 1.6, bevelEnabled: true, bevelThickness: 0.3, bevelSize: 0.3, bevelSegments: 2, curveSegments: 8 });
    g.rotateX(-Math.PI / 2).translate(0, -1.9, 0);
    const p = new THREE.Mesh(g, M.plinth);
    p.receiveShadow = true;
    root.add(p);
  }
  box(null, 92, 0.04, 3.6, -5, 0, 29, M.road, { shadow: false });
  box(null, 3.6, 0.04, 9, 41, 0, 31.6, M.road, { shadow: false });
  box(null, 3.6, 0.04, 4, 0, 0, 26.2, M.road, { shadow: false });
  box(null, 13, 0.04, 7.5, 15, 0, 20.5, M.road, { shadow: false });
  box(null, 3.6, 0.04, 14, -38, 0, 21, M.road, { shadow: false });
  const dashes = [];
  for (let x = -49; x < 40; x += 3) dashes.push([x, 0.02, 29]);
  inst(null, bgeo(1.4, 0.03, 0.14), M.mark, dashes, false);
  const stripes = [];
  for (let x = 9.5; x <= 21; x += 2.2) stripes.push([x, 0.02, 18.6], [x, 0.02, 22.4]);
  inst(null, bgeo(0.1, 0.03, 2.6), M.mark, stripes, false);
  const treeSpots = [];
  for (let x = -40, i = 0; x <= 58; x += 7, i++) treeSpots.push([x, 0, -28 - i % 2 * 2.5]);
  treeSpots.push(
    [-58, 0, 24],
    [-36, 0, 25.5],
    [-14, 0, 25.5],
    [26, 0, 25],
    [52, 0, 25.5],
    [58, 0, 22],
    [60, 0, -20],
    [60, 0, -10],
    [60, 0, 12],
    [-62, 0, -20],
    [-62, 0, 20],
    [-58, 0, -26],
    [-49, 0, -28]
  );
  treeSpots.forEach((t2, i) => {
    const s = 0.8 + i * 37 % 10 / 20;
    const tr = new THREE.Mesh(cgeo(0.15, 0.2, 1.2, 6), M.trunk);
    tr.position.set(t2[0], 0, t2[2]);
    tr.scale.setScalar(s);
    add(tr, null);
    const lf = new THREE.Mesh(cgeo(0, 1.3, 3.2, 7), i % 2 ? M.leaf : M.leaf2);
    lf.position.set(t2[0], 1 * s, t2[2]);
    lf.scale.setScalar(s);
    add(lf, null);
  });
  const gridMetal = mat("grid", 10134445, { opacity: 0.12 });
  const gridArm = mat("grid", 8160656, { dark: 10134445, metal: 0.3, rough: 0.6 });
  const insul = mat("grid", 13226972, { rough: 0.4 });
  const wireM = mat("grid", 3883080, { dark: 9279137 });
  for (const tx of [-60, -52]) {
    const body = new THREE.Mesh(cached("tower", () => new THREE.CylinderGeometry(0.5, 2.2, 14, 4, 1, true).rotateY(Math.PI / 4).translate(0, 7, 0)), gridMetal);
    body.position.set(tx, 0, 0);
    add(body, "grid", { shadow: false });
    const pts = [];
    const cnr = (lv) => {
      const t2 = lv / 5, r = 2.2 * (1 - t2) + 0.5 * t2, y = 14 * t2;
      return [[r, y, r], [-r, y, r], [-r, y, -r], [r, y, -r]];
    };
    for (let lv = 0; lv < 5; lv++) {
      const a = cnr(lv), b = cnr(lv + 1);
      for (let k = 0; k < 4; k++) {
        const k2 = (k + 1) % 4;
        pts.push(...a[k], ...b[k], ...b[k], ...b[k2], ...a[k], ...b[k2], ...a[k2], ...b[k]);
      }
    }
    const lg2 = new THREE.BufferGeometry();
    lg2.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    const lat = new THREE.LineSegments(lg2, latticeMat);
    lat.position.set(tx, 0, 0);
    root.add(lat);
    box("grid", 0.4, 0.4, 8, tx, 12.8, 0, gridArm);
    box("grid", 0.35, 0.35, 5, tx, 10.4, 0, gridArm);
    for (const z of [-3, 0, 3]) cyl("grid", 0.12, 0.8, tx, 12.1, z, insul, 8);
  }
  const wireY = 12.1;
  const spans = [[-84, 10, -60, wireY], [-60, wireY, -52, wireY], [-52, wireY, -45, 8.3]];
  for (const z of [-3, 0, 3]) for (const [x0, y0, x1, y1] of spans) {
    const pts = [];
    for (let i = 0; i <= 12; i++) {
      const t2 = i / 12;
      pts.push(new THREE.Vector3(x0 + (x1 - x0) * t2, y0 + (y1 - y0) * t2 - Math.sin(Math.PI * t2) * 1.1, z));
    }
    add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.06, 5, false), wireM), "grid", { shadow: false });
  }
  const subPad = mat("substation", 14276303, { dark: 3816253 });
  const trM = mat("substation", 10135459, { dark: 8227462, rough: 0.7, metal: 0.2 });
  const finM = mat("substation", 8819855, { dark: 7043188, rough: 0.7, metal: 0.2 });
  const subPost = mat("substation", 9081500);
  const subPanel = mat("substation", 10989754, { opacity: 0.25 });
  box("substation", 13, 0.1, 19, -41, 0, 0, subPad, { shadow: false });
  fence("substation", -47.5, -9.5, -34.5, -9.5, 2, subPost, subPanel);
  fence("substation", -34.5, -9.5, -34.5, 9.5, 2, subPost, subPanel);
  fence("substation", -34.5, 9.5, -47.5, 9.5, 2, subPost, subPanel);
  fence("substation", -47.5, 9.5, -47.5, -9.5, 2, subPost, subPanel);
  for (const z of [-5, 0, 5]) {
    box("substation", 3.2, 0.3, 4, -40, 0.1, z, subPad);
    box("substation", 2.4, 2.4, 3.2, -40, 0.4, z, trM, { edges: true });
    const fins = [];
    for (let k = -1.3; k <= 1.31; k += 0.32) fins.push([-41.55, 0.6, z + k], [-38.45, 0.6, z + k]);
    inst("substation", bgeo(0.7, 1.9, 0.06), finM, fins);
    const tank = new THREE.Mesh(cgeo(0.35, 0.35, 2.4, 12), trM);
    tank.rotation.z = Math.PI / 2;
    tank.position.set(-38.8, 3.4, z - 1);
    add(tank, "substation");
    for (const dz of [-0.9, 0, 0.9]) {
      cyl("substation", 0.14, 1.4, -40.3, 2.8, z + dz, insul, 8);
      for (let k = 0; k < 4; k++) cyl("substation", 0.26, 0.06, -40.3, 3 + k * 0.3, z + dz, insul, 10);
    }
  }
  const gantM = mat("substation", 9081757, { dark: 10792375, metal: 0.3, rough: 0.6 });
  box("substation", 0.4, 9, 0.4, -45, 0, -6.5, gantM, { edges: true });
  box("substation", 0.4, 9, 0.4, -45, 0, 6.5, gantM, { edges: true });
  box("substation", 0.5, 0.5, 13.4, -45, 8.6, 0, gantM, { edges: true });
  box("substation", 7, 0.08, 0.8, -34.5, 0, 0, mat("substation", COL.power), { shadow: false });
  const sgM = mat("switchgear", 15000026, { dark: 9276036 });
  const sgRoof = mat("switchgear", 13618114, { dark: 7302246 });
  const yellow = mat("switchgear", COL.power, { rough: 0.6 });
  box("switchgear", 6, 3.4, 18, -28, 0, 0, sgM, { edges: true });
  box("switchgear", 6.3, 0.25, 18.3, -28, 3.4, 0, sgRoof, { edges: true });
  const doors = [];
  for (let z = -8; z <= 8.01; z += 1.15) doors.push([-24.97, 0.25, z]);
  inst("switchgear", bgeo(0.06, 2.4, 0.9), yellow, doors);
  box("switchgear", 0.4, 0.4, 0.4, -24.8, 2.9, -7, yellow);
  box("switchgear", 5, 0.45, 0.45, -22.5, 2.9, -7, yellow, { edges: true });
  const genM = mat("generators", 14078660, { dark: 9407358 });
  const genDark = mat("generators", 5988456, { dark: 4869974, metal: 0.4, rough: 0.5 });
  const tankM = mat("generators", 15131612, { dark: 10131343, rough: 0.6 });
  for (let i = 0; i < 6; i++) {
    const x = -52 + i * 4.2;
    box("generators", 2.6, 0.2, 6.8, x, 0, 20, genDark);
    box("generators", 2.4, 2.6, 6.4, x, 0.2, 20, genM, { edges: true });
    const louv = [];
    for (let k = 0; k < 5; k++) louv.push([x + 1.21, 0.8 + k * 0.32, 21.5]);
    inst("generators", bgeo(0.03, 0.1, 2.2), genDark, louv, false);
    cyl("generators", 0.22, 2.2, x - 0.5, 2.8, 18, genDark, 10);
    cyl("generators", 0.22, 2.2, x + 0.5, 2.8, 18, genDark, 10);
  }
  for (const x of [-26, -22]) {
    for (const dz of [-2, 2]) box("generators", 2, 0.6, 0.4, x, 0, 20 + dz, genDark);
    const t2 = new THREE.Mesh(cgeo(1.1, 1.1, 6.4, 20), tankM);
    t2.rotation.x = Math.PI / 2;
    t2.position.set(x, 1.6, 16.8);
    add(t2, "generators", { edges: true });
  }
  const FY = 0.4;
  const slabM = mat("shell", 14672614, { dark: 4870233 });
  const wallM = mat("shell", 15856372, { dark: 6975867 });
  const beamM = mat("shell", 9279137, { dark: 10134446, metal: 0.4, rough: 0.5 });
  box("shell", 40, FY, 24, 0, 0, 0, slabM, { edges: true });
  box("shell", 40, 9, 0.4, 0, FY, -11.8, wallM, { edges: true });
  box("shell", 0.4, 9, 24, -19.8, FY, 0, wallM, { edges: true });
  box("shell", 40, 0.9, 0.3, 0, FY, 11.85, wallM, { edges: true });
  box("shell", 0.3, 0.9, 24, 19.85, FY, 0, wallM, { edges: true });
  box("shell", 0.25, 2.8, 9.5, -12, FY, -7, wallM, { edges: true });
  box("shell", 0.25, 2.8, 9.5, -12, FY, 7, wallM, { edges: true });
  for (const [x, z] of [[19.7, 11.7], [19.7, -11.7], [-19.7, 11.7]]) box("shell", 0.5, 9, 0.5, x, FY, z, beamM, { edges: true });
  for (let x = -16; x <= 16; x += 4) box("shell", 0.3, 0.6, 24, x, 8.8, 0, beamM, { edges: true });
  box("shell", 40, 0.6, 0.3, 0, 8.8, 11.7, beamM, { edges: true });
  box("shell", 0.3, 0.6, 24, 19.7, 8.8, 0, beamM, { edges: true });
  box("shell", 40, 0.35, 3, 0, 9.4, -10.5, wallM, { edges: true });
  box("shell", 3, 0.35, 21, -18.5, 9.4, 1.5, wallM, { edges: true });
  const ledBlue = mat("racks", 4892927, { emissive: 4892927, glow: [0.7, 2.6], twinkle: true });
  const ledGreen = mat("racks", 4054148, { emissive: 4054148, glow: [0.7, 2.4], twinkle: true });
  const ledGeo = bgeo(0.08, 0.05, 0.02);
  const upsM = mat("ups", 14212321, { dark: 10133930, rough: 0.6 });
  const battM = mat("ups", 3883080, { dark: 3817287 });
  const upsLed = mat("ups", 4054148, { emissive: 4054148, glow: [0.7, 2.4], twinkle: true });
  const upsScreen = mat("ups", 2783446, { emissive: 2783446, glow: [0.4, 1.6] });
  for (let i = 0; i < 6; i++) {
    const z = -10.6 + i * 1;
    box("ups", 1, 2.2, 0.95, -18.6, FY, z, upsM, { edges: true });
    box("ups", 0.02, 0.25, 0.4, -18.09, FY + 1.6, z, upsScreen, { shadow: false });
  }
  const battLeds = [], batts = [];
  for (const x of [-17, -15.5, -14]) for (let k = 0; k < 6; k++) {
    const z = 0.8 + k * 1.6;
    batts.push([x, FY, z]);
    for (let s = 0; s < 3; s++) battLeds.push([x + 0.31, FY + 0.45 + s * 0.5, z + 0.45]);
  }
  inst("ups", bgeo(0.6, 1.8, 1.45), battM, batts);
  inst("ups", ledGeo.clone().rotateY(Math.PI / 2), upsLed, battLeds, false);
  const ROWS = [-6.4, -3.6, 3.6, 6.4];
  const RX0 = -7, RN = 22, RS = 0.75, RX1 = RX0 + (RN - 1) * RS;
  const rackM = mat("racks", COL.rack, { rough: 0.55, metal: 0.3 });
  const rackTop = mat("racks", 2895926, { rough: 0.6 });
  const glass = mat("racks", 12375786, { opacity: 0.22, rough: 0.1 });
  const glassFrame = mat("racks", 6252658, { metal: 0.5, rough: 0.4 });
  const rk = [], lb = [], lg = [];
  ROWS.forEach((z) => {
    const coldSign = z === -6.4 || z === 3.6 ? -1 : 1;
    for (let i = 0; i < RN; i++) {
      const x = RX0 + i * RS;
      rk.push([x, FY, z]);
      for (let s = 0; s < 6; s++) {
        const p = [x - 0.18 + s % 3 * 0.18, FY + 0.5 + Math.floor(s / 3) * 0.9 + (i * 7 + s) % 3 * 0.2, z + coldSign * 0.56];
        ((i + s) % 2 ? lb : lg).push(p);
      }
    }
  });
  inst("racks", bgeo(0.68, 2.4, 1.1), rackM, rk);
  inst("racks", bgeo(0.7, 0.04, 1.12), rackTop, rk.map((p) => [p[0], p[1] + 2.4, p[2]]), false);
  inst("racks", ledGeo, ledBlue, lb, false);
  inst("racks", ledGeo, ledGreen, lg, false);
  for (const zc of [-5, 5]) {
    const len = RX1 - RX0 + 0.7, cx = (RX0 + RX1) / 2;
    box("racks", len, 0.05, 1.7, cx, FY + 2.6, zc, glass, { shadow: false });
    for (const ex of [RX0 - 0.37, RX1 + 0.37]) box("racks", 0.05, 2.6, 1.7, ex, FY, zc, glass, { shadow: false });
    for (const dz of [-0.85, 0.85]) box("racks", len, 0.08, 0.08, cx, FY + 2.6, zc + dz, glassFrame, { shadow: false });
  }
  const busM = mat("busway", COL.power, { rough: 0.55 });
  const BY = 3.7;
  box("busway", 10, 0.3, 0.35, -13, BY, -7.6, busM, { edges: true });
  box("busway", 0.35, 0.3, 14.3, -8, BY, -0.6, busM, { edges: true });
  box("busway", 0.3, 1.3, 0.3, -18.4, FY + 2.2, -7.6, busM);
  const drops = [];
  ROWS.forEach((z) => {
    box("busway", RX1 - -8 + 0.4, 0.3, 0.35, (RX1 + -8) / 2, BY, z, busM, { edges: true });
    for (let i = 0; i < RN; i += 2) drops.push([RX0 + i * RS, FY + 2.4, z]);
  });
  inst("busway", bgeo(0.08, BY - FY - 2.4, 0.08), busM, drops, false);
  const netM = mat("network", 2501425, { rough: 0.55, metal: 0.3 });
  const fibreM = mat("network", COL.fibre, { rough: 0.6 });
  const netLed = mat("network", 4054148, { emissive: 4054148, glow: [0.7, 2.6], twinkle: true });
  const nr = [], nl = [];
  for (const x of [-10.9, -10.2, -9.5]) for (const z of [-0.56, 0.56]) {
    nr.push([x, FY, z]);
    for (let s = 0; s < 8; s++) nl.push([x - 0.2 + s % 4 * 0.13, FY + 0.6 + Math.floor(s / 4) * 0.7, z + Math.sign(z) * 0.56]);
  }
  inst("network", bgeo(0.68, 2.4, 1.1), netM, nr);
  inst("network", ledGeo, netLed, nl, false);
  const TY = 4.3;
  box("network", 0.5, 0.12, 14.4, -9.7, TY, 0.3, fibreM);
  ROWS.forEach((z) => box("network", RX1 + 9.7 + 0.3, 0.12, 0.5, (RX1 - 9.7) / 2, TY, z + 0.5, fibreM));
  box("network", 0.3, TY - FY - 2.4, 0.3, -9.7, FY + 2.4, 0, fibreM);
  pipe("network", [[-11.3, FY + 1.2, 0], [-11.3, 0.25, 0], [-11.3, 0.25, -18]], 0.18, fibreM);
  box("network", 2.4, 0.6, 2.4, -11.3, 0, -18.8, mat("network", 12172739, { dark: 6975608 }), { edges: true });
  box("network", 1.4, 0.08, 1.4, -11.3, 0.6, -18.8, fibreM);
  const cduM = mat("cdu", 14869993, { dark: 10528688, rough: 0.6 });
  const supM = mat("cdu", COL.supply, { rough: 0.45, metal: 0.2 });
  const retM = mat("cdu", COL.ret, { rough: 0.45, metal: 0.2 });
  const SUPY = 5, RETY = 5.6;
  ROWS.forEach((z) => {
    const x = RX1 + 0.95;
    box("cdu", 1, 2.2, 1.1, x, FY, z, cduM, { edges: true });
    box("cdu", 0.02, 0.25, 0.9, x + 0.51, FY + 1.7, z, supM, { shadow: false });
    box("cdu", 0.02, 0.25, 0.9, x + 0.51, FY + 1.35, z, retM, { shadow: false });
    pipe("cdu", [[x - 0.2, FY + 2.2, z], [x - 0.2, SUPY, z], [11, SUPY, z]], 0.12, supM);
    pipe("cdu", [[x + 0.2, FY + 2.2, z], [x + 0.2, RETY, z], [11.5, RETY, z]], 0.12, retM);
  });
  pipe("cdu", [[11, SUPY, -6.4], [11, SUPY, 6.4]], 0.16, supM);
  pipe("cdu", [[11.5, RETY, -6.4], [11.5, RETY, 6.4]], 0.16, retM);
  pipe("cdu", [[11, SUPY, -0.6], [24, SUPY, -0.6], [24, 1, -0.6], [48, 1, -0.6]], 0.2, supM);
  pipe("cdu", [[11.5, RETY, 0.6], [24.6, RETY, 0.6], [24.6, 1, 0.6], [48, 1, 0.6]], 0.2, retM);
  const pipeStands = [];
  for (let x = 27; x <= 47; x += 4) pipeStands.push([x, 0, 0]);
  inst("cdu", bgeo(0.15, 0.8, 1.8), mat("cdu", 9279137), pipeStands);
  const dcM = mat("chillers", 15132907, { dark: 10068138, rough: 0.6 });
  const coilM = mat("chillers", 10135217, { dark: 7174018, metal: 0.4, rough: 0.5 });
  const fanHM = mat("chillers", 4870232, { dark: 4014922, rough: 0.5 });
  const bladeM = mat("chillers", 3027769, { dark: 12173513, rough: 0.5 });
  const legs = [];
  const coolerXs = [29, 35, 41, 47];
  box("chillers", 26, 0.12, 20, 38, 0, 0, mat("chillers", 14276303, { dark: 3816253 }), { shadow: false });
  for (const s of [-1, 1]) for (const x of coolerXs) {
    const z = s * 6;
    for (const dx of [-2.2, 2.2]) for (const dz of [-1.1, 1.1]) legs.push([x + dx, 0, z + dz]);
    box("chillers", 5, 1.8, 2.6, x, 0.9, z, dcM, { edges: true });
    box("chillers", 4.6, 1.2, 0.04, x, 1.2, z + 1.31, coilM, { shadow: false });
    box("chillers", 4.6, 1.2, 0.04, x, 1.2, z - 1.31, coilM, { shadow: false });
    for (const dx of [-1.25, 1.25]) {
      cyl("chillers", 1.05, 0.35, x + dx, 2.7, z, fanHM, 20);
      const g = new THREE.Group();
      g.position.set(x + dx, 3.08, z);
      for (let b = 0; b < 3; b++) {
        const bl = new THREE.Mesh(bgeo(0.85, 0.03, 0.22), bladeM);
        bl.geometry.computeBoundingSphere();
        const pivot = new THREE.Group();
        pivot.rotation.y = b * Math.PI * 2 / 3;
        bl.position.set(0.45, 0, 0);
        bl.rotation.x = 0.3;
        pivot.add(bl);
        g.add(pivot);
        bl.userData["comp"] = "chillers";
        pickables.push(bl);
        bl.castShadow = true;
      }
      const hub = new THREE.Mesh(cgeo(0.14, 0.14, 0.1, 10), bladeM);
      hub.userData["comp"] = "chillers";
      pickables.push(hub);
      g.add(hub);
      root.add(g);
      fans.push(g);
    }
    pipe("chillers", [[x - 0.5, 1, -0.6], [x - 0.5, 1, s * 4.7]], 0.1, supM);
    pipe("chillers", [[x + 0.5, 1, 0.6], [x + 0.5, 1, s * 4.7]], 0.1, retM);
  }
  inst("chillers", bgeo(0.15, 0.9, 0.15), coilM, legs);
  const wt = new THREE.Mesh(cgeo(2.4, 2.4, 5, 28), dcM);
  wt.position.set(55, 0, 6);
  add(wt, "chillers", { edges: true });
  cyl("chillers", 2.5, 0.2, 55, 5, 6, coilM, 28);
  pipe("chillers", [[48, 1, -0.6], [55, 1, -0.6], [55, 1, 3.6]], 0.2, supM);
  const offM = mat("ops", 15789801, { dark: 9341829 });
  const offRoof = mat("ops", 13289150, { dark: 6117973 });
  const winM = mat("ops", 12178406, { emissive: 16767386, glow: [0.05, 1.2], rough: 0.2 });
  const opsPost = mat("ops", 9081500, { dark: 10134188 });
  const opsPanel = mat("ops", 10989754, { opacity: 0.2 });
  const red = mat("ops", 13781306), white = mat("ops", 16053492);
  box("ops", 12, 4.2, 7, 0, 0, 21, offM, { edges: true });
  box("ops", 12.4, 0.3, 7.4, 0, 4.2, 21, offRoof, { edges: true });
  for (const y of [0.9, 2.6]) {
    for (let x = -5; x <= 5.01; x += 1.25) box("ops", 0.9, 1, 0.04, x, y, 24.51, winM, { shadow: false });
    for (let z = 18.5; z <= 23.51; z += 1.25) box("ops", 0.04, 1, 0.9, 6.01, y, z, winM, { shadow: false });
  }
  box("ops", 1.4, 2.2, 0.06, -3, 0, 24.52, offRoof);
  box("ops", 2.6, 2.6, 2.6, 45.5, 0, 31, offM, { edges: true });
  box("ops", 3, 0.25, 3, 45.5, 2.6, 31, offRoof, { edges: true });
  box("ops", 0.04, 1, 1.8, 44.19, 1.2, 31, winM, { shadow: false });
  box("ops", 1.8, 1, 0.04, 45.5, 1.2, 32.31, winM, { shadow: false });
  box("ops", 0.4, 1.1, 0.4, 43.6, 0, 33.6, red);
  for (let k = 0; k < 6; k++) box("ops", 0.8, 0.14, 0.14, 43 - k * 0.8, 0.95, 33.6, k % 2 ? white : red);
  const FX = 63, FZ = 33.6;
  fence("ops", -FX, -FZ, FX, -FZ, 2, opsPost, opsPanel);
  fence("ops", FX, -FZ, FX, FZ, 2, opsPost, opsPanel);
  fence("ops", FX, FZ, 43.4, FZ, 2, opsPost, opsPanel);
  fence("ops", 38.6, FZ, -FX, FZ, 2, opsPost, opsPanel);
  fence("ops", -FX, FZ, -FX, -FZ, 2, opsPost, opsPanel);
  const hemi = new THREE.HemisphereLight(15660031, 14208962, 1.1);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(16773339, 2.2);
  key.position.set(45, 80, 35);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  const sc = key.shadow.camera;
  sc.left = -85;
  sc.right = 85;
  sc.top = 70;
  sc.bottom = -70;
  sc.near = 1;
  sc.far = 300;
  key.shadow.bias = -5e-4;
  key.shadow.normalBias = 0.04;
  scene.add(key);
  scene.add(key.target);
  const fill = new THREE.DirectionalLight(12375295, 0.6);
  fill.position.set(-60, 35, -40);
  scene.add(fill);
  function mkPath(arr, fadeIdx = -1) {
    const pts = arr.map((p) => new THREE.Vector3(...p));
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + pts[i].distanceTo(pts[i - 1]));
    const len = cum[cum.length - 1];
    return { pts, cum, len, fade: fadeIdx >= 0 ? cum[fadeIdx] : Infinity };
  }
  function sample(p, d, out) {
    let i = 1;
    while (i < p.cum.length - 1 && p.cum[i] < d) i++;
    const a = p.cum[i - 1], b = p.cum[i];
    out.lerpVectors(p.pts[i - 1], p.pts[i], (d - a) / (b - a || 1));
  }
  const powerHead = [[-84, 10, 0], [-60, wireY, 0], [-52, wireY, 0], [-45, 8.3, 0], [-40.3, 4.2, 0], [-40, 0.3, 0], [-31, 0.3, 0], [-28, 0.5, -7], [-28, 3.1, -7], [-18.4, 3.1, -7.6], [-18.4, BY + 0.15, -7.6], [-8, BY + 0.15, -7.6]];
  const powerPaths = ROWS.map((z) => mkPath([...powerHead, [-8, BY + 0.15, z], [RX1, BY + 0.15, z], [RX1, FY + 2.4, z]]));
  const heatPaths = [];
  let hi = 0;
  for (const s of [-1, 1]) for (const x of coolerXs) {
    const zr = ROWS[hi % 4], za = zr < 0 ? -5 : 5;
    hi++;
    heatPaths.push(mkPath([[RX0, FY + 1.6, za], [RX1, FY + 1.6, za], [RX1 + 0.95, FY + 1.6, zr], [RX1 + 1.15, RETY, zr], [11.5, RETY, zr], [11.5, RETY, 0.6], [24.6, RETY, 0.6], [24.6, 1, 0.6], [x + 0.5, 1, 0.6], [x + 0.5, 1, s * 4.7], [x + 0.5, 3.3, s * 6], [x + 0.5, 11, s * 6]], 10));
  }
  const dataPaths = [
    ...ROWS.map((z) => mkPath([[-9.7, FY + 2.4, 0], [-9.7, TY + 0.1, 0], [-9.7, TY + 0.1, z + 0.5], [RX1, TY + 0.1, z + 0.5]])),
    mkPath([[-10.6, FY + 1.2, 0], [-11.3, FY + 1.2, 0], [-11.3, 0.25, 0], [-11.3, 0.25, -18], [-11.3, 0.7, -18.8]])
  ];
  const sphereGeo = new THREE.SphereGeometry(0.24, 10, 8);
  function mkFlow(paths, color, spacing, speed) {
    const items = [];
    paths.forEach((p, pi) => {
      for (let d = 0; d < p.len; d += spacing) items.push({ p: pi, d0: d + pi * 0.37 % spacing });
    });
    const core = new THREE.InstancedMesh(sphereGeo, new THREE.MeshBasicMaterial({ color }), items.length);
    const halo = new THREE.InstancedMesh(sphereGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.25, depthWrite: false, blending: THREE.AdditiveBlending }), items.length);
    core.visible = halo.visible = false;
    core.frustumCulled = halo.frustumCulled = false;
    scene.add(core, halo);
    return { core, halo, paths, items, speed, on: false };
  }
  const flows = {
    power: mkFlow(powerPaths, 16761370, 2.4, 6),
    heat: mkFlow(heatPaths, 16738854, 2.6, 4),
    data: mkFlow(dataPaths, 3007386, 1.6, 8)
  };
  const tmpO = new THREE.Object3D(), tmpV = new THREE.Vector3();
  function updateFlows(t2) {
    Object.keys(flows).forEach((n) => {
      const f = flows[n];
      if (!f.on) return;
      f.items.forEach((it, i) => {
        const p = f.paths[it.p];
        const d = (it.d0 + t2 * f.speed) % p.len;
        sample(p, d, tmpV);
        let s = 1;
        if (d > p.fade) s = Math.max(0.05, 1 - (d - p.fade) / (p.len - p.fade)) * (1 + (d - p.fade) * 0.12);
        if (d > p.fade) s = Math.max(0.02, Math.min(s, 1.6 * (1 - (d - p.fade) / (p.len - p.fade))));
        tmpO.position.copy(tmpV);
        tmpO.scale.setScalar(s);
        tmpO.updateMatrix();
        f.core.setMatrixAt(i, tmpO.matrix);
        tmpO.scale.setScalar(s * 2.3);
        tmpO.updateMatrix();
        f.halo.setMatrixAt(i, tmpO.matrix);
      });
      f.core.instanceMatrix.needsUpdate = true;
      f.halo.instanceMatrix.needsUpdate = true;
    });
  }
  let dark = true, hovered = null, selected = null;
  const hoverCol = new THREE.Color();
  function applyHighlight() {
    hoverCol.setHex(dark ? 9346047 : 3360457);
    compMats.forEach((set, comp) => set.forEach((m) => {
      if (m.userData["glow"]) return;
      if (comp === hovered) {
        m.emissive.copy(hoverCol);
        m.emissiveIntensity = dark ? 0.5 : 0.45;
      } else if (comp === selected) {
        m.emissive.copy(hoverCol);
        m.emissiveIntensity = dark ? 0.25 : 0.2;
      } else {
        m.emissive.copy(m.userData["baseEmissive"]);
        m.emissiveIntensity = m.userData["baseEI"];
      }
    }));
  }
  function setTheme(d) {
    dark = d;
    renderer.setClearColor(d ? 1316635 : 16316923, 1);
    themed.forEach((t2) => t2.m.color.setHex(d ? t2.d : t2.l));
    glows.forEach((g) => {
      g.cur = d ? g.d : g.l;
      g.m.emissiveIntensity = g.cur;
    });
    edgeMat.color.setHex(d ? 461067 : 2764598);
    edgeMat.opacity = d ? 0.75 : 0.42;
    hemi.intensity = d ? 0.75 : 1.1;
    hemi.color.setHex(d ? 12109536 : 15660031);
    hemi.groundColor.setHex(d ? 2762274 : 14208962);
    key.intensity = d ? 1.7 : 2.2;
    fill.intensity = d ? 0.7 : 0.6;
    applyHighlight();
  }
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 2e3);
  const target = new THREE.Vector3(0, 2, 2);
  let az = Math.PI / 4, el = 0.6, zoom = 1, view = 50;
  function updateCam() {
    const d = 600;
    cam.position.set(target.x + d * Math.cos(el) * Math.sin(az), target.y + d * Math.sin(el), target.z + d * Math.cos(el) * Math.cos(az));
    cam.lookAt(target);
    cam.zoom = zoom;
    cam.updateProjectionMatrix();
  }
  function resize() {
    const w = container.clientWidth || 1, h = container.clientHeight || 1, a = w / h;
    renderer.setSize(w, h, false);
    view = Math.max(82 / a, 46);
    cam.left = -view * a;
    cam.right = view * a;
    cam.top = view;
    cam.bottom = -view;
    updateCam();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();
  let userTook = reduced;
  const ptrs = /* @__PURE__ */ new Map();
  let downAt = null, moved = 0, pinchD = 0;
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const hoverCbs = /* @__PURE__ */ new Set();
  const selectCbs = /* @__PURE__ */ new Set();
  function pick(cx, cy) {
    const r = canvas.getBoundingClientRect();
    ndc.set((cx - r.left) / r.width * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, cam);
    const hit = raycaster.intersectObjects(pickables, false)[0];
    return hit ? hit.object.userData["comp"] : null;
  }
  function setHovered(id) {
    if (id === hovered) return;
    hovered = id;
    canvas.style.cursor = id ? "pointer" : "grab";
    applyHighlight();
    hoverCbs.forEach((cb) => cb(id));
  }
  const onDown = (e) => {
    canvas.setPointerCapture(e.pointerId);
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    userTook = true;
    if (ptrs.size === 1) {
      downAt = { x: e.clientX, y: e.clientY };
      moved = 0;
    }
    if (ptrs.size === 2) {
      const [a, b] = [...ptrs.values()];
      pinchD = Math.hypot(a.x - b.x, a.y - b.y);
    }
  };
  const onMove = (e) => {
    const prev = ptrs.get(e.pointerId);
    if (!prev) {
      setHovered(pick(e.clientX, e.clientY));
      return;
    }
    const dx = e.clientX - prev.x, dy = e.clientY - prev.y;
    prev.x = e.clientX;
    prev.y = e.clientY;
    if (ptrs.size === 1) {
      moved += Math.abs(dx) + Math.abs(dy);
      az -= dx * 6e-3;
      el = Math.min(1.35, Math.max(0.2, el + dy * 5e-3));
      updateCam();
      if (moved > 5) canvas.style.cursor = "grabbing";
    } else if (ptrs.size === 2) {
      moved = 99;
      const [a, b] = [...ptrs.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinchD > 0) {
        zoom = Math.min(5, Math.max(0.6, zoom * (d / pinchD)));
        updateCam();
      }
      pinchD = d;
    }
  };
  const onUp = (e) => {
    ptrs.delete(e.pointerId);
    if (ptrs.size === 0 && downAt && moved < 6) {
      const id = pick(e.clientX, e.clientY);
      if (id) selected = id; // clicking empty space keeps the current part selected
      applyHighlight();
      selectCbs.forEach((cb) => cb(selected));
      if (e.pointerType !== "mouse") setHovered(id);
    }
    if (ptrs.size === 0) {
      downAt = null;
      canvas.style.cursor = hovered ? "pointer" : "grab";
    }
  };
  const onLeave = () => {
    if (ptrs.size === 0) setHovered(null);
  };
  const onWheel = (e) => {
    e.preventDefault();
    const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
    zoom = Math.min(5, Math.max(0.6, zoom * Math.exp(-dy * 15e-4)));
    userTook = true;
    updateCam();
  };
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onUp);
  canvas.addEventListener("pointerleave", onLeave);
  canvas.addEventListener("wheel", onWheel, { passive: false });
  canvas.style.cursor = "grab";
  setTheme(!opts || opts.dark !== false);
  const clock = new THREE.Clock();
  let t = 0, raf = 0;
  let running = true, over = false;
  const frameCbs = /* @__PURE__ */ new Set();
  canvas.addEventListener("pointerenter", () => (over = true));
  canvas.addEventListener("pointerleave", () => (over = false));
  function frame() {
    if (!running) { raf = 0; return; }
    raf = requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05);
    t += dt;
    if (!userTook && !over) {
      az += dt * 0.03;
      updateCam();
    }
    if (!reduced) fans.forEach((f, i) => {
      f.rotation.y += dt * (5 + i % 3);
    });
    glows.forEach((g) => {
      if (g.tw && !reduced) g.m.emissiveIntensity = g.cur * (0.8 + 0.2 * Math.sin(t * 2.3 + g.ph));
    });
    updateFlows(reduced ? 0 : t);
    renderer.render(scene, cam);
    frameCbs.forEach((cb) => cb());
  }
  frame();
  return {
    // Hooks added for the site: pause when off screen, highlight from the page, labels, reset.
    setRunning(on) {
      if (on && !running) { running = true; clock.getDelta(); frame(); }
      else if (!on && running) { running = false; cancelAnimationFrame(raf); raf = 0; }
    },
    setHover(id) { hovered = id; applyHighlight(); },
    setSelected(id) { selected = id; applyHighlight(); },
    resetView() { az = Math.PI / 4; el = 0.6; zoom = 1; userTook = reduced; updateCam(); },
    onFrame(cb) { frameCbs.add(cb); return () => frameCbs.delete(cb); },
    project(x, y, z) {
      tmpV.set(x, y, z).project(cam);
      return [(tmpV.x + 1) / 2 * canvas.clientWidth, (1 - tmpV.y) / 2 * canvas.clientHeight, Math.abs(tmpV.x) < 1.02 && Math.abs(tmpV.y) < 1.02];
    },
    setTheme,
    setFlow(name, on) {
      const f = flows[name];
      f.on = on;
      f.core.visible = f.halo.visible = on;
      if (on) updateFlows(reduced ? 0 : t);
    },
    onHover(cb) {
      hoverCbs.add(cb);
      return () => hoverCbs.delete(cb);
    },
    onSelect(cb) {
      selectCbs.add(cb);
      return () => selectCbs.delete(cb);
    },
    dispose() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      canvas.removeEventListener("pointerleave", onLeave);
      canvas.removeEventListener("wheel", onWheel);
      const geos = /* @__PURE__ */ new Set(), mats = /* @__PURE__ */ new Set();
      scene.traverse((o) => {
        const m = o;
        if (m.geometry) geos.add(m.geometry);
        if (m.material) (Array.isArray(m.material) ? m.material : [m.material]).forEach((x) => mats.add(x));
      });
      geos.forEach((g) => g.dispose());
      mats.forEach((m) => m.dispose());
      key.shadow.map?.dispose();
      hoverCbs.clear();
      selectCbs.clear();
      renderer.dispose();
      canvas.remove();
    }
  };
}
window.createDataCenterScene = createDataCenterScene;
})();
