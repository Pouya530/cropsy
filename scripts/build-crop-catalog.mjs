#!/usr/bin/env node
/**
 * Parses crop-catelog.md for ### N. Title headings and writes
 * public/crop-catalog-sections.mjs (source of truth for catalog labels).
 *
 * Run: node scripts/build-crop-catalog.mjs
 */
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const MD = join(ROOT, "crop-catelog.md");
const OUT = join(ROOT, "public", "crop-catalog-sections.mjs");

const text = readFileSync(MD, "utf8");
const sections = [];
const re = /^### (\d+)\.\s+(.+)$/gm;
let m;
while ((m = re.exec(text)) !== null) {
  sections.push({ n: Number(m[1]), title: m[2].trim() });
}

sections.sort((a, b) => a.n - b.n);
const nums = sections.map((s) => s.n);
for (let i = 0; i < sections.length; i++) {
  if (sections[i].n !== i + 1) {
    console.error("Expected consecutive catalog numbers 1..N, got:", nums.slice(0, 20), "...");
    process.exit(1);
  }
}

const body = `/**
 * Auto-generated from crop-catelog.md — do not edit by hand.
 * Regenerate: node scripts/build-crop-catalog.mjs
 */
export const CROP_CATALOG_SECTIONS = ${JSON.stringify(sections, null, 2)};

export const CROP_CATALOG_COUNT = ${sections.length};
`;

writeFileSync(OUT, body, "utf8");
console.log(`Wrote ${sections.length} sections → ${OUT}`);
