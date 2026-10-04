import { ReactNode } from "react";

export function PkSlideFrame({ children }: { children: ReactNode }) {
  return <div className="slide-frame">{children}</div>;
}
