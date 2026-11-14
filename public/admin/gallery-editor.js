(() => {
  const escape = (value = "") => String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
  const safeImage = (src = "") => {
    const value = String(src).trim();
    if (/^https?:\/\//i.test(value) || (/^(?!\/\/)[/.\w-]/.test(value) && !/^[^/]*:/.test(value))) return value;
    return "";
  };
  const toBlock = ({ title = "", images = [] } = {}) => {
    const items = images.filter(({ src }) => safeImage(src)).map(({ src, alt = "" }) => `<img src="${escape(safeImage(src))}" alt="${escape(alt)}" loading="lazy">`).join("");
    return `<figure data-content-gallery="true"><div>${items}</div>${title ? `<figcaption>${escape(title)}</figcaption>` : ""}</figure>`;
  };
  CMS.registerEditorComponent({
    id: "content-gallery",
    label: "Galeria de imagens",
    icon: "photo_library",
    fields: [
      { name: "title", label: "Legenda da galeria", widget: "string", required: false },
      { name: "images", label: "Imagens", label_singular: "Imagem", widget: "list", fields: [
        { name: "src", label: "Imagem", widget: "image" },
        { name: "alt", label: "Descrição da imagem", widget: "string", hint: "Descreva a imagem para pessoas que usam leitores de tela." },
      ] },
    ],
    pattern: /^<figure data-content-gallery="true">[\s\S]*?<\/figure>$/m,
    fromBlock: (match) => {
      const document = new DOMParser().parseFromString(match[0], "text/html");
      return {
        title: document.querySelector("figcaption")?.textContent ?? "",
        images: Array.from(document.querySelectorAll("img"), (image) => ({ src: image.getAttribute("src") ?? "", alt: image.getAttribute("alt") ?? "" })),
      };
    },
    toBlock,
    toPreview: toBlock,
  });
})();
