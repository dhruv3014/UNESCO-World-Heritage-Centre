import { X } from "lucide-react";
import { cn } from "@/lib/utils.js";

/** A simple centered modal dialog with a backdrop. */
export default function Modal({ open, onClose, title, children, className }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className={cn("relative z-10 max-h-[85vh] w-full max-w-lg overflow-auto rounded-lg border border-border bg-card shadow-xl", className)}>
        <div className="sticky top-0 flex items-center justify-between border-b border-border bg-card px-5 py-3">
          <h3 className="font-semibold">{title}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
