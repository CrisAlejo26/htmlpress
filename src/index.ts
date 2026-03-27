import puppeteer from 'puppeteer';
import { readdir, mkdir } from 'node:fs/promises';
import { resolve, basename, extname } from 'node:path';
import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const INPUT_DIR = resolve('input');
const OUTPUT_DIR = resolve('output');

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
    const fileUrl = pathToFileURL(inputPath).href;
    await page.goto(fileUrl, { waitUntil: 'networkidle0' });

    await page.pdf({
      path: outputPath,
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm',
      },
    });

    console.log(`  ${htmlFile} -> ${pdfName}`);
  } finally {
    await page.close();
  }
}

async function main(): Promise<void> {
  console.log('htmlpress - HTML to PDF converter\n');

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
