// News radar on the Overview page. Needs news-data.js (window.VC_NEWS).
// Sectors are slices; rings are how long ago the news broke, with the newest in the middle.
(() => {
  const host = document.getElementById("newsRadar"), D = window.VC_NEWS;
  if (!host || !D) return;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const tip = document.getElementById("ctip"), list = document.getElementById("newsList"), card = document.getElementById("newsCard");
  const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const fmtD = d => `${+d.slice(8)} ${MON[+d.slice(5, 7) - 1]} ${d.slice(0, 4)}`;
  const day = d => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8)) / 864e5;
  const now = day(D.asOf);

  const RINGS = [{ max: 30, r0: 44, r1: 132, name: "Last 30 days" }, { max: 92, r0: 132, r1: 204, name: "Last 3 months" }, { max: 366, r0: 204, r1: 268, name: "Last 12 months" }];
  const keys = Object.keys(D.sectors), SL = 360 / keys.length, CX = 340, CY = 322, W = 680, H = 650;
  const pol = (r, deg) => [CX + r * Math.cos(deg * Math.PI / 180), CY + r * Math.sin(deg * Math.PI / 180)];
  const wedge = (r, a0, a1) => { const [x0, y0] = pol(r, a0), [x1, y1] = pol(r, a1); return `M${CX},${CY}L${x0.toFixed(1)},${y0.toFixed(1)}A${r},${r} 0 0 1 ${x1.toFixed(1)},${y1.toFixed(1)}Z`; };

  // Number the items sector by sector, newest first, and place each one.
  const items = [];
  keys.forEach((k, si) => {
    const a0 = -90 + si * SL, mine = D.items.filter(x => x.s === k && now - day(x.d) <= 366).sort((a, b) => b.d.localeCompare(a.d));
    RINGS.forEach((ring, ri) => {
      const inRing = mine.filter(x => { const age = now - day(x.d); return age <= ring.max && (ri === 0 || age > RINGS[ri - 1].max); });
      inRing.forEach((x, j) => {
        const r = ring.r0 + (j + 0.5) / inRing.length * (ring.r1 - ring.r0);
        const a = a0 + (j + 1) / (inRing.length + 1) * SL; // spread across the slice; radius steps outward with age
        items.push({ ...x, ring: ri, xy: pol(r, a) });
      });
    });
  });
  items.sort((a, b) => keys.indexOf(a.s) - keys.indexOf(b.s) || b.d.localeCompare(a.d)).forEach((x, i) => (x.n = i + 1));

  host.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="group" aria-label="Radar of ${items.length} AI news items. Slices are topics; rings show how recent each item is, newest in the middle.">
    ${keys.map((k, i) => `<path class="nr-wedge" d="${wedge(RINGS[2].r1, -90 + i * SL, -90 + (i + 1) * SL)}" fill="${D.sectors[k].color}"></path>`).join("")}
    ${RINGS.map((r, i) => `<circle class="nr-ring" cx="${CX}" cy="${CY}" r="${r.r1}"></circle><text class="nr-rl" x="${CX}" y="${CY - r.r1 + 13}" text-anchor="middle">${r.name}</text>`).join("")}
    ${keys.map((k, i) => { const [x0, y0] = pol(RINGS[2].r1 + 4, -90 + i * SL + 1.2), [x1, y1] = pol(RINGS[2].r1 + 4, -90 + (i + 1) * SL - 1.2); return `<path class="nr-arc" d="M${x0.toFixed(1)},${y0.toFixed(1)}A${RINGS[2].r1 + 4},${RINGS[2].r1 + 4} 0 0 1 ${x1.toFixed(1)},${y1.toFixed(1)}" stroke="${D.sectors[k].color}"></path>`; }).join("")}
    ${keys.map((k, i) => { const [x, y] = pol(RINGS[2].r1, -90 + i * SL); return `<line class="nr-sep" x1="${CX}" y1="${CY}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"></line>`; }).join("")}
    ${keys.map((k, i) => { const mid = -90 + (i + 0.5) * SL, [x, y] = pol(RINGS[2].r1 + 20, mid), c = Math.cos(mid * Math.PI / 180);
      return `<text class="nr-sl" x="${x.toFixed(1)}" y="${(y + (Math.sin(mid * Math.PI / 180) > 0.3 ? 12 : 4)).toFixed(1)}" text-anchor="${c > 0.3 ? "start" : c < -0.3 ? "end" : "middle"}">${esc(D.sectors[k].name)}</text>`; }).join("")}
    <circle class="nr-hub" cx="${CX}" cy="${CY}" r="26"></circle><text class="nr-now" x="${CX}" y="${CY + 4}" text-anchor="middle">Now</text>
    ${items.map(x => `<g class="nr-dot" data-n="${x.n}" tabindex="0" role="button" aria-label="${x.n}. ${esc(x.h)}, ${fmtD(x.d)}, ${esc(D.sectors[x.s].name)}" style="--dc:${D.sectors[x.s].color}">
      <circle cx="${x.xy[0].toFixed(1)}" cy="${x.xy[1].toFixed(1)}" r="12.5"></circle><text x="${x.xy[0].toFixed(1)}" y="${(x.xy[1] + 4.2).toFixed(1)}" text-anchor="middle">${x.n}</text></g>`).join("")}
  </svg>`;

  list.innerHTML = keys.map(k => `<div class="nl-group" style="--dc:${D.sectors[k].color}"><h3>${esc(D.sectors[k].name)}</h3>
    ${items.filter(x => x.s === k).map(x => `<button type="button" class="nl-item" data-n="${x.n}"><span class="nl-n">${x.n}</span><span class="nl-h">${esc(x.h)}</span><span class="nl-d num">${fmtD(x.d).replace(/ \d{4}$/, "")}</span></button>`).join("")}</div>`).join("");

  function pick(n, scroll) {
    const x = items.find(i => i.n === n); if (!x) return;
    host.querySelectorAll(".nr-dot").forEach(g => g.classList.toggle("on", +g.dataset.n === n));
    list.querySelectorAll(".nl-item").forEach(b => b.setAttribute("aria-pressed", +b.dataset.n === n));
    card.innerHTML = `<p class="eyebrow"><i style="background:${D.sectors[x.s].color}"></i>${esc(D.sectors[x.s].name)} · ${fmtD(x.d)}</p><h3>${esc(x.h)}</h3><p>${esc(x.t)}</p>
      <p class="nc-src"><a href="${x.url}" target="_blank" rel="noopener">Source: ${esc(x.src)}</a>${x.weak ? ` <span>Reported by trackers or secondary sources only.</span>` : ""}</p>`;
  }
  const hover = n => { host.querySelectorAll(".nr-dot").forEach(g => g.classList.toggle("hl", +g.dataset.n === n)); list.querySelectorAll(".nl-item").forEach(b => b.classList.toggle("hl", +b.dataset.n === n)); };
  host.querySelectorAll(".nr-dot").forEach(g => {
    const n = +g.dataset.n, x = items.find(i => i.n === n);
    g.addEventListener("click", () => pick(n)); g.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(n); } });
    g.addEventListener("mousemove", e => { hover(n); tip.innerHTML = `<b>${esc(x.h)}</b><span class="num">${fmtD(x.d)}</span><br>${esc(D.sectors[x.s].name)}`; tip.hidden = false; const r = tip.getBoundingClientRect(); tip.style.left = Math.max(8, Math.min(e.clientX + 14, innerWidth - r.width - 8)) + "px"; tip.style.top = Math.min(e.clientY + 14, innerHeight - r.height - 8) + "px"; });
    g.addEventListener("mouseleave", () => { hover(null); tip.hidden = true; });
  });
  list.querySelectorAll(".nl-item").forEach(b => { const n = +b.dataset.n; b.addEventListener("click", () => pick(n)); b.addEventListener("mouseenter", () => hover(n)); b.addEventListener("mouseleave", () => hover(null)); });
  document.getElementById("newsAsOf").textContent = fmtD(D.asOf);
  pick(1);
})();
