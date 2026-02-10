import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { seedIfEmpty } from "./seed";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

seedIfEmpty().then(() => {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});
