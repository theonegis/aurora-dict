import type { CSSProperties } from "react";

const iconClasses = {
  book: "fa-book",
  globe: "fa-globe",
  search: "fa-magnifying-glass",
  close: "fa-xmark",
  minus: "fa-minus",
  square: "fa-square",
  macZoom: "fa-up-right-and-down-left-from-center",
  check: "fa-check",
  info: "fa-circle-info",
  speaker: "fa-volume-high",
  translate: "fa-language",
} as const;

export type IconName = keyof typeof iconClasses;

export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return <i className={`ui-icon fa-solid ${iconClasses[name]}`} style={{ "--icon-size": `${size}px` } as CSSProperties} aria-hidden="true" />;
}
