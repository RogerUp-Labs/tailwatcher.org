"use strict";
// Renders the app's own guide (instructions.md, the StartOS Instructions tab and
// in-app ? Help) with the same small Markdown subset the Web UI uses: headings,
// paragraphs, lists with one nesting level, tables and quotes. Section ids match
// the app's data-section ids, so docs.html#text-commands works like the app.
(() => {
  const SOURCES = [
    "https://raw.githubusercontent.com/RogerUp-Labs/tailwatcher/main/instructions.md",
    "docs/guide.md",  // copy shipped with the site, for when GitHub is unreachable
  ];
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
  const slugify = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  function inline(text) {
    // text is already HTML-escaped
    return text.replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
      .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<i>$2</i>")
      .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" rel="noopener noreferrer">$1</a>');
  }

  function renderBlocks(lines) {
    const out = [];
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      if (!line.trim()) { i++; continue; }
      if (line.startsWith("|")) {
        const rows = [];
        while (i < lines.length && lines[i].startsWith("|")) rows.push(lines[i++]);
        const cells = (r) => r.replace(/^\||\|$/g, "").split("|").map((c) => inline(esc(c.trim())));
        const body = rows.filter((r) => !/^\|[\s|:-]+\|$/.test(r));
        out.push(`<div class="table-wrap"><table><thead><tr>${cells(body[0]).map((c) => `<th>${c}</th>`).join("")}</tr></thead><tbody>${body.slice(1).map((r) => `<tr>${cells(r).map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`);
        continue;
      }
      if (line.startsWith(">")) {
        const q = [];
        while (i < lines.length && lines[i].startsWith(">")) q.push(inline(esc(lines[i++].replace(/^>\s?/, ""))));
        out.push(`<blockquote>${q.join("<br>")}</blockquote>`);
        continue;
      }
      const ordered = /^\d+\.\s/.test(line);
      if (ordered || /^-\s/.test(line)) {
        const items = [];
        while (i < lines.length && (/^(\d+\.|-)\s/.test(lines[i]) || /^\s{2,}\S/.test(lines[i]))) {
          if (/^\s{2,}-\s/.test(lines[i]) && items.length) (items[items.length - 1].sub ||= []).push(lines[i].trim().replace(/^-\s/, ""));
          else if (/^\s{2,}\S/.test(lines[i]) && items.length) items[items.length - 1].text += " " + lines[i].trim();
          else items.push({text: lines[i].replace(/^(\d+\.|-)\s/, "")});
          i++;
        }
        const tag = ordered ? "ol" : "ul";
        out.push(`<${tag}>${items.map((it) => `<li>${inline(esc(it.text))}${it.sub ? `<ul>${it.sub.map((x) => `<li>${inline(esc(x))}</li>`).join("")}</ul>` : ""}</li>`).join("")}</${tag}>`);
        continue;
      }
      const para = [];
      while (i < lines.length && lines[i].trim() && !/^(#|\||>|-\s|\d+\.\s)/.test(lines[i])) para.push(lines[i++]);
      out.push(`<p>${inline(esc(para.join(" ")))}</p>`);
    }
    return out.join("");
  }

  function parseGuide(md) {
    const sections = [];
    let cur = null;
    for (const line of md.split("\n")) {
      const h = /^(#{2,3})\s+(.*)$/.exec(line);
      if (h) {
        cur = {id: slugify(h[2]), level: h[1].length, title: h[2], lines: []};
        sections.push(cur);
      } else if (cur) cur.lines.push(line);
    }
    return sections.map((sec) => ({...sec, html: renderBlocks(sec.lines),
      text: (sec.title + " " + sec.lines.join(" ")).replace(/[`*|>#]/g, " ").replace(/\s+/g, " ").toLowerCase()}));
  }

  async function fetchGuide() {
    for (const url of SOURCES) {
      try {
        const ctl = new AbortController();
        const timer = setTimeout(() => ctl.abort(), 4000);
        const r = await fetch(url, {cache: "no-cache", signal: ctl.signal});
        clearTimeout(timer);
        if (!r.ok) continue;
        const text = await r.text();
        if (/^##\s/m.test(text)) return {text, url};
      } catch (e) { /* try the next source */ }
    }
    return null;
  }

  let GUIDE = [];

  function render(query) {
    const q = query.trim().toLowerCase();
    // A ## topic shows when it or any of its ### questions match.
    const show = new Set();
    let parent = null;
    for (const s of GUIDE) {
      if (s.level === 2) parent = s;
      if (!q || s.text.includes(q)) { show.add(s.id); if (parent) show.add(parent.id); }
    }
    const visible = GUIDE.filter((s) => show.has(s.id));
    const mark = (htmlText) => {
      if (!q) return htmlText;
      const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
      return htmlText.split(/(<[^>]+>)/).map((part) => part.startsWith("<") ? part : part.replace(re, "<mark>$1</mark>")).join("");
    };
    $("guide").innerHTML = visible.length
      ? visible.map((s) => `<section id="${s.id}" data-level="${s.level}"><h${s.level}>${esc(s.title)}</h${s.level}>${mark(s.html)}</section>`).join("")
        + `<p class="guide-src">This guide is <a href="https://github.com/RogerUp-Labs/tailwatcher/blob/main/instructions.md">instructions.md</a> in the TailWatcher repository, the same text as the app's ? Help and the StartOS Instructions tab.</p>`
      : `<p class="empty">Nothing in the guide matches "${esc(query)}". Try a shorter word, like <code>iphone</code> or <code>share</code>.</p>`;
    $("toc").innerHTML = `<div class="toc-title">On this page</div>` + GUIDE.filter((s) => s.level === 2 && show.has(s.id))
      .map((s) => `<a href="#${s.id}" data-id="${s.id}">${esc(s.title)}</a>`).join("");
    spy();
  }

  let observer = null;
  function spy() {
    if (observer) observer.disconnect();
    if (!("IntersectionObserver" in window)) return;
    observer = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const id = e.target.dataset.level === "2" ? e.target.id : null;
        if (id) document.querySelectorAll("#toc a").forEach((a) => a.classList.toggle("on", a.dataset.id === id));
      }
    }, {rootMargin: "-90px 0px -65% 0px"});
    document.querySelectorAll('#guide section[data-level="2"]').forEach((s) => observer.observe(s));
  }

  (async () => {
    const got = await fetchGuide();
    if (!got) {
      $("guide").innerHTML = `<p class="empty">The guide couldn't load. Read it on GitHub: <a href="https://github.com/RogerUp-Labs/tailwatcher/blob/main/instructions.md">instructions.md</a>.</p>`;
      return;
    }
    // The guide's own title (# TailWatcher) and intro sit above the first ##.
    const intro = got.text.split(/\n(?=##\s)/)[0].split("\n").filter((l) => !/^#\s/.test(l));
    GUIDE = [{id: "overview", level: 2, title: "Overview", lines: intro}, ...parseGuide(got.text)]
      .map((s) => s.html ? s : {...s, html: renderBlocks(s.lines), text: (s.title + " " + s.lines.join(" ")).toLowerCase()});
    render("");
    const target = location.hash.slice(1);
    if (target && document.getElementById(target)) document.getElementById(target).scrollIntoView();
    let t = null;
    $("q").addEventListener("input", (e) => { clearTimeout(t); t = setTimeout(() => render(e.target.value), 120); });
  })();
})();
