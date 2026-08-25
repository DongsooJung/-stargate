import fs from 'node:fs/promises';

/**
 * Notion 서재 전체(필터 없음) → reading/data/notion-library.json
 * 기존 독후감 공개 동기화(update-reading-from-notion.mjs)와 분리:
 *  - reading: 웹공개 ∧ 완독 → notion-reading.json
 *  - library: 전 권 → notion-library.json
 */
const OUT = new URL('../reading/data/notion-library.json', import.meta.url);
const NOTION_API_KEY = process.env.NOTION_API_KEY || process.env.NOTION_TOKEN;
const DATA_SOURCE_ID =
  process.env.NOTION_LIBRARY_DATA_SOURCE_ID ||
  process.env.NOTION_DATA_SOURCE_ID ||
  '66846d6d-864e-42dc-99db-2b61b315f8d4';
const NOTION_VERSION = '2026-03-11';
const ONLY_COMPLETED = process.env.LIBRARY_ONLY_COMPLETED === '1';

if (!NOTION_API_KEY) {
  throw new Error(
    'NOTION_API_KEY가 없습니다. Notion 내부 연결 토큰을 GitHub Actions secret으로 등록해야 합니다.',
  );
}

const colors = {
  'AI·IT·프로그래밍': ['#334d6e', '#18283d'],
  '비즈니스·경영·창업': ['#6b4b2a', '#332313'],
  '투자·재테크·경제': ['#3c6447', '#1d3524'],
  '자기계발·심리': ['#704050', '#37202a'],
  '인문·사회·역사': ['#684c35', '#33251a'],
  '도시·부동산·건축': ['#5b4636', '#2d2119'],
  '교육·학습': ['#315f68', '#173137'],
  '과학·기술': ['#3e526b', '#1d2938'],
  '소설·문학': ['#68405f', '#351f30'],
  '법률·행정': ['#4f5663', '#262b33'],
  '군사·안보': ['#4b5c42', '#242f20'],
  '과학·에세이': ['#3e526b', '#1d2938'],
  '과학·심리': ['#3e526b', '#1d2938'],
  '역사·인문': ['#684c35', '#33251a'],
  '판타지 소설': ['#68405f', '#351f30'],
  소설: ['#68405f', '#351f30'],
  기타: ['#505766', '#262b34'],
};

const richText = (property) =>
  (property?.title || property?.rich_text || []).map((item) => item.plain_text || '').join('');
const select = (property) => property?.select?.name || property?.status?.name || '';
const multiSelect = (property) => (property?.multi_select || []).map((item) => item.name);
const number = (property) =>
  Number.isFinite(property?.number) && property.number >= 0 ? property.number : 0;
const date = (property) => property?.date?.start?.slice(0, 10) || '';
const checkbox = (property) => Boolean(property?.checkbox);
const keywords = (property) =>
  richText(property)
    .split(/[,，\n]/)
    .map((value) => value.trim().replace(/^#/, ''))
    .filter(Boolean);
const quotes = (property) =>
  richText(property)
    .split(/\n+/)
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => ({ t: value, s: 'Notion 기록' }));
const rating = (property) =>
  Math.min(5, Math.max(0, [...select(property)].filter((char) => char === '⭐').length));

function normalize(page) {
  const properties = page.properties || {};
  const genre = select(properties['대분류']) || select(properties['장르']) || '기타';
  const completedAt = date(properties['완독일']);
  const startedAt = date(properties['시작일']) || completedAt;
  const status = select(properties['독서상태']) || '미분류';
  const [c1, c2] = colors[genre] || colors['기타'];
  return {
    id: page.id.replaceAll('-', ''),
    title: richText(properties['도서명']) || richText(properties['Name']) || '제목 미등록',
    author: richText(properties['저자']),
    pub: richText(properties['출판사']),
    genre,
    status,
    public: checkbox(properties['웹공개']),
    rating: rating(properties['평점']),
    start: startedAt,
    end: completedAt,
    pages: number(properties['페이지수']),
    days: null,
    c1,
    c2,
    oneline: richText(properties['한줄평']),
    quotes: quotes(properties['인용문']),
    review: richText(properties['독후감본문']),
    recommend: multiSelect(properties['추천대상']),
    tags: keywords(properties['핵심키워드']),
  };
}

async function queryNotion(startCursor) {
  const filter = ONLY_COMPLETED
    ? { property: '독서상태', select: { equals: '완독' } }
    : undefined;

  const response = await fetch(
    `https://api.notion.com/v1/data_sources/${DATA_SOURCE_ID}/query`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${NOTION_API_KEY}`,
        'content-type': 'application/json',
        'notion-version': NOTION_VERSION,
      },
      body: JSON.stringify({
        ...(filter ? { filter } : {}),
        sorts: [{ timestamp: 'last_edited_time', direction: 'descending' }],
        page_size: 100,
        ...(startCursor ? { start_cursor: startCursor } : {}),
      }),
      signal: AbortSignal.timeout(60000),
    },
  );
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Notion API HTTP ${response.status}: ${detail.slice(0, 500)}`);
  }
  return response.json();
}

const pages = [];
let cursor;
do {
  const payload = await queryNotion(cursor);
  pages.push(...payload.results.filter((item) => item.object === 'page'));
  cursor = payload.has_more ? payload.next_cursor : null;
} while (cursor);

const books = pages
  .map(normalize)
  .sort((a, b) => String(b.end || '').localeCompare(String(a.end || '')) || a.title.localeCompare(b.title, 'ko'));

let previous = { meta: {}, books: [], posts: [] };
try {
  previous = JSON.parse(await fs.readFile(OUT, 'utf8'));
} catch {
  /* first run */
}

const previousList = previous.books || previous.posts || [];
const changed = JSON.stringify(previousList) !== JSON.stringify(books);
const output = {
  meta: {
    status: 'connected',
    source: 'Notion · 📖 독서 LOG & 독후감 (서재 전체)',
    generatedAt: changed ? new Date().toISOString() : previous.meta?.generatedAt || new Date().toISOString(),
    publicFilter: ONLY_COMPLETED ? '독서상태 = 완독 (웹공개 제한 없음)' : '필터 없음 · 서재 전체',
    count: books.length,
  },
  // reading/index.html 호환: posts 키도 함께 제공
  books,
  posts: books,
};

await fs.mkdir(new URL('.', OUT), { recursive: true });
await fs.writeFile(OUT, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Notion 서재 ${books.length}권 동기화 완료${changed ? '' : ' (변경 없음)'}`);
