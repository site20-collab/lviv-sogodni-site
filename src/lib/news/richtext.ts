const AMP = "\u0026";

const ESC: Record<string, string> = {
  "&": `${AMP}amp;`,
  "<": `${AMP}lt;`,
  ">": `${AMP}gt;`,
  '"': `${AMP}quot;`,
  "'": `${AMP}#39;`,
};

export function escapeHtml(input: string): string {
  return input.replace(/[&<>"']/g, (ch) => ESC[ch] ?? ch);
}

export function escapeXml(input: string): string {
  return escapeHtml(input);
}

/** Inline marks after HTML escape. Links only to http(s). */
export function renderInline(input: string): string {
  const esc = escapeHtml(input);
  return esc
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      '<a href="$2" rel="noopener noreferrer nofollow" target="_blank">$1</a>',
    )
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>")
    .replace(/~~([^~]+)~~/g, "<s>$1</s>")
    .replace(/__([^_]+)__/g, "<u>$1</u>");
}

const YT = /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{6,})/;
const VIMEO = /vimeo\.com\/(\d+)/;

export function videoEmbed(url: string): string | null {
  const yt = url.match(YT);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}`;
  const vm = url.match(VIMEO);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  return null;
}
