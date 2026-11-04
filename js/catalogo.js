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

  const state = { pods: [], categories: [], query: "", category: "", sort: "default" };

  const hasWhatsapp = String(cfg.whatsappNumber || "").replace(/\D/g, "").length > 0;
  const pad = (n) => String(n).padStart(2, "0");
  const canTilt =
    window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- textos da loja ----------
  const storeName = cfg.storeName || "Catálogo de Pods";
  document.title = storeName;
  $("brand-name").textContent = storeName;
  $("footer-brand").textContent = storeName;
  if (cfg.tagline) $("store-tagline").textContent = cfg.tagline;

  // Título: última palavra em verde-lima com brilho
  (function renderTitle() {
    const words = storeName.trim().split(/\s+/);
    const last = words.length > 1 ? words.pop() : null;
    const title = $("store-name");
    title.replaceChildren();
    title.append(words.join(" "));
    if (last) title.append(" ", el("span", { class: "text-lime glow-text" }, last));
  })();

  const year = new Date().getFullYear();
  $("header-edition").textContent = `Online · Coleção ${year}`;
  $("hero-code").textContent = `ED. ${year}`;
  $("footer-year").textContent = `© ${year} · Catálogo digital`;
  if (store.isDemo) $("demo-banner").hidden = false;

  $("search-icon").append(icon("search"));
  $("spec-icon-1").append(icon("whatsapp"));
  $("spec-icon-2").append(icon("image"));
  $("spec-icon-3").append(icon("check"));
  $("hero-explore").append(icon("arrow"));
  $("spotlight-arrow").append(icon("arrow"));

  // Links gerais de contato
  const contactHref = hasWhatsapp
    ? whatsappLink(cfg.whatsappNumber, "Olá! Vi o catálogo e tenho uma dúvida.")
    : null;
  for (const id of ["header-whatsapp", "footer-whatsapp", "hero-whatsapp", "cta-whatsapp"]) {
    const link = $(id);
    if (contactHref) {
      link.href = contactHref;
      link.prepend(icon("whatsapp"));
    } else {
      link.hidden = true;
    }
  }
  if (!contactHref) $("cta-section").hidden = true;

  function orderHref(pod) {
    const message = `Olá! Vi o catálogo e tenho interesse no pod *${pod.name}* (${formatPrice(pod.price)}). Ainda está disponível?`;
    return whatsappLink(cfg.whatsappNumber, message);
  }

  // ---------- identificadores ----------
  const refOf = (pod) => pad(state.pods.indexOf(pod) + 1);
  const idOf = (pod) => `P-${String(state.pods.indexOf(pod) + 1).padStart(3, "0")}`;
  const catCodeOf = (pod) => {
    const i = state.categories.indexOf(pod.category);
    return i === -1 ? "CAT·00" : `CAT·${pad(i + 1)}`;
  };

  // Primeira linha da descrição = sabor / variação
  function variantOf(pod) {
    const line = pod.description.split("\n").map((l) => l.trim()).find(Boolean) || "";
    return line.length > 90 ? `${line.slice(0, 88)}…` : line;
  }

  // Restante da descrição (usado nos cards em destaque)
  function restOf(pod) {
    const lines = pod.description.split("\n").map((l) => l.trim()).filter(Boolean);
    return lines.slice(1).join(" ");
  }

  // Preço com números em destaque: R$ | 52 | ,90
  function priceDisplay(value, size = "") {
    const n = Number(value) || 0;
    const [int, cents] = n.toFixed(2).split(".");
    return el(
      "span",
      { class: `price-display ${size}`.trim() },
      el("span", { class: "sr-only" }, formatPrice(n)),
      el("span", { class: "pd-cur", "aria-hidden": "true" }, "R$"),
      el("span", { class: "pd-int", "aria-hidden": "true" }, Number(int).toLocaleString("pt-BR")),
      el("span", { class: "pd-cents", "aria-hidden": "true" }, `,${cents}`)
    );
  }

  // ---------- imagens ----------
  function placeholder(size = "icon-lg") {
    return el("span", { class: "placeholder" }, icon("image", `icon ${size}`));
  }

  function productImage(src, alt, size) {
    const img = el("img", { src, alt, loading: "lazy", decoding: "async" });
    img.addEventListener("error", () => img.replaceWith(placeholder(size)), { once: true });
    img.addEventListener("load", () => img.classList.add("is-loaded"), { once: true });
    return img;
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
  const isDefaultView = () => !state.query.trim() && !state.category && state.sort === "default";

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

  function renderStats() {
    $("stat-count").textContent = pad(state.pods.length);
    $("stat-categories").textContent = state.categories.length ? pad(state.categories.length) : "—";
    const from = $("stat-from");
    if (state.pods.length) {
      from.replaceChildren(priceDisplay(Math.min(...state.pods.map((p) => p.price)), "price-sm"));
    } else {
      from.textContent = "—";
    }
  }

  function renderChips() {
    chipsEl.replaceChildren();
    chipsEl.hidden = state.categories.length < 2;
    if (state.categories.length < 2) return;

    const count = (value) => (value ? state.pods.filter((p) => p.category === value).length : state.pods.length);

    ["", ...state.categories].forEach((value, i) => {
      chipsEl.append(
        el(
          "button",
          {
            type: "button",
            class: "chip",
            "aria-pressed": String(state.category === value),
            dataset: { value },
            onclick: () => {
              if (state.category === value) return;
              state.category = value;
              chipsEl.querySelectorAll(".chip").forEach((chip) =>
                chip.setAttribute("aria-pressed", String(chip.dataset.value === value))
              );
              renderGrid();
            },
          },
          el("span", { class: "chip-code", "aria-hidden": "true" }, value ? pad(i) : "∑"),
          el("span", { class: "chip-label" }, value || "Todos"),
          el("span", { class: "chip-count" }, pad(count(value)))
        )
      );
    });
  }

  // ---------- vitrine do hero ----------
  function renderSpotlight() {
    const pod = state.pods[0];
    const showcase = $("showcase");
    showcase.classList.toggle("is-empty", !pod);
    for (const id of ["spotlight-open", "spotlight-card", "spotlight-tag"]) $(id).hidden = !pod;
    if (!pod) return;

    $("spotlight-media").replaceChildren(
      pod.images.length ? productImage(pod.images[0], pod.name, "icon-xl") : placeholder("icon-xl")
    );
    $("spotlight-name").textContent = pod.name;
    $("spotlight-price").replaceChildren(priceDisplay(pod.price, "price-sm"));
    $("spotlight-category").textContent = pod.category || "Pod";
    $("spotlight-tag").hidden = !pod.category;
    $("spotlight-open").onclick = () => openPod(pod);
    $("spotlight-card").onclick = () => openPod(pod);
  }

  // ---------- cards ----------
  function photoDots(total) {
    if (total < 2) return null;
    const dots = el("span", { class: "hud-dots", "aria-label": `${total} fotos` });
    for (let i = 0; i < Math.min(total, 5); i++) dots.append(el("span", { class: i === 0 ? "on" : "" }));
    return dots;
  }

  function podCard(pod, position, featuredRank) {
    const featured = featuredRank > 0;
    const variant = variantOf(pod);
    const rest = featured ? restOf(pod) : "";

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
          el("span", {}, featured ? "Pedir pelo WhatsApp" : "Pedir"),
          el("span", { class: "btn-orb" }, icon("arrow"))
        )
      : el(
          "button",
          { type: "button", class: "btn btn-lime btn-card", onclick: () => openPod(pod) },
          el("span", {}, "Ver detalhes"),
          el("span", { class: "btn-orb" }, icon("arrow"))
        );

    const card = el(
      "article",
      { class: `pod-card${featured ? " is-featured" : ""}`, style: `--i:${Math.min(position, 12)}` },
      el("button", {
        type: "button",
        class: "pod-card-hit",
        "aria-label": `Ver detalhes de ${pod.name}`,
        onclick: () => openPod(pod),
      }),
      el(
        "div",
        { class: "pod-card-stage" },
        el("span", { class: "stage-glow", "aria-hidden": "true" }),
        el("span", { class: "stage-ring", "aria-hidden": "true" }),
        el("span", { class: "stage-ticks", "aria-hidden": "true" }),
        el(
          "span",
          { class: "pod-card-plate" },
          pod.images.length ? productImage(pod.images[0], pod.name) : placeholder()
        ),
        el("span", { class: "stage-floor", "aria-hidden": "true" }),
        el(
          "span",
          { class: "stage-hud" },
          el("span", { class: "micro hud-id" }, idOf(pod)),
          photoDots(pod.images.length)
        ),
        featured ? el("span", { class: "feature-badge" }, `★ Destaque ${pad(featuredRank)}`) : null
      ),
      el(
        "div",
        { class: "pod-card-body" },
        el(
          "div",
          { class: "pod-card-meta" },
          el("span", { class: "micro" }, catCodeOf(pod)),
          el("span", { class: "meta-sep", "aria-hidden": "true" }),
          el("span", { class: "pod-card-cat" }, pod.category || "Pod")
        ),
        el("h3", { class: "pod-card-name" }, pod.name),
        variant ? el("p", { class: "pod-card-variant" }, variant) : null,
        rest ? el("p", { class: "pod-card-desc" }, rest) : null,
        el(
          "div",
          { class: "pod-card-foot" },
          el(
            "div",
            { class: "pod-card-price" },
            el("span", { class: "micro" }, "Preço"),
            priceDisplay(pod.price, featured ? "price-lg" : "")
          ),
          cta
        )
      )
    );

    if (canTilt) attachTilt(card);
    return card;
  }

  // Profundidade 3D e luz que acompanha o cursor (só em mouse/trackpad)
  function attachTilt(card) {
    let frame = 0;
    card.addEventListener("pointermove", (event) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = card.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width;
        const y = (event.clientY - rect.top) / rect.height;
        const strength = card.classList.contains("is-featured") ? 3 : 5;
        card.style.setProperty("--rx", `${((0.5 - y) * strength).toFixed(2)}deg`);
        card.style.setProperty("--ry", `${((x - 0.5) * strength).toFixed(2)}deg`);
        card.style.setProperty("--mx", `${(x * 100).toFixed(1)}%`);
        card.style.setProperty("--my", `${(y * 100).toFixed(1)}%`);
      });
    });
    card.addEventListener("pointerleave", () => {
      cancelAnimationFrame(frame);
      card.style.setProperty("--rx", "0deg");
      card.style.setProperty("--ry", "0deg");
    });
  }

  function renderGrid() {
    const list = filteredPods();
    grid.replaceChildren();

    const n = list.length;
    $("result-count").textContent = pad(n);

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

    // Na visão padrão, os 2 primeiros (ordem do painel) ganham card em destaque
    const featuredCount = isDefaultView() ? Math.min(2, n) : 0;
    grid.append(...list.map((pod, i) => podCard(pod, i, i < featuredCount ? i + 1 : 0)));
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
    $("modal-ref").textContent = `${idOf(pod)} · ${catCodeOf(pod)}`;
    $("modal-name").textContent = pod.name;
    $("modal-price").replaceChildren(priceDisplay(pod.price, "price-xl"));
    $("modal-spec-ref").textContent = idOf(pod);
    $("modal-spec-cat").textContent = pod.category || "—";
    $("modal-spec-photos").textContent = pad(total);
    $("modal-description").textContent = pod.description;
    $("modal-description-block").hidden = !pod.description;

    const wa = $("modal-whatsapp");
    wa.hidden = !hasWhatsapp;
    $("modal-fine-print").hidden = !hasWhatsapp;
    if (hasWhatsapp) {
      wa.href = orderHref(pod);
      wa.replaceChildren(icon("whatsapp"), el("span", {}, "Pedir pelo WhatsApp"), el("span", { class: "btn-orb" }, icon("arrow")));
    }

    history.replaceState(null, "", `#pod-${pod.id}`);
    if (!modal.open) modal.showModal();
    modal.scrollTop = 0;
  }

  // Link direto para um pod: .../#pod-<id>
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
      state.categories = [...new Set(state.pods.map((p) => p.category).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b, "pt-BR")
      );
      renderStats();
      renderSpotlight();
      renderChips();
      renderGrid();
      openFromHash();
      window.addEventListener("hashchange", openFromHash);
    } catch (err) {
      console.error(err);
      statusEl.textContent = "Não foi possível carregar o catálogo. Tente novamente em instantes.";
      statusEl.hidden = false;
      renderSpotlight();
    }
  }

  load();
})();
