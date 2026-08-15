import type { CSSProperties } from "react";

const iconClasses = {
  book: "fa-book",
  globe: "fa-globe",
  search: "fa-magnifying-glass",
  close: "fa-xmark",
  minus: "fa-minus",
  check: "fa-check",
  info: "fa-circle-info",
  speaker: "fa-volume-high",
  translate: "fa-language",
} as const;

export type IconName = keyof typeof iconClasses
  | "windowClose"
  | "windowMinimize"
  | "maximize"
  | "restore";

export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  if (name === "windowClose") {
    return <svg className="ui-icon window-state-icon" width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3.5 3.5L12.5 12.5M12.5 3.5L3.5 12.5" stroke="currentColor" strokeWidth="2.15" strokeLinecap="round" />
    </svg>;
  }
  if (name === "windowMinimize") {
    return <svg className="ui-icon window-state-icon" width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 8H13" stroke="currentColor" strokeWidth="2.15" strokeLinecap="round" />
    </svg>;
  }
  if (name === "maximize") {
    return <svg className="ui-icon window-state-icon" width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="2.75" y="2.75" width="10.5" height="10.5" rx="1.25" stroke="currentColor" strokeWidth="2.15" />
    </svg>;
  }
  if (name === "restore") {
    return <svg className="ui-icon window-state-icon" width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M5.25 5.25V4.1c0-.75.6-1.35 1.35-1.35h5.3c.75 0 1.35.6 1.35 1.35v5.3c0 .75-.6 1.35-1.35 1.35h-1.15" stroke="currentColor" strokeWidth="2.15" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="2.75" y="5.25" width="8" height="8" rx="1.25" stroke="currentColor" strokeWidth="2.15" />
    </svg>;
  }
  return <i className={`ui-icon fa-solid ${iconClasses[name]}`} style={{ "--icon-size": `${size}px` } as CSSProperties} aria-hidden="true" />;
}
