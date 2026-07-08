// Turn an array of row objects into CSV text. Values with commas, quotes or
// newlines are wrapped in double quotes (with quotes doubled), per RFC 4180.
export function toCsv(columns, rows) {
  const escape = (value) => {
    if (value === null || value === undefined) return "";
    const str = String(value);
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };
  const header = columns.join(",");
  const body = rows.map((row) => columns.map((col) => escape(row[col])).join(",")).join("\n");
  return `${header}\n${body}`;
}
