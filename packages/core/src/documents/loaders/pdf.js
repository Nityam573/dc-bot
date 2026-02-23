import fs from 'fs';
import pdfParse from 'pdf-parse';
/**
 * Loads a PDF file and returns its raw text content.
 */
export async function loadPdf(filePath) {
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);
    return data.text;
}
//# sourceMappingURL=pdf.js.map