// Education page: three levels of puzzles, quizzes and number problems. Needs data.js (window.VC).
// Activity types: "puzzle" (fill blanks in a diagram from a bank), "quiz" (multiple choice), "numbers" (calculate, with tolerance).
(() => {
  const body = document.getElementById("learnBody"), tabs = document.getElementById("learnTabs");
  if (!body) return;
  const VC = window.VC;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const stage = Object.fromEntries(VC.stages.map(s => [s.id, s]));
  const co = Object.fromEntries(VC.companies.map(c => [c.id, c]));
  function shuffle(arr, seed) { let s = seed >>> 0; const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { s = (s * 1664525 + 1013904223) >>> 0; const j = s % (i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  // "Where does this company sit?" questions, generated from the map's data.
  const CONFUSABLE = [["electrical", "power"], ["frontier", "openw"], ["hyperscalers", "neoclouds"], ["developers", "construction"], ["fabtools", "litho"]];
  function sorter(ids, seed) {
    const titles = VC.stages.filter(s => s.id !== "users" && s.id !== "training").map(s => s.id);
    return ids.filter(id => co[id]).map((id, i) => {
      const c = co[id], sid = Object.keys(c.at)[0];
      const near = CONFUSABLE.filter(p => p.includes(sid)).flat(); // don't offer a near-identical stage as a wrong answer
      const wrong = shuffle(titles.filter(t => !c.at[t] && !near.includes(t)), seed + i * 7).slice(0, 3);
      return { q: `Where does ${c.name} sit in the chain?`, opts: [stage[sid].title, ...wrong.map(w => stage[w].title)], why: `${c.name}: ${c.at[sid]}.`, link: "#map" };
    });
  }
  const BUCKETS = ["Chips and hardware", "Data centers and cloud", "Models and apps"];
  const bucketQ = (name, b, why) => ({ q: `Which part of the chain is ${name} in?`, opts: BUCKETS, a: b, fixed: true, why });

  // ── Content ──
  const LEVELS = [
    { id: "starter", name: "Starter", blurb: "The big picture. No background needed.", acts: [
      { id: "s-order", type: "puzzle", title: "Build the chain", topic: "Diagram",
        intro: "AI reaches you through five steps. Put them in order, from the factory to your screen.",
        rows: [[{ slot: "Make the chips" }, { slot: "Build the data centers" }, { slot: "Rent out the compute" }, { slot: "Train and serve models" }, { slot: "Use AI" }]],
        done: "That's the chain. Goods move in this direction; money moves the other way, from users back to the chip makers.", link: "#overview" },
      { id: "s-quiz", type: "quiz", title: "The big picture", topic: "Questions", qs: [
        { q: "What does a GPU do in AI?", opts: ["It does the math that trains and runs models", "It stores the training data", "It cools the servers", "It connects data centers to the internet"], why: "GPUs and other accelerators do the calculations. Most of the money spent on an AI data center goes on them.", link: "#chips" },
        { q: "Who pays for the whole chain in the end?", opts: ["The people and businesses who use AI", "Chip makers", "Electricity companies", "Governments"], why: "Money enters only from users. It then flows back up through apps, model labs, clouds and chip makers.", link: "#map" },
        { q: "Which company designs most of the chips used for AI?", opts: ["Nvidia", "TSMC", "ASML", "Equinix"], why: "Nvidia's data center business took in $193.7B in its latest fiscal year.", link: "#chips" },
        { q: "Nvidia designs its chips. Who manufactures most of them?", opts: ["TSMC", "Nvidia itself", "Microsoft", "OpenAI"], why: "TSMC, in Taiwan, makes nearly all leading AI chips. Nvidia owns no factories.", link: "#chips" },
        { q: "What is a hyperscaler?", opts: ["A giant cloud company with a huge fleet of data centers", "A very fast chip", "A company that builds power plants", "An AI model with many parameters"], why: "AWS, Microsoft Azure and Google Cloud are the biggest. They buy most of the chips.", link: "#datacenters" },
        { q: "What is the difference between training and inference?", opts: ["Training builds the model from data; inference uses it to answer", "Training is for text; inference is for images", "Training happens on phones; inference in data centers", "There is no difference"], why: "Training happens once per model and takes months of compute. Inference happens every time someone asks a question.", link: "#models" },
      ] },
      { id: "s-sort", type: "quiz", title: "Sort the companies", topic: "Questions", qs: [
        bucketQ("Nvidia", 0, "Nvidia designs the GPUs most AI runs on."),
        bucketQ("Equinix", 1, "Equinix builds data centers and rents out space and power."),
        bucketQ("OpenAI", 2, "OpenAI makes the GPT models and ChatGPT."),
        bucketQ("TSMC", 0, "TSMC manufactures chips designed by Nvidia, AMD, Apple and others."),
        bucketQ("CoreWeave", 1, "CoreWeave is a cloud company that rents out GPUs."),
        bucketQ("Anthropic", 2, "Anthropic makes the Claude models."),
      ] },
      { id: "s-env", type: "quiz", title: "Energy and water basics", topic: "Environment", qs: [
        { q: "Roughly how much energy does a typical AI text prompt use in the data center?", opts: ["About 0.3 watt-hours", "About 30 watt-hours", "About 3 kilowatt-hours", "About 0.0003 watt-hours"], why: "Google reports 0.24 Wh, Microsoft estimates 0.31 Wh and OpenAI says 0.34 Wh.", link: "#environment" },
        { q: "A laptop drawing 20 watts runs for one minute. That is about as much energy as…", opts: ["One typical AI prompt", "A thousand AI prompts", "One hour of streaming video", "Charging a phone fully"], why: "20 W for a minute is 0.33 Wh, about the same as one typical prompt.", link: "#environment" },
        { q: "Where does nearly all the electricity a data center uses end up?", opts: ["As heat that has to be removed", "Stored in batteries", "Sent back to the grid", "As light from the servers"], why: "Almost every watt the chips draw becomes heat. That is why cooling is such a big part of the building.", link: "#inside" },
        { q: "Why do data centers use water?", opts: ["Mostly to carry heat away, often by evaporating it", "To clean the chips", "To generate their own electricity", "To put out fires"], why: "Many sites cool by evaporating water. Power plants also use water to make the electricity, which often adds up to more.", link: "#environment" },
      ] },
    ] },
    { id: "inter", name: "Intermediate", blurb: "Who does what, and how a data center works.", acts: [
      { id: "i-dc", type: "puzzle", title: "Label the data center", topic: "Diagram",
        intro: "Power comes in on the top row and heat goes out on the bottom row. Fill in the missing parts. Two of the labels don't belong on either path.",
        rows: [
          ["Grid", { slot: "Substation" }, { slot: "Switchgear" }, { slot: "UPS and batteries" }, { slot: "Busway and PDUs" }, "AI racks"],
          ["AI racks", { slot: "Coolant distribution unit" }, { slot: "Dry coolers" }, "Outside air"],
        ],
        rowNames: ["Power in", "Heat out"], extra: ["Backup generators", "Fibre entry room"],
        done: "Backup generators sit beside this path and only feed the switchgear when the grid fails. The fibre room carries data, not power or heat.", link: "#inside" },
      { id: "i-order", type: "puzzle", title: "From design to rented compute", topic: "Diagram",
        intro: "Put the steps that turn a chip design into cloud computing in order.",
        rows: [[{ slot: "Design the chip" }, { slot: "Print it on a wafer" }, { slot: "Package it with memory" }, { slot: "Build servers and racks" }, { slot: "Install in a data center" }, { slot: "Rent it out by the hour" }]],
        done: "Each step is a different industry: designers like Nvidia, foundries like TSMC, packaging houses, server makers like Foxconn, then the clouds.", link: "#chips" },
      { id: "i-quiz", type: "quiz", title: "Who does what", topic: "Questions", qs: [
        { q: "Which company is the only maker of the EUV lithography machines needed for leading chips?", opts: ["ASML", "Applied Materials", "TSMC", "Nvidia"], why: "ASML, in the Netherlands, is the single supplier. It is one of two stages on the map marked as a single point of failure.", link: "#chips" },
        { q: "What is HBM?", opts: ["Fast memory stacked next to the GPU", "A type of liquid cooling", "A measure of data center efficiency", "A kind of power cable"], why: "High-bandwidth memory comes from only three suppliers: SK hynix, Samsung and Micron.", link: "#chips" },
        { q: "What is a neocloud?", opts: ["A cloud company that specialises in renting GPUs", "A new type of AI model", "A data center cooled with rain water", "A government-owned data center"], why: "CoreWeave is the largest, with $5.1B revenue in 2025.", link: "#datacenters" },
        { q: "What does a developer like Equinix or Digital Realty mainly sell?", opts: ["Space and power, rented by the kilowatt", "AI models", "Chips", "Electricity it generates"], why: "About 70% of Equinix's revenue is colocation: rent for space and power.", link: "#datacenters" },
        { q: "Why have AI data centers switched to liquid cooling?", opts: ["One AI rack draws 100–130 kW, too much heat for air", "Water is cheaper than air", "It makes the chips faster", "Regulations require it"], why: "An AI rack draws about ten times an ordinary server rack. Liquid carries the heat away far better than air.", link: "#inside" },
        { q: "What makes a model \"open-weight\"?", opts: ["Its trained parameters are published, so anyone can run it", "It was trained only on public data", "It is free to use in an app", "It has no safety rules"], why: "Meta's Llama and many Mistral models are open-weight. Frontier labs like OpenAI keep theirs private.", link: "#models" },
      ] },
      { id: "i-sort", type: "quiz", title: "Place the company", topic: "Questions", qs: sorter(["asml", "skhynix", "arista", "vertiv", "equinix", "coreweave", "turner", "supermicro"], 11) },
      { id: "i-env", type: "quiz", title: "Measuring the footprint", topic: "Environment", qs: [
        { q: "PUE measures how efficiently a data center uses power. What is it?", opts: ["Total facility energy divided by the energy used by the IT equipment", "Power used per employee", "The share of power from renewables", "Processor utilisation efficiency"], why: "A PUE of 1.0 would mean no overhead at all. Google reports 1.09 across its fleet.", link: "#environment" },
        { q: "Counting the water used to generate the electricity, how does the total compare with cooling water alone?", opts: ["It is 6 to 32 times higher", "It is about the same", "It is lower", "It can't be estimated"], why: "In the three facility profiles that report both, electricity-generation water is 6 to 32 times the cooling water.", link: "#environment" },
        { q: "Published figures for energy per token differ by about a factor of 1,000. What is the main reason?", opts: ["They measure different things: a single GPU, a whole facility, small or large models", "Some labs use much better chips", "Tokens differ in size between languages", "Most of the figures are wrong"], why: "The lowest are GPU-only measurements of small open models. The highest are estimates for reasoning models that include the whole facility.", link: "#environment" },
        { q: "Ten minutes of streaming video, counting the screen and network, uses about as much energy as…", opts: ["About 40 typical AI prompts", "About 2 typical AI prompts", "Half a typical AI prompt", "About 4,000 typical AI prompts"], why: "The IEA's figure is 12.8 Wh for ten minutes; a typical prompt is 0.3 Wh. Counting only the data center, the video equals about two prompts.", link: "#environment" },
      ] },
    ] },
    { id: "advanced", name: "Advanced", blurb: "Follow the money and do the arithmetic.", acts: [
      { id: "a-money", type: "puzzle", title: "Follow the money", topic: "Diagram",
        intro: "A subscription payment travels back up the chain. Fill in what each company pays the next one for. Two of the labels don't belong.",
        rows: [
          ["A business", { arrow: "Subscription or seat fee" }, "AI app", { arrow: "Fees per token (API)" }, "Model lab", { arrow: "Compute rental" }, "Cloud"],
          ["Cloud", { arrow: "GPU purchases" }, "Chip designer", { arrow: "Wafer orders" }, "Foundry", { arrow: "Machine purchases" }, "Toolmaker"],
        ],
        extra: ["Advertising revenue", "Rent per kilowatt"],
        done: "At every step the buyer's spending is the seller's revenue. Rent per kilowatt is real too, but it is what clouds pay data center developers, a branch not shown here.", link: "#map" },
      { id: "a-num", type: "numbers", title: "Do the arithmetic", topic: "Numbers", qs: [
        { q: "An AI rack draws 120 kW. How many racks can 1 GW of power supply? Ignore cooling overhead.", ans: 8333, tol: 0.03, unit: "racks", work: "1 GW = 1,000,000 kW. 1,000,000 ÷ 120 ≈ 8,333 racks." },
        { q: "A 72-GPU rack costs about $3.5M. What do 8,300 of them cost, in billions of dollars?", ans: 29.05, tol: 0.05, unit: "$ billion", work: "8,300 × $3.5M = $29,050M ≈ $29B. That is far more than the building costs." },
        { q: "A 1 GW campus runs flat out all year. How many terawatt-hours does it use?", ans: 8.76, tol: 0.02, unit: "TWh", work: "1 GW × 8,760 hours = 8,760 GWh = 8.76 TWh." },
        { q: "A typical prompt uses 0.3 Wh. How many megawatt-hours do one billion prompts use?", ans: 300, tol: 0.02, unit: "MWh", work: "0.3 Wh × 1,000,000,000 = 300,000,000 Wh = 300 MWh. A 1 GW campus uses that in 18 minutes." },
        { q: "A model uses 1 joule per token. How many kilowatt-hours is that per million tokens?", ans: 0.278, tol: 0.03, unit: "kWh", work: "1,000,000 J ÷ 3,600,000 J per kWh = 0.278 kWh." },
        { q: "At 1 J per token, a site evaporates 1.15 litres per kWh (Google's fleet figure). How many microlitres of cooling water is that per token?", ans: 0.319, tol: 0.05, unit: "µL", work: "µL per token = J per token × L/kWh ÷ 3.6 = 1 × 1.15 ÷ 3.6 ≈ 0.32 µL." },
        { q: "Nvidia's data center revenue was $193.7B. OpenAI and Anthropic together made about $17.7B. How many times bigger is Nvidia's figure?", ans: 10.9, tol: 0.05, unit: "times", work: "193.7 ÷ 17.7 ≈ 10.9. So far the chip seller has earned far more than the model makers." },
      ] },
      { id: "a-quiz", type: "quiz", title: "Chokepoints and deals", topic: "Questions", qs: [
        { q: "Which two stages does the map mark as a single point of failure?", opts: ["EUV lithography and leading-edge foundry", "Servers and networking", "Frontier labs and assistants", "Construction and developers"], why: "ASML is the only EUV supplier and TSMC makes nearly all leading AI chips.", link: "#map" },
        { q: "Why are Google, Amazon and Microsoft designing their own AI chips?", opts: ["To depend less on Nvidia and lower their cost per unit of compute", "Because Nvidia refuses to sell to them", "To sell chips to consumers", "Because their chips need no cooling"], why: "Google's TPU, Amazon's Trainium and Microsoft's Maia are built with partners such as Broadcom and made by TSMC.", link: "#chips" },
        { q: "What limits how fast new AI campuses can open in most places today?", opts: ["Getting a large enough grid connection", "A shortage of land", "A shortage of fibre", "A shortage of software engineers"], why: "The map rates power as a severe chokepoint: the grid is the limit. A gigawatt connection can take years.", link: "#world" },
        { q: "Developers lease data halls on \"take-or-pay\" terms. What does that mean?", opts: ["The tenant pays for the capacity whether or not it uses it", "The tenant can leave at any time", "The landlord pays the electricity bill", "Rent depends on the tenant's revenue"], why: "Multi-year take-or-pay leases, billed per kilowatt, are how developers such as Digital Realty and QTS finance campuses.", link: "#datacenters" },
        { q: "Project Rainier in Indiana is planned for 2.2 GW. Whose chips fill it, and who uses them?", opts: ["Amazon's Trainium chips, used by Anthropic", "Nvidia GPUs, used by OpenAI", "Google TPUs, used by Google", "Intel CPUs, used by Meta"], why: "It holds about 500,000 Trainium2 chips devoted to Anthropic.", link: "#world" },
      ] },
      { id: "a-sort", type: "quiz", title: "Place the company (harder)", topic: "Questions", qs: sorter(["amkor", "tel", "corning", "marvell", "scale", "digitalrealty", "foxconn", "synopsys"], 29) },
      { id: "a-env", type: "quiz", title: "Reading the fine print", topic: "Environment", qs: [
        { q: "Why do reasoning models show very high energy per visible token?", opts: ["Hidden reasoning tokens use energy but aren't counted as output", "They run on older chips", "They are always larger models", "They use more cooling water"], why: "The energy of the hidden reasoning is divided over only the visible tokens, which inflates the per-token figure.", link: "#environment" },
        { q: "Which cost is left out of every per-token figure on the Environment page?", opts: ["The energy used to train the model", "The energy used by the GPUs", "Cooling overhead", "Idle servers"], why: "No per-token figure there spreads training over the tokens served. Only Mistral used a life-cycle method, and its per-response number covers inference.", link: "#environment" },
        { q: "The ML.ENERGY benchmark changed only the batch size. How much did energy per token change?", opts: ["By 3 to 5 times", "Not at all", "By about 10%", "By 100 times"], why: "Serving many requests at once spreads fixed power over more tokens. A GPU at full load and a half-idle fleet give very different numbers.", link: "#environment" },
        { q: "Moving from Nvidia H100 to B200 GPUs, what was the median change in energy per token?", opts: ["About 35% lower", "About 35% higher", "About 90% lower", "No change"], why: "ML.ENERGY measured a median 35% reduction. Hardware gains are one reason figures from 2023 look high today.", link: "#environment" },
      ] },
    ] },
  ];

  // ── Progress (kept in this browser only) ──
  const KEY = "vc-learn-v1";
  let done = {};
  try { done = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { done = {}; }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(done)); } catch (e) { /* private mode */ } };
  const itemsOf = a => a.type === "puzzle" ? [a.id] : a.qs.map((_, i) => `${a.id}:${i}`);
  const countLevel = L => { const all = L.acts.flatMap(itemsOf); return [all.filter(k => done[k]).length, all.length]; };

  let level = "starter";
  try { const l = localStorage.getItem(KEY + "-level"); if (LEVELS.some(x => x.id === l)) level = l; } catch (e) { /* ignore */ }

  function drawTabs() {
    tabs.innerHTML = LEVELS.map((L, i) => { const [d, t] = countLevel(L); return `<button type="button" class="lv-tab" id="lv-${L.id}" data-level="${L.id}" aria-pressed="${L.id === level}">
      <span class="lv-n">Level ${i + 1}</span><b>${L.name}</b><span class="lv-p"><i style="width:${(d / t * 100).toFixed(0)}%"></i></span><span class="lv-c">${d} of ${t} solved</span></button>`; }).join("");
    tabs.querySelectorAll(".lv-tab").forEach(b => b.addEventListener("click", () => { level = b.dataset.level; try { localStorage.setItem(KEY + "-level", level); } catch (e) { /* ignore */ } draw(); }));
  }
  function refreshProgress() {
    LEVELS.forEach(L => { const b = document.getElementById("lv-" + L.id), [d, t] = countLevel(L); if (!b) return; b.querySelector(".lv-p i").style.width = (d / t * 100).toFixed(0) + "%"; b.querySelector(".lv-c").textContent = `${d} of ${t} solved`; });
    body.querySelectorAll("[data-act]").forEach(card => { const a = actById[card.dataset.act], ks = itemsOf(a), d = ks.filter(k => done[k]).length; card.querySelector(".act-score").textContent = a.type === "puzzle" ? (d ? "Solved" : "Not solved yet") : `${d} of ${ks.length}`; card.classList.toggle("solved", d === ks.length); });
  }
  const actById = Object.fromEntries(LEVELS.flatMap(L => L.acts).map(a => [a.id, a]));

  function draw() {
    drawTabs();
    const L = LEVELS.find(x => x.id === level);
    body.innerHTML = `<p class="lv-blurb">${esc(L.blurb)}</p>` + L.acts.map(a => `
      <article class="act" data-act="${a.id}">
        <header><span class="act-topic t-${a.topic.toLowerCase()}">${a.topic}</span><h3>${esc(a.title)}</h3><span class="act-score"></span></header>
        ${a.intro ? `<p class="act-intro">${esc(a.intro)}</p>` : ""}
        <div class="act-body"></div>
      </article>`).join("") +
      `<div class="lv-foot"><button type="button" class="chip" id="lvReset">Reset this level</button>${level !== "advanced" ? `<button type="button" class="chip" id="lvNext">Go to the next level →</button>` : ""}</div>`;
    L.acts.forEach(a => { const host = body.querySelector(`[data-act="${a.id}"] .act-body`); ({ puzzle: drawPuzzle, quiz: drawQuiz, numbers: drawNumbers })[a.type](a, host); });
    document.getElementById("lvReset").addEventListener("click", () => { L.acts.flatMap(itemsOf).forEach(k => delete done[k]); save(); draw(); });
    const nx = document.getElementById("lvNext");
    if (nx) nx.addEventListener("click", () => { level = LEVELS[LEVELS.findIndex(x => x.id === level) + 1].id; draw(); document.getElementById("learnTabs").scrollIntoView({ block: "start" }); });
    refreshProgress();
  }

  // ── Puzzle: blanks in a diagram, filled from a bank of labels ──
  function drawPuzzle(a, host) {
    const answers = [];
    const rowsHtml = a.rows.map((row, ri) => {
      let h = "", prevNode = false;
      row.forEach(it => {
        const isArrow = typeof it === "object" && it.arrow;
        if (isArrow) { answers.push(it.arrow); h += `<span class="pz-arrow has"><button type="button" class="pz-slot on-arrow" data-i="${answers.length - 1}"></button><i aria-hidden="true">→</i></span>`; prevNode = false; return; }
        if (prevNode) h += `<span class="pz-arrow" aria-hidden="true"><i>→</i></span>`;
        if (typeof it === "string") h += `<span class="pz-box">${esc(it)}</span>`;
        else { answers.push(it.slot); h += `<button type="button" class="pz-slot" data-i="${answers.length - 1}"></button>`; }
        prevNode = true;
      });
      return `<div class="pz-line">${a.rowNames ? `<span class="pz-rowname">${esc(a.rowNames[ri])}</span>` : ""}<div class="pz-row">${h}</div></div>`;
    }).join("");
    const bank = shuffle([...answers, ...(a.extra || [])], a.id.length * 31 + answers.length);
    host.innerHTML = `<div class="pz">${rowsHtml}</div>
      <div class="pz-bank" role="group" aria-label="Labels to place">${bank.map((t, i) => `<button type="button" class="pz-tile" data-t="${i}">${esc(t)}</button>`).join("")}</div>
      <div class="pz-ctl"><button type="button" class="chip pz-check" disabled>Check</button><button type="button" class="chip pz-reset">Start over</button><span class="pz-msg" role="status"></span></div>
      <p class="act-why" hidden></p>`;
    const slots = [...host.querySelectorAll(".pz-slot")], tiles = [...host.querySelectorAll(".pz-tile")];
    const fill = slots.map(() => null); // tile index in each slot
    let active = 0;
    const msg = host.querySelector(".pz-msg"), check = host.querySelector(".pz-check"), why = host.querySelector(".act-why");
    function paint() {
      slots.forEach((s, i) => {
        s.textContent = fill[i] == null ? (s.classList.contains("on-arrow") ? "pays for…" : String(i + 1)) : bank[fill[i]];
        s.classList.toggle("filled", fill[i] != null); s.classList.toggle("active", i === active && fill[i] == null);
        s.setAttribute("aria-label", fill[i] == null ? `Blank ${i + 1}, empty` : `Blank ${i + 1}: ${bank[fill[i]]}. Press to remove.`);
      });
      tiles.forEach((t, i) => { t.disabled = fill.includes(i); });
      check.disabled = fill.includes(null);
    }
    const clearMarks = () => slots.forEach(s => s.classList.remove("ok", "bad"));
    function solved(silent) {
      slots.forEach(s => { s.classList.add("ok"); s.disabled = true; }); tiles.forEach(t => (t.disabled = true)); check.disabled = true;
      msg.textContent = "✓ Solved"; why.hidden = false;
      why.innerHTML = `${esc(a.done)} ${a.link ? `<a href="${a.link}">Read more →</a>` : ""}`;
      if (!silent) { done[a.id] = 1; save(); refreshProgress(); }
    }
    slots.forEach((s, i) => s.addEventListener("click", () => { clearMarks(); msg.textContent = ""; if (fill[i] != null) fill[i] = null; active = i; paint(); }));
    tiles.forEach((t, ti) => t.addEventListener("click", () => {
      clearMarks(); msg.textContent = "";
      if (active == null || fill[active] != null) active = fill.indexOf(null);
      if (active < 0) return;
      fill[active] = ti; const next = fill.indexOf(null); active = next < 0 ? null : next; paint();
    }));
    check.addEventListener("click", () => {
      let right = 0; slots.forEach((s, i) => { const ok = bank[fill[i]] === answers[i]; s.classList.toggle("ok", ok); s.classList.toggle("bad", !ok); if (ok) right++; });
      if (right === slots.length) solved(false); else msg.textContent = `${right} of ${slots.length} in the right place. Tap a red one to change it.`;
    });
    host.querySelector(".pz-reset").addEventListener("click", () => { fill.fill(null); active = 0; clearMarks(); slots.forEach(s => (s.disabled = false)); msg.textContent = ""; why.hidden = true; paint(); });
    if (done[a.id]) { answers.forEach((ans, i) => (fill[i] = bank.indexOf(ans))); active = null; paint(); solved(true); } else paint();
  }

  // ── Quiz: multiple choice with an explanation after each answer ──
  function drawQuiz(a, host) {
    host.innerHTML = a.qs.map((q, qi) => {
      const order = q.fixed ? q.opts.map((_, i) => i) : shuffle(q.opts.map((_, i) => i), qi * 97 + a.id.length * 13 + 5);
      return `<fieldset class="qz" data-q="${qi}"><legend><span class="qz-n">${qi + 1}</span>${esc(q.q)}</legend>
        <div class="qz-opts">${order.map(oi => `<button type="button" class="qz-opt" data-o="${oi}">${esc(q.opts[oi])}</button>`).join("")}</div>
        <p class="act-why" hidden></p></fieldset>`;
    }).join("");
    host.querySelectorAll(".qz").forEach(fs => {
      const qi = +fs.dataset.q, q = a.qs[qi], correct = q.a || 0, why = fs.querySelector(".act-why");
      const reveal = (picked, silent) => {
        fs.querySelectorAll(".qz-opt").forEach(b => { const o = +b.dataset.o; b.disabled = true; if (o === correct) b.classList.add("ok"); else if (o === picked) b.classList.add("bad"); });
        const right = picked === correct;
        why.hidden = false; why.innerHTML = `<b>${right ? "✓ Correct." : "✗ Not quite."}</b> ${esc(q.why)} ${q.link ? `<a href="${q.link}">Read more →</a>` : ""}`;
        if (right && !silent) { done[`${a.id}:${qi}`] = 1; save(); refreshProgress(); }
      };
      fs.querySelectorAll(".qz-opt").forEach(b => b.addEventListener("click", () => reveal(+b.dataset.o, false)));
      if (done[`${a.id}:${qi}`]) reveal(correct, true);
    });
  }

  // ── Numbers: type an answer; close enough counts ──
  function drawNumbers(a, host) {
    host.innerHTML = a.qs.map((q, qi) => `<div class="nm" data-q="${qi}"><p class="nm-q"><span class="qz-n">${qi + 1}</span>${esc(q.q)}</p>
      <div class="nm-row"><input type="text" inputmode="decimal" id="${a.id}-in-${qi}" aria-label="Your answer in ${esc(q.unit)}" autocomplete="off"><span class="nm-unit">${esc(q.unit)}</span>
      <button type="button" class="chip nm-check">Check</button><button type="button" class="chip nm-show" hidden>Show the working</button><span class="pz-msg" role="status"></span></div>
      <p class="act-why" hidden></p></div>`).join("");
    host.querySelectorAll(".nm").forEach(box => {
      const qi = +box.dataset.q, q = a.qs[qi], inp = box.querySelector("input"), msg = box.querySelector(".pz-msg"), why = box.querySelector(".act-why"), show = box.querySelector(".nm-show");
      const fmt = v => v.toLocaleString("en-US", { maximumFractionDigits: 3 });
      const reveal = () => { why.hidden = false; why.innerHTML = `<b>Answer: ${fmt(q.ans)} ${esc(q.unit)}.</b> ${esc(q.work)}`; };
      const go = () => {
        const v = parseFloat(inp.value.replace(/[, $]/g, ""));
        if (!isFinite(v)) { msg.textContent = "Type a number."; return; }
        if (Math.abs(v - q.ans) / q.ans <= q.tol) { msg.textContent = "✓ Correct"; inp.classList.add("ok"); inp.classList.remove("bad"); reveal(); done[`${a.id}:${qi}`] = 1; save(); refreshProgress(); }
        else { const off = v / q.ans; msg.textContent = off > 100 || off < 0.01 ? "✗ Far off. Check your units." : v > q.ans ? "✗ Too high" : "✗ Too low"; inp.classList.add("bad"); inp.classList.remove("ok"); show.hidden = false; }
      };
      box.querySelector(".nm-check").addEventListener("click", go);
      inp.addEventListener("keydown", e => { if (e.key === "Enter") go(); });
      show.addEventListener("click", reveal);
      if (done[`${a.id}:${qi}`]) { inp.value = fmt(q.ans); inp.classList.add("ok"); msg.textContent = "✓ Correct"; reveal(); }
    });
  }

  draw();
})();
