#!/usr/bin/env node
/**
 * Post-build import rewriter.
 *
 * Rewrites workspace package imports (@context-mode/shared/*)
 * to relative paths in compiled output directories.
 * This ensures the published npm package works without workspace symlinks.
 *
 * Targets:
 *   - build/          (core package output — imports become ../packages/shared/dist/*)
 *   - packages/session/dist/ (session package output — imports become ../../shared/dist/*)
 */

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// ── Core build output (build/*.js, build/*.d.ts) ──
const CORE_BUILD = join(import.meta.dirname, "..", "build");

const CORE_REWRITES = [
  [/@context-mode\/shared\/db-base/g, "../packages/shared/dist/db-base.js"],
  [/@context-mode\/shared\/truncate/g, "../packages/shared/dist/truncate.js"],
  [/@context-mode\/shared\/types/g, "../packages/shared/dist/types.js"],
];

// ── Session dist output (packages/session/dist/*.js) ──
const SESSION_DIST = join(import.meta.dirname, "..", "packages", "session", "dist");

const SESSION_REWRITES = [
  [/@context-mode\/shared\/db-base/g, "../../shared/dist/db-base.js"],
  [/@context-mode\/shared\/truncate/g, "../../shared/dist/truncate.js"],
  [/@context-mode\/shared\/types/g, "../../shared/dist/types.js"],
];

function rewriteDir(dir, rewrites, label) {
  let rewritten = 0;

  let files;
  try {
    files = readdirSync(dir);
  } catch {
    console.log(`  ${label}: directory not found, skipping`);
    return 0;
  }

  for (const file of files) {
    if (!file.endsWith(".js") && !file.endsWith(".d.ts")) continue;

    const filePath = join(dir, file);
    let content = readFileSync(filePath, "utf-8");
    let changed = false;

    for (const [pattern, replacement] of rewrites) {
      if (pattern.test(content)) {
        // Reset lastIndex since we're reusing the regex
        pattern.lastIndex = 0;
        content = content.replace(pattern, replacement);
        changed = true;
      }
    }

    if (changed) {
      writeFileSync(filePath, content);
      rewritten++;
      console.log(`  Rewritten: ${label}/${file}`);
    }
  }

  return rewritten;
}

const coreCount = rewriteDir(CORE_BUILD, CORE_REWRITES, "build");
const sessionCount = rewriteDir(SESSION_DIST, SESSION_REWRITES, "session");

console.log(`fix-imports: ${coreCount + sessionCount} files rewritten (core: ${coreCount}, session: ${sessionCount})`);
