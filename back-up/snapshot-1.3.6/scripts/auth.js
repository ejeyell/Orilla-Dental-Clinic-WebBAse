const adminSessionKey = "orilla-dental-admin-session";
const isLoginPage = window.location.pathname.endsWith("/login.html");
const globalTextSizeStorageKey = "orilla-dental-text-size";
const globalThemeStorageKey = "orilla-dental-theme";
const appointmentsStorageKey = "orilla-dental-appointments-v1";

try {
  const savedTextSize = localStorage.getItem(globalTextSizeStorageKey);
  const presetTextScales = { standard: 100, large: 115, "extra-large": 130 };
  const textScale = Number.isFinite(Number(savedTextSize))
    ? Number(savedTextSize)
    : presetTextScales[savedTextSize];
  if (textScale >= 100 && textScale <= 160) {
    const safeScale = Math.round(textScale / 5) * 5;
    document.documentElement.dataset.textSize = safeScale === 100 ? "standard" : safeScale === 115 ? "large" : safeScale === 130 ? "extra-large" : "custom";
    document.documentElement.style.setProperty("--ui-text-scale", `${safeScale}%`);
  }
} catch (error) {
  console.warn("Could not load the saved text size preference:", error);
}

try {
  const savedTheme = localStorage.getItem(globalThemeStorageKey);
  if (["light", "dark"].includes(savedTheme)) {
    document.documentElement.dataset.theme = savedTheme;
  }
} catch (error) {
  console.warn("Could not load the saved appearance preference:", error);
}

if (!isLoginPage && sessionStorage.getItem(adminSessionKey) !== "authenticated") {
  window.location.replace("login.html");
}

window.addEventListener("DOMContentLoaded", () => {
  updatePendingRequestBadges();
  document.querySelectorAll("[data-logout]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!window.confirm("Are you sure you want to log out?")) return;
      sessionStorage.removeItem(adminSessionKey);
      window.location.replace("login.html");
    });
  });
});

function updatePendingRequestBadges() {
  let pendingCount = 0;
  try {
    const appointments = JSON.parse(localStorage.getItem(appointmentsStorageKey) || "[]");
    if (Array.isArray(appointments)) {
      pendingCount = appointments.filter((item) => item && item.requested && (item.requestStatus || "pending") === "pending").length;
    }
  } catch (error) {
    console.warn("Could not count online appointment requests:", error);
  }
  document.querySelectorAll("[data-pending-request-count]").forEach((badge) => {
    badge.textContent = String(pendingCount);
    badge.hidden = pendingCount === 0;
    badge.setAttribute("aria-label", `${pendingCount} pending online appointment requests`);
  });
}

window.refreshPendingRequestBadges = updatePendingRequestBadges;
window.addEventListener("storage", (event) => {
  if (event.key === appointmentsStorageKey) updatePendingRequestBadges();
});
