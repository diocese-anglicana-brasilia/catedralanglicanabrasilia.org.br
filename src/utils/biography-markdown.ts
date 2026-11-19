import { renderMarkdown } from "./event-markdown";

// Aceita apenas o formato produzido pelo editor de galerias; os demais HTMLs
// continuam escapados pelo renderizador Markdown.
const galleryPattern = /<figure data-content-gallery="true"><div>((?:<img src="[^"<>]*" alt="[^"<>]*" loading="lazy"(?: data-caption="[^"<>]*")?>)*)<\/div>(?:<figcaption>[^<>]*<\/figcaption>)?<\/figure>/g;
const imagePattern = /<img src="([^"<>]*)" alt="[^"<>]*" loading="lazy"(?: data-caption="[^"<>]*")?>/g;

export function renderBiographyMarkdown(source: string): string {
  let result = "";
  let offset = 0;
  for (const match of source.matchAll(galleryPattern)) {
    const images = [...match[1].matchAll(imagePattern)];
    if (!images.every((image) => /^(?:https?:\/\/|\/(?!\/)|\.\.?\/)/i.test(image[1]) && !/[\s&]/.test(image[1]))) continue;
    result += renderMarkdown(source.slice(offset, match.index));
    result += match[0];
    offset = match.index + match[0].length;
  }
  return result + renderMarkdown(source.slice(offset));
}
