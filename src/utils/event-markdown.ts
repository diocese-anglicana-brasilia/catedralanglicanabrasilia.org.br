import MarkdownIt from "markdown-it";
import sanitizeHtml from "sanitize-html";

const markdown = new MarkdownIt({ html: false });

export function renderMarkdown(description: string): string {
  return markdown.render(description);
}

const eventMarkdown = new MarkdownIt({ html: true });

export function renderEventDescription(description: string): string {
  return sanitizeHtml(eventMarkdown.render(description), {
    allowedTags: [...sanitizeHtml.defaults.allowedTags, "figure", "figcaption", "img"],
    allowedAttributes: {
      a: ["href", "title"],
      img: ["src", "alt", "title", "loading", "data-caption"],
      figure: ["data-content-gallery"],
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowProtocolRelative: false,
  });
}
