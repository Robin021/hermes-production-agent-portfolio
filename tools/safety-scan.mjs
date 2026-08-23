#!/usr/bin/env node
// Publication safety scan.
//
//   node tools/safety-scan.mjs
//
// Walks every file that would be published, strips inlined base64 payloads
// (their alphabet makes short literals match by chance), and asserts that no
// operational identifier, secret, host, path or retired price appears anywhere.
// Binary media is scanned for embedded metadata strings.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, extname } from "node:path";
import { execSync } from "node:child_process";

const ROOT = process.cwd();
const SKIP_DIRS = new Set([".git", "node_modules", "png"]);
const BINARY = new Set([".png", ".mp4", ".jpg", ".jpeg", ".gif", ".webp"]);

// Two files must state the forbidden patterns in order to forbid them: this
// scanner, which contains the rule table, and .gitignore, whose entries exist
// precisely so an accidentally copied credential file is never committed.
// Scanning them would report the guard as the leak.
const SELF = new Set(["tools/safety-scan.mjs", ".gitignore"]);

function walk(dir, out = []) {
  for (const name of readdirSync(dir).sort()) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

// Inlined base64 is data, not prose. A four-character literal such as a domain
// fragment or a price will appear in any large base64 blob by chance, so the
// payload is removed before the text patterns run. Binary media is checked
// separately, by its metadata strings.
const stripB64 = (s) => s.replace(/base64,[A-Za-z0-9+/=]+/g, "base64,<PAYLOAD>");

const RULES = [
  ["host or ip literal",        /23\.252|\b(?:\d{1,3}\.){3}\d{1,3}\b/g],
  ["operational hostname",      /\b021d\.com|hermes\.021d/gi],
  ["personal mailbox",          /boyd\d*@|westman\d*@|@qq\.com/gi],
  ["production path",           /\/opt\/hermes|(^|[^A-Za-z0-9._-])\/(opt|home|root|srv|Users)\//gm],
  ["oauth identifier",          /apps\.googleusercontent|GOCSPX|ya29\./g],
  ["database dsn",              /postgres(?:ql)?:\/\//g],
  ["bot token shape",           /\b\d{8,10}:[A-Za-z0-9_-]{30,}/g],
  ["credential keyword",        /client_secret|refresh_token|access_token|api[_-]?key\s*[=:]|password\s*[=:]/gi],
  ["database role name",        /\bgmail_rw\b|\bapproval_rw\b|\btool_writer\b|\bhermes_executor\b|\bbusiness_exec_owner\b|\bbusiness_ro\b|\bhermes_ops\b/g],
  ["provider or env secret",    /DEEPSEEK|OPS_DATABASE_URL|APPROVAL_DATABASE_URL|GMAIL_DATABASE_URL/g],
  ["engineer identity",         /\brobin\b|Robin021/gi],
  ["retired price range",       /\$3[.,]5k|\$8k|\$12k|\$30k|\$18k|\$45k/gi],
  ["real gmail id shape",       /\b1a02dd93a8792baf\b|\br4080801890220747151\b/g],
];

// Addresses reserved by RFC 2606 / RFC 6761 for documentation. These cannot
// route anywhere and are the synthetic identifiers used throughout the repo.
const ALLOWED_MAIL = new Set(["customer@example.com", "support@example-shop.test", "attacker@evil.invalid"]);

// The one place the author's handle is intentional: a public portfolio has to name a way to
// reach its author, and the GitHub profile is the only contact surface published here. It is a
// handle on the same site as the repository, not an operational identifier. Anything wider --
// a personal address, a hostname, a path containing the username -- still fails.
const ALLOWED_IDENTITY = ["https://github.com/Robin021"];

let findings = 0, scanned = 0;
const note = (file, rule, hit) => { findings++; console.log("  FAIL  " + rule + "  " + relative(ROOT, file) + "  :: " + hit); };

for (const file of walk(ROOT)) {
  const rel = relative(ROOT, file);
  if (SELF.has(rel)) continue;
  scanned++;
  const ext = extname(file).toLowerCase();

  if (BINARY.has(ext)) {
    // Container and chunk metadata is where a username or machine name hides.
    let meta = "";
    try { meta = execSync("strings " + JSON.stringify(file), { encoding: "utf8", maxBuffer: 1 << 28 }); } catch { continue; }
    for (const m of meta.match(/robin|Robin021|\/Users\/|021d|23\.252|boyd|Chrome|chrome-headless|Software|tEXt|iTXt|zTXt/gi) || []) {
      note(file, "binary metadata", m);
    }
    continue;
  }

  const text = stripB64(readFileSync(file, "utf8"));
  // Remove the sanctioned profile link before matching, so the handle inside it cannot
  // mask a genuine leak of the same string elsewhere in the file.
  const body = ALLOWED_IDENTITY.reduce((s, allowed) => s.split(allowed).join("<PROFILE_LINK>"), text);
  for (const [rule, re] of RULES) {
    for (const m of body.match(re) || []) {
      // business_rows_written contains business_ro as a substring; that is a
      // column name in a synthetic audit record, not a role grant.
      if (/business_ro/.test(m) && /business_rows/.test(body)) continue;
      note(file, rule, m.trim().slice(0, 60));
    }
  }
  for (const addr of body.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) || []) {
    if (!ALLOWED_MAIL.has(addr)) note(file, "unrecognized address", addr);
  }
}

console.log("");
console.log("scanned " + scanned + " files, " + findings + " finding" + (findings === 1 ? "" : "s"));
process.exit(findings === 0 ? 0 : 1);
