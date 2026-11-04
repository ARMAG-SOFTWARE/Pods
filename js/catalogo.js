// =========================================
// CATÁLOGO PÚBLICO (página que o cliente vê)
// =========================================
(function () {
  const cfg = window.CATALOG_CONFIG || {};
  const { formatPrice, normalize, el, icon, whatsappLink } = window.PodUtil;
  const store = window.PodStore;

  const $ = (id) => document.getElementById(id);
  const grid = $("grid");
  const statusEl = $("status");
  const searchInput = $("search");
  const chipsEl = $("categories");
  const modal = $("pod-modal");

  const state = { pods: [], query: "", category: "" };

  // ---------- textos da loja ----------
  if (cfg.storeName) {
    $("store-name").textContent = cfg.storeName;
    document.title = cfg.storeName;
  }
  if (cfg.tagline) $("store-tagline").textContent = cfg.tagline;
  if (store.isDemo) $("demo-banner").hidden = false;

  const footerLink = $("footer-whatsapp");
  if (cfg.whatsappNumber) {
    footerLink.href = whatsappLink(cfg.whatsappNumber, "Olá! Vi o catálogo e tenho uma dúvida.");
    footerLink.prepend(icon("whatsapp", "icon"));
  } else {
    footerLink.hidden = true;
  }

  $("modal-close").append(icon("close"));
  $("modal-close").addEventListener("click", () => modal.close());
  // Fecha ao clicar fora do conteúdo
  modal.addEventListener("click", (event) => {
    if (event.target === modal) modal.close();
  });
  modal.addEventListener("close", () => {
    if (location.hash.startsWith("#pod-")) {
      history.replaceState(null, "", location.pathname + location.search);
    }
  });

  // ---------- filtros ----------
  function filteredPods() {
    const q = normalize(state.query.trim());
    return state.pods.filter((pod) => {
      if (state.category && pod.category !== state.category) return false;
      if (!q) return true;
      return normalize(`${pod.name} ${pod.category} ${pod.description}`).includes(q);
    });
  }

  function renderChips() {
    const categories = [...new Set(state.pods.map((p) => p.category).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b, "pt-BR")
    );
    chipsEl.replaceChildren();
    if (categories.length < 2) return;

    for (const value of ["", ...categories]) {
      chipsEl.append(
        el(
          "button",
          {
            type: "button",
            class: "chip",
            "aria-pressed": String(state.category === value),
            onclick: () => {
              state.category = value;
              renderChips();
              renderGrid();
            },
          },
          value || "Todos"
        )
      );
    }
  }

  // ---------- cards ----------
  function podImage(pod, className) {
    if (pod.images.length === 0) {
      return el("div", { class: `${className} placeholder` }, icon("image", "icon icon-lg"));
    }
    return el("img", { class: className, src: pod.images[0], alt: pod.name, loading: "lazy" });
  }

  function renderGrid() {
    const list = filteredPods();
    grid.replaceChildren();

    if (state.pods.length === 0) {
      statusEl.textContent = "Nenhum pod disponível no momento. Volte em breve!";
      statusEl.hidden = false;
      return;
    }
    if (list.length === 0) {
      statusEl.textContent = "Nenhum pod encontrado para essa busca.";
      statusEl.hidden = false;
      return;
    }
    statusEl.hidden = true;

    for (const pod of list) {
      grid.append(
        el(
          "button",
          { type: "button", class: "pod-card", onclick: () => openPod(pod) },
          el("div", { class: "pod-card-media" }, podImage(pod, "pod-card-img")),
          el(
            "div",
            { class: "pod-card-body" },
            pod.category ? el("span", { class: "tag" }, pod.category) : null,
            el("h3", { class: "pod-card-name" }, pod.name),
            el("p", { class: "price" }, formatPrice(pod.price))
          )
        )
      );
    }
  }

  // ---------- detalhes ----------
  function openPod(pod) {
    const main = $("gallery-main");
    const thumbs = $("gallery-thumbs");

    function showImage(index) {
      main.replaceChildren(
        pod.images.length
          ? el("img", { src: pod.images[index], alt: `${pod.name} — foto ${index + 1}` })
          : el("div", { class: "placeholder" }, icon("image", "icon icon-xl"))
      );
      thumbs.querySelectorAll(".thumb").forEach((t, i) => t.setAttribute("aria-current", String(i === index)));
    }

    thumbs.replaceChildren();
    if (pod.images.length > 1) {
      pod.images.forEach((src, i) => {
        thumbs.append(
          el(
            "button",
            { type: "button", class: "thumb", "aria-label": `Ver foto ${i + 1}`, onclick: () => showImage(i) },
            el("img", { src, alt: "", loading: "lazy" })
          )
        );
      });
    }
    showImage(0);

    const categoryEl = $("modal-category");
    categoryEl.textContent = pod.category;
    categoryEl.hidden = !pod.category;
    $("modal-name").textContent = pod.name;
    $("modal-price").textContent = formatPrice(pod.price);
    $("modal-description").textContent = pod.description;
    $("modal-description").hidden = !pod.description;

    const wa = $("modal-whatsapp");
    if (cfg.whatsappNumber) {
      const message = `Olá! Vi o catálogo e tenho interesse no pod *${pod.name}* (${formatPrice(pod.price)}). Ainda está disponível?`;
      wa.href = whatsappLink(cfg.whatsappNumber, message);
      wa.replaceChildren(icon("whatsapp", "icon"), "Pedir pelo WhatsApp");
      wa.hidden = false;
    } else {
      wa.hidden = true;
    }

    history.replaceState(null, "", `#pod-${pod.id}`);
    if (!modal.open) modal.showModal();
    modal.scrollTop = 0;
  }

  searchInput.addEventListener("input", () => {
    state.query = searchInput.value;
    renderGrid();
  });

  // Link direto para um pod: catalogo/#pod-<id>
  function openFromHash() {
    const match = location.hash.match(/^#pod-(.+)$/);
    if (!match) return;
    const pod = state.pods.find((p) => String(p.id) === decodeURIComponent(match[1]));
    if (pod) openPod(pod);
  }

  // ---------- carregamento ----------
  async function load() {
    try {
      state.pods = await store.listPods();
      renderChips();
      renderGrid();

      openFromHash();
      window.addEventListener("hashchange", openFromHash);
    } catch (err) {
      console.error(err);
      statusEl.textContent = "Não foi possível carregar o catálogo. Tente novamente em instantes.";
      statusEl.hidden = false;
    }
  }

  load();
})();
