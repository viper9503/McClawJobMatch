// Client-side resume PDF → text extraction with pdf.js.
//
// pdf.js runs its parser in a web worker. Vite's `?worker` import bundles the
// worker as a real module worker and gives us a constructor; handing pdf.js a
// live worker instance via `workerPort` is what works reliably under both
// `vite dev` and `vite build`. (The plain `?url` form breaks in dev: pdf.js then
// tries to dynamically import the worker file, which Vite serves with a `?import`
// query it can't execute — "Setting up fake worker failed".)

import * as pdfjsLib from "pdfjs-dist";
import PdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?worker";

// Spin the worker up lazily — only the first time a PDF is parsed — so we don't
// pay for it on every page load for users who never upload one.
let workerReady = false;
function ensureWorker() {
  if (!workerReady) {
    pdfjsLib.GlobalWorkerOptions.workerPort = new PdfWorker();
    workerReady = true;
  }
}

/**
 * Extract plain text from a PDF File/Blob.
 * Joins text items per page and preserves line breaks reasonably well.
 * @param {File|Blob} file
 * @returns {Promise<string>}
 */
export async function extractPdfText(file) {
  ensureWorker();
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
  const pages = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    pages.push(itemsToText(content.items));
  }

  await pdf.cleanup?.();
  return pages
    .join("\n\n")
    .replace(/ +\n/g, "\n") // drop trailing spaces left before inserted line breaks
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// pdf.js returns positioned text fragments. Reconstruct line breaks from the
// `hasEOL` flag (and from large vertical jumps as a fallback) so the resume
// reads top-to-bottom instead of as one run-on blob.
function itemsToText(items) {
  let out = "";
  let lastY = null;
  for (const it of items) {
    if (!("str" in it)) continue;
    const y = it.transform?.[5];
    if (lastY != null && y != null && Math.abs(y - lastY) > 6 && !out.endsWith("\n")) {
      out += "\n";
    }
    out += it.str;
    if (it.hasEOL) out += "\n";
    else if (it.str && !it.str.endsWith(" ")) out += " ";
    lastY = y;
  }
  return out;
}

/** True if the file looks like a PDF we can parse. */
export function isPdf(file) {
  return (
    file &&
    (file.type === "application/pdf" || /\.pdf$/i.test(file.name || ""))
  );
}
