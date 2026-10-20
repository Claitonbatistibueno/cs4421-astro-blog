// Minimal reader for the MySQL dump in farm-app/farmproject.sql.
// It understands the `INSERT INTO `table` (`col`, ...) VALUES (...), (...);`
// statements that phpMyAdmin/mysqldump write, and returns plain objects.
// Why: the static site has no database server, so the data is read from the
// dump at build time and baked into the HTML.

export type SqlValue = string | number | null;
export type Row = Record<string, SqlValue>;
export type Tables = Record<string, Row[]>;

const INSERT_RE = /INSERT INTO `(\w+)` \(([^)]*)\) VALUES\s*/g;

function parseValue(raw: string, quoted: boolean): SqlValue {
  if (quoted) return raw;
  const t = raw.trim();
  if (t.toUpperCase() === 'NULL') return null;
  const n = Number(t);
  return Number.isNaN(n) ? t : n;
}

/** Parses the tuples that follow VALUES, starting at `start`. Returns rows and the index after `;`. */
function parseTuples(sql: string, start: number): { tuples: SqlValue[][]; end: number } {
  const tuples: SqlValue[][] = [];
  let i = start;
  let current: SqlValue[] | null = null;
  let token = '';
  let quoted = false;

  while (i < sql.length) {
    const ch = sql[i];
    if (current === null) {
      if (ch === '(') {
        current = [];
        token = '';
        quoted = false;
      } else if (ch === ';') {
        return { tuples, end: i + 1 };
      }
      i++;
      continue;
    }
    if (ch === "'") {
      // string literal: supports \' and '' escapes
      quoted = true;
      token = ''; // drop the whitespace between the comma and the opening quote
      i++;
      while (i < sql.length) {
        const c = sql[i];
        if (c === '\\') {
          const next = sql[i + 1];
          token += next === 'n' ? '\n' : next === 'r' ? '\r' : next === 't' ? '\t' : next;
          i += 2;
        } else if (c === "'" && sql[i + 1] === "'") {
          token += "'";
          i += 2;
        } else if (c === "'") {
          i++;
          break;
        } else {
          token += c;
          i++;
        }
      }
      continue;
    }
    if (ch === ',' || ch === ')') {
      current.push(parseValue(token, quoted));
      token = '';
      quoted = false;
      if (ch === ')') {
        tuples.push(current);
        current = null;
      }
      i++;
      continue;
    }
    token += ch;
    i++;
  }
  return { tuples, end: i };
}

/** Reads every INSERT statement of a SQL dump into `{ table: rows[] }`. */
export function parseSqlDump(sql: string): Tables {
  const tables: Tables = {};
  INSERT_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = INSERT_RE.exec(sql)) !== null) {
    const [, table, colList] = match;
    const columns = colList.split(',').map((c) => c.trim().replace(/`/g, ''));
    const { tuples, end } = parseTuples(sql, INSERT_RE.lastIndex);
    const rows = (tables[table] ??= []);
    for (const tuple of tuples) {
      const row: Row = {};
      columns.forEach((col, idx) => (row[col] = tuple[idx] ?? null));
      rows.push(row);
    }
    INSERT_RE.lastIndex = end;
  }
  return tables;
}
