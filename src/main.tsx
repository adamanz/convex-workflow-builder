import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import "./index.css";
import App from "./App";

// Initialize Convex client
const convexUrl = import.meta.env.VITE_CONVEX_URL;

if (!convexUrl) {
  console.warn(
    "VITE_CONVEX_URL is not set. Please run `npx convex dev` to set up your Convex project."
  );
}

const convex = new ConvexReactClient(convexUrl || "");

// Root element
const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found. Please add a <div id='root'></div> to your index.html.");
}

// Render application
createRoot(rootElement).render(
  <StrictMode>
    <ConvexProvider client={convex}>
      <App />
    </ConvexProvider>
  </StrictMode>
);
