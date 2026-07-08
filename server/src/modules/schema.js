import { query } from "../config/db.js";

// Columns that exist in the database but should never be shown or edited.
const HIDDEN_COLUMNS = new Set(["deleted_at", "search_vector"]);

// Types an admin is allowed to use when adding a column, mapped to SQL.
export const ALLOWED_COLUMN_TYPES = {
  string: "TEXT",
  number: "DOUBLE PRECISION",
  integer: "INTEGER",
  boolean: "BOOLEAN",
  date: "DATE",
};

// Map a PostgreSQL data type to the simple types the app understands.
function toAppType(dataType) {
  if (["integer", "bigint", "smallint", "numeric", "double precision", "real"].includes(dataType)) return "number";
  if (dataType === "boolean") return "boolean";
  if (dataType.startsWith("timestamp") || dataType === "date") return "date";
  return "string";
}

// Turn "type_of_danger" into "Type Of Danger" for auto-generated labels.
function prettify(name) {
  return name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// Cache of live columns per table so we don't hit information_schema on every request.
const columnCache = new Map();

export function invalidateColumns(table) {
  columnCache.delete(table);
}

async function getLiveColumns(table) {
  if (columnCache.has(table)) return columnCache.get(table);
  const rows = await query(
    `SELECT column_name, data_type
       FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position`,
    [table]
  );
  columnCache.set(table, rows);
  return rows;
}

// Merge the static registry (labels, searchable/filterable flags, keys) with the
// live database columns, so any admin-added column automatically appears.
export async function getEffectiveFields(resource) {
  const liveColumns = await getLiveColumns(resource.table);
  const staticByName = Object.fromEntries(resource.fields.map((f) => [f.name, f]));
  const fields = [];

  for (const col of liveColumns) {
    if (HIDDEN_COLUMNS.has(col.column_name)) continue;
    if (col.data_type === "tsvector" || col.data_type === "USER-DEFINED") continue;

    const known = staticByName[col.column_name];
    if (known) {
      fields.push(known); // keep curated label / flags
    } else {
      // Column added at runtime via the schema editor — expose it generically.
      const type = toAppType(col.data_type);
      fields.push({
        name: col.column_name,
        label: prettify(col.column_name),
        type,
        searchable: type === "string",
        filterable: true,
        isId: false,
        custom: true,
      });
    }
  }
  return fields;
}
