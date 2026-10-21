import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Landing } from "./pages/Landing";
import { AudienceLanding } from "./pages/AudienceLanding";
import { Login } from "./pages/Login";
import { CopyCode } from "./pages/CopyCode";
import { AppHome } from "./pages/AppHome";
import { DeckHistory } from "./pages/DeckHistory";
import { DeckView } from "./pages/DeckView";
import { Legal } from "./pages/Legal";
import { Pricing } from "./pages/Pricing";
import { Contact } from "./pages/Contact";
import { AUDIENCE_PAGES } from "./audience-pages";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        {AUDIENCE_PAGES.map((p) => (
          <Route key={p.slug} path={`/${p.slug}`} element={<AudienceLanding slug={p.slug} />} />
        ))}
        <Route path="/login" element={<Login />} />
        <Route path="/copy-code" element={<CopyCode />} />
        <Route path="/app" element={<AppHome />} />
        <Route path="/app/history" element={<DeckHistory />} />
        <Route path="/view/:id" element={<DeckView />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/legal/:doc" element={<Legal />} />
      </Routes>
    </BrowserRouter>
  );
}
