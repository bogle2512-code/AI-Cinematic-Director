console.log("AI Cinematic Workflow Director loaded");

window.addEventListener("load", () => {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./service-worker.js")
      .then(() => console.log("Service worker registered"))
      .catch(err => console.warn("Service worker registration failed:", err));
  }
});
