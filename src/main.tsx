import React from "react";
import { createRoot } from "react-dom/client";
import AppShell from "./app/AppShell";
import "./styles.css";
import "./styles/angel-visual-identity.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppShell />
  </React.StrictMode>,
);
