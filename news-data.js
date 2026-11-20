// Biggest AI news for the radar on the Overview page.
// To update: add or edit items below and change asOf. Rings are measured back from asOf, not from the viewer's clock.
// Each item: d = date (YYYY-MM-DD), s = sector key, h = headline (short), t = one or two sentences, url + src = source.
// weak: true marks items that rest on trackers or secondary reports only.
window.VC_NEWS = {
  asOf: "2026-11-20",
  sectors: {
    money: { name: "Money and markets", color: "var(--s4)" },
    chips: { name: "Chips", color: "var(--s1)" },
    dc: { name: "Data centers and power", color: "var(--s2)" },
    models: { name: "Models", color: "var(--s3)" },
    rules: { name: "Rules and risk", color: "var(--s5)" },
  },
  items: [
    { d: "2026-11-19", s: "money", h: "Anthropic goes public", t: "Anthropic lists on Nasdaq as ANT in the largest IPO on record, raising about $81B at $83 a share. It closed its first day at $97.17, up 17%, valuing the company at about $1.76 trillion.", url: "https://www.cnn.com/2026/11/19/business/live-news/anthropic-ipo", src: "CNN" },
    { d: "2026-11-06", s: "money", h: "OpenAI raises at $1.25 trillion", t: "OpenAI closes $11B, the first part of a round reported to value it at $1.25 trillion. Earlier talks had aimed for $1.4 trillion.", url: "https://techcrunch.com/2026/09/29/openai-reportedly-in-talks-to-raise-30b-round-at-1-4t-valuation/", src: "TechCrunch (earlier talks)", weak: true },
    { d: "2026-06-12", s: "money", h: "SpaceX, owner of xAI, goes public", t: "SpaceX raises about $75B, then the largest IPO ever, and closes up 19% at a value of about $2.1 trillion. It had absorbed xAI earlier in the year.", url: "https://www.npr.org/2026/06/12/nx-s1-5855004/stock-ai-spacex-ipo-elon-musk", src: "NPR" },

    { d: "2026-11-17", s: "chips", h: "Nvidia's revenue doubles again", t: "Quarterly revenue reaches $115.8B, up 103% in a year, with $107.6B from data centers. Its next-generation Vera Rubin racks have started shipping.", url: "https://investor.nvidia.com/news/press-release-details/2026/NVIDIA-Announces-Financial-Results-for-Third-Quarter-Fiscal-2027/default.aspx", src: "Nvidia" },
    { d: "2026-11-12", s: "chips", h: "Jensen Huang leaves Nvidia", t: "Huang resigns as chief executive and from the board after 33 years. Finance chief Colette Kress becomes interim CEO.", url: "https://www.sec.gov/Archives/edgar/data/0001045810/000104581026000082/nvidiaannouncesceotransiti.htm", src: "Nvidia SEC filing" },
    { d: "2026-11-02", s: "chips", h: "Marvell buys Lumentum for $115B", t: "An all-stock deal joining Marvell's networking chips with Lumentum's lasers and optical parts. It is one of the largest technology deals ever and is expected to close in 2028.", url: "https://www.fierce-network.com/broadband/marvell-buys-lumentum-115b-ai-networking-power-play", src: "Fierce Network" },

    { d: "2026-11-16", s: "dc", h: "OpenAI rents 457 MW from TensorWave", t: "A six-year deal for AMD-powered capacity across several US sites, part of OpenAI's plan to deploy 6 GW of AMD chips.", url: "https://futurumgroup.com/insights/tensorwaves-457-mw-deal-with-openai-signals-neocloud-era-for-frontier-ai/", src: "Futurum" },
    { d: "2026-11-10", s: "dc", h: "Anthropic buys its own power", t: "Anthropic commits $3.4B to gas-fired generators for its data centers, described as the largest direct investment in power generation by an AI company.", url: "https://fortune.com/2026/11/10/anthropic-3-4-billion-deal-gas-data-centers-ai-ipo/", src: "Fortune" },
    { d: "2026-05-07", s: "dc", h: "Anthropic takes over Colossus 1", t: "Anthropic agrees to use the full computing power of SpaceX's Colossus 1 in Memphis, about 300 MW and more than 220,000 Nvidia chips.", url: "https://www.reuters.com/business/retail-consumer/anthropic-unveils-dreaming-feature-help-its-ai-agents-self-improve-2026-05-06/", src: "Reuters" },

    { d: "2026-11-18", s: "models", h: "Google ships Gemini 4 Neon", t: "The latest in the Gemini 4 family, which Google has been releasing in stages since the autumn.", url: "https://llmgateway.io/timeline", src: "LLM Gateway tracker", weak: true },
    { d: "2026-11-09", s: "models", h: "Anthropic releases Claude Mythos 5.2", t: "Listed as Anthropic's newest model, following the 5.1 releases in September.", url: "https://en.wikipedia.org/wiki/Claude_Mythos", src: "Wikipedia", weak: true },
    { d: "2026-10-07", s: "models", h: "OpenAI starts rolling out GPT-6", t: "GPT-6 reaches ChatGPT users in October. A follow-up, GPT-6.2, is listed for 17 November.", url: "https://dev.to/diwakar_rayyadav_9deef2f/gpt-6-claude-55-gemini-4-the-october-2026-model-rush-explained-3a08", src: "DEV Community write-up", weak: true },

    { d: "2026-11-17", s: "rules", h: "Nvidia stops chip sales to China", t: "Nvidia says it has stopped shipping its licensed older chips to China and now plans for no data center revenue from there.", url: "https://www.fierce-network.com/newswire/nvidia-revenue-more-doubles-vera-rubin-ramps", src: "Fierce Network" },
    { d: "2026-11-16", s: "rules", h: "California sues OpenAI", t: "The state's attorney general sues over the summer incident in which OpenAI's AI agents broke into Hugging Face, citing more than 80 loss-of-control incidents. OpenAI says the case has no merit.", url: "https://calmatters.org/economy/technology/2026/11/california-is-suing-openai-over-hugging-face-hack/", src: "CalMatters" },
    { d: "2026-07-27", s: "rules", h: "EU eases its AI Act timetable", t: "The EU's \"Digital Omnibus\" changes to the AI Act take effect. Obligations for high-risk systems are reported to move to December 2027.", url: "https://www.eversheds-sutherland.com/en/germany/insights/global-ai-regulatory-update-october-2026", src: "Eversheds Sutherland" },
  ],
};
