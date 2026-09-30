import { getMetadata } from '../../scripts/aem.js';
import { createTag, fetchQueryIndexAll, formatDate } from '../../scripts/shared.js';

/**
 * Insert ancestor crumbs using page titles from the query index. URL slugs are never
 * shown as labels, and ancestors that are not real pages are skipped.
 * @param {Element} list The breadcrumb <ol>
 * @param {Element} current The current-page <li>
 */
async function addAncestorCrumbs(list, current) {
  const segments = window.location.pathname.split('/').filter(Boolean).slice(0, -1);
  if (!segments.length) return;
  try {
    const rows = await fetchQueryIndexAll();
    const titles = new Map(rows.map((row) => [String(row.path).replace(/\/+$/, ''), row.title]));
    let path = '';
    segments.forEach((segment) => {
      path += `/${segment}`;
      const title = titles.get(path);
      if (title) current.before(createTag('li', {}, createTag('a', { href: path }, title)));
    });
  } catch {
    // index unavailable: keep Home > current page only
  }
}

function buildBreadcrumb(root = document) {
  const segments = window.location.pathname.split('/').filter(Boolean);
  if (!segments.length) return null;

  const nav = createTag('nav', { class: 'article-breadcrumb', 'aria-label': 'Breadcrumb' });
  const list = createTag('ol');
  const title = root.querySelector('main .hero h1')?.textContent?.trim() || root.title;

  list.append(createTag('li', {}, createTag('a', { href: '/' }, 'Home')));
  const current = createTag('li', { 'aria-current': 'page' }, title);
  list.append(current);
  nav.append(list);
  addAncestorCrumbs(list, current);
  return nav;
}

function buildAuthorDate() {
  const author = getMetadata('author');
  const date = getMetadata('date');
  if (!author && !date) return null;

  const container = createTag('div', { class: 'article-author-container' });

  if (author) {
    container.append(createTag('span', { class: 'article-author' }, `By ${author}`));
  }

  if (date) {
    const parsed = new Date(String(date).trim());
    const datetime = !Number.isNaN(parsed.getTime()) ? parsed.toISOString() : null;
    const formatted = formatDate(date);
    const time = createTag('time', datetime ? { datetime } : {}, formatted);
    container.append(createTag('span', { class: 'article-date' }, time));
  }

  return container;
}

export default function init(root = document) {
  const main = root.querySelector('main');
  if (!main) return;

  const hero = main.querySelector('.hero');
  const heroText = main.querySelector('.hero > div:last-child > div');

  if (hero && !main.querySelector('.article-breadcrumb')) {
    const breadcrumb = buildBreadcrumb(root);
    if (breadcrumb) hero.insertAdjacentElement('afterend', breadcrumb);
  }

  if (heroText && !heroText.querySelector('.article-author-container')) {
    const authorDate = buildAuthorDate();
    if (authorDate) heroText.append(authorDate);
  }

  // Wrap all non-hero content sections in <article> for semantic correctness
  const contentSections = [...main.querySelectorAll(':scope > .section:not(.hero-container)')];
  if (contentSections.length && !main.querySelector('article.article-body')) {
    const article = createTag('article', { class: 'article-body' });
    contentSections[0].before(article);
    contentSections.forEach((s) => article.append(s));
  }
}
