import { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "ghost" | "yandex";

export function PkButton({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button className={`pk ${variant} ${className}`.trim()} {...props} />;
}
