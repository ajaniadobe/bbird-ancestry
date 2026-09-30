/**
 * Relationship Calculator block.
 * Pick how you and a relative each descend from a shared ancestor and see
 * what the relationship is called (e.g. "2nd cousin once removed").
 *
 * Authoring (all rows optional – override any key in LABELS):
 *   | Relationship Calculator                        |
 *   | you-label    | How are you related to the shared ancestor? |
 *   | them-label   | How is your relative related to them?       |
 */
import { toClassName } from '../../scripts/aem.js';
import { createTag } from '../../scripts/shared.js';

const LABELS = {
  'you-label': 'You are the shared ancestor’s…',
  'them-label': 'Your relative is the shared ancestor’s…',
  'result-prefix': 'Your relative is your',
  'same-person': 'You picked the same person twice. Choose a different generation for one of you.',
  'ancestor-option': 'Shared ancestor (same person)',
  'ladder-heading': 'How it works',
  'ladder-text': 'Count the generations from the shared ancestor down to each of you. The smaller count sets the cousin degree; the difference between the two is how many times “removed”.',
  'generations-you': 'Generations to you',
  'generations-them': 'Generations to your relative',
  'max-generations': '8',
};

const ORDINALS = ['', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th'];
const REMOVED = ['', 'once removed', 'twice removed', 'three times removed', 'four times removed',
  'five times removed', 'six times removed', 'seven times removed'];

function greats(n) {
  if (n <= 0) return '';
  if (n === 1) return 'great-';
  return `${n}x great-`;
}

/** Name for a descendant `n` generations below the shared ancestor. */
function descendantName(n) {
  if (n === 1) return 'child';
  if (n === 2) return 'grandchild';
  return `${greats(n - 2)}grandchild`;
}

/**
 * Relationship of "them" to "you", given each person's generation count below
 * the shared ancestor (0 = the ancestor themselves).
 * @param {number} you
 * @param {number} them
 * @returns {string|null}
 */
export function relationshipName(you, them) {
  if (you === 0 && them === 0) return null;
  if (you === 0) return descendantName(them);
  if (them === 0) {
    if (you === 1) return 'parent';
    if (you === 2) return 'grandparent';
    return `${greats(you - 2)}grandparent`;
  }
  if (you === 1 && them === 1) return 'sibling';
  if (you === 1) {
    if (them === 2) return 'niece or nephew';
    return `${greats(them - 3)}grandniece or grandnephew`;
  }
  if (them === 1) {
    if (you === 2) return 'aunt or uncle';
    return `${greats(you - 2)}aunt or ${greats(you - 2)}uncle`;
  }
  const degree = Math.min(you, them) - 1;
  const removed = Math.abs(you - them);
  const cousin = `${ORDINALS[degree] || `${degree}th`} cousin`;
  return removed ? `${cousin} ${REMOVED[removed] || `${removed} times removed`}` : cousin;
}

function readLabels(block) {
  const labels = { ...LABELS };
  [...block.children].forEach((row) => {
    const cells = [...row.children].map((c) => c.textContent.trim());
    if (cells.length >= 2 && cells[0]) labels[toClassName(cells[0])] = cells[1];
  });
  return labels;
}

function buildSelect(id, label, max, value, ancestorLabel) {
  const select = createTag('select', { id });
  for (let n = 0; n <= max; n += 1) {
    const text = n === 0 ? ancestorLabel : descendantName(n).replace(/^./, (c) => c.toUpperCase());
    const option = createTag('option', { value: n }, text);
    if (n === value) option.selected = true;
    select.append(option);
  }
  const row = createTag('div', { class: 'relationship-calculator-field' }, [
    createTag('label', { for: id }, label),
    select,
  ]);
  return { row, select };
}

export default function decorate(block) {
  const labels = readLabels(block);
  const max = Math.min(Math.max(Number(labels['max-generations']) || 8, 2), 10);
  block.textContent = '';

  const uid = Math.random().toString(36).slice(2, 8);
  const you = buildSelect(`rc-you-${uid}`, labels['you-label'], max, 3, labels['ancestor-option']);
  const them = buildSelect(`rc-them-${uid}`, labels['them-label'], max, 4, labels['ancestor-option']);
  const form = createTag('form', { class: 'relationship-calculator-form' }, [you.row, them.row]);

  const result = createTag('p', { class: 'relationship-calculator-result', 'aria-live': 'polite' });
  const counts = createTag('dl', { class: 'relationship-calculator-counts' });
  const output = createTag('section', { class: 'relationship-calculator-output' }, [
    result,
    counts,
    createTag('h3', {}, labels['ladder-heading']),
    createTag('p', {}, labels['ladder-text']),
  ]);

  const render = () => {
    const a = Number(you.select.value);
    const b = Number(them.select.value);
    const name = relationshipName(a, b);
    result.textContent = '';
    if (!name) {
      result.append(labels['same-person']);
    } else {
      result.append(`${labels['result-prefix']} `, createTag('strong', {}, name));
    }
    counts.replaceChildren(
      createTag('dt', {}, labels['generations-you']),
      createTag('dd', {}, String(a)),
      createTag('dt', {}, labels['generations-them']),
      createTag('dd', {}, String(b)),
    );
  };

  form.addEventListener('change', render);
  form.addEventListener('submit', (e) => e.preventDefault());
  block.append(createTag('div', { class: 'relationship-calculator-layout' }, [form, output]));
  render();
}
