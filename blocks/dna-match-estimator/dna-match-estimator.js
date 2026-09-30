/**
 * DNA Match Estimator block.
 * Enter the amount of shared DNA (centimorgans) with a match and see which
 * relationships commonly fall in that range.
 *
 * Authoring (all rows optional):
 *   | DNA Match Estimator                                  |
 *   | input-label   | Shared DNA (centimorgans)            |
 *   | button-label  | Estimate relationship                |
 *   | ...other label keys, see LABELS                      |
 *   | Relationship  | Average | Min | Max  (4-cell rows override the dataset) |
 */
import { toClassName } from '../../scripts/aem.js';
import { createTag } from '../../scripts/shared.js';

const LABELS = {
  'input-label': 'Shared DNA (centimorgans)',
  'input-hint': 'Find this number on your match’s profile, next to “Shared DNA”.',
  'button-label': 'Estimate relationship',
  'results-heading': 'Possible relationships',
  'average-label': 'Average',
  'range-label': 'Range',
  'empty-message': 'Enter a value between 0 and 3,720 cM to see possible relationships.',
  'none-message': 'No common relationships match that amount. Double-check the number and try again.',
  disclaimer: 'Estimates are based on published, crowd-sourced ranges of shared DNA. Always confirm relationships with records and your family tree.',
  unit: 'cM',
};

/* Averages and ranges (cM) adapted from the Shared cM Project v4 (CC BY 4.0). */
const RELATIONSHIPS = [
  ['Parent / Child', 3485, 2376, 3720],
  ['Full sibling', 2613, 1613, 3488],
  ['Half sibling', 1759, 1160, 2436],
  ['Grandparent / Grandchild', 1754, 984, 2462],
  ['Aunt, Uncle / Niece, Nephew', 1741, 1201, 2282],
  ['Great-grandparent', 887, 485, 1486],
  ['Great-aunt, Great-uncle', 914, 251, 1486],
  ['Half aunt, Half uncle', 871, 492, 1315],
  ['1st cousin', 866, 396, 1397],
  ['Half 1st cousin', 449, 156, 979],
  ['1st cousin once removed', 433, 102, 980],
  ['2nd cousin', 229, 41, 592],
  ['1st cousin twice removed', 221, 33, 471],
  ['2nd cousin once removed', 122, 14, 353],
  ['Half 2nd cousin', 120, 9, 397],
  ['3rd cousin', 73, 0, 234],
  ['3rd cousin once removed', 48, 0, 192],
  ['4th cousin', 35, 0, 139],
].map(([name, avg, min, max]) => ({
  name, avg, min, max,
}));

function readConfig(block) {
  const labels = { ...LABELS };
  const custom = [];
  [...block.children].forEach((row) => {
    const cells = [...row.children].map((c) => c.textContent.trim());
    if (cells.length >= 4 && cells.slice(1, 4).every((v) => v !== '' && !Number.isNaN(Number(v)))) {
      const [name, avg, min, max] = cells;
      custom.push({
        name, avg: Number(avg), min: Number(min), max: Number(max),
      });
    } else if (cells.length >= 2 && cells[0]) {
      labels[toClassName(cells[0])] = cells[1];
    }
  });
  return { labels, relationships: custom.length ? custom : RELATIONSHIPS };
}

/**
 * Rank relationships whose range includes the value by closeness to the average.
 * @param {number} cm
 * @param {Array} relationships
 */
export function estimate(cm, relationships) {
  return relationships
    .filter((r) => cm >= r.min && cm <= r.max)
    .map((r) => ({ ...r, distance: Math.abs(cm - r.avg) / Math.max(r.max - r.min, 1) }))
    .sort((a, b) => a.distance - b.distance);
}

export default function decorate(block) {
  const { labels, relationships } = readConfig(block);
  const maxValue = Math.max(...relationships.map((r) => r.max));
  block.textContent = '';

  const inputId = `dna-cm-${Math.random().toString(36).slice(2, 8)}`;
  const input = createTag('input', {
    id: inputId,
    type: 'number',
    inputmode: 'decimal',
    min: 0,
    max: maxValue,
    step: 1,
    value: 229,
    'aria-describedby': `${inputId}-hint`,
  });
  const form = createTag('form', { class: 'dna-match-estimator-form' }, [
    createTag('label', { for: inputId, class: 'dna-match-estimator-label' }, labels['input-label']),
    createTag('div', { class: 'dna-match-estimator-input-wrap' }, [
      input,
      createTag('span', { class: 'dna-match-estimator-unit', 'aria-hidden': 'true' }, labels.unit),
    ]),
    createTag('p', { id: `${inputId}-hint`, class: 'dna-match-estimator-hint' }, labels['input-hint']),
    createTag('button', { type: 'submit', class: 'button' }, labels['button-label']),
  ]);

  const output = createTag('section', { class: 'dna-match-estimator-output', 'aria-live': 'polite' });

  const render = () => {
    const cm = Number(input.value);
    output.textContent = '';
    output.append(createTag('h3', {}, labels['results-heading']));
    if (input.value === '' || Number.isNaN(cm) || cm < 0 || cm > maxValue) {
      output.append(createTag('p', { class: 'dna-match-estimator-empty' }, labels['empty-message']));
      return;
    }
    const matches = estimate(cm, relationships);
    if (!matches.length) {
      output.append(createTag('p', { class: 'dna-match-estimator-empty' }, labels['none-message']));
      return;
    }
    const list = createTag('ol', { class: 'dna-match-estimator-list' });
    matches.forEach((m, index) => {
      const position = ((m.avg - m.min) / Math.max(m.max - m.min, 1)) * 100;
      const marker = ((cm - m.min) / Math.max(m.max - m.min, 1)) * 100;
      const bar = createTag('div', { class: 'dna-match-estimator-bar', 'aria-hidden': 'true' }, [
        createTag('span', { class: 'dna-match-estimator-bar-avg', style: `inset-inline-start: ${position}%` }),
        createTag('span', { class: 'dna-match-estimator-bar-you', style: `inset-inline-start: ${marker}%` }),
      ]);
      list.append(createTag('li', { class: index === 0 ? 'is-top' : null }, [
        createTag('p', { class: 'dna-match-estimator-name' }, m.name),
        createTag('p', { class: 'dna-match-estimator-meta' }, `${labels['average-label']}: ${m.avg.toLocaleString()} ${labels.unit} · ${labels['range-label']}: ${m.min.toLocaleString()}–${m.max.toLocaleString()} ${labels.unit}`),
        bar,
      ]));
    });
    output.append(list);
  };

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    render();
  });
  input.addEventListener('input', render);

  block.append(
    createTag('div', { class: 'dna-match-estimator-layout' }, [form, output]),
    createTag('p', { class: 'dna-match-estimator-disclaimer' }, labels.disclaimer),
  );
  render();
}
