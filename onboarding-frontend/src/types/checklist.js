/**
 * Shared JSDoc type definitions for checklist data. This project is plain
 * JS (no TypeScript build step), so these typedefs exist purely for editor
 * intellisense / documentation — they aren't enforced at build time.
 */

/**
 * @typedef {Object} ChecklistResource
 * @property {string} [label]  Display text for the link. Falls back to `url` if missing.
 * @property {string} url      Destination URL, opened in a new tab.
 * @property {"link"|"document"|string} [type]  Used to pick an icon; anything unrecognized falls back to a generic link icon.
 */

/**
 * @typedef {Object} ChecklistItem
 * @property {number} id
 * @property {string} title
 * @property {string} [description]        Short description shown in the list.
 * @property {string} [detailed_guide]      Longer step-by-step guide, may contain newlines.
 * @property {ChecklistResource[]|null} [resources]
 * @property {string} [category]
 * @property {number} [order]
 * @property {boolean} is_mandatory
 * @property {boolean} is_completed
 */

/**
 * @typedef {Object} ChecklistResponse
 * @property {number} id
 * @property {string} title
 * @property {string} [description]
 * @property {number} total_items
 * @property {number} completed_items
 * @property {number} progress_percent
 * @property {ChecklistItem[]} items
 */

export {};
