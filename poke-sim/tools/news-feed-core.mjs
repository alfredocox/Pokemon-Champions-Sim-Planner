import { load } from 'cheerio';
import { createHash } from 'node:crypto';

export function sourceFingerprint(source) {
  return createHash('sha256').update(JSON.stringify(source)).digest('hex');
}

export const FALLBACK_IMAGE = 'assets/news-card.svg';
export function safeUrl(value, base, hosts) {
  if (!value) return '';
  try {
    const url = new URL(value, base);
    if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443')) return '';
    if (hosts && !hosts.includes(url.hostname)) return '';
    url.hash = '';
    for (const key of [...url.searchParams.keys()]) if (/^utm_|^(fbclid|gclid)$/.test(key)) url.searchParams.delete(key);
    return url.href;
  } catch { return ''; }
}

function plain(value) { return load(String(value || '')).text().replace(/\s+/g, ' ').trim(); }
export function matchesSourceFilters(item, source) {
  const text = `${item.title} ${item.filter_text || ''}`.toLowerCase();
  const exclude = source.exclude_keywords || [];
  const include = source.include_keywords || [];
  return !exclude.some(word => text.includes(word.toLowerCase())) &&
    (!include.length || include.some(word => text.includes(word.toLowerCase())));
}

function normalize(raw, source, now) {
  const title = plain(raw.title).slice(0, 240);
  const url = safeUrl(raw.url, source.url, source.link_hosts);
  const published = Date.parse(raw.published);
  if (!title || !url || !Number.isFinite(published)) throw new Error('Malformed article: title, approved URL and publication date are required');
  if (published > Date.parse(now)) return null;
  if (!matchesSourceFilters({ title, filter_text: raw.filter_text }, source)) return null;
  const video = source.type === 'atom';
  const worlds = video && source.id === 'play-pokemon' && /world|worlds/i.test(title);
  const category = worlds ? 'Worlds broadcasts' : video ? 'Player videos' : source.category;
  const image = safeUrl(raw.image, source.url, source.image_hosts || []) || FALLBACK_IMAGE;
  return {
    id: raw.id || url, source_id: source.id, source_tier: source.tier,
    source_policy_sha256: sourceFingerprint(source), channel_id: source.channel_id || null,
    filter_basis: source.filter_description ? 'title_or_description' : 'title',
    source: source.name, source_url: source.profile_url || source.url,
    category, content_type: worlds ? 'worlds' : video ? 'video' : 'news',
    title, url, published_at: new Date(published).toISOString(),
    date: new Date(published).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }),
    detail: worlds ? 'Official tournament video. Broadcast availability and match coverage are provided by the publisher.' :
      video ? 'Community analysis and gameplay. Commentary is not official rules evidence.' :
      source.tier === 'official' ? 'Official announcement. Read the source for full details and effective dates.' :
      'Community tournament coverage. Results and commentary are not mechanics evidence.',
    image, image_source: image === FALLBACK_IMAGE ? 'local_fallback' : source.type === 'champions_index' ? 'article_metadata' : 'rss_media',
    alt: title, synced_at: now, stale: false, rules_authority: false
  };
}

export function parseSource(body, source, now) {
  if (source.type === 'champions_index') {
    const $ = load(body);
    const cards = $('article');
    if (!cards.length) throw new Error('Official news layout changed: no article cards');
    const items = cards.map((_, card) => {
      const el = $(card);
      const imageStyle = el.find('[style*="background-image"]').attr('style') || '';
      return normalize({
        title: el.find('[class*="__description"]').text(),
        url: el.find('a[href]').first().attr('href'),
        published: el.find('[class*="__date"]').text().trim() + ' 00:00:00 GMT',
        image: (imageStyle.match(/url\(["']?([^"')]+)["']?\)/) || [])[1]
      }, source, now);
    }).get().filter(Boolean);
    if (!items.length) throw new Error('Official news layout produced no valid dated articles');
    return items;
  }
  const $ = load(body, { xmlMode: true });
  if (!$('rss, feed').length) throw new Error('Expected RSS or Atom, not an HTML/error page');
  if (source.channel_id) {
    const channel = $('feed > yt\\:channelId').text();
    const author = $('feed > author > uri').text();
    if (![source.channel_id, source.channel_id.slice(2)].includes(channel) || author !== `https://www.youtube.com/channel/${source.channel_id}`) throw new Error('YouTube channel identity mismatch');
  }
  return $('item, entry').map((_, entry) => {
    const el = $(entry);
    const alternate = el.find('link').filter((_, link) => !$(link).attr('rel') || $(link).attr('rel') === 'alternate').first();
    const videoId = el.find('yt\\:videoId').text();
    if (source.channel_id && (el.find('yt\\:channelId').text() !== source.channel_id || !/^[\w-]{11}$/.test(videoId) ||
      ![`https://www.youtube.com/watch?v=${videoId}`, `https://www.youtube.com/shorts/${videoId}`].includes(alternate.attr('href')))) throw new Error('YouTube entry identity mismatch');
    return normalize({
      id: videoId ? `youtube:${videoId}` : undefined,
      title: el.find('title').first().text(),
      url: alternate.attr('href') || alternate.text(),
      published: el.find('published').first().text() || el.find('pubDate').first().text(),
      filter_text: source.filter_description ? plain(el.find('description, summary, media\\:description').first().text()) : '',
      image: el.find('media\\:thumbnail').first().attr('url') || el.find('media\\:content').first().attr('url') ||
        load(el.find('description, content\\:encoded').first().text())('img').first().attr('src')
    }, source, now);
  }).get().filter(Boolean);
}

export function assembleFeed(config, existing, results, now) {
  const cutoff = Date.parse(now) - (config.max_age_days || 90) * 86400000;
  const seen = new Set();
  const items = [];
  const health = [];
  for (const source of config.sources.filter(s => s.enabled)) {
    const result = results.find(r => r.source_id === source.id);
    const failed = !result || !!result.error;
    const candidates = failed ? (existing.items || []).filter(i => i.source_id === source.id && i.source_policy_sha256 === sourceFingerprint(source)) : result.items;
    const eligible = candidates.filter(i => safeUrl(i.url, undefined, source.link_hosts) && !(source.exclude_keywords || []).some(word => i.title.toLowerCase().includes(word.toLowerCase())) && Date.parse(i.published_at) >= cutoff && Date.parse(i.published_at) <= Date.parse(now))
      .sort((a, b) => Date.parse(b.published_at) - Date.parse(a.published_at) || a.url.localeCompare(b.url));
    health.push({ source_id: source.id, status: failed ? 'unavailable' : eligible.length ? 'ok' : 'no_recent_matches',
      checked_at: now, last_success_at: failed ? (existing.source_health || []).find(h => h.source_id === source.id)?.last_success_at || null : now,
      sha256: result?.sha256 || null, error: result?.error || null, eligible_count: eligible.length });
    for (const item of eligible.slice(0, config.max_per_source || 4)) {
      if (seen.has(item.url)) continue;
      seen.add(item.url);
      items.push({ ...item, image: safeUrl(item.image, undefined, source.image_hosts || []) || FALLBACK_IMAGE, stale: failed });
    }
  }
  items.sort((a, b) => Date.parse(b.published_at) - Date.parse(a.published_at) || a.url.localeCompare(b.url));
  const selected = items.slice(0, config.max_items || 24);
  return { schema_version: 'champions-news-feed-v1', generated_at: now, source_mode: 'curated_sync',
    source_count: health.length, source_health: health,
    errors: health.filter(h => h.status === 'unavailable'), item_count: selected.length, items: selected,
    profiles: config.sources.filter(s => s.enabled && s.profile_url).map(s => ({ id: s.id, name: s.name, url: s.profile_url, tier: s.tier })) };
}
