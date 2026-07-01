#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(new URL('.', import.meta.url).pathname, '..');
const SOURCES_PATH = path.join(ROOT, 'tools', 'news_sources.json');
const OUT_PATH = path.join(ROOT, 'generated', 'news_feed.js');
const DEFAULT_IMAGE = 'assets/news-card.svg';
const FALLBACK_IMAGE_KIND = 'local_fallback';
const RSS_IMAGE_KIND = 'rss_media';
const ARTICLE_IMAGE_KIND = 'article_metadata';
const WORDPRESS_IMAGE_KIND = 'wordpress_featured_media';

function escapeJs(value) {
  return JSON.stringify(value).replace(/<\//g, '<\\/');
}

function stripTags(value) {
  return String(value || '')
    .replace(/<!\[CDATA\[/g, '')
    .replace(/\]\]>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#038;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeXmlEntities(value) {
  return String(value || '')
    .replace(/&amp;/g, '&')
    .replace(/&#038;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

function readTag(block, tag) {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const match = block.match(re);
  return match ? stripTags(match[1]) : '';
}

function readAttr(block, tag, attr) {
  const re = new RegExp(`<${tag}[^>]*\\s${attr}=["']([^"']+)["'][^>]*>`, 'i');
  const match = block.match(re);
  return match ? decodeXmlEntities(match[1]) : '';
}

function readMetaContent(html, names) {
  const doc = String(html || '');
  for (const name of names) {
    const escaped = String(name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const propertyFirst = new RegExp(`<meta[^>]*(?:property|name)=["']${escaped}["'][^>]*content=["']([^"']+)["'][^>]*>`, 'i');
    const contentFirst = new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["']${escaped}["'][^>]*>`, 'i');
    const match = doc.match(propertyFirst) || doc.match(contentFirst);
    if (match && match[1]) return decodeXmlEntities(match[1]);
  }
  return '';
}

function isLocalFallbackImage(value) {
  return !value || String(value).trim() === DEFAULT_IMAGE;
}

function isUsableImage(value) {
  const src = String(value || '').trim();
  if (!src) return false;
  if (/battle-stadium\.jpg|game-screenshot-2\.png/i.test(src)) return false;
  if (/^https?:\/\//i.test(src)) return true;
  return src === DEFAULT_IMAGE || src.startsWith('assets/');
}

async function enrichArticleImage(item, timeoutMs = 8000) {
  if (!item || !isLocalFallbackImage(item.image)) return item;
  if (!/^https?:\/\//i.test(String(item.url || ''))) return item;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(item.url, {
      headers: { 'user-agent': 'battle-labs-news-sync/1.1' },
      signal: controller.signal
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    const image = readMetaContent(html, ['og:image', 'twitter:image', 'twitter:image:src']);
    if (isUsableImage(image) && !isLocalFallbackImage(image)) {
      return {
        ...item,
        image,
        image_source: ARTICLE_IMAGE_KIND
      };
    }
  } catch {
    // Keep local fallback. News artwork is UX enrichment, not source truth.
  } finally {
    clearTimeout(timer);
  }
  return item;
}

function sameCanonicalPath(a, b) {
  try {
    return new URL(a).pathname.replace(/\/+$/, '') === new URL(b).pathname.replace(/\/+$/, '');
  } catch {
    return false;
  }
}

function wpSearchUrl(item) {
  try {
    const url = new URL(item.url);
    if (!/victoryroad\.pro$/i.test(url.hostname)) return '';
    url.pathname = '/wp-json/wp/v2/posts';
    url.search = new URLSearchParams({
      search: item.title || '',
      _fields: 'link,title,featured_media'
    }).toString();
    return url.toString();
  } catch {
    return '';
  }
}

function wpMediaUrl(item, mediaId) {
  try {
    const url = new URL(item.url);
    if (!/victoryroad\.pro$/i.test(url.hostname)) return '';
    url.pathname = `/wp-json/wp/v2/media/${mediaId}`;
    url.search = '_fields=source_url,media_details.sizes';
    return url.toString();
  } catch {
    return '';
  }
}

function pickWordPressMediaSource(media) {
  if (!media || typeof media !== 'object') return '';
  const sizes = media.media_details && media.media_details.sizes ? media.media_details.sizes : {};
  const preferred = sizes.large || sizes.medium_large || sizes.medium || null;
  return (preferred && preferred.source_url) || media.source_url || '';
}

async function enrichWordPressFeaturedImage(item, timeoutMs = 8000) {
  if (!item || !isLocalFallbackImage(item.image)) return item;
  const searchUrl = wpSearchUrl(item);
  if (!searchUrl) return item;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(searchUrl, {
      headers: { 'user-agent': 'battle-labs-news-sync/1.1' },
      signal: controller.signal
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const posts = await res.json();
    const post = (Array.isArray(posts) ? posts : []).find(candidate => {
      return candidate && candidate.featured_media && sameCanonicalPath(candidate.link, item.url);
    }) || (Array.isArray(posts) ? posts : []).find(candidate => candidate && candidate.featured_media);
    if (!post || !post.featured_media) return item;
    const mediaEndpoint = wpMediaUrl(item, post.featured_media);
    if (!mediaEndpoint) return item;
    const mediaRes = await fetch(mediaEndpoint, {
      headers: { 'user-agent': 'battle-labs-news-sync/1.1' },
      signal: controller.signal
    });
    if (!mediaRes.ok) throw new Error(`HTTP ${mediaRes.status}`);
    const media = await mediaRes.json();
    const image = pickWordPressMediaSource(media);
    if (isUsableImage(image) && !isLocalFallbackImage(image)) {
      return {
        ...item,
        image,
        image_source: WORDPRESS_IMAGE_KIND
      };
    }
  } catch {
    // Keep local fallback. Featured media is display enrichment, not rules evidence.
  } finally {
    clearTimeout(timer);
  }
  return item;
}

function normalizeDate(value) {
  const d = new Date(value || '');
  if (Number.isNaN(d.getTime())) return 'Recently synced';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

function excerpt(value) {
  const clean = stripTags(value);
  if (!clean) return 'Synced competitive Pokemon news. Treat as news/meta context, not rules truth.';
  return clean.length > 150 ? clean.slice(0, 147).trim() + '...' : clean;
}

function parseRss(xml, source) {
  const blocks = [...String(xml || '').matchAll(/<item\b[\s\S]*?<\/item>/gi)].map(m => m[0]);
  const atomBlocks = blocks.length ? [] : [...String(xml || '').matchAll(/<entry\b[\s\S]*?<\/entry>/gi)].map(m => m[0]);
  return (blocks.length ? blocks : atomBlocks).map(block => {
    const title = readTag(block, 'title');
    const link = decodeXmlEntities(readTag(block, 'link') || readAttr(block, 'link', 'href'));
    const rawDate = readTag(block, 'pubDate') || readTag(block, 'updated') || readTag(block, 'published');
    const desc = readTag(block, 'description') || readTag(block, 'summary') || readTag(block, 'content:encoded');
    const mediaImage = readAttr(block, 'media:content', 'url') || readAttr(block, 'media:thumbnail', 'url') || readAttr(block, 'enclosure', 'url');
    const image = isUsableImage(mediaImage) ? mediaImage : DEFAULT_IMAGE;
    if (!title || !link) return null;
    return {
      category: source.category || 'News',
      date: normalizeDate(rawDate),
      title,
      detail: excerpt(desc),
      source: `${source.name} · ${source.tier}`,
      source_tier: source.tier,
      url: link,
      image,
      image_source: image === DEFAULT_IMAGE ? FALLBACK_IMAGE_KIND : RSS_IMAGE_KIND,
      alt: `${title} news image`,
      synced_at: new Date().toISOString()
    };
  }).filter(Boolean);
}

function keywordList(value) {
  return Array.isArray(value) ? value.map(v => String(v || '').toLowerCase()).filter(Boolean) : [];
}

function matchesSourceFilters(item, source) {
  const haystack = `${item.title || ''} ${item.detail || ''} ${item.url || ''}`.toLowerCase();
  const include = keywordList(source.include_keywords);
  const exclude = keywordList(source.exclude_keywords);
  if (exclude.some(word => haystack.includes(word))) return false;
  if (include.length && !include.some(word => haystack.includes(word))) return false;
  return true;
}

async function main() {
  const config = JSON.parse(await fs.readFile(SOURCES_PATH, 'utf8'));
  const items = [];
  const errors = [];
  for (const source of config.sources || []) {
    if (!source.enabled) continue;
    if (source.type !== 'rss' && source.type !== 'atom') continue;
    try {
      const res = await fetch(source.url, { headers: { 'user-agent': 'battle-labs-news-sync/1.0' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      items.push(...parseRss(text, source).filter(item => matchesSourceFilters(item, source)));
    } catch (err) {
      errors.push({ source_id: source.id, url: source.url, error: String(err && err.message || err) });
    }
  }
  const seen = new Set();
  const deduped = items
    .filter(item => {
      const key = String(item.url || item.title).toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => Date.parse(b.synced_at || 0) - Date.parse(a.synced_at || 0))
    .slice(0, Number(config.max_items || 25));
  const enriched = await Promise.all(deduped.map(async item => {
    const withWpImage = await enrichWordPressFeaturedImage(item);
    return enrichArticleImage(withWpImage);
  }));
  const payload = {
    schema_version: 'champions-news-feed-v1',
    generated_at: new Date().toISOString(),
    source_mode: 'rss_sync',
    source_count: (config.sources || []).filter(s => s.enabled).length,
    item_count: enriched.length,
    errors,
    items: enriched
  };
  await fs.mkdir(path.dirname(OUT_PATH), { recursive: true });
  await fs.writeFile(OUT_PATH, `// Generated by tools/sync-news-feed.mjs. Do not edit by hand.\n(function(root) {\n  root.CHAMPIONS_NEWS_FEED = ${escapeJs(payload)};\n})(typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : globalThis));\n`, 'utf8');
  console.log(`Synced ${deduped.length} news item(s); ${errors.length} error(s) -> ${OUT_PATH}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
