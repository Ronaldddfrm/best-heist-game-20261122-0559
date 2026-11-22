// main.ts — the entrypoint for "The Midnight Vault", a top-down museum heist
// game built for the make.fun best-heist-game bounty (best-heist-game-20261122-0559).
//
// What this program hands in: the playable game in game/ (plain static files,
// canvas 2D, no assets, no network), the four screenshots in screenshots/,
// and a dossier.json the judge reads — all copied to /output (or to the
// MAKEFUN_OUTPUT_DIR stand-in when run outside the grader). It uses only the
// Node 22 standard library plus the vendored make.fun library, and it writes
// the same bytes on every run, so the grader's two runs agree.
//
// Run it locally:  mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Play it locally: node serve.ts, then open http://localhost:8080

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the
// bytes; the others refuse an entry the scorer would refuse (more than 4
// screenshots or one over 256 KiB; more than 993 files in game/ or 48 MiB of
// game files, in all, or a path under game/ over 1000 bytes).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
