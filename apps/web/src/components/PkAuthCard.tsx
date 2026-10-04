import { ReactNode } from "react";

export function PkAuthCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="card">
      <h1>{title}</h1>
      {children}
    </div>
  );
}
