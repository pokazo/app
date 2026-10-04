import { InputHTMLAttributes } from "react";

export function PkInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className="pk" {...props} />;
}
