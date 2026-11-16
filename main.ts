// Hand-in program for the makefun-frontend-01 entry (Node 22, standard library only).
//
// The entry itself is app/: plain static files (index.html, ES modules, one stylesheet,
// no build step) that a browser runs against make.fun's public API. This program copies
// app/ and screenshots/ from beside itself into the output directory and writes
// dossier.json there with buildDossier from vendor/makefun-frontend.ts — the kit's
// library, kept byte-identical, because the scorer rebuilds the dossier with its own
// copy and compares the two byte for byte.
//
// Run it locally with:  mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// (MAKEFUN_OUTPUT_DIR stands in for the grader's /output.)
// Serve the app itself with:  node serve.ts   →   http://localhost:8080

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The gate's caps, passed to the library so an over-limit entry fails here first:
// at most 3 screenshots of 256 KiB, at most 993 files and 16 MiB under app/, and the
// dossier's text cut at 163,840 bytes.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, { text_max_bytes: 163840, screenshots: { max: 3, max_bytes: 262144 }, app_max_files: 993, app_max_bytes: 16777216 }),
);
