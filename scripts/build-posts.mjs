import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
const files = (await readdir(new URL('../posts/', import.meta.url))).filter((file) => file.endsWith('.md'));
const root = new URL('../', import.meta.url);
const postsDirectory = new URL('posts/', root);
const siteUrl = 'https://aryantiw.github.io/blog/';
const siteName = 'aryan:notes';

const escapeHtml = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

const parsePost = async (file) => {
  const source = await readFile(new URL(file, postsDirectory), 'utf8');
  const match = source.match(/^---\s*([\s\S]*?)\s*---\s*/);
  const data = {};
  for (const line of (match?.[1] || '').split('\n')) {
    const split = line.indexOf(':');
    if (split < 0) continue;
    const key = line.slice(0, split).trim();
    const value = line.slice(split + 1).trim();
    data[key] = key === 'tags'
      ? value.split(',').map((tag) => tag.trim()).filter(Boolean)
      : value === 'true' ? true : value.replace(/^['"]|['"]$/g, '');
  }
  return { ...data, slug: file.replace(/\.md$/, ''), body: source.replace(/^---\s*[\s\S]*?\s*---\s*/, '').trim() };
};

const markdownToHtml = (text) => text.split(/\n\n+/).map((block) => {
  if (block.startsWith('## ')) return `<h2>${escapeHtml(block.slice(3))}</h2>`;
  if (block.startsWith('> ')) return `<blockquote>${inlineMarkdown(block.slice(2))}</blockquote>`;
  return `<p>${inlineMarkdown(block).replaceAll('\n', '<br>')}</p>`;
}).join('\n');

const inlineMarkdown = (text) => escapeHtml(text)
  .replaceAll(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  .replaceAll(/\*(.+?)\*/g, '<em>$1</em>');

const date = (value, long = false) => new Intl.DateTimeFormat('en-US', long
  ? { month: 'long', day: 'numeric', year: 'numeric' }
  : { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));

const header = ({ title, description, canonical, css = 'css/', jsonLd }) => `<!doctype html>
<html lang="en"><head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${escapeHtml(description)}"><meta name="author" content="Aryan Tiwari">
  <meta name="theme-color" content="#0b0d0f"><meta property="og:title" content="${escapeHtml(siteName)}">
  <meta property="og:description" content="${escapeHtml(description)}"><meta property="og:url" content="${canonical}">
  <meta property="og:site_name" content="${escapeHtml(siteName)}"><meta property="og:type" content="${jsonLd['@type'] === 'Article' ? 'article' : 'website'}">
  <meta name="twitter:card" content="summary"><link rel="canonical" href="${canonical}"><link rel="icon" href="${css}../favicon.svg">
  <link rel="stylesheet" href="${css}style.css"><link rel="stylesheet" href="${css}dark.css">
  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script><title>${escapeHtml(siteName)}</title>
</head>`;

const footer = (prefix = '') => `<footer><div class="shell footer"><span>Made slowly, published openly.</span><a href="https://github.com/aryantiw">GitHub ↗</a></div></footer>
</body></html>`;
const navigation = (prefix = '') => `<header class="site-header"><div class="shell nav"><a class="logo" href="${prefix}index.html">aryan<span>:</span>notes</a><nav><a href="${prefix}index.html">Journal</a><a href="https://aryantiw.github.io/">Portfolio ↗</a></nav></div></header>`;
const postLink = (post, prefix = '') => `${prefix}${post.slug}/`;

const posts = (await Promise.all(files.map(parsePost))).sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
const featured = posts.find((post) => post.featured) || posts[0];
const remaining = posts.filter((post) => post.slug !== featured.slug);
const categories = [...new Set(posts.map((post) => post.category))];
const tags = [...new Set(posts.flatMap((post) => post.tags))];

const homeRows = remaining.map((post, index) => `<a class="post" href="${postLink(post)}"><div class="number">${String(index + 1).padStart(2, '0')}</div><div><span class="category">${escapeHtml(post.category)}</span><h3>${escapeHtml(post.title)}</h3><p>${escapeHtml(post.description)}</p></div><div class="post-time"><time datetime="${post.pubDate}">${date(post.pubDate)}</time><span>${escapeHtml(post.readingTime)}</span></div><span class="arrow">↗</span></a>`).join('');
const homeHeader = header({ title: siteName, description: 'Essays on existence, science, philosophy, desire, humanity, and the questions that shape us.', canonical: siteUrl, jsonLd: { '@context': 'https://schema.org', '@type': 'Blog', name: siteName, url: siteUrl, author: { '@type': 'Person', name: 'Aryan Tiwari' } } });
const home = `${homeHeader}
<body><main>${navigation()}<section class="hero shell"><p class="eyebrow">A personal journal</p><h1>Thinking out loud,<br><em>one page at a time.</em></h1><p class="intro">Essays and observations on being human, building things, and finding a little more clarity in the noise.</p></section>
<section class="latest shell"><div class="rule-title"><span>Latest note</span><time datetime="${featured.pubDate}">${date(featured.pubDate)}</time></div><a class="featured" href="${postLink(featured)}"><div class="featured-copy"><span class="category">${escapeHtml(featured.category)}</span><h2>${escapeHtml(featured.title)}</h2><p>${escapeHtml(featured.description)}</p><span class="read">Read the essay <span>↗</span></span></div><div class="mark"><span>${escapeHtml(featured.title[0])}</span></div></a></section>
<section class="archive shell"><div class="archive-head"><div><p class="eyebrow">The archive</p><h2>All notes</h2></div><div class="filters"><span>Topics</span>${categories.map((category) => `<button class="filter" data-category="${escapeHtml(category)}">${escapeHtml(category)}</button>`).join('')}</div></div><div class="posts">${homeRows}</div><div class="tags"><span>Filed under</span>${tags.map((tag) => `<strong>#${escapeHtml(tag)}</strong>`).join('')}</div></section></main><script src="js/app.js"></script>${footer()}`;
await writeFile(new URL('index.html', root), home);

await Promise.all(posts.map(async (post, index) => {
  const previous = posts[index + 1];
  const next = posts[index - 1];
  const canonical = `${siteUrl}${post.slug}/`;
  const article = `${header({ title: siteName, description: post.description, canonical, css: '../css/', jsonLd: { '@context': 'https://schema.org', '@type': 'Article', headline: post.title, description: post.description, datePublished: post.pubDate, author: { '@type': 'Person', name: post.author }, mainEntityOfPage: canonical } })}
<body><main>${navigation('../')}<article class="article shell"><a class="back" href="../index.html">← Back to the journal</a><header class="article-head"><div class="meta"><span>${escapeHtml(post.category)}</span><span>${escapeHtml(post.readingTime)}</span></div><h1>${escapeHtml(post.title)}</h1><p class="description">${escapeHtml(post.description)}</p><div class="byline"><span>By ${escapeHtml(post.author)}</span><time datetime="${post.pubDate}">${date(post.pubDate, true)}</time></div></header><div class="article-body"><aside><span>In this note</span>${post.tags.map((tag) => `<a href="../index.html#${encodeURIComponent(tag)}">#${escapeHtml(tag)}</a>`).join('')}</aside><div class="prose">${markdownToHtml(post.body)}</div></div><nav class="article-nav" aria-label="Article navigation">${previous ? `<a href="../${postLink(previous)}"><span>← Previous</span><strong>${escapeHtml(previous.title)}</strong></a>` : '<span></span>'}${next ? `<a class="next" href="../${postLink(next)}"><span>Next →</span><strong>${escapeHtml(next.title)}</strong></a>` : '<span></span>'}</nav></article></main>${footer('../')}`;
  await mkdir(new URL(`${post.slug}/`, root), { recursive: true });
  await writeFile(new URL(`${post.slug}/index.html`, root), article);
}));

const sitemap = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${siteUrl}</loc><priority>1.0</priority></url>${posts.map((post) => `<url><loc>${siteUrl}${post.slug}/</loc><lastmod>${post.pubDate}</lastmod><priority>0.8</priority></url>`).join('')}</urlset>\n`;
await writeFile(new URL('sitemap.xml', root), sitemap);
await rm(new URL('post.html', root), { force: true });
console.log(`Generated homepage and ${posts.length} static article pages.`);
