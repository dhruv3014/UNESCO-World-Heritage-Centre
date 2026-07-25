import { query } from "../../config/database.js";

// Columns that exist in the database but must never be shown or edited.
const HIDDEN_COLUMNS = new Set(["deleted_at", "search_vector"]);

// Column types an admin may add via the schema editor, mapped to SQL types.
export const ALLOWED_COLUMN_TYPES = {
  string: "TEXT",
  number: "DOUBLE PRECISION",
  integer: "INTEGER",
  boolean: "BOOLEAN",
  date: "DATE",
};

/** Map a PostgreSQL data type to one of the simple types the app understands. */
function toAppType(dataType) {
  if (["integer", "bigint", "smallint", "numeric", "double precision", "real"].includes(dataType)) return "number";
  if (dataType === "boolean") return "boolean";
  if (dataType.startsWith("timestamp") || dataType === "date") return "date";
  return "string";
}

/** "type_of_danger" → "Type Of Danger" for auto-generated labels. */
function prettify(name) {
  return name.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

// Cache of live columns per table so we don't hit information_schema on every request.
const columnCache = new Map();

export function invalidateColumnCache(table) {
  columnCache.delete(table);
}

async function getLiveColumns(table) {
  if (columnCache.has(table)) return columnCache.get(table);
  const columns = await query(
    `SELECT column_name, data_type
       FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position`,
    [table],
  );
  columnCache.set(table, columns);
  return columns;
}

/**
 * Merge the static registry (labels, searchable/filterable flags, keys) with
 * the live database columns, so any admin-added column automatically appears in
 * the API and UI. Curated columns keep their nice labels; new columns are
 * exposed generically.
 */
export async function getEffectiveFields(resource) {
  const liveColumns = await getLiveColumns(resource.table);
  const staticByName = Object.fromEntries(resource.fields.map((field) => [field.name, field]));
  const fields = [];

  for (const column of liveColumns) {
    if (HIDDEN_COLUMNS.has(column.column_name)) continue;
    if (column.data_type === "tsvector" || column.data_type === "USER-DEFINED") continue;

    const known = staticByName[column.column_name];
    if (known) {
      fields.push(known);
    } else {
      const type = toAppType(column.data_type);
      fields.push({
        name: column.column_name,
        label: prettify(column.column_name),
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
