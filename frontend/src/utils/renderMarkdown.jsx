/**
 * Safely render markdown without exposing XSS.
 * Supports: **bold**, *italic*, `inline code`, code blocks (```),
 * bullet lists (- / •), numbered lists (1.), quotes (> ), and links [text](url).
 * Everything else is HTML-escaped.
 */
export function renderMarkdown(text) {
  const escaped = (s) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  // Extract code blocks first so inline rules don't touch them
  const codeBlocks = [];
  let processed = text.replace(/```([\s\S]*?)```/g, (_, code) => {
    codeBlocks.push(escaped(code.trim()));
    return `\u0000CODE${codeBlocks.length - 1}\u0000`;
  });

  const inline = (s) =>
    s
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>")
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  const lines = escaped(processed).split("\n");
  const blocks = [];
  let list = null; // { ordered, items }

  const flushList = () => {
    if (!list) return;
    const tag = list.ordered ? "ol" : "ul";
    const items = list.items.map((it) => `<li>${it}</li>`).join("");
    blocks.push(`<${tag} style="margin:4px 0 4px 4px;padding-left:18px">${items}</${tag}>`);
    list = null;
  };

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (/^>\s?/.test(line)) {
      flushList();
      blocks.push(`<blockquote style="border-left:3px solid #6366f1;margin:4px 0;padding:2px 10px;opacity:0.85">${inline(line.replace(/^>\s?/, ""))}</blockquote>`);
      continue;
    }

    const heading = line.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      flushList();
      const level = heading[1].length;
      const size = ["1.5rem", "1.2rem", "1.05rem", "0.95rem"][level - 1];
      const weight = level <= 2 ? 700 : 600;
      blocks.push(`<h${level} style="margin:10px 0 4px;font-size:${size};font-weight:${weight};line-height:1.4;color:inherit">${inline(heading[2])}</h${level}>`);
      continue;
    }

    const bullet = line.match(/^([-•*])\s+(.*)$/);
    if (bullet) {
      if (!list || list.ordered) { flushList(); list = { ordered: false, items: [] }; }
      list.items.push(inline(bullet[2]));
      continue;
    }

    const num = line.match(/^(\d+)[.)]\s+(.*)$/);
    if (num) {
      if (!list || !list.ordered) { flushList(); list = { ordered: true, items: [] }; }
      list.items.push(inline(num[2]));
      continue;
    }

    flushList();

    const codeMatch = line.match(/^\u0000CODE(\d+)\u0000$/);
    if (codeMatch) {
      blocks.push(`<pre style="background:rgba(0,0,0,0.06);border-radius:6px;padding:8px 10px;margin:4px 0;overflow-x:auto;font-size:0.75rem;white-space:pre-wrap"><code>${codeBlocks[+codeMatch[1]]}</code></pre>`);
      continue;
    }

    if (line.trim() === "") continue;
    blocks.push(`<span style="display:block">${inline(line)}</span>`);
  }
  flushList();

  return <span dangerouslySetInnerHTML={{ __html: blocks.join("") }} />;
}