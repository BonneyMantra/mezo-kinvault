# Repo Plan

Status: **DONE — 2026-05-24 autonomous session.**

## Proposed Repo

- Name: `mezo-kinvault`
- Visibility: public
- Owner: **BLOCKED - must match selected primary submitter**
- Description: `Heartbeat-based beneficiary release infrastructure for Bitcoin-backed MUSD on Mezo.`

## Creation Method

Use `agent-browser` when the repo must belong to a persona-owned GitHub account:

```bash
agent-browser --session create-mezo-kinvault-repo --profile "<chosen chromeDir>" \
  --allowed-domains "github.com,www.github.com" \
  open "https://github.com/new"
```

Then verify the active GitHub account visually/profile-side before creating the repo.

Use `gh` only if `gh auth status` proves the CLI is authenticated as the chosen owner. No repo should be created under the wrong account for speed.

## Visibility Proof

After creation:

- public GitHub URL,
- screenshot or browser snapshot of repo page,
- `git remote -v`,
- successful push hash.

## Push And Deploy Steps

1. Create public repo under selected owner.
2. Add remote.
3. Commit local implementation.
4. Push `main`.
5. Deploy frontend to Vercel or Netlify if account ownership is available; otherwise provide local demo URL and deployment instructions.

## Current State

- Public repo: `https://github.com/BonneyMantra/mezo-kinvault`
- Owner: `BonneyMantra` (Bonney — mid-flight reassignment 2026-05-25)
- Previous repo (Gabriel): `https://github.com/gabrielantonyxaviour/mezo-kinvault` (left as-is, not used for submission)
- Branch: `main`
- Frontend deploy: `https://mezo-kinvault.vercel.app` (Vercel, rax-tech org)
- Mezo contract: `0x229869949693f1467b8b43d2907bDAE3C58E3047` on chain 31611
