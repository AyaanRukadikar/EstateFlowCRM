import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Apply persisted theme before React renders to avoid flash
const theme = localStorage.getItem("estateflow-theme") || "system";
if (theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
  document.documentElement.classList.add("dark");
}

createRoot(document.getElementById("root")!).render(<App />);
