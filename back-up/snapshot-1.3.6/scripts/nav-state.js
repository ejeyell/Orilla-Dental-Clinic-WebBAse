(() => {
  const storageKey = "orilla-dental-admin-nav-state-v1";
  const groups = Array.from(document.querySelectorAll(".nav-menu .nav-group"));
  if (!groups.length) return;

  const readState = () => {
    try {
      const value = JSON.parse(sessionStorage.getItem(storageKey) || "{}");
      return value && typeof value === "object" ? value : {};
    } catch (error) {
      return {};
    }
  };

  let state = readState();
  groups.forEach((group) => {
    const title = group.querySelector(":scope > summary");
    if (!title) return;
    const key = title.textContent.trim();
    if (group.querySelector('[aria-current="page"]')) {
      group.open = true;
    } else if (Object.prototype.hasOwnProperty.call(state, key)) {
      group.open = Boolean(state[key]);
    }
    group.addEventListener("toggle", () => {
      state = readState();
      state[key] = group.open;
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(state));
      } catch (error) {
        // Keep navigation usable when browser storage is unavailable.
      }
    });
  });
})();

// Keep admin navigation inside the existing page shell. This avoids a full
// document reload when staff move between dashboard sections.
(() => {
  const routerKey = "orilla-dental-admin-router-v1";
  if (window[routerKey]) return;
  window[routerKey] = true;

  let pageEvents = null;
  let requestController = null;

  function runPageScripts(parsedPage) {
    pageEvents?.abort();
    pageEvents = new AbortController();

    const originalWindowAdd = window.addEventListener;
    const originalDocumentAdd = document.addEventListener;
    const bindPageEvent = (original) => function (type, listener, options) {
      const pageOptions = typeof options === "boolean"
        ? { capture: options, signal: pageEvents.signal }
        : { ...(options || {}), signal: options?.signal || pageEvents.signal };
      return original.call(this, type, listener, pageOptions);
    };

    window.addEventListener = bindPageEvent(originalWindowAdd);
    document.addEventListener = bindPageEvent(originalDocumentAdd);
    try {
      parsedPage.querySelectorAll("script:not([src])").forEach((script) => {
        const source = script.textContent.trim();
        if (source) new Function(source).call(window);
      });
    } finally {
      window.addEventListener = originalWindowAdd;
      document.addEventListener = originalDocumentAdd;
    }
  }

  function updateNavigation(url) {
    document.querySelectorAll(".nav-menu a.nav-item[href]").forEach((link) => {
      const linkUrl = new URL(link.href, window.location.href);
      const active = linkUrl.pathname === url.pathname;
      link.classList.toggle("active", active);
      if (active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");

      const group = link.closest(".nav-group");
      if (active && group) group.open = true;
    });
  }

  async function navigate(url, { addHistory = true } = {}) {
    requestController?.abort();
    requestController = new AbortController();
    const currentMain = document.querySelector(".main-panel");
    if (!currentMain) return false;

    currentMain.setAttribute("aria-busy", "true");
    try {
      const response = await fetch(url.href, {
        signal: requestController.signal,
        headers: { "X-Requested-With": "admin-router" },
      });
      if (!response.ok) throw new Error(`Navigation failed (${response.status})`);

      const html = await response.text();
      const parsedPage = new DOMParser().parseFromString(html, "text/html");
      const nextMain = parsedPage.querySelector(".main-panel");
      if (!nextMain) throw new Error("The destination is not an admin page.");

      if (addHistory) window.history.pushState({}, "", url.href);
      document.title = parsedPage.title;
      currentMain.replaceWith(document.importNode(nextMain, true));

      document.querySelectorAll("body > dialog").forEach((dialog) => dialog.remove());
      parsedPage.querySelectorAll("body > dialog").forEach((dialog) => {
        document.body.appendChild(document.importNode(dialog, true));
      });

      updateNavigation(url);
      runPageScripts(parsedPage);
      document.querySelector(".main-panel")?.scrollTo(0, 0);
      return true;
    } catch (error) {
      if (error.name === "AbortError") return false;
      // Keep navigation working when served from file:// or if fetch is unavailable.
      window.location.assign(url.href);
      return false;
    } finally {
      document.querySelector(".main-panel")?.removeAttribute("aria-busy");
    }
  }

  document.addEventListener("click", (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest(".nav-menu a.nav-item[href]");
    if (!link || link.target || link.hasAttribute("download")) return;

    const url = new URL(link.href, window.location.href);
    if (url.origin !== window.location.origin || !url.pathname.endsWith(".html")) return;
    if (url.pathname === window.location.pathname && url.search === window.location.search) {
      event.preventDefault();
      return;
    }

    event.preventDefault();
    navigate(url);
  });

  window.addEventListener("popstate", () => {
    navigate(new URL(window.location.href), { addHistory: false });
  });
})();
