// =========================================
// CAMADA DE DADOS
// =========================================
// Usa o Supabase quando configurado em config.js.
// Sem configuração, roda em "modo demonstração" salvando no localStorage
// (útil para testar o painel, mas os dados ficam só neste navegador).
(function () {
  const cfg = window.CATALOG_CONFIG || {};
  const bucket = cfg.storageBucket || "pod-images";
  const isDemo = !cfg.supabaseUrl || !cfg.supabaseAnonKey;
  const DEMO_KEY = "podCatalog.demo.pods";

  let client = null;
  if (!isDemo) {
    if (!window.supabase || !window.supabase.createClient) {
      console.error("Biblioteca do Supabase não carregou.");
    } else {
      client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
    }
  }

  function requireClient() {
    if (!client) throw new Error("Não foi possível conectar ao banco de dados. Verifique sua internet.");
    return client;
  }

  function normalizePod(row) {
    return {
      id: row.id,
      name: row.name || "",
      description: row.description || "",
      category: row.category || "",
      price: Number(row.price) || 0,
      images: Array.isArray(row.images) ? row.images.filter(Boolean) : [],
      available: row.available !== false,
      sort_order: Number(row.sort_order) || 0,
      created_at: row.created_at || "",
    };
  }

  function sortPods(list) {
    return list.sort(
      (a, b) => a.sort_order - b.sort_order || String(a.created_at).localeCompare(String(b.created_at))
    );
  }

  function toPayload(pod) {
    return {
      name: pod.name.trim(),
      description: (pod.description || "").trim(),
      category: (pod.category || "").trim(),
      price: Number(pod.price) || 0,
      images: pod.images || [],
      available: pod.available !== false,
      sort_order: Number(pod.sort_order) || 0,
    };
  }

  // ---------- modo demonstração ----------
  const demo = {
    read() {
      try {
        return JSON.parse(localStorage.getItem(DEMO_KEY)) || [];
      } catch {
        return [];
      }
    },
    write(list) {
      try {
        localStorage.setItem(DEMO_KEY, JSON.stringify(list));
      } catch (err) {
        throw new Error(
          "O espaço do modo demonstração acabou (fotos ocupam muito). Configure o Supabase para uso real."
        );
      }
    },
  };

  function newId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  // ---------- pods ----------
  async function listPods({ includeHidden = false } = {}) {
    if (isDemo) {
      let list = demo.read().map(normalizePod);
      if (!includeHidden) list = list.filter((p) => p.available);
      return sortPods(list);
    }
    let query = requireClient()
      .from("pods")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (!includeHidden) query = query.eq("available", true);
    const { data, error } = await query;
    if (error) throw error;
    return data.map(normalizePod);
  }

  async function savePod(pod) {
    const payload = toPayload(pod);

    if (isDemo) {
      const list = demo.read();
      let saved;
      if (pod.id) {
        const index = list.findIndex((p) => p.id === pod.id);
        if (index === -1) throw new Error("Pod não encontrado.");
        saved = { ...list[index], ...payload };
        list[index] = saved;
      } else {
        saved = { id: newId(), created_at: new Date().toISOString(), ...payload };
        list.push(saved);
      }
      demo.write(list);
      return normalizePod(saved);
    }

    const db = requireClient().from("pods");
    const { data, error } = pod.id
      ? await db.update(payload).eq("id", pod.id).select().single()
      : await db.insert(payload).select().single();
    if (error) throw error;
    return normalizePod(data);
  }

  async function deletePod(pod) {
    if (isDemo) {
      demo.write(demo.read().filter((p) => p.id !== pod.id));
      return;
    }
    const { error } = await requireClient().from("pods").delete().eq("id", pod.id);
    if (error) throw error;
    await removeImages(pod.images);
  }

  // Salva a nova ordem (lista já na ordem desejada)
  async function saveOrder(pods) {
    const changed = pods
      .map((pod, index) => ({ pod, index }))
      .filter(({ pod, index }) => pod.sort_order !== index);

    if (isDemo) {
      const list = demo.read();
      for (const { pod, index } of changed) {
        const item = list.find((p) => p.id === pod.id);
        if (item) item.sort_order = index;
      }
      demo.write(list);
    } else {
      const results = await Promise.all(
        changed.map(({ pod, index }) =>
          requireClient().from("pods").update({ sort_order: index }).eq("id", pod.id)
        )
      );
      const failed = results.find((r) => r.error);
      if (failed) throw failed.error;
    }
    for (const { pod, index } of changed) pod.sort_order = index;
  }

  // ---------- fotos ----------
  async function uploadImage(file) {
    const blob = await window.PodUtil.resizeImage(file, isDemo ? 800 : 1400, isDemo ? 0.75 : 0.82);
    if (isDemo) return window.PodUtil.blobToDataURL(blob);

    const storage = requireClient().storage.from(bucket);
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.jpg`;
    const { error } = await storage.upload(path, blob, {
      contentType: "image/jpeg",
      cacheControl: "31536000",
    });
    if (error) throw error;
    return storage.getPublicUrl(path).data.publicUrl;
  }

  // Apaga fotos do Storage (falhas são ignoradas: no máximo sobra um arquivo órfão)
  async function removeImages(urls) {
    if (isDemo || !client || !urls || urls.length === 0) return;
    const marker = `/storage/v1/object/public/${bucket}/`;
    const paths = urls
      .map((url) => {
        const i = String(url).indexOf(marker);
        return i === -1 ? null : decodeURIComponent(url.slice(i + marker.length).split("?")[0]);
      })
      .filter(Boolean);
    if (paths.length === 0) return;
    try {
      await client.storage.from(bucket).remove(paths);
    } catch (err) {
      console.warn("Não foi possível apagar fotos antigas:", err);
    }
  }

  // ---------- login do admin ----------
  async function getUser() {
    if (isDemo) return { email: "modo demonstração" };
    const { data } = await requireClient().auth.getSession();
    return data.session ? data.session.user : null;
  }

  async function signIn(email, password) {
    const { data, error } = await requireClient().auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data.user;
  }

  async function signOut() {
    if (!isDemo && client) await client.auth.signOut();
  }

  async function isAdmin() {
    if (isDemo) return true;
    const { data, error } = await requireClient().rpc("is_admin");
    if (error) throw error;
    return data === true;
  }

  window.PodStore = {
    isDemo,
    listPods,
    savePod,
    deletePod,
    saveOrder,
    uploadImage,
    removeImages,
    getUser,
    signIn,
    signOut,
    isAdmin,
  };
})();
