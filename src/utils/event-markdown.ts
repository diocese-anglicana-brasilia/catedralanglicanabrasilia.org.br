import MarkdownIt from "markdown-it";

const markdown = new MarkdownIt({ html: false });

export function renderEventDescription(description: string): string {
  return markdown.render(description);
}
