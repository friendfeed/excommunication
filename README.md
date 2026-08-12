# The Excommunication Registry

A static, client-only React + TypeScript app that checks whether accounts in
your extended Bluesky network have blocked you, no login, no backend.

## How it works

Bluesky block records (`app.bsky.graph.block`) live in the *blocker's* own
repository, and AT Protocol repos are public by design. So:

1. It resolves your handle to a DID.
2. It fetches everyone you follow (your root network, excluded as
   candidates since blocking you would normally break the follow).
3. It walks outward from there, depth by depth, pulling followers and/or
   following at each level according to the network reach you select
   (up to three levels deep).
4. For each account found, it resolves their PDS (home server) and reads
   their public block records, checking for your DID.

**Limitation:** this only sees blocks from accounts reachable through the
depth and relations you selected. There is no public "who has blocked me"
index for all of Bluesky, sites that claim to offer that are running a
24/7 firehose indexer, which isn't something a static frontend can do.

## Local development

```bash
npm install
npm run dev
```

## Deploying to GitHub Pages

1. Push this repo to GitHub.
2. In the repo, go to **Settings → Pages → Build and deployment**, and set
   **Source** to **GitHub Actions**.
3. Push to `main`. The included workflow (`.github/workflows/deploy.yml`)
   builds the app and deploys it automatically.
4. Your app will be live at `https://<your-username>.github.io/<repo-name>/`.

No environment variables, API keys, or secrets are needed. Every request
goes straight from the visitor's browser to Bluesky's public endpoints.

## Project structure

```
src/
  types.ts                     Shared TypeScript interfaces
  services/
    BlueskyApi.ts               Public AppView client (profiles, follows, followers)
    DidResolver.ts               Resolves a DID to its PDS URL
    BlockRecordReader.ts        Reads public block records from a PDS
    AsyncPool.ts                Concurrency-limited task runner
    BlockScanner.ts              Orchestrates the configurable-depth network scan
  components/
    ScanPanel.tsx                Scan progress UI
    ResultCard.tsx              Single result row
  App.tsx                       Top-level UI and state
```
