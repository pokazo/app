import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { initPkMetrika } from "./metrika";
import "./styles/global.css";

initPkMetrika();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
