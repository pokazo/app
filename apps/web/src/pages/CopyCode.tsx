import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

function parseOtp(raw: string | null): string {
  return (raw ?? "").replace(/\D/g, "").slice(0, 8);
}

export function CopyCode() {
  const [params] = useSearchParams();
  const otp = parseOtp(params.get("c"));

  useEffect(() => {
    const q = otp ? `?c=${encodeURIComponent(otp)}` : "";
    window.location.replace(`/copy.html${q}`);
  }, [otp]);

  return null;
}
