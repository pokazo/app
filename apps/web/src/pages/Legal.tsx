import { PkHeader } from "../components/PkHeader";

export function Legal() {
  return (
    <>
      <PkHeader />
      <main className="wrap" style={{ padding: "48px 20px 80px", textAlign: "center" }}>
        <h1>Документы</h1>
        <p>Оферта и политика обработки персональных данных будут опубликованы до запуска оплаты.</p>
      </main>
    </>
  );
}
