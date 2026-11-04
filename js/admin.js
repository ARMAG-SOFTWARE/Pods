// =========================================
// PAINEL ADMIN
// =========================================
(function () {
  const { formatPrice, parsePrice, priceToInput, normalize, el, icon } = window.PodUtil;
  const store = window.PodStore;

  const $ = (id) => document.getElementById(id);
  const loginView = $("login-view");
  const appView = $("app-view");
  const listEl = $("pod-list");
  const statusEl = $("admin-status");
  const searchInput = $("admin-search");
  const editor = $("editor");
  const form = $("pod-form");

  let pods = [];
  let busy = false;

  // ---------- avisos ----------
  let toastTimer;
  function toast(message, isError = false) {
    const t = $("toast");
    t.textContent = message;
    t.classList.toggle("error", isError);
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 3200);
  }

  function errorMessage(err) {
    const msg = (err && err.message) || String(err);
    if (/invalid login credentials/i.test(msg)) return "E-mail ou senha incorretos.";
    if (/email not confirmed/i.test(msg)) return "Confirme o e-mail antes de entrar.";
    if (/row-level security|permission denied|not authorized|unauthorized/i.test(msg)) {
      return "Sem permissão. Verifique se seu e-mail está na tabela admins do Supabase.";
    }
    if (/failed to fetch|network/i.test(msg)) return "Falha de conexão. Verifique sua internet.";
    return msg;
  }

  // ---------- login ----------
  function showLogin(message = "") {
    appView.hidden = true;
    loginView.hidden = false;
    $("login-error").textContent = message;
    $("login-email").focus();
  }

  async function enterApp(user) {
    if (!(await store.isAdmin())) {
      await store.signOut();
      showLogin(`O usuário ${user.email} não é admin. Adicione o e-mail na tabela "admins" do Supabase.`);
      return;
    }
    loginView.hidden = true;
    appView.hidden = false;
    $("admin-user").textContent = store.isDemo ? "Modo demonstração" : `Logado como ${user.email}`;
    $("logout").hidden = store.isDemo;
    await loadPods();
  }

  $("login-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = $("login-email").value.trim();
    const password = $("login-password").value;
    if (!email || !password) {
      $("login-error").textContent = "Informe e-mail e senha.";
      return;
    }
    const button = $("login-submit");
    button.disabled = true;
    button.textContent = "Entrando...";
    $("login-error").textContent = "";
    try {
      const user = await store.signIn(email, password);
      $("login-password").value = "";
      await enterApp(user);
    } catch (err) {
      $("login-error").textContent = errorMessage(err);
    } finally {
      button.disabled = false;
      button.textContent = "Entrar";
    }
  });

  $("logout").addEventListener("click", async () => {
    await store.signOut();
    pods = [];
    listEl.replaceChildren();
    showLogin();
  });

  $("copy-link").addEventListener("click", async () => {
    const url = new URL("./", location.href).href;
    try {
      await navigator.clipboard.writeText(url);
      toast("Link copiado! Agora é só colar na conversa com o cliente.");
    } catch {
      window.prompt("Copie o link do catálogo:", url);
    }
  });

  // ---------- lista ----------
  async function loadPods() {
    statusEl.textContent = "Carregando...";
    statusEl.hidden = false;
    try {
      pods = await store.listPods({ includeHidden: true });
      renderList();
    } catch (err) {
      console.error(err);
      statusEl.textContent = `Erro ao carregar: ${errorMessage(err)}`;
    }
  }

  function renderList() {
    const q = normalize(searchInput.value.trim());
    const visible = q
      ? pods.filter((p) => normalize(`${p.name} ${p.category} ${p.description}`).includes(q))
      : pods;
    const canReorder = !q;

    listEl.replaceChildren();
    if (pods.length === 0) {
      statusEl.textContent = 'Nenhum pod cadastrado ainda. Clique em "+ Novo pod" para começar.';
      statusEl.hidden = false;
      return;
    }
    if (visible.length === 0) {
      statusEl.textContent = "Nenhum pod encontrado.";
      statusEl.hidden = false;
      return;
    }
    statusEl.hidden = true;

    visible.forEach((pod) => {
      const index = pods.indexOf(pod);
      const toggle = el("input", { type: "checkbox", "aria-label": `Disponível: ${pod.name}` });
      toggle.checked = pod.available;
      toggle.addEventListener("change", () => toggleAvailable(pod, toggle));

      listEl.append(
        el(
          "li",
          { class: `pod-row${pod.available ? "" : " is-hidden"}` },
          pod.images.length
            ? el("img", { class: "pod-row-thumb", src: pod.images[0], alt: "", loading: "lazy" })
            : el("div", { class: "pod-row-thumb placeholder" }, icon("image")),
          el(
            "div",
            { class: "pod-row-info" },
            el("strong", {}, pod.name),
            el(
              "span",
              { class: "muted" },
              [formatPrice(pod.price), pod.category, pod.available ? "" : "Oculto"].filter(Boolean).join(" · ")
            )
          ),
          el(
            "label",
            { class: "switch-field compact", title: "Disponível no catálogo" },
            toggle,
            el("span", { class: "switch", "aria-hidden": "true" })
          ),
          el(
            "div",
            { class: "pod-row-actions" },
            canReorder
              ? [
                  el(
                    "button",
                    { type: "button", class: "icon-btn", "aria-label": "Mover para cima", disabled: index === 0, onclick: () => move(index, -1) },
                    icon("up")
                  ),
                  el(
                    "button",
                    { type: "button", class: "icon-btn", "aria-label": "Mover para baixo", disabled: index === pods.length - 1, onclick: () => move(index, 1) },
                    icon("down")
                  ),
                ]
              : null,
            el("button", { type: "button", class: "icon-btn", "aria-label": `Editar ${pod.name}`, onclick: () => openEditor(pod) }, icon("edit")),
            el("button", { type: "button", class: "icon-btn danger", "aria-label": `Excluir ${pod.name}`, onclick: () => removePod(pod) }, icon("trash"))
          )
        )
      );
    });
  }

  searchInput.addEventListener("input", renderList);

  async function toggleAvailable(pod, checkbox) {
    checkbox.disabled = true;
    try {
      const saved = await store.savePod({ ...pod, available: checkbox.checked });
      Object.assign(pod, saved);
      toast(pod.available ? "Pod visível no catálogo." : "Pod ocultado do catálogo.");
    } catch (err) {
      checkbox.checked = pod.available;
      toast(errorMessage(err), true);
    }
    renderList();
  }

  async function move(index, delta) {
    const target = index + delta;
    if (busy || target < 0 || target >= pods.length) return;
    busy = true;
    const previous = pods.slice();
    [pods[index], pods[target]] = [pods[target], pods[index]];
    renderList();
    try {
      await store.saveOrder(pods);
    } catch (err) {
      pods = previous;
      renderList();
      toast(errorMessage(err), true);
    } finally {
      busy = false;
    }
  }

  async function removePod(pod) {
    if (!window.confirm(`Excluir "${pod.name}"? Essa ação não pode ser desfeita.`)) return;
    try {
      await store.deletePod(pod);
      pods = pods.filter((p) => p !== pod);
      renderList();
      toast("Pod excluído.");
    } catch (err) {
      toast(errorMessage(err), true);
    }
  }

  // ---------- editor ----------
  const editing = {
    pod: null, // pod original (null = novo)
    images: [], // fotos atuais no formulário
    uploaded: [], // fotos enviadas nesta edição
    pendingUploads: 0,
    saved: false,
    session: 0, // muda a cada abertura do formulário
  };

  $("editor-close").append(icon("close"));
  $("editor-close").addEventListener("click", () => editor.close());
  $("editor-cancel").addEventListener("click", () => editor.close());
  $("new-pod").addEventListener("click", () => openEditor(null));

  function openEditor(pod) {
    editing.session++;
    editing.pod = pod;
    editing.images = pod ? pod.images.slice() : [];
    editing.uploaded = [];
    editing.pendingUploads = 0;
    editing.saved = false;

    $("editor-title").textContent = pod ? "Editar pod" : "Novo pod";
    $("pod-name").value = pod ? pod.name : "";
    $("pod-price").value = pod ? priceToInput(pod.price) : "";
    $("pod-category").value = pod ? pod.category : "";
    $("pod-description").value = pod ? pod.description : "";
    $("pod-available").checked = pod ? pod.available : true;
    $("editor-error").textContent = "";
    form.querySelectorAll(".field.invalid").forEach((f) => f.classList.remove("invalid"));

    const categories = [...new Set(pods.map((p) => p.category).filter(Boolean))];
    $("category-options").replaceChildren(...categories.map((c) => el("option", { value: c })));

    renderImages();
    updateSaveButton();
    editor.showModal();
    $("pod-name").focus();
  }

  editor.addEventListener("close", () => {
    // Fotos enviadas mas não salvas são apagadas para não ocupar espaço
    if (!editing.saved && editing.uploaded.length) store.removeImages(editing.uploaded);
    editing.uploaded = [];
  });

  function renderImages() {
    const container = $("image-list");
    container.replaceChildren();

    editing.images.forEach((src, i) => {
      container.append(
        el(
          "div",
          { class: `image-item${i === 0 ? " is-cover" : ""}` },
          el("img", { src, alt: `Foto ${i + 1}` }),
          i === 0 ? el("span", { class: "cover-badge" }, "Capa") : null,
          el(
            "div",
            { class: "image-actions" },
            i > 0
              ? el(
                  "button",
                  {
                    type: "button",
                    class: "icon-btn small",
                    "aria-label": "Usar como capa",
                    title: "Usar como capa",
                    onclick: () => {
                      editing.images.unshift(editing.images.splice(i, 1)[0]);
                      renderImages();
                    },
                  },
                  icon("star")
                )
              : null,
            el(
              "button",
              {
                type: "button",
                class: "icon-btn small danger",
                "aria-label": "Remover foto",
                title: "Remover foto",
                onclick: () => {
                  editing.images.splice(i, 1);
                  renderImages();
                },
              },
              icon("trash")
            )
          )
        )
      );
    });

    for (let i = 0; i < editing.pendingUploads; i++) {
      container.append(el("div", { class: "image-item loading" }, el("span", { class: "spinner" })));
    }
  }

  function updateSaveButton() {
    const button = $("editor-save");
    button.disabled = editing.pendingUploads > 0 || busy;
    button.textContent = editing.pendingUploads > 0 ? "Enviando fotos..." : busy ? "Salvando..." : "Salvar";
  }

  $("pod-images").addEventListener("change", async (event) => {
    const files = [...event.target.files].filter((f) => f.type.startsWith("image/"));
    event.target.value = "";
    if (files.length === 0) return;

    editing.pendingUploads += files.length;
    renderImages();
    updateSaveButton();

    // Envia em paralelo, mas mantém a ordem em que as fotos foram escolhidas
    const session = editing.session;
    const results = await Promise.allSettled(files.map((file) => store.uploadImage(file)));
    const urls = results.filter((r) => r.status === "fulfilled").map((r) => r.value);

    // Formulário fechado durante o envio: descarta as fotos
    if (session !== editing.session || !editor.open) {
      store.removeImages(urls);
      return;
    }

    editing.pendingUploads -= files.length;
    editing.images.push(...urls);
    editing.uploaded.push(...urls);
    const failed = results.find((r) => r.status === "rejected");
    if (failed) {
      console.error(failed.reason);
      $("editor-error").textContent = `Erro ao enviar foto: ${errorMessage(failed.reason)}`;
    }
    renderImages();
    updateSaveButton();
  });

  function setFieldError(inputId, hasError) {
    $(inputId).closest(".field").classList.toggle("invalid", hasError);
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (busy || editing.pendingUploads > 0) return;

    const name = $("pod-name").value.trim();
    const price = parsePrice($("pod-price").value);
    const nameOk = name.length > 0;
    const priceOk = !Number.isNaN(price) && price >= 0;
    setFieldError("pod-name", !nameOk);
    setFieldError("pod-price", !priceOk);
    if (!nameOk || !priceOk) {
      $("editor-error").textContent = !nameOk ? "Informe o nome do pod." : "Informe um preço válido. Ex: 29,90";
      return;
    }

    const original = editing.pod;
    const data = {
      id: original ? original.id : undefined,
      name,
      price,
      category: $("pod-category").value,
      description: $("pod-description").value,
      available: $("pod-available").checked,
      images: editing.images.slice(),
      sort_order: original
        ? original.sort_order
        : pods.reduce((max, p) => Math.max(max, p.sort_order), -1) + 1,
    };

    busy = true;
    updateSaveButton();
    $("editor-error").textContent = "";
    try {
      const saved = await store.savePod(data);
      editing.saved = true;

      // Apaga do Storage as fotos que foram removidas do pod
      const before = (original ? original.images : []).concat(editing.uploaded);
      store.removeImages(before.filter((src) => !saved.images.includes(src)));
      if (original) {
        Object.assign(original, saved);
      } else {
        pods.push(saved);
      }
      editor.close();
      renderList();
      toast(original ? "Pod atualizado!" : "Pod cadastrado!");
    } catch (err) {
      console.error(err);
      $("editor-error").textContent = errorMessage(err);
    } finally {
      busy = false;
      updateSaveButton();
    }
  });

  ["pod-name", "pod-price"].forEach((id) =>
    $(id).addEventListener("input", () => setFieldError(id, false))
  );

  // ---------- início ----------
  async function init() {
    if (store.isDemo) {
      $("demo-banner").hidden = false;
      await enterApp({ email: "" });
      return;
    }
    try {
      const user = await store.getUser();
      if (user) await enterApp(user);
      else showLogin();
    } catch (err) {
      console.error(err);
      showLogin(errorMessage(err));
    }
  }

  init();
})();
