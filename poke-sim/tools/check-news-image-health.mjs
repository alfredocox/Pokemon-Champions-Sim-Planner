#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FEED_PATH = path.join(ROOT, 'generated', 'news_feed.js');
const DEFAULT_TIMEOUT_MS = 10000;

function loadFeed() {
  const code = fs.readFileSync(FEED_PATH, 'utf8');
  const ctx = { window: {}, self: null, globalThis: {} };
  ctx.self = ctx.window;
  ctx.globalThis = ctx.window;
  vm.createContext(ctx);
  vm.runInContext(code, ctx, { filename: FEED_PATH });
  return ctx.window.CHAMPIONS_NEWS_FEED || {};
}

function isRemote(value) {
  return /^https?:\/\//i.test(String(value || ''));
}

function localPath(value) {
  return path.join(ROOT, String(value || '').replace(/^\.?\//, ''));
}

async function fetchWithTimeout(url, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function checkRemoteImage(url) {
  let res = await fetchWithTimeout(url, {
    method: 'HEAD',
    headers: { 'user-agent': 'battle-labs-news-image-health/1.0' }
  });
  if (res.status === 405 || res.status === 403) {
    res = await fetchWithTimeout(url, {
      method: 'GET',
      headers: {
        'user-agent': 'battle-labs-news-image-health/1.0',
        range: 'bytes=0-0'
      }
    });
  }
  const contentType = res.headers.get('content-type') || '';
  return {
    ok: res.ok,
    status: res.status,
    contentType,
    imageLike: /^image\//i.test(contentType)
  };
}

async function main() {
  const feed = loadFeed();
  const items = Array.isArray(feed.items) ? feed.items : [];
  if (!items.length) throw new Error('No news feed items found.');

  const failures = [];
  let remoteChecked = 0;
  let localChecked = 0;

  for (const item of items) {
    const image = String(item.image || '').trim();
    if (!image) {
      failures.push(`${item.title || 'Untitled'} has no image.`);
      continue;
    }
    if (isRemote(image)) {
      remoteChecked += 1;
      try {
        const result = await checkRemoteImage(image);
        if (!result.ok) failures.push(`${item.title || image} image returned HTTP ${result.status}: ${image}`);
        if (result.ok && !result.imageLike) failures.push(`${item.title || image} image content-type is not image/* (${result.contentType || 'missing'}): ${image}`);
      } catch (err) {
        failures.push(`${item.title || image} image health check failed: ${err && err.message ? err.message : err}`);
      }
    } else {
      localChecked += 1;
      if (!fs.existsSync(localPath(image))) failures.push(`${item.title || image} local fallback image missing: ${image}`);
    }
  }

  console.log(`News image health: ${items.length} item(s), ${remoteChecked} remote image(s), ${localChecked} local fallback image(s).`);
  if (failures.length) {
    console.error('News image health failures:');
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }
  console.log('News image health passed.');
}

main().catch(err => {
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
