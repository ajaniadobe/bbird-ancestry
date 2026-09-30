/**
 * Generation Calculator block.
 * Estimate when ancestors in each generation were born, how many ancestors
 * you have at that level, and which census years they may appear in.
 *
 * Authoring (all rows optional – override any key in LABELS):
 *   | Generation Calculator                                |
 *   | census-years  | 1790, 1800, 1810, ...  (e.g. UK: 1841, 1851, ...) |
 *   | census-label  | U.S. federal censuses to search      |
 */
import { toClassName } from '../../scripts/aem.js';
import { createTag } from '../../scripts/shared.js';

const LABELS = {
  'birth-year-label': 'Your birth year',
  'generations-label': 'Generations to go back',
  'interval-label': 'Average years per generation',
  'interval-hint': 'Most family historians use 25–33 years.',
  'col-generation': 'Generation',
  'col-ancestors': 'Ancestors',
  'col-born': 'Likely born',
  'col-records': 'Census years to search',
  'census-label': 'U.S. federal censuses to search',
  'no-census': 'Before census records – try church, land, and probate records',
  'summary-template': 'Going back {n} generations, you have {count} ancestors at that level, most born around {year}.',
  'census-years': '1790, 1800, 1810, 1820, 1830, 1840, 1850, 1860, 1870, 1880, 1900, 1910, 1920, 1930, 1940, 1950',
};

const DEFAULTS = {
  birthYear: 1990,
  generations: 6,
  interval: 30,
  lifespan: 70,
  spread: 10,
};

function readLabels(block) {
  const labels = { ...LABELS };
  [...block.children].forEach((row) => {
    const cells = [...row.children].map((c) => c.textContent.trim());
    if (cells.length >= 2 && cells[0]) labels[toClassName(cells[0])] = cells[1];
  });
  return labels;
}

/** Ancestor label for generation n (1 = parents). */
export function generationName(n) {
  if (n === 1) return 'Parents';
  if (n === 2) return 'Grandparents';
  if (n === 3) return 'Great-grandparents';
  return `${n - 2}x great-grandparents`;
}

/**
 * Build the generation table.
 * @returns {Array<{n:number,name:string,count:number,from:number,to:number,census:number[]}>}
 */
export function buildGenerations(birthYear, generations, interval, censusYears) {
  const rows = [];
  for (let n = 1; n <= generations; n += 1) {
    const mid = birthYear - n * interval;
    const from = mid - DEFAULTS.spread;
    const to = mid + DEFAULTS.spread;
    const census = censusYears.filter((y) => y >= from && y <= to + DEFAULTS.lifespan);
    rows.push({
      n, name: generationName(n), count: 2 ** n, from, to, census,
    });
  }
  return rows;
}

function numberField(id, label, value, attrs, hint) {
  const input = createTag('input', {
    id, type: 'number', inputmode: 'numeric', value, ...attrs,
  });
  const children = [createTag('label', { for: id }, label), input];
  if (hint) children.push(createTag('p', { class: 'generation-calculator-hint' }, hint));
  return { row: createTag('div', { class: 'generation-calculator-field' }, children), input };
}

export default function decorate(block) {
  const labels = readLabels(block);
  const censusYears = labels['census-years'].split(',').map((y) => Number(y.trim())).filter(Number.isFinite);
  block.textContent = '';

  const uid = Math.random().toString(36).slice(2, 8);
  const thisYear = new Date().getFullYear();
  const birth = numberField(`gc-birth-${uid}`, labels['birth-year-label'], DEFAULTS.birthYear, { min: 1800, max: thisYear, step: 1 });
  const gens = numberField(`gc-gens-${uid}`, labels['generations-label'], DEFAULTS.generations, { min: 1, max: 12, step: 1 });
  const interval = numberField(`gc-int-${uid}`, labels['interval-label'], DEFAULTS.interval, { min: 18, max: 45, step: 1 }, labels['interval-hint']);
  const form = createTag('form', { class: 'generation-calculator-form' }, [birth.row, gens.row, interval.row]);

  const summary = createTag('p', { class: 'generation-calculator-summary', 'aria-live': 'polite' });
  const table = createTag('table', { class: 'generation-calculator-table' });
  const output = createTag('section', { class: 'generation-calculator-output' }, [
    summary,
    createTag('div', { class: 'generation-calculator-table-wrap' }, table),
  ]);

  const clamp = (v, min, max, fallback) => {
    const n = Math.round(Number(v));
    return Number.isFinite(n) && n >= min && n <= max ? n : fallback;
  };

  const render = () => {
    const year = clamp(birth.input.value, 1800, thisYear, DEFAULTS.birthYear);
    const n = clamp(gens.input.value, 1, 12, DEFAULTS.generations);
    const step = clamp(interval.input.value, 18, 45, DEFAULTS.interval);
    const rows = buildGenerations(year, n, step, censusYears);
    const last = rows[rows.length - 1];

    summary.textContent = labels['summary-template']
      .replace('{n}', n)
      .replace('{count}', last.count.toLocaleString())
      .replace('{year}', String(year - n * step));

    const head = createTag('thead', {}, createTag('tr', {}, [
      createTag('th', { scope: 'col' }, labels['col-generation']),
      createTag('th', { scope: 'col' }, labels['col-ancestors']),
      createTag('th', { scope: 'col' }, labels['col-born']),
      createTag('th', { scope: 'col' }, labels['col-records']),
    ]));
    const body = createTag('tbody');
    rows.forEach((r) => {
      body.append(createTag('tr', {}, [
        createTag('th', { scope: 'row' }, r.name),
        createTag('td', {}, r.count.toLocaleString()),
        createTag('td', {}, `${r.from}–${r.to}`),
        createTag('td', {}, r.census.length ? r.census.join(', ') : labels['no-census']),
      ]));
    });
    table.replaceChildren(
      createTag('caption', {}, labels['census-label']),
      head,
      body,
    );
  };

  form.addEventListener('input', render);
  form.addEventListener('submit', (e) => e.preventDefault());
  block.append(createTag('div', { class: 'generation-calculator-layout' }, [form, output]));
  render();
}
