// CLI agent mode wraps rows; a normal terminal returns the row array directly.
// Preserve the whole JSON document, including its outer array and quoted braces.
export function parseQueryRows(stdout) {
  const match = /^[ \t]*[\[{]/m.exec(stdout);
  if (!match) throw new Error("Supabase CLI returned no JSON query result");
  const start = match.index + match[0].length - 1;
  const stack = [];
  let inString = false;
  let escaped = false;
  for (let index = start; index < stdout.length; index++) {
    const character = stdout[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') inString = false;
      continue;
    }
    if (character === '"') inString = true;
    else if (character === "{" || character === "[") stack.push(character);
    else if (character === "}" || character === "]") {
      if (stack.pop() !== (character === "}" ? "{" : "[")) {
        throw new Error("Supabase CLI returned malformed JSON query results");
      }
      if (stack.length === 0) {
        let parsed;
        try { parsed = JSON.parse(stdout.slice(start, index + 1)); }
        catch { throw new Error("Supabase CLI returned malformed JSON query results"); }
        const rows = Array.isArray(parsed) ? parsed : parsed?.rows;
        if (!Array.isArray(rows) || rows.some((row) => row === null || typeof row !== "object" || Array.isArray(row))) {
          throw new Error("Supabase CLI query results must be a row array or an object containing rows");
        }
        return rows;
      }
    }
  }
  throw new Error("Supabase CLI returned incomplete JSON query results");
}

export function inventoryFromRows(rows) {
  const snapshot = rows?.[0]?.inventory;
  if (!Array.isArray(rows) || rows.length !== 1 || !snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    throw new Error("Inventory query must return exactly one row containing an inventory object");
  }
  for (const field of ["relations", "columns", "counts", "cron", "retained_admins", "guards"]) {
    if (!Array.isArray(snapshot[field])) throw new Error(`Inventory query returned an invalid ${field} field`);
  }
  return snapshot;
}
