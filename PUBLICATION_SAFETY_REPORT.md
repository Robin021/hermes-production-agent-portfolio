# Publication Safety Report

Scope: every tracked file in this repository, plus every blob in its Git history.
Method: pattern scans executed against the working tree and against the full object
database, not a manual reading. Each check below is a command whose output was inspected.

Result: **no finding blocks publication.** One issue was found and fixed before any push
existed; it is recorded in section 4 rather than quietly corrected.

---

## 1. Working-tree scans

| # | Check | Pattern class | Result |
|---|---|---|---|
| 1 | Host addresses, credentials, production paths | deployment IP, OAuth prefixes, DSN schemes, `/opt` and `/Users` roots | clean |
| 2 | IPv4 | dotted quad | clean |
| 3 | IPv6 | hex-group and link-local forms | 2 matches, both timestamps (`11:07:12`, `10:40:51`) caught by the hex-group pattern. Not addresses. |
| 4 | Bot-token shape | numeric id, colon, long opaque tail | clean |
| 5 | Chat and user identifiers | `chat_id=`, `user_id=` with numeric tails | clean |
| 6 | Secret keywords | client secret, refresh token, access token, API key, bearer, private key, password assignment | clean |
| 7 | Absolute production paths | `/opt`, `/home`, `/root`, `/var`, `/etc`, `/srv`, `/Users` | clean |
| 8 | Provider message and draft identifiers | 16+ hex runs | clean |
| 9 | Email addresses | any RFC-shaped address | 4 distinct, all reserved-for-documentation domains: see section 2 |
| 10 | Database role names | the six literal principal names and the environment variable names | 2 matches, both the substring `business_ro` inside `business_rows_written`. No role name is published. |
| 11 | Markup corruption | HTML entities that would break a diagram | clean |
| 12 | Author personal name | given name and account handle in file content | clean |
| 13 | Hostnames | any registrable domain outside the documentation set | clean |
| 14 | Host and port pairs | loopback, wildcard bind, service ports | clean |
| 15 | Infrastructure specifics | firewall, jail, unit, container and distribution names | 9 matches, all architectural prose (for example "the attack surface is one SSH port"). No address, port, unit name or version. |

## 2. Identifiers that appear on purpose

Every identifier in this repository is synthetic. The addresses use domains reserved by
RFC 2606 and RFC 6761 precisely so that they cannot resolve to anyone:

| Identifier | Role in the examples |
|---|---|
| `customer@example.com` | the person who wrote in |
| `support@example-shop.test` | the mailbox the system operates |
| `attacker@evil.invalid` | the injection payload target that must never appear in a header |
| `SO-1001`, `SO-1002`, `SO-1004`, `CUST-4402`, `TRK-55012` | synthetic order, customer and tracking records |
| `<MESSAGE_ID_A>`, `<THREAD_ID_A>`, `<DRAFT_ID_A>`, `<APPROVAL_ID>`, `<TASK_ID>`, `<RUN_ID>`, `<EXECUTION_ID>`, `<DECISION_ID>`, `<OPERATOR_ID>` | placeholders where the real system carries opaque provider or control-plane identifiers |

No real provider message id, thread id or draft id appears anywhere. Database principals are
described by function — mail runtime, approval runtime, audit writer, executor — never by
their literal role names.

## 3. Git history

The repository was created with a fresh `git init` over sanitized files. It is **not** a
clone, fork or filtered copy of the production repository, so there is no history to inherit
and nothing recoverable from an earlier revision.

| Property | Value |
|---|---|
| Commits | 3 |
| Objects reachable from all refs | 28 |
| Deleted files anywhere in history | none |
| Refs | `refs/heads/main` only |

Every blob ever committed was read back out of the object database and scanned for the
banned literal set — deployment address, personal domains, production paths, OAuth prefixes,
DSN schemes, and the specific provider message and draft identifiers from the live
validation run. Zero matches.

## 4. Finding: author email in commit metadata

**Severity:** low, but permanent once pushed.

The first three commits carried a personal email address in their author and committer
fields. File content was clean; the leak was in the metadata, which is exactly where a scan
of the working tree does not look. Published, it would sit in the commit log of a repository
whose entire purpose is to be read by strangers, and be harvested from the API by anyone who
asks.

**Fixed** before a remote existed: all three commits were rewritten to the GitHub
no-reply address, the `refs/original` backup refs were deleted, the reflog was expired and
the object database was pruned. The full object scan then confirmed no object in the
repository contains the personal address. Attribution and the profile link are unaffected.

Because this was corrected pre-publication, no rewrite of a published history is required.

## 5. What is deliberately absent

Not copied from the production repository, by rule rather than by omission:

- runtime status and changelog history
- deployment scripts, service units, container and firewall configuration
- database migrations and grant scripts
- environment files, credential setup, OAuth client material
- host addresses, hostnames, ports, filesystem paths
- provider account data and any raw mailbox content
- internal evaluation artifacts and raw run logs

## 6. Product and technology names

The agent runtime, the mail provider and the approval channel are named in this repository
where naming them is the point — a buyer searching for that runtime should find this work,
and a diagram that hides which mail provider it integrates is less useful, not safer. Naming
a technology reveals nothing an attacker can use. What is withheld is the operational
detail: which account, which host, which credential, which identifier.

## 7. Verdict

| Category | Status |
|---|---|
| Addresses and hostnames | none present |
| Credentials, tokens, secrets | none present |
| Provider identifiers | none present |
| Personal data | none present in content; metadata corrected |
| Sensitive history inheritance | none — repository initialized fresh |

**Cleared for public release.** This report contains no sensitive value and is itself
publishable; it is kept in the repository as evidence that the check was run rather than
claimed.
