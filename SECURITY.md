# Security Policy

## Scope

Mexai is a local CLI tool and MCP server. It handles:

- Local filesystem access under `~/.mexai/`
- Optional GitHub API calls for sync (user-provided token)
- MCP tool calls from AI agents running in your editor

It does **not** handle:
- User authentication
- Remote servers or cloud storage
- Payment or personal data beyond your own project context

---

## Supported Versions

| Version | Supported |
|---|---|
| latest (`main`) | ✅ |
| older releases | security fixes backported to the previous minor if critical |

---

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Report privately via GitHub's [private vulnerability reporting](https://github.com/mexai/mexai/security/advisories/new) or email directly (address in the GitHub profile).

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Your suggested fix (optional but appreciated)

You'll receive acknowledgement within 48 hours and a status update within 7 days.

---

## Security Model

### What Mexai Can Access

- **Read/write:** `~/.mexai/` — project context, codebase maps, rules, pending diffs
- **Read:** The project directory you point `mexai map` at (filenames and structure only — never file contents)
- **Read/write:** Editor MCP config files (`~/.cursor/mcp.json`, etc.) when you run `mexai connect`
- **Network:** GitHub API, only when you explicitly run `mexai sync --init` or `mexai sync`

### What Mexai Never Does

- Read source file contents (scanner reads filenames and structure only)
- Store or transmit your code anywhere
- Make network requests without explicit user invocation
- Execute code from context files
- Store credentials in `~/.mexai/` (GitHub token read from environment only)

### MCP Trust Boundary

The MCP server runs as a subprocess of your editor. It accepts tool calls from AI agents running in that editor. Trust assumptions:

- Tool input is validated with Zod before any operation
- Path traversal attacks: all file operations are scoped to `~/.mexai/` — no relative paths accepted in slugs or layer names
- The server does not execute any content from context files

### GitHub Token Handling

`mexai sync` requires a GitHub token. Rules:

- Read from `GITHUB_TOKEN` or `MEXAI_GITHUB_TOKEN` environment variable only
- Never written to disk by Mexai
- Never logged
- Scope required: `repo` (for private sidecar repos) or `public_repo` (for public only)

---

## Known Limitations

- Mexai inherits the security posture of your editor's MCP implementation. If your editor's MCP has a vulnerability, Mexai is affected.
- Symlink attacks: `fs.realpathSync` is used for path resolution, which resolves symlinks. An attacker who can create symlinks in your codebase directories could potentially influence project detection. This requires local filesystem access, which implies prior compromise.

---

## Dependency Security

Dependencies are pinned in `pnpm-lock.yaml`. `pnpm audit` runs in CI on every PR. High or critical severity findings block merges.

To audit locally:

```bash
pnpm audit
```