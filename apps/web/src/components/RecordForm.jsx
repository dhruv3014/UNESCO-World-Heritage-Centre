import { useState } from "react";
import { Button, Input, Select } from "@/components/ui/index.jsx";

/** Create/edit form generated automatically from a resource's field metadata. */
export default function RecordForm({ resource, initialValues, isEdit, onSubmit, onCancel, error, busy }) {
  const [values, setValues] = useState(() => {
    const initial = {};
    for (const field of resource.fields) {
      const raw = initialValues?.[field.name];
      if (raw === null || raw === undefined) initial[field.name] = "";
      else if (field.type === "date") initial[field.name] = String(raw).slice(0, 10);
      else initial[field.name] = String(raw);
    }
    return initial;
  });

  const setValue = (name, value) => setValues((previous) => ({ ...previous, [name]: value }));

  const handleSubmit = (event) => {
    event.preventDefault();
    const body = {};
    for (const field of resource.fields) {
      if (isEdit && field.isId) continue; // the primary key is not editable
      const raw = values[field.name];
      if (raw === "") {
        if (!isEdit && field.isId) continue; // let the server report the missing key
        body[field.name] = null;
      } else if (field.type === "boolean") {
        body[field.name] = raw === "true";
      } else {
        body[field.name] = raw;
      }
    }
    onSubmit(body);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {resource.fields.map((field) => {
          const disabled = isEdit && field.isId;
          return (
            <label key={field.name} className="block space-y-1 text-sm">
              <span className="flex items-center gap-1 font-medium">
                {field.label}
                {field.isId && <span className="text-xs text-amber-500">(key)</span>}
              </span>
              {field.type === "boolean" ? (
                <Select value={values[field.name]} onChange={(event) => setValue(field.name, event.target.value)} disabled={disabled}>
                  <option value="">—</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </Select>
              ) : (
                <Input
                  type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
                  value={values[field.name]}
                  onChange={(event) => setValue(field.name, event.target.value)}
                  disabled={disabled}
                  step={field.type === "number" ? "any" : undefined}
                />
              )}
            </label>
          );
        })}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : isEdit ? "Save changes" : "Create record"}
        </Button>
      </div>
    </form>
  );
}
