import puppeteer from 'puppeteer';
import { readdir, mkdir } from 'node:fs/promises';
import { resolve, basename, extname } from 'node:path';
import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const INPUT_DIR = resolve('input');
const OUTPUT_DIR = resolve('output');
const singlePage = process.argv.includes('--single-page');

async function ensureDirectories(): Promise<void> {
  if (!existsSync(INPUT_DIR)) {
    await mkdir(INPUT_DIR, { recursive: true });
    console.log(`Created input directory: ${INPUT_DIR}`);
  }
  if (!existsSync(OUTPUT_DIR)) {
    await mkdir(OUTPUT_DIR, { recursive: true });
    console.log(`Created output directory: ${OUTPUT_DIR}`);
  }
}

async function getHtmlFiles(): Promise<string[]> {
  const files = await readdir(INPUT_DIR);
  return files.filter((file) => extname(file).toLowerCase() === '.html');
}

async function convertHtmlToPdf(
  htmlFile: string,
  browser: puppeteer.Browser,
): Promise<void> {
  const inputPath = resolve(INPUT_DIR, htmlFile);
  const pdfName = basename(htmlFile, extname(htmlFile)) + '.pdf';
  const outputPath = resolve(OUTPUT_DIR, pdfName);

  const page = await browser.newPage();

  try {
    await page.setViewport({ width: 860, height: 1200 });

    const fileUrl = pathToFileURL(inputPath).href;
    await page.goto(fileUrl, { waitUntil: 'networkidle0' });

    if (singlePage) {
      const contentHeight = await page.evaluate(() => {
        const proposal = document.getElementById('proposal');
        return proposal ? proposal.scrollHeight : document.body.scrollHeight;
      });

      // Add extra space to account for print layout differences
      const safeHeight = Math.ceil(contentHeight * 1.05);

      await page.pdf({
        path: outputPath,
        width: '210mm',
        height: `${safeHeight}px`,
        printBackground: true,
        margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
      });
    } else {
      await page.pdf({
        path: outputPath,
        format: 'A4',
        printBackground: true,
        margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
      });
    }

    console.log(`  ${htmlFile} -> ${pdfName}`);
  } finally {
    await page.close();
  }
}

async function main(): Promise<void> {
  console.log('htmlpress - HTML to PDF converter\n');

  if (singlePage) {
    console.log('Mode: single page\n');
  }

  await ensureDirectories();

  const htmlFiles = await getHtmlFiles();

  if (htmlFiles.length === 0) {
    console.log('No HTML files found in the input/ directory.');
    console.log('Place your .html files there and run again.');
    return;
  }

  console.log(`Found ${htmlFiles.length} HTML file(s). Converting...\n`);

  const browser = await puppeteer.launch();

  try {
    for (const file of htmlFiles) {
      await convertHtmlToPdf(file, browser);
    }
  } finally {
    await browser.close();
  }

  console.log(`\nDone! PDFs saved to: ${OUTPUT_DIR}`);
}

main().catch((error: unknown) => {
  console.error('Error:', error);
  process.exit(1);
});
