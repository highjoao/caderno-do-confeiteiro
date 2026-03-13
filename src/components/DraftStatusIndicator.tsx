import type { DraftStatus } from "@/hooks/use-auto-save-draft";
import { Save, Check, AlertCircle } from "lucide-react";

const config: Record<DraftStatus, { label: string; icon: typeof Save; className: string } | null> = {
  idle: null,
  saving: { label: "Salvando...", icon: Save, className: "text-yellow-600 dark:text-yellow-400" },
  saved: { label: "Rascunho salvo", icon: Check, className: "text-green-600 dark:text-green-400" },
  unsaved: { label: "Alterações não salvas", icon: AlertCircle, className: "text-destructive" },
};

export function DraftStatusIndicator({ status }: { status: DraftStatus }) {
  const c = config[status];
  if (!c) return null;
  const Icon = c.icon;
  return (
    <div className={`flex items-center gap-1.5 text-xs ${c.className} animate-in fade-in duration-300`}>
      <Icon className="h-3 w-3" />
      <span>{c.label}</span>
    </div>
  );
}
