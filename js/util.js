// =========================================
// FUNÇÕES UTILITÁRIAS (compartilhadas entre catálogo e admin)
// =========================================
(function () {
  const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

  function formatPrice(value) {
    return brl.format(Number(value) || 0);
  }

  // Aceita "29,90", "29.90", "R$ 1.299,90", "1299.9"...
  function parsePrice(input) {
    let s = String(input ?? "").trim().replace(/[R$\s]/g, "");
    if (s === "") return NaN;
    if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
    if (!/^\d+(\.\d{1,2})?$/.test(s)) return NaN;
    return Math.round(parseFloat(s) * 100) / 100;
  }

  // Formata número para o campo de preço do formulário: 29.9 -> "29,90"
  function priceToInput(value) {
    return (Number(value) || 0).toFixed(2).replace(".", ",");
  }

  // Remove acentos e deixa minúsculo, para buscas
  function normalize(text) {
    return String(text ?? "")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase();
  }

  // Cria elementos com segurança (texto sempre entra como texto, nunca como HTML)
  function el(tag, props, ...children) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(props || {})) {
      if (value == null || value === false) continue;
      if (key === "class") node.className = value;
      else if (key === "dataset") Object.assign(node.dataset, value);
      else if (key.startsWith("on") && typeof value === "function") {
        node.addEventListener(key.slice(2).toLowerCase(), value);
      } else if (value === true) node.setAttribute(key, "");
      else node.setAttribute(key, value);
    }
    for (const child of children.flat()) {
      if (child == null || child === false) continue;
      node.append(child instanceof Node ? child : String(child));
    }
    return node;
  }

  // Ícones SVG (conteúdo fixo, seguro)
  const ICONS = {
    up: '<path d="M12 5l-7 7h4v7h6v-7h4z"/>',
    down: '<path d="M12 19l7-7h-4V5H9v7H5z"/>',
    edit: '<path d="M4 17.25V20h2.75L17.8 8.94l-2.75-2.75L4 17.25zM20.7 6.04a1 1 0 0 0 0-1.41l-1.33-1.33a1 1 0 0 0-1.41 0l-1.05 1.05 2.75 2.75 1.04-1.06z"/>',
    trash: '<path d="M6 7h12l-1 13H7L6 7zm3-3h6l1 2h4v2H4V6h4l1-2z"/>',
    star: '<path d="M12 3l2.7 5.6 6.2.9-4.5 4.4 1 6.1L12 17.1 6.6 20l1-6.1L3.1 9.5l6.2-.9z"/>',
    close: '<path d="M6.4 5 5 6.4 10.6 12 5 17.6 6.4 19l5.6-5.6 5.6 5.6 1.4-1.4-5.6-5.6L19 6.4 17.6 5 12 10.6z"/>',
    image: '<path d="M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zm1 2v8.6l3.5-3.5 3 3 4-4.6L19 13V7H5zm4 3.5A1.5 1.5 0 1 0 9 7.5a1.5 1.5 0 0 0 0 3z"/>',
    whatsapp:
      '<path d="M16.004 3C9.377 3 4 8.373 4 15c0 2.386.712 4.607 1.932 6.463L4 29l7.73-1.902A11.93 11.93 0 0 0 16.004 27C22.63 27 28 21.627 28 15S22.63 3 16.004 3Zm0 21.75c-1.99 0-3.86-.55-5.46-1.5l-.39-.23-4.59 1.13 1.15-4.47-.25-.4A9.7 9.7 0 0 1 5.25 15c0-5.93 4.82-10.75 10.754-10.75S26.75 9.07 26.75 15 21.938 24.75 16.004 24.75Zm5.94-8.07c-.32-.16-1.9-.94-2.2-1.05-.3-.11-.51-.16-.73.16-.21.32-.84 1.05-1.03 1.26-.19.21-.38.24-.7.08-.32-.16-1.36-.5-2.6-1.6-.96-.86-1.61-1.92-1.8-2.24-.19-.32-.02-.5.14-.66.14-.14.32-.38.48-.56.16-.19.21-.32.32-.53.11-.21.05-.4-.03-.56-.08-.16-.73-1.75-1-2.4-.26-.62-.53-.54-.73-.55h-.62c-.21 0-.56.08-.85.4-.29.32-1.12 1.1-1.12 2.67 0 1.57 1.15 3.09 1.31 3.3.16.21 2.26 3.45 5.48 4.84.77.33 1.36.53 1.83.68.77.24 1.47.21 2.02.13.62-.09 1.9-.78 2.17-1.53.27-.75.27-1.4.19-1.53-.08-.13-.29-.21-.61-.37Z"/>',
  };

  function icon(name, className = "icon") {
    const viewBox = name === "whatsapp" ? "0 0 32 32" : "0 0 24 24";
    const span = document.createElement("span");
    span.innerHTML = `<svg class="${className}" viewBox="${viewBox}" aria-hidden="true" fill="currentColor">${ICONS[name] || ""}</svg>`;
    return span.firstChild;
  }

  // Reduz a foto antes de enviar (celulares geram fotos de vários MB)
  async function resizeImage(file, maxSize = 1400, quality = 0.82) {
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error(`Não foi possível ler a imagem "${file.name}".`));
        image.src = url;
      });
      const scale = Math.min(1, maxSize / Math.max(img.naturalWidth, img.naturalHeight));
      const width = Math.round(img.naturalWidth * scale);
      const height = Math.round(img.naturalHeight * scale);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      return await new Promise((resolve, reject) =>
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error("Falha ao processar a imagem."))),
          "image/jpeg",
          quality
        )
      );
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  function blobToDataURL(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }

  function whatsappLink(number, message) {
    const digits = String(number || "").replace(/\D/g, "");
    return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
  }

  window.PodUtil = {
    formatPrice,
    parsePrice,
    priceToInput,
    normalize,
    el,
    icon,
    resizeImage,
    blobToDataURL,
    whatsappLink,
  };
})();
