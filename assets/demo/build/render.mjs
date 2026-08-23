#!/usr/bin/env node
// Deterministic demo asset generator.
//
// One timeline in, everything out: video frames (SVG), burned-in captions, subtitle files,
// and the ffmpeg concat lists. Nothing here captures a screen. Every frame is vector art built
// from synthetic fixtures, which is why no mailbox, host, account, path, token or real
// identifier can leak into the video.
//
//   node render.mjs        # writes frames/, ../*.srt, ../*.vtt, ../*.timeline.json, concat lists

import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const DEMO = join(HERE, "..");
const ASSETS = join(DEMO, "..");
const FRAMES = join(HERE, "frames");
mkdirSync(FRAMES, { recursive: true });
mkdirSync(join(HERE, "png"), { recursive: true });

const W = 1920, H = 1080;
const CAP_TOP = 936;
const UI = "-apple-system, Helvetica Neue, Helvetica, Arial, sans-serif";
const MONO = "SF Mono, Menlo, DejaVu Sans Mono, monospace";
const C = {
  bg: "#0d1117", panel: "#161b22", panel2: "#1c2128", line: "#30363d",
  fg: "#e6edf3", dim: "#8b949e", faint: "#484f58",
  ok: "#3fb950", err: "#f85149", warn: "#d29922", blue: "#58a6ff",
  light: "#f6f8fa", card: "#ffffff", ink: "#1f2328", inkDim: "#59636e"
};
const MD = "\u2014", MID = "\u00b7", RA = "\u2192", NE = "\u2260", CHK = "\u2713", XX = "\u2717";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function wrap(s, maxChars) {
  const words = String(s).split(" ");
  const out = []; let cur = "";
  for (const w of words) {
    const t = cur ? cur + " " + w : w;
    if (t.length > maxChars && cur) { out.push(cur); cur = w; } else { cur = t; }
  }
  if (cur) out.push(cur);
  return out;
}

function txt(x, y, s, o = {}) {
  const a = [];
  a.push("x=\"" + x + "\" y=\"" + y + "\"");
  a.push("font-family=\"" + (o.mono ? MONO : UI) + "\"");
  a.push("font-size=\"" + (o.size || 30) + "\"");
  a.push("fill=\"" + (o.fill || C.fg) + "\"");
  if (o.weight) a.push("font-weight=\"" + o.weight + "\"");
  if (o.anchor) a.push("text-anchor=\"" + o.anchor + "\"");
  if (o.ls) a.push("letter-spacing=\"" + o.ls + "\"");
  if (o.opacity) a.push("opacity=\"" + o.opacity + "\"");
  if (o.mono) a.push("xml:space=\"preserve\"");
  return "<text " + a.join(" ") + ">" + esc(s) + "</text>";
}

function rect(x, y, w, h, fill, o = {}) {
  const a = ["x=\"" + x + "\"", "y=\"" + y + "\"", "width=\"" + w + "\"", "height=\"" + h + "\"", "fill=\"" + fill + "\""];
  if (o.rx) a.push("rx=\"" + o.rx + "\"");
  if (o.stroke) a.push("stroke=\"" + o.stroke + "\" stroke-width=\"" + (o.sw || 2) + "\"");
  return "<rect " + a.join(" ") + "/>";
}

// ---------------------------------------------------------------- shared chrome
function shell(f, bodyFill) {
  let s = rect(0, 0, W, H, bodyFill || C.bg);
  s += rect(0, CAP_TOP, W, H - CAP_TOP, "#010409");
  s += rect(0, CAP_TOP, W, 2, C.line);
  const lines = wrap(f.caption, 96);
  const y0 = lines.length > 1 ? 1000 : 1022;
  lines.forEach((l, i) => { s += txt(W / 2, y0 + i * 44, l, { size: 34, anchor: "middle", fill: C.fg }); });
  s += txt(72, 66, String(f.label || "").toUpperCase(), { size: 22, ls: 3, fill: C.dim });
  s += txt(W - 72, 66, "SYNTHETIC FIXTURE " + MID + " NO CUSTOMER DATA", { size: 19, ls: 2, fill: C.faint, anchor: "end" });
  return s;
}

function doc(inner) {
  return "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n" +
    "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" " +
    "width=\"" + W + "\" height=\"" + H + "\" viewBox=\"0 0 " + W + " " + H + "\">" + inner + "</svg>";
}

// ---------------------------------------------------------------- frame types
function titleCard(f) {
  let s = rect(0, 0, W, H, C.bg);
  s += rect(0, CAP_TOP, W, H - CAP_TOP, "#010409") + rect(0, CAP_TOP, W, 2, C.line);
  const lines = wrap(f.caption, 96);
  const y0 = lines.length > 1 ? 1000 : 1022;
  lines.forEach((l, i) => { s += txt(W / 2, y0 + i * 44, l, { size: 34, anchor: "middle" }); });
  s += rect(0, 0, W, 6, C.blue);
  s += txt(W / 2, 200, String(f.kicker || "").toUpperCase(), { size: 24, ls: 6, fill: C.blue, anchor: "middle" });
  f.headline.forEach((l, i) => { s += txt(W / 2, 340 + i * 84, l, { size: 68, weight: 600, anchor: "middle" }); });
  const n = f.stats.length, gap = 1500 / n;
  f.stats.forEach((st, i) => {
    const cx = 210 + gap * i + gap / 2;
    s += txt(cx, 700, st.n, { size: 92, weight: 700, anchor: "middle", fill: st.tone === "ok" ? C.ok : C.fg, mono: true });
    s += txt(cx, 754, st.l.toUpperCase(), { size: 22, ls: 3, anchor: "middle", fill: C.dim });
  });
  if (f.foot) s += txt(W / 2, 860, f.foot, { size: 26, anchor: "middle", fill: C.faint });
  return s;
}

function closing(f) {
  let s = rect(0, 0, W, H, C.bg);
  s += rect(0, CAP_TOP, W, H - CAP_TOP, "#010409") + rect(0, CAP_TOP, W, 2, C.line);
  const lines = wrap(f.caption, 96);
  const y0 = lines.length > 1 ? 1000 : 1022;
  lines.forEach((l, i) => { s += txt(W / 2, y0 + i * 44, l, { size: 34, anchor: "middle" }); });
  s += rect(0, 0, W, 6, C.ok);
  f.lines.forEach((l, i) => {
    s += txt(W / 2, 260 + i * 116, l, { size: 54, weight: 600, anchor: "middle", fill: i === 0 ? C.fg : C.fg });
  });
  if (f.foot) s += txt(W / 2, 880, f.foot, { size: 26, anchor: "middle", fill: C.faint });
  return s;
}

function terminal(f) {
  let s = shell(f);
  const contentH = f.lines.reduce((a, ln) => a + (ln.t === "gap" ? 22 : ln.t === "cmd" ? 52 : 42), 0);
  const panelH = Math.min(800, 56 + 56 + contentH + 40);
  const top = Math.round(110 + (800 - panelH) / 2);
  s += rect(72, top, W - 144, panelH, C.panel, { rx: 12, stroke: C.line });
  s += rect(72, top, W - 144, 56, C.panel2, { rx: 12 });
  s += rect(72, top + 54, W - 144, 2, C.line);
  [0, 1, 2].forEach((i) => { s += "<circle cx=\"" + (110 + i * 30) + "\" cy=\"" + (top + 28) + "\" r=\"8\" fill=\"" + C.faint + "\"/>"; });
  s += txt(W / 2, top + 37, f.title || "operator session", { size: 22, anchor: "middle", fill: C.dim });
  let y = top + 112;
  for (const ln of f.lines) {
    if (ln.t === "gap") { y += 22; continue; }
    const fill = ln.t === "cmd" ? C.fg : ln.t === "ok" ? C.ok : ln.t === "err" ? C.err : ln.t === "warn" ? C.warn : ln.t === "key" ? C.blue : C.dim;
    const weight = ln.t === "cmd" ? 600 : null;
    s += txt(120, y, ln.s, { mono: true, size: ln.t === "cmd" ? 32 : 29, fill, weight });
    y += ln.t === "cmd" ? 52 : 42;
  }
  return s;
}

function table(f) {
  let s = shell(f);
  s += txt(72, 170, f.title, { size: 40, weight: 600 });
  const x0 = 72, wAll = W - 144;
  const cols = f.head.length;
  const xs = cols === 2 ? [x0 + 32, x0 + 1000] : [x0 + 32, x0 + 780, x0 + 1140];
  s += rect(x0, 210, wAll, 60, C.panel2, { rx: 8 });
  f.head.forEach((h, i) => { s += txt(xs[i], 249, h.toUpperCase(), { size: 22, ls: 3, fill: C.dim }); });
  let y = 270;
  f.rows.forEach((r, i) => {
    const rowH = 62;
    if (i % 2 === 0) s += rect(x0, y, wAll, rowH, C.panel, { rx: 0 });
    const tone = r.tone === "ok" ? C.ok : r.tone === "err" ? C.err : r.tone === "warn" ? C.warn : C.fg;
    r.c.forEach((cell, j) => {
      s += txt(xs[j], y + 41, cell, { mono: j > 0, size: 29, fill: j === 0 ? C.fg : tone });
    });
    y += rowH;
  });
  if (f.foot) s += txt(x0 + 32, y + 58, f.foot, { size: 28, fill: C.blue, mono: true });
  return s;
}

function mailList(f) {
  let s = shell(f, C.light);
  s += txt(72, 66, String(f.label || "").toUpperCase(), { size: 22, ls: 3, fill: C.inkDim });
  s += txt(W - 72, 66, "SYNTHETIC FIXTURE " + MID + " NO CUSTOMER DATA", { size: 19, ls: 2, fill: "#9aa4ae", anchor: "end" });
  s += rect(72, 110, W - 144, 96, C.card, { rx: 12, stroke: "#d0d7de" });
  s += rect(96, 138, 40, 40, "#d0d7de", { rx: 20 });
  s += txt(158, 166, f.account, { size: 30, fill: C.ink, weight: 600 });
  s += txt(W - 104, 166, "account name and address collapsed", { size: 22, fill: "#9aa4ae", anchor: "end" });
  let y = 234;
  f.rows.forEach((r) => {
    s += rect(72, y, W - 144, 150, C.card, { rx: 12, stroke: "#d0d7de" });
    if (r.unread) s += rect(72, y, 8, 150, C.blue, { rx: 4 });
    s += txt(112, y + 52, r.from, { size: 30, fill: C.ink, weight: r.unread ? 700 : 400 });
    s += txt(W - 112, y + 52, r.time, { size: 24, fill: C.inkDim, anchor: "end" });
    s += txt(112, y + 98, r.subject, { size: 34, fill: C.ink, weight: r.unread ? 700 : 500 });
    s += txt(112, y + 134, r.snippet, { size: 24, fill: C.inkDim });
    const lw = 18 + r.tag.length * 15;
    s += rect(W - 112 - lw, y + 76, lw, 38, "#ddf4e4", { rx: 8 });
    s += txt(W - 112 - lw / 2, y + 103, r.tag, { size: 21, fill: "#1a7f37", anchor: "middle" });
    if (r.unread) s += txt(W - 112, y + 140, "UNREAD", { size: 20, ls: 2, fill: C.blue, anchor: "end" });
    y += 174;
  });
  if (f.note) s += txt(72, y + 46, f.note, { size: 26, fill: C.inkDim });
  return s;
}

function mailBody(f) {
  let s = shell(f, C.light);
  s += txt(72, 66, String(f.label || "").toUpperCase(), { size: 22, ls: 3, fill: C.inkDim });
  s += txt(W - 72, 66, "SYNTHETIC FIXTURE " + MID + " NO CUSTOMER DATA", { size: 19, ls: 2, fill: "#9aa4ae", anchor: "end" });
  s += rect(72, 110, W - 144, 800, C.card, { rx: 12, stroke: "#d0d7de" });
  s += txt(112, 172, f.subject, { size: 40, fill: C.ink, weight: 600 });
  s += txt(112, 218, "from " + f.from + "   " + MID + "   to " + f.to, { size: 26, fill: C.inkDim, mono: true });
  s += rect(112, 246, W - 224, 2, "#d0d7de");
  let y = 306;
  f.body.forEach((l) => {
    const hostile = l.startsWith("!");
    const text = hostile ? l.slice(1) : l;
    if (hostile) s += rect(104, y - 34, W - 208, 48, "#fff1e5", { rx: 4 });
    s += txt(120, y, text, { size: 30, fill: hostile ? "#9a3412" : C.ink, mono: hostile });
    y += 48;
  });
  if (f.note) s += txt(120, 880, f.note, { size: 26, fill: "#9a3412", weight: 600 });
  return s;
}

function draftView(f) {
  let s = shell(f, C.light);
  s += txt(72, 66, String(f.label || "").toUpperCase(), { size: 22, ls: 3, fill: C.inkDim });
  s += txt(W - 72, 66, "SYNTHETIC FIXTURE " + MID + " NO CUSTOMER DATA", { size: 19, ls: 2, fill: "#9aa4ae", anchor: "end" });
  s += rect(72, 110, W - 144, 92, "#fff8c5", { rx: 12, stroke: "#d4a72c" });
  s += txt(W / 2, 170, f.banner, { size: 44, weight: 700, ls: 4, anchor: "middle", fill: "#7d4e00" });
  s += rect(72, 226, W - 144, 684, C.card, { rx: 12, stroke: "#d0d7de" });
  let y = 288;
  f.headers.forEach((h) => {
    const tone = h[2] === "ok" ? "#1a7f37" : h[2] === "err" ? "#cf222e" : C.ink;
    s += txt(112, y, h[0], { size: 28, fill: C.inkDim, mono: true });
    s += txt(352, y, h[1], { size: 28, fill: tone, mono: true, weight: h[2] ? 600 : 400 });
    y += 44;
  });
  s += rect(112, y + 6, W - 224, 2, "#d0d7de");
  y += 62;
  f.body.forEach((l) => { s += txt(112, y, l, { size: 28, fill: C.ink }); y += 40; });
  if (f.note) s += txt(112, 872, f.note, { size: 26, fill: "#1a7f37", weight: 600, mono: true });
  return s;
}

function chat(f) {
  let s = shell(f);
  s += txt(W / 2, 170, f.title.toUpperCase(), { size: 24, ls: 4, anchor: "middle", fill: C.dim });
  s += txt(W / 2, 206, "channel header, bot name and chat id cropped", { size: 20, anchor: "middle", fill: C.faint });
  const cw = 1080, cx = (W - cw) / 2;
  const heights = f.cards.map((c) => 84 + c.rows.length * 46 + (c.buttons ? 96 : 0) + (c.note ? 84 : 0));
  const totalH = heights.reduce((a, b) => a + b, 0) + (f.cards.length - 1) * 40;
  let y = Math.max(250, Math.round(240 + (670 - totalH) / 2));
  f.cards.forEach((card) => {
    const h = 84 + card.rows.length * 46 + (card.buttons ? 96 : 0) + (card.note ? 84 : 0);
    const accent = card.tone === "ok" ? C.ok : card.tone === "warn" ? C.warn : C.blue;
    s += rect(cx, y, cw, h, C.panel, { rx: 14, stroke: C.line });
    s += rect(cx, y, 8, h, accent, { rx: 4 });
    s += txt(cx + 40, y + 56, card.title, { size: 32, weight: 700, ls: 2, fill: accent });
    let ry = y + 112;
    card.rows.forEach((r) => {
      s += txt(cx + 40, ry, r[0], { size: 27, fill: C.dim, mono: true });
      s += txt(cx + 400, ry, r[1], { size: 27, fill: C.fg, mono: true });
      ry += 46;
    });
    if (card.buttons) {
      const bw = 260;
      card.buttons.forEach((b, i) => {
        s += rect(cx + 40 + i * (bw + 24), ry + 8, bw, 62, C.panel2, { rx: 10, stroke: C.line });
        s += txt(cx + 40 + i * (bw + 24) + bw / 2, ry + 49, b, { size: 28, anchor: "middle", fill: i === 0 ? C.ok : C.dim });
      });
      ry += 96;
    }
    if (card.note) s += txt(cx + 40, ry + 44, card.note, { size: 24, fill: C.faint });
    y += h + 40;
  });
  return s;
}

function split(f) {
  let s = shell(f);
  const pw = 872, gap = 32, x0 = 72;
  const maxLines = Math.max(f.left.lines.length, f.right.lines.length);
  const ph = Math.max(340, 220 + maxLines * 46);
  const blockH = ph + (f.foot ? 130 : 0);
  const top = Math.round(110 + (800 - blockH) / 2);
  [f.left, f.right].forEach((col, i) => {
    const x = x0 + i * (pw + gap);
    const accent = col.tone === "ok" ? C.ok : col.tone === "warn" ? C.warn : col.tone === "err" ? C.err : C.blue;
    s += rect(x, top, pw, ph, C.panel, { rx: 14, stroke: C.line });
    s += rect(x, top, pw, 6, accent, { rx: 3 });
    s += txt(x + 40, top + 80, col.title, { size: 36, weight: 700, ls: 2, fill: accent });
    let y = top + 162;
    col.lines.forEach((l) => { s += txt(x + 40, y, l, { size: 27, mono: true, fill: C.fg }); y += 46; });
    if (col.note) s += txt(x + 40, top + ph - 34, col.note, { size: 24, fill: C.dim });
  });
  if (f.foot) s += txt(W / 2, top + ph + 92, f.foot, { size: 46, weight: 700, anchor: "middle", fill: C.warn });
  return s;
}

function quote(f) {
  let s = shell(f);
  s += txt(72, 190, f.kicker.toUpperCase(), { size: 24, ls: 5, fill: f.tone === "err" ? C.err : C.blue });
  let y = 290;
  f.lines.forEach((l) => {
    if (l === "") { y += 26; return; }
    const mono = l.startsWith("$") || l.startsWith("  ");
    s += txt(72, y, l, { size: mono ? 30 : 38, mono, fill: mono ? C.ok : C.fg });
    y += mono ? 46 : 58;
  });
  if (f.foot) s += txt(72, 880, f.foot, { size: 26, fill: C.faint });
  return s;
}

function diagram(f) {
  const b64 = readFileSync(join(ASSETS, f.src)).toString("base64");
  let s = shell(f);
  s += rect(72, 120, W - 144, 790, "#f6f8fa", { rx: 12, stroke: C.line });
  const iw = W - 224, ih = 700;
  s += "<image x=\"112\" y=\"165\" width=\"" + iw + "\" height=\"" + ih + "\" preserveAspectRatio=\"xMidYMid meet\" xlink:href=\"data:image/png;base64," + b64 + "\"/>";
  s += txt(W / 2, 155, (f.note || "").toUpperCase(), { size: 22, ls: 3, anchor: "middle", fill: C.inkDim });
  return s;
}

const RENDER = { title: titleCard, closing, terminal, table, mailList, mailBody, draftView, chat, split, quote, diagram };

export function build(scenes, name) {
  scenes.forEach((f) => {
    const fn = RENDER[f.type];
    if (!fn) throw new Error("unknown frame type: " + f.type);
    writeFileSync(join(FRAMES, f.id + ".svg"), doc(fn(f)));
  });
  // concat list for ffmpeg
  const cat = [];
  scenes.forEach((f) => { cat.push("file 'png/" + f.id + ".png'"); cat.push("duration " + f.dur.toFixed(2)); });
  cat.push("file 'png/" + scenes[scenes.length - 1].id + ".png'");
  writeFileSync(join(HERE, "concat-" + name + ".txt"), cat.join("\n") + "\n");
  // subtitles
  const tc = (t, comma) => {
    const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = Math.floor(t % 60);
    const ms = Math.round((t - Math.floor(t)) * 1000);
    const pad = (n, w) => String(n).padStart(w, "0");
    return pad(h, 2) + ":" + pad(m, 2) + ":" + pad(s, 2) + (comma ? "," : ".") + pad(ms, 3);
  };
  const srt = [], vtt = ["WEBVTT", ""];
  let t = 0;
  scenes.forEach((f, i) => {
    const a = t, b = t + f.dur; t = b;
    const body = wrap(f.caption, 56).join("\n");
    srt.push(String(i + 1), tc(a, true) + " --> " + tc(b, true), body, "");
    vtt.push(String(i + 1), tc(a, false) + " --> " + tc(b, false), body, "");
  });
  writeFileSync(join(DEMO, "hermes-agent-demo-" + name + ".srt"), srt.join("\n"));
  writeFileSync(join(DEMO, "hermes-agent-demo-" + name + ".vtt"), vtt.join("\n"));
  // timeline (the single source of truth referenced by the scripts)
  let acc = 0;
  const tl = {
    name,
    total_seconds: scenes.reduce((s, f) => s + f.dur, 0),
    frame_count: scenes.length,
    generated_by: "assets/demo/build/render.mjs",
    note: "Hand-authored vector frames from synthetic fixtures. No screen capture, no real identifiers.",
    scenes: scenes.map((f) => {
      const row = { id: f.id, start: Number(acc.toFixed(2)), duration: f.dur, type: f.type, label: f.label || null, caption: f.caption };
      acc += f.dur;
      return row;
    })
  };
  writeFileSync(join(DEMO, name + ".timeline.json"), JSON.stringify(tl, null, 2) + "\n");
  return tl.total_seconds;
}

export { MD, MID, RA, NE, CHK, XX };
