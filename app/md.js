// A small, safe Markdown renderer for bounty descriptions and rules: the API's text is
// escaped first, then only a fixed set of constructs (headings, lists, tables, code,
// emphasis, links to web pages) becomes HTML. No raw HTML from the API ever reaches the page.

import { esc } from './format.js';

/** Inline constructs inside one already-escaped line of text. */
function inline(text) {
  const codeSpans = [];
  let out = text.replace(/`([^`]+)`/g, (_, code) => {
    codeSpans.push(code);
    return `\u0000${codeSpans.length - 1}\u0000`;
  });
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, url) => {
    const href = url.startsWith('/') ? `https://make.fun${url}` : url;
    return /^https?:\/\//.test(href) ? `<a href="${href}" rel="noopener">${label}</a>` : label;
  });
  out = out
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|\W)\*([^*\n]+)\*/g, '$1<em>$2</em>')
    .replace(/(^|\W)_([^_\n]+)_/g, '$1<em>$2</em>');
  return out.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${codeSpans[Number(i)]}</code>`);
}

/** One table block: a header row, a --- separator row, then body rows. */
function table(lines) {
  const cells = (row) => row.trim().replace(/^\||\|$/g, '').split('|').map((c) => inline(esc(c.trim())));
  const head = cells(lines[0]).map((c) => `<th scope="col">${c}</th>`).join('');
  const body = lines
    .slice(2)
    .map((row) => `<tr>${cells(row).map((c) => `<td>${c}</td>`).join('')}</tr>`)
    .join('');
  return `<div class="table-scroll"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}

/** Render Markdown text to an HTML string. */
export function md(source) {
  const lines = String(source ?? '').replace(/\r\n?/g, '\n').split('\n');
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i += 1;
    } else if (line.startsWith('```')) {
      const code = [];
      i += 1;
      while (i < lines.length && !lines[i].startsWith('```')) code.push(lines[i++]);
      i += 1;
      blocks.push(`<pre><code>${esc(code.join('\n'))}</code></pre>`);
    } else if (/^(#{1,6})\s+/.test(line)) {
      const level = Math.min(line.match(/^#+/)[0].length + 1, 4);
      blocks.push(`<h${level}>${inline(esc(line.replace(/^#+\s+/, '')))}</h${level}>`);
      i += 1;
    } else if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) {
      blocks.push('<hr>');
      i += 1;
    } else if (line.trim().startsWith('|') && i + 1 < lines.length && /^\|?[\s:|-]+\|?$/.test(lines[i + 1]) && lines[i + 1].includes('-')) {
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) rows.push(lines[i++]);
      blocks.push(table(rows));
    } else if (/^\s*([-*+]|\d+\.)\s+/.test(line)) {
      const ordered = /^\s*\d+\./.test(line);
      const items = [];
      while (i < lines.length && /^\s*([-*+]|\d+\.)\s+/.test(lines[i])) {
        items.push(`<li>${inline(esc(lines[i].replace(/^\s*([-*+]|\d+\.)\s+/, '')))}</li>`);
        i += 1;
      }
      blocks.push(`<${ordered ? 'ol' : 'ul'}>${items.join('')}</${ordered ? 'ol' : 'ul'}>`);
    } else if (line.trim().startsWith('>')) {
      const quoted = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) quoted.push(lines[i++].trim().replace(/^>\s?/, ''));
      blocks.push(`<blockquote>${inline(esc(quoted.join(' ')))}</blockquote>`);
    } else {
      const paragraph = [];
      while (i < lines.length && lines[i].trim() && !/^(#{1,6}\s|```|\s*([-*+]|\d+\.)\s)/.test(lines[i])) paragraph.push(lines[i++]);
      blocks.push(`<p>${inline(esc(paragraph.join(' ')))}</p>`);
    }
  }
  return blocks.join('\n');
}
