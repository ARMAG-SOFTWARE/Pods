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
  const sortSelect = $("sort");
  const chipsEl = $("categories");
  const modal = $("pod-modal");

  const state = { pods: [], query: "", category: "", sort: "default" };

  const hasWhatsapp = String(cfg.whatsappNumber || "").replace(/\D/g, "").length > 0;
  const pad = (n) => String(n).padStart(2, "0");

  // ---------- textos da loja ----------
  const storeName = cfg.storeName || "Catálogo de Pods";
  document.title = storeName;
  $("brand-name").textContent = storeName;
  $("footer-brand").textContent = storeName;
  // Título grande com ponto final em verde-lima (assinatura visual)
  $("store-name").replaceChildren(storeName, el("span", { class: "accent-dot", "aria-hidden": "true" }, "."));
  if (cfg.tagline) $("store-tagline").textContent = cfg.tagline;

  const year = new Date().getFullYear();
  $("header-edition").textContent = `Coleção ${year}`;
  $("footer-year").textContent = `© ${year}`;
  if (store.isDemo) $("demo-banner").hidden = false;

  $("search-icon").append(icon("search"));

  // Links gerais de contato
  const contactHref = hasWhatsapp
    ? whatsappLink(cfg.whatsappNumber, "Olá! Vi o catálogo e tenho uma dúvida.")
    : null;
  const headerLink = $("header-whatsapp");
  const footerLink = $("footer-whatsapp");
  if (contactHref) {
    headerLink.href = contactHref;
    headerLink.prepend(icon("whatsapp"));
    footerLink.href = contactHref;
    footerLink.prepend(icon("whatsapp"));
  } else {
    headerLink.hidden = true;
    footerLink.hidden = true;
  }

  function orderHref(pod) {
    const message = `Olá! Vi o catálogo e tenho interesse no pod *${pod.name}* (${formatPrice(pod.price)}). Ainda está disponível?`;
    return whatsappLink(cfg.whatsappNumber, message);
  }

  // Número de referência fixo (ordem definida no painel)
  const refOf = (pod) => pad(state.pods.indexOf(pod) + 1);

  // Primeira linha da descrição = sabor / variação
  function variantOf(pod) {
    const line = pod.description.split("\n").map((l) => l.trim()).find(Boolean) || "";
    return line.length > 90 ? `${line.slice(0, 88)}…` : line;
  }

  // ---------- modal ----------
  $("modal-close").append(icon("close"));
  $("modal-close").addEventListener("click", () => modal.close());
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
    const list = state.pods.filter((pod) => {
      if (state.category && pod.category !== state.category) return false;
      if (!q) return true;
      return normalize(`${pod.name} ${pod.category} ${pod.description}`).includes(q);
    });
    if (state.sort === "price-asc") list.sort((a, b) => a.price - b.price);
    else if (state.sort === "price-desc") list.sort((a, b) => b.price - a.price);
    else if (state.sort === "name") list.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    return list;
  }

  function categoriesOf(pods) {
    return [...new Set(pods.map((p) => p.category).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b, "pt-BR")
    );
  }

  function renderStats() {
    $("stat-count").textContent = pad(state.pods.length);
    const total = categoriesOf(state.pods).length;
    $("stat-categories").textContent = total ? pad(total) : "—";
  }

  function renderChips() {
    const categories = categoriesOf(state.pods);
    chipsEl.replaceChildren();
    chipsEl.hidden = categories.length < 2;
    if (categories.length < 2) return;

    const count = (value) => (value ? state.pods.filter((p) => p.category === value).length : state.pods.length);

    for (const value of ["", ...categories]) {
      chipsEl.append(
        el(
          "button",
          {
            type: "button",
            class: "chip",
            "aria-pressed": String(state.category === value),
            onclick: () => {
              if (state.category === value) return;
              state.category = value;
              chipsEl.querySelectorAll(".chip").forEach((chip) =>
                chip.setAttribute("aria-pressed", String(chip.dataset.value === value))
              );
              renderGrid();
            },
            dataset: { value },
          },
          el("span", {}, value || "Todos"),
          el("span", { class: "chip-count" }, pad(count(value)))
        )
      );
    }
  }

  // ---------- cards ----------
  function placeholder(size = "icon-lg") {
    return el("div", { class: "placeholder" }, icon("image", `icon ${size}`));
  }

  function productImage(src, alt, size) {
    const img = el("img", { src, alt, loading: "lazy", decoding: "async" });
    img.addEventListener("error", () => img.replaceWith(placeholder(size)), { once: true });
    img.addEventListener("load", () => img.classList.add("is-loaded"), { once: true });
    return img;
  }

  function podCard(pod, position) {
    const variant = variantOf(pod);
    const cta = hasWhatsapp
      ? el(
          "a",
          {
            class: "btn btn-lime btn-card",
            href: orderHref(pod),
            target: "_blank",
            rel: "noopener",
            "aria-label": `Pedir ${pod.name} pelo WhatsApp`,
          },
          el("span", {}, "Pedir"),
          icon("arrow")
        )
      : el(
          "button",
          { type: "button", class: "btn btn-lime btn-card", onclick: () => openPod(pod) },
          el("span", {}, "Ver"),
          icon("arrow")
        );

    return el(
      "article",
      { class: "pod-card glass", style: `--i:${Math.min(position, 12)}` },
      // Botão invisível que cobre o card inteiro (abre os detalhes)
      el("button", {
        type: "button",
        class: "pod-card-hit",
        "aria-label": `Ver detalhes de ${pod.name}`,
        onclick: () => openPod(pod),
      }),
      el(
        "div",
        { class: "pod-card-media" },
        pod.images.length ? productImage(pod.images[0], pod.name) : placeholder(),
        el("span", { class: "pod-card-ref" }, refOf(pod)),
        pod.images.length > 1 ? el("span", { class: "pod-card-photos" }, `${pod.images.length} fotos`) : null
      ),
      el(
        "div",
        { class: "pod-card-body" },
        el("span", { class: "eyebrow pod-card-cat" }, pod.category || "Pod"),
        el("h3", { class: "pod-card-name" }, pod.name),
        variant ? el("p", { class: "pod-card-variant" }, variant) : null,
        el(
          "div",
          { class: "pod-card-foot" },
          el("div", { class: "pod-card-price" }, el("span", { class: "eyebrow" }, "Preço"), el("strong", {}, formatPrice(pod.price))),
          cta
        )
      )
    );
  }

  function renderGrid() {
    const list = filteredPods();
    grid.replaceChildren();

    const n = list.length;
    $("result-count").textContent = state.pods.length ? `${pad(n)} ${n === 1 ? "produto" : "produtos"}` : "";

    if (state.pods.length === 0) {
      statusEl.textContent = "Nenhum pod disponível no momento. Volte em breve!";
      statusEl.hidden = false;
      return;
    }
    if (n === 0) {
      statusEl.textContent = "Nenhum pod encontrado para essa busca.";
      statusEl.hidden = false;
      return;
    }
    statusEl.hidden = true;
    grid.append(...list.map(podCard));
  }

  // ---------- detalhes ----------
  function openPod(pod) {
    const main = $("gallery-main");
    const thumbs = $("gallery-thumbs");
    const counter = $("gallery-counter");
    const total = pod.images.length;

    function showImage(index) {
      main.replaceChildren(
        total ? productImage(pod.images[index], `${pod.name} — foto ${index + 1}`, "icon-xl") : placeholder("icon-xl")
      );
      counter.textContent = `${pad(index + 1)} / ${pad(total)}`;
      thumbs.querySelectorAll(".thumb").forEach((t, i) => t.setAttribute("aria-current", String(i === index)));
    }

    thumbs.replaceChildren();
    counter.hidden = total < 2;
    if (total > 1) {
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
    $("modal-ref").textContent = `Ref. ${refOf(pod)}`;
    $("modal-name").textContent = pod.name;
    $("modal-price").textContent = formatPrice(pod.price);
    $("modal-description").textContent = pod.description;
    $("modal-description-block").hidden = !pod.description;

    const wa = $("modal-whatsapp");
    wa.hidden = !hasWhatsapp;
    $("modal-fine-print").hidden = !hasWhatsapp;
    if (hasWhatsapp) {
      wa.href = orderHref(pod);
      wa.replaceChildren(icon("whatsapp"), el("span", {}, "Pedir pelo WhatsApp"), icon("arrow"));
    }

    history.replaceState(null, "", `#pod-${pod.id}`);
    if (!modal.open) modal.showModal();
    modal.scrollTop = 0;
  }

  // Link direto para um pod: catalogo/#pod-<id>
  function openFromHash() {
    const match = location.hash.match(/^#pod-(.+)$/);
    if (!match) return;
    const pod = state.pods.find((p) => String(p.id) === decodeURIComponent(match[1]));
    if (pod) openPod(pod);
  }

  searchInput.addEventListener("input", () => {
    state.query = searchInput.value;
    renderGrid();
  });

  sortSelect.addEventListener("change", () => {
    state.sort = sortSelect.value;
    renderGrid();
  });

  // ---------- carregamento ----------
  async function load() {
    try {
      state.pods = await store.listPods();
      renderStats();
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
