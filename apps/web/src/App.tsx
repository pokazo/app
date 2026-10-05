import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Landing } from "./pages/Landing";
import { Login } from "./pages/Login";
import { CopyCode } from "./pages/CopyCode";
import { AppHome } from "./pages/AppHome";
import { DeckHistory } from "./pages/DeckHistory";
import { DeckView } from "./pages/DeckView";
import { Legal } from "./pages/Legal";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/copy-code" element={<CopyCode />} />
        <Route path="/app" element={<AppHome />} />
        <Route path="/app/history" element={<DeckHistory />} />
        <Route path="/view/:id" element={<DeckView />} />
        <Route path="/legal/:doc" element={<Legal />} />
      </Routes>
    </BrowserRouter>
  );
}
