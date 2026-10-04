import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Landing } from "./pages/Landing";
import { Login } from "./pages/Login";
import { AppHome } from "./pages/AppHome";
import { Legal } from "./pages/Legal";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/app" element={<AppHome />} />
        <Route path="/legal/:doc" element={<Legal />} />
      </Routes>
    </BrowserRouter>
  );
}
