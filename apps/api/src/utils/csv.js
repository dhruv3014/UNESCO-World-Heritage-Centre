/**
 * Convert an array of row objects into CSV text (RFC 4180).
 * Values containing commas, quotes or newlines are wrapped in double quotes.
 */
export function toCsv(columns, rows) {
  const escape = (value) => {
    if (value === null || value === undefined) return "";
    const text = String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const header = columns.join(",");
  const body = rows.map((row) => columns.map((column) => escape(row[column])).join(",")).join("\n");
  return `${header}\n${body}`;
}
