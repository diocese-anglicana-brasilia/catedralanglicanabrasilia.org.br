import MarkdownIt from "markdown-it";

const markdown = new MarkdownIt({ html: false });

export function renderMarkdown(description: string): string {
  return markdown.render(description);
}

export const renderEventDescription = renderMarkdown;
