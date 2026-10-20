// Loads farm-app/farmproject.sql once per build.
// Only used in page frontmatter, which runs on Node at build time.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseSqlDump, type Tables } from './sqlDump';

let cache: Tables | null = null;

export function loadFarmDb(): Tables {
  if (!cache) {
    const sql = readFileSync(join(process.cwd(), 'farm-app', 'farmproject.sql'), 'utf-8');
    cache = parseSqlDump(sql);
  }
  return cache;
}
