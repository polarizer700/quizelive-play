import { createRoot } from "react-dom/client";

import "@fontsource-variable/fraunces/wght.css";
import "@fontsource-variable/fraunces/wght-italic.css";
import "@fontsource-variable/outfit";

import { App } from "@app/app";
import "@app/styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("root element is missing");

createRoot(root).render(<App />);
