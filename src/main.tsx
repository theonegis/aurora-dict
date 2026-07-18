import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import App from "./App";

const root = document.querySelector<HTMLDivElement>("#app");
if (!root) throw new Error("Unable to mount Aurora Dictionary");

createRoot(root).render(<StrictMode><App /></StrictMode>);
