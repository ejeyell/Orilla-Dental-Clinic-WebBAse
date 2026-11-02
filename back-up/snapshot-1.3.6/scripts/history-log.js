(() => {
  const storageKey = "orilla-dental-history-v1";

  function read() {
    try {
      const saved = localStorage.getItem(storageKey);
      if (!saved) return [];
      const entries = JSON.parse(saved);
      if (!Array.isArray(entries)) throw new TypeError("Saved clinic history must be a list.");
      return entries.filter((entry) =>
        entry &&
        typeof entry.id === "string" &&
        typeof entry.eventType === "string" &&
        typeof entry.action === "string" &&
        typeof entry.patientName === "string" &&
        typeof entry.occurredAt === "string"
      );
    } catch (error) {
      console.error("Could not load clinic history:", error);
      return null;
    }
  }

  function record(entry) {
    try {
      const entries = read();
      if (entries === null) throw new Error("Existing clinic history could not be read.");
      entries.unshift({
        ...entry,
        id: crypto.randomUUID(),
        occurredAt: new Date().toISOString(),
      });
      localStorage.setItem(storageKey, JSON.stringify(entries));
      return true;
    } catch (error) {
      console.error("Could not record clinic history:", error);
      alert("The information was saved, but the activity could not be added to History.");
      return false;
    }
  }

  window.clinicHistory = { read, record };
})();
