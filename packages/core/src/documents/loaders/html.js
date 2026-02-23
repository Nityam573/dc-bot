import fs from 'fs';
import { JSDOM } from 'jsdom';
/**
 * Loads an HTML file, strips tags/scripts/nav, and returns clean plain text.
 */
export function loadHtml(filePath) {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const dom = new JSDOM(raw);
    const doc = dom.window.document;
    // Remove noise elements
    doc.querySelectorAll('script, style, nav, footer, header, aside').forEach((el) => el.remove());
    return doc.body?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
}
//# sourceMappingURL=html.js.map