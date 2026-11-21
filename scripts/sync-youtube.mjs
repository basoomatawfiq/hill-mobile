const channelId = 'UCj7Lj5MsFVUwqFBli6kAxVw';
const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
const outputUrl = new URL('../public/youtube-videos.json', import.meta.url);

function decodeXml(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function extract(tag, value) {
  const match = value.match(new RegExp(`<(?:[^:]+:)?${tag}[^>]*>([\\s\\S]*?)<\\/(?:[^:]+:)?${tag}>`, 'i'));
  return match ? decodeXml(match[1].replace(/<[^>]+>/g, '').trim()) : '';
}

function extractAttribute(tag, attribute, value) {
  const match = value.match(new RegExp(`<${tag}\\b[^>]*${attribute}=["']([^"']+)["'][^>]*>`, 'i'));
  return match ? decodeXml(match[1]) : '';
}

const response = await fetch(feedUrl);
if (!response.ok) {
  throw new Error(`YouTube RSS request failed (${response.status})`);
}

const xml = await response.text();
const entries = [...xml.matchAll(/<entry\b[\s\S]*?<\/entry>/gi)];
const items = entries.map((match) => {
  const entry = match[0];
  const videoId = extract('videoId', entry) || extractAttribute('link', 'href', entry).match(/(?:v=|\/shorts\/)([^&/?]+)/)?.[1] || '';
  const title = extract('title', entry);
  const description = extract('description', entry);
  const publishedAt = extract('published', entry);
  const thumbnailUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

  return {
    videoId,
    title,
    description,
    thumbnailUrl,
    publishedAt,
    isAvailable: Boolean(videoId),
    liveBroadcastContent: 'none',
  };
}).filter((item) => item.videoId);

items.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

const data = {
  configured: true,
  items,
  nextPageToken: null,
  totalResults: items.length,
  channel: {
    channelId,
    handle: '@samiwabasriugandatrueislam688',
    title: 'HILL TV (Powered By: Sami Wa Basri UG)',
    channelUrl: 'https://www.youtube.com/@samiwabasriugandatrueislam688',
  },
  checkedAt: new Date().toISOString(),
  fromCache: true,
};

const fs = await import('node:fs/promises');
await fs.writeFile(outputUrl, `${JSON.stringify(data, null, 2)}\n`);
console.log(`Synced ${items.length} YouTube videos`);
