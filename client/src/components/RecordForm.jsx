import { useState } from "react";
import { Button, Input, Select } from "@/components/ui/index.jsx";

// Create/edit form generated automatically from a resource's field metadata.
export default function RecordForm({ resource, initial, isEdit, onSubmit, onCancel, error, busy }) {
  const [values, setValues] = useState(() => {
    const initialValues = {};
    for (const field of resource.fields) {
      const raw = initial ? initial[field.name] : undefined;
      if (raw === null || raw === undefined) initialValues[field.name] = "";
      else if (field.type === "date") initialValues[field.name] = String(raw).slice(0, 10);
      else initialValues[field.name] = String(raw);
    }
    return initialValues;
  });

  const set = (name, value) => setValues((prev) => ({ ...prev, [name]: value }));

  const submit = (e) => {
    e.preventDefault();
    const body = {};
    for (const field of resource.fields) {
      if (isEdit && field.isId) continue; // primary key is not editable
      const raw = values[field.name];
      if (raw === "") {
        if (!isEdit && field.isId) continue; // skip empty PK on create -> validation error
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
    <form onSubmit={submit} className="space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        {resource.fields.map((field) => {
          const disabled = isEdit && field.isId;
          return (
            <label key={field.name} className="text-sm space-y-1 block">
              <span className="flex items-center gap-1 font-medium">
                {field.label}
                {field.isId && <span className="text-amber-500 text-xs">(key)</span>}
              </span>
              {field.type === "boolean" ? (
                <Select value={values[field.name]} onChange={(e) => set(field.name, e.target.value)} disabled={disabled}>
                  <option value="">—</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </Select>
              ) : (
                <Input
                  type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
                  value={values[field.name]}
                  onChange={(e) => set(field.name, e.target.value)}
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
