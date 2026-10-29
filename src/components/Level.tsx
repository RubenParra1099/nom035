import { LEVEL_LABEL, type Level } from "@/lib/nom035/guides";

export const LEVEL_BG: Record<Level, string> = {
  NULO: "bg-nulo text-white",
  BAJO: "bg-bajo text-white",
  MEDIO: "bg-medio text-gray-900",
  ALTO: "bg-alto text-white",
  MUY_ALTO: "bg-muyalto text-white",
};
export const LEVEL_HEX: Record<Level, string> = {
  NULO: "#2bb3c0", BAJO: "#34a853", MEDIO: "#f6c026", ALTO: "#f28c28", MUY_ALTO: "#e53935",
};

export function LevelBadge({ level, className = "" }: { level: Level; className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${LEVEL_BG[level]} ${className}`}>
      {LEVEL_LABEL[level]}
    </span>
  );
}
