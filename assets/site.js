"use strict";
(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const pad = (n) => String(n).padStart(2, "0");

  /** Run fn every ms while el is on screen (and the tab is visible). */
  function whileVisible(el, ms, fn) {
    if (!el || still) return;
    let on = false, timer = null;
    const tick = () => { if (on && !document.hidden) fn(); };
    const start = () => { if (!timer) timer = setInterval(tick, ms); };
    const stop = () => { clearInterval(timer); timer = null; };
    if ("IntersectionObserver" in window) {
      new IntersectionObserver((entries) => {
        on = entries[0].isIntersecting;
        on ? start() : stop();
      }, {threshold: 0.15}).observe(el);
    } else { on = true; start(); }
  }

  /* ---------- nav ---------- */
  const menu = $(".menu-btn"), links = $("#nav-links");
  if (menu && links) {
    menu.addEventListener("click", () => {
      const open = links.classList.toggle("open");
      menu.setAttribute("aria-expanded", String(open));
    });
    links.addEventListener("click", (e) => {
      if (e.target.closest("a")) { links.classList.remove("open"); menu.setAttribute("aria-expanded", "false"); }
    });
  }

  /* ---------- stars ---------- */
  const canvas = $(".stars");
  if (canvas && canvas.getContext) {
    const ctx = canvas.getContext("2d");
    let stars = [];
    const size = () => {
      const r = canvas.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = r.width * dpr; canvas.height = r.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      let seed = 7;
      const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      stars = Array.from({length: Math.round(r.width * r.height / 5200)}, () => ({
        x: rnd() * r.width, y: rnd() * r.height * 0.82, r: rnd() * 1.2 + 0.25, a: rnd() * 0.6 + 0.2, p: rnd() * 6.28}));
      draw(0);
    };
    const draw = (t) => {
      const r = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, r.width, r.height);
      for (const s of stars) {
        ctx.globalAlpha = s.a * (0.75 + 0.25 * Math.sin(t / 900 + s.p));
        ctx.fillStyle = "#dbe9ff";
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.283); ctx.fill();
      }
      ctx.globalAlpha = 1;
    };
    size();
    window.addEventListener("resize", size);
    if (!still) {
      let visible = true;
      if ("IntersectionObserver" in window) new IntersectionObserver((e) => { visible = e[0].isIntersecting; }).observe(canvas);
      const loop = (t) => { if (visible && !document.hidden) draw(t); requestAnimationFrame(loop); };
      requestAnimationFrame(loop);
    }
  }

  /* ---------- phone lock screen ---------- */
  const NOTIFS = [
    {title: "N731RG (Club Cessna) departed", body: "at KFDK – Frederick Municipal Airport\n1,800 ft · 96 kt · hdg 230° · C172"},
    {title: "✈️ UA1234: your plane is on its way", body: "N38473 is in the air as UAL587. Due at IAD around 11:35 AM. Your UA1234 departs 12:30 PM, 55 min after it lands."},
    {title: "📣 Alex shared a round trip with you", body: "UA1234 · Thu Oct 22, departs 12:30 PM from IAD.\nReturn: UA5678 · Thu Oct 29."},
    {title: "DL89 (N401DZ) is airborne", body: "36,000 ft · 488 kt · hdg 284°\nA339 · DAL89"},
    {title: "⏳ WN2316: tight turnaround", body: "N8712L is now due around 1:02 PM. Your WN2316 departs 1:35 PM, 33 min after it lands."},
    {title: "UA1234 (N38473) landed", body: "at KLAS – Harry Reid Intl\nB738 · UAL1234"},
    {title: "🛬 WN2316: your plane landed", body: "N8712L is on the ground at BWI. Your WN2316 departs 1:35 PM, 31 min after it lands."},
  ];
  const stack = $("#notifs");
  const BELL = '<svg viewBox="0 0 24 24"><use href="#i-bell" style="color:#fff"/></svg>';
  const notifHtml = (n, ago, enter) => `<div class="notif${enter ? " enter" : ""}"><div class="app">${BELL}</div><div><div class="top"><span>ntfy</span><span>${ago}</span></div><b>${esc(n.title)}</b><p>${esc(n.body.replace(/\n/g, " · "))}</p></div></div>`;
  if (stack) {
    let next = 3;
    const render = (enterFirst) => {
      const shown = [next - 1, next - 2, next - 3].map((i) => NOTIFS[((i % NOTIFS.length) + NOTIFS.length) % NOTIFS.length]);
      stack.innerHTML = shown.map((n, i) => notifHtml(n, ["now", "4m ago", "11m ago"][i], enterFirst && i === 0)).join("");
    };
    render(false);
    whileVisible(stack, 3600, () => { next++; render(true); });
  }
  const clock = () => {
    const d = new Date();
    const pt = $("#phone-time"), pd = $("#phone-date"), bc = $("#board-clock");
    if (pt) pt.textContent = `${d.getHours() % 12 || 12}:${pad(d.getMinutes())}`;
    if (pd) pd.textContent = d.toLocaleDateString(undefined, {weekday: "long", month: "long", day: "numeric"});
    if (bc) bc.textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  clock(); setInterval(clock, 15000);

  /* ---------- departures board ---------- */
  // Each row cycles through the states a real trip or aircraft goes through.
  const ROWS = [
    {time: "13:35", flight: "WN2316", plane: "N8712L", to: "MCO", states: [
      ["SCHED", "", "<b>Jordan's trip.</b> Waiting for Southwest to assign a plane."],
      ["ASSIGNED", "g", "<b>Plane assigned:</b> N8712L, flying in from Boston as WN1801."],
      ["EN ROUTE", "y", "<b>Your plane is on its way.</b> Due at BWI 1:02 PM."],
      ["TIGHT 33M", "o", "<b>Tight turnaround:</b> it lands 33 minutes before you leave."],
      ["ARRIVED", "g", "<b>Your plane landed</b> at BWI. Time to head to the gate."]]},
    {time: "12:30", flight: "UA1234", plane: "N38473", to: "LAS", states: [
      ["ASSIGNED", "g", "<b>Shared with Mom &amp; Dad.</b> They get the takeoff and landing."],
      ["DEPARTED", "y", "<b>UA1234 (N38473) departed</b> IAD. Family notified."],
      ["LANDED", "g", "<b>Landed at LAS.</b> Mom &amp; Dad got the alert too."]]},
    {time: "--:--", flight: "N731RG", plane: "C172", to: "", states: [
      ["PARKED", "m", "<b>Club Cessna.</b> Quiet since yesterday, last seen at FDK."],
      ["DEPARTED", "y", "<b>Departed FDK.</b> 1,800 ft, 96 kt, heading 230°."],
      ["AIRBORNE", "y", "<b>6,500 ft</b>, 12 nm SW of Frederick, MD."]]},
    {time: "18:05", flight: "DL89", plane: "N401DZ", to: "LAX", states: [
      ["AIRBORNE", "y", "<b>FL360</b> near Wichita, KS. Stops watching in 1 day."],
      ["LANDED", "g", "<b>DL89 (N401DZ) landed</b> at LAX."]]},
    {time: "07:10", flight: "AA2207", plane: "", to: "DFW", states: [
      ["SCHED", "", "<b>Next check in 3 days</b>, then daily until the last day."],
      ["RENUMBER", "r", "<b>Renumbered by the airline.</b> Likely now AA2271: text <b>change 3 AA2271</b>."],
      ["SCHED", "", "<b>Updated to AA2271.</b> TailWatcher never switches on its own."]]},
    {time: "10/29", flight: "UA5678", plane: "", to: "IAD", states: [
      ["SCHED", "", "<b>Return of UA1234.</b> Checked weekly until two weeks out."]]},
  ];
  const WIDTH = {time: 5, flight: 6, plane: 6, to: 3, status: 9};
  const PREV = {};
  function flaps(key, text, n, cls = "", col = "") {
    const shown = String(text ?? "").toUpperCase().padEnd(n).slice(0, n);
    const before = PREV[key];
    PREV[key] = shown;
    return `<span class="flaps${col}" role="cell" aria-label="${esc(shown.trim()) || "none"}">${[...shown].map((ch, i) => {
      const flip = before !== undefined && before[i] !== ch ? " flip" : "";
      const delay = flip ? ` style="animation-delay:${i * 42}ms"` : "";
      return `<span class="flap ${cls}${flip}"${delay} aria-hidden="true">${ch === " " ? "&nbsp;" : esc(ch)}</span>`;
    }).join("")}</span>`;
  }
  const grid = $("#board-grid");
  if (grid) {
    const head = grid.innerHTML;
    const at = ROWS.map(() => 0);
    const render = () => {
      grid.innerHTML = head + ROWS.map((r, i) => {
        const [status, cls, note] = r.states[at[i]];
        const flight = r.flight === "AA2207" && at[i] === 2 ? "AA2271" : r.flight;
        return flaps(`t${i}`, r.time, WIDTH.time, "", " c-time") + flaps(`f${i}`, flight, WIDTH.flight, "y") + flaps(`p${i}`, r.plane, WIDTH.plane, "", " c-plane")
          + flaps(`d${i}`, r.to, WIDTH.to, "", " c-to") + flaps(`s${i}`, status, WIDTH.status, cls) + `<span class="note" role="cell">${note}</span>`;
      }).join("");
    };
    render();
    let turn = 0;
    whileVisible(grid, 2600, () => {
      // Advance one row per tick, skipping rows with only one state.
      for (let k = 0; k < ROWS.length; k++) {
        const i = (turn + k) % ROWS.length;
        if (ROWS[i].states.length > 1) { at[i] = (at[i] + 1) % ROWS[i].states.length; turn = i + 1; break; }
      }
      render();
    });
  }

  /* ---------- text command chat ---------- */
  const SCRIPT = [
    ["list", "Alex's aircraft (2):\n• N731RG (Club Cessna) — ✈️ airborne\n• UA1234 (Vegas trip) — on the ground · 2d left"],
    ["info N731RG", "Cessna 172S (2004)\nOwner: Sample Flying Club (corporation) · Frederick, MD\nLive: ✈️ 6,500 ft · 118 kt · 12 nm SW of KFDK\nOn your list ✓"],
    ["DL89 for 2 days", "✅ Added flight DL89 for 2d. Watching 3 aircraft."],
    ["inbound UA1234 10/22 return UA5678 10/29", "🧳 UA1234 · Thu Oct 22, departs 12:30 PM from IAD\nYour plane: N38473, arriving as UA587 from ORD (due 11:35 AM)\n\n↩ Return UA5678 · Thu Oct 29 from LAS\nNo plane assigned yet. I'll check again closer to departure."],
    ["share 1 Mom & Dad", "🔗 UA1234 and UA5678 are shared with Mom & Dad."],
    ["remove DL89", "🗑 Removed DL89. Watching 2 aircraft."],
  ];
  const log = $("#chat-log"), typing = $("#chat-type");
  if (log && typing) {
    const add = (cls, text) => {
      const el = document.createElement("div");
      el.className = "msg " + cls;
      el.textContent = text;
      log.appendChild(el);
      while (log.children.length > 6) log.removeChild(log.firstChild);
    };
    if (still) {
      for (const [cmd, reply] of SCRIPT.slice(0, 2)) { add("me", cmd); add("tw", reply); }
    } else {
      let step = 0, busy = false;
      const play = () => {
        if (busy) return;
        busy = true;
        const [cmd, reply] = SCRIPT[step++ % SCRIPT.length];
        let i = 0;
        const type = setInterval(() => {
          i++;
          typing.innerHTML = esc(cmd.slice(0, i)) + '<span class="caret"></span>';
          if (i >= cmd.length) {
            clearInterval(type);
            setTimeout(() => {
              typing.textContent = "";
              add("me", cmd);
              setTimeout(() => { add("tw", reply); busy = false; }, 900);
            }, 380);
          }
        }, 55);
      };
      whileVisible(log, 5200, play);
    }
  }

  /* ---------- screenshot tabs ---------- */
  const tabs = document.querySelectorAll("[data-theme-tab]");
  tabs.forEach((tab) => tab.addEventListener("click", () => {
    const theme = tab.dataset.themeTab;
    tabs.forEach((t) => t.setAttribute("aria-selected", String(t === tab)));
    $("#shots").setAttribute("aria-labelledby", tab.id);
    const d = $("#shot-desktop"), p = $("#shot-phone");
    d.src = `assets/img/${theme}-desktop.webp`;
    p.src = `assets/img/${theme}-phone.webp`;
    d.alt = theme === "board"
      ? "TailWatcher dashboard in the Board theme: trips and aircraft on yellow and white split-flap tiles, like an airport departures board"
      : "TailWatcher dashboard in the Modern theme: trip cards with a progress bar from Scheduled to At the airport, and an activity feed of alerts";
    p.alt = `The ${theme === "board" ? "Board" : "Modern"} theme on a phone`;
    document.querySelectorAll("[data-cap]").forEach((c) => { c.hidden = c.dataset.cap !== theme; });
  }));
})();
