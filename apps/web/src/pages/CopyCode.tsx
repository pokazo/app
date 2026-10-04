import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { PkHeader } from "../components/PkHeader";
import { PkButton } from "../components/PkButton";

function parseOtp(raw: string | null): string {
  return (raw ?? "").replace(/\D/g, "").slice(0, 8);
}

export function CopyCode() {
  const [params] = useSearchParams();
  const otp = useMemo(() => parseOtp(params.get("c")), [params]);
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!otp) return;
    try {
      await navigator.clipboard.writeText(otp);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  useEffect(() => {
    if (!otp || !navigator.clipboard) return;
    void navigator.clipboard.writeText(otp).then(
      () => setCopied(true),
      () => setCopied(false),
    );
  }, [otp]);

  return (
    <>
      <PkHeader />
      <main className="card" style={{ textAlign: "center" }}>
        <h1>Код входа</h1>
        {otp ? (
          <>
            <p className="otp-display">{otp}</p>
            <PkButton type="button" onClick={() => void copy()}>
              {copied ? "Скопировано" : "Скопировать код"}
            </PkButton>
            <p style={{ marginTop: 16, color: "var(--pk-ink-muted)", fontSize: 14 }}>
              Вернись на вкладку входа и вставь код.
            </p>
            <p>
              <Link to="/login">Открыть вход</Link>
            </p>
          </>
        ) : (
          <p>В письме нет кода. Запроси новый на странице входа.</p>
        )}
      </main>
    </>
  );
}
