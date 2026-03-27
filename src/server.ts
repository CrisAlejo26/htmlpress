import express from 'express';
import puppeteer, { type Browser, type Page } from 'puppeteer';
import { resolve, extname, basename } from 'node:path';
import { pathToFileURL } from 'node:url';
import { readdir, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const app = express();
const PORT = 3000;
const ROOT_DIR = resolve('.');
const INPUT_DIR = resolve('input');
const OUTPUT_DIR = resolve('output');

let browser: Browser;

app.use(express.json({ limit: '50mb' }));

// Serve UI
app.use('/ui', express.static(resolve('src/ui')));

// Serve project files for HTML preview in iframe
app.use('/preview', express.static(ROOT_DIR));

// Root redirect
app.get('/', (_req, res) => {
  res.redirect('/ui/');
});

// List HTML files in input/
app.get('/api/files', async (_req, res) => {
  if (!existsSync(INPUT_DIR)) {
    res.json([]);
    return;
  }
  const files = await readdir(INPUT_DIR);
  res.json(files.filter((f) => extname(f).toLowerCase() === '.html'));
});

// Upload HTML file
app.post('/api/upload', async (req, res) => {
  const { filename, content } = req.body;
  if (!filename || !content) {
    res.status(400).json({ error: 'filename and content required' });
    return;
  }
  const safeName = basename(filename);
  await writeFile(resolve(INPUT_DIR, safeName), content, 'utf-8');
  res.json({ ok: true, filename: safeName });
});

// ── Shared PDF generation ──
interface PdfOptions {
  format?: string;
  customWidth?: string;
  customHeight?: string;
  singlePage?: boolean;
  margins?: { top?: number; right?: number; bottom?: number; left?: number };
  savePath?: string;
}

async function generatePdf(
  filePath: string,
  opts: PdfOptions,
): Promise<Uint8Array> {
  const page: Page = await browser.newPage();

  try {
    await page.setViewport({ width: 860, height: 1200 });

    // Use file:// URL so Puppeteer loads directly from disk
    // Relative paths (../assets/images/...) resolve correctly from the file location
    const fileUrl = pathToFileURL(filePath).href;
    await page.goto(fileUrl, { waitUntil: 'networkidle0' });

    const pdfMargins = {
      top: `${opts.margins?.top ?? 0}mm`,
      right: `${opts.margins?.right ?? 0}mm`,
      bottom: `${opts.margins?.bottom ?? 0}mm`,
      left: `${opts.margins?.left ?? 0}mm`,
    };

    if (opts.singlePage) {
      const contentHeight = await page.evaluate(() => {
        const el = document.querySelector('#proposal') || document.body;
        return el.scrollHeight;
      });
      const safeHeight = Math.ceil(contentHeight * 1.05);

      return await page.pdf({
        path: opts.savePath,
        printBackground: true,
        width: opts.customWidth || '210mm',
        height: `${safeHeight}px`,
        margin: pdfMargins,
      });
    }

    if (opts.format === 'custom' && opts.customWidth && opts.customHeight) {
      return await page.pdf({
        path: opts.savePath,
        printBackground: true,
        width: opts.customWidth,
        height: opts.customHeight,
        margin: pdfMargins,
      });
    }

    return await page.pdf({
      path: opts.savePath,
      printBackground: true,
      format: (opts.format as 'A4') || 'A4',
      margin: pdfMargins,
    });
  } finally {
    await page.close();
  }
}

// Generate PDF (preview)
app.post('/api/pdf', async (req, res) => {
  const { file, format, customWidth, customHeight, margins, singlePage } =
    req.body;

  const safeName = basename(file);
  const filePath = resolve(INPUT_DIR, safeName);

  if (!existsSync(filePath)) {
    res.status(404).json({ error: 'File not found' });
    return;
  }

  try {
    const pdfBuffer = await generatePdf(filePath, {
      format,
      customWidth,
      customHeight,
      margins,
      singlePage,
    });

    res.contentType('application/pdf');
    res.send(Buffer.from(pdfBuffer));
  } catch (err) {
    console.error('PDF generation error:', err);
    res.status(500).json({ error: String(err) });
  }
});

// Save PDF to output directory + download
app.post('/api/save', async (req, res) => {
  const { file, format, customWidth, customHeight, margins, singlePage } =
    req.body;

  const safeName = basename(file);
  const filePath = resolve(INPUT_DIR, safeName);

  if (!existsSync(filePath)) {
    res.status(404).json({ error: 'File not found' });
    return;
  }

  const pdfName = safeName.replace(/\.html?$/i, '.pdf');
  const outputPath = resolve(OUTPUT_DIR, pdfName);

  try {
    const pdfBuffer = await generatePdf(filePath, {
      format,
      customWidth,
      customHeight,
      margins,
      singlePage,
      savePath: outputPath,
    });

    res.contentType('application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${pdfName}"`);
    res.send(Buffer.from(pdfBuffer));
  } catch (err) {
    console.error('Save error:', err);
    res.status(500).json({ error: String(err) });
  }
});

async function main() {
  if (!existsSync(INPUT_DIR)) await mkdir(INPUT_DIR, { recursive: true });
  if (!existsSync(OUTPUT_DIR)) await mkdir(OUTPUT_DIR, { recursive: true });

  browser = await puppeteer.launch();

  app.listen(PORT, () => {
    console.log(`\n  htmlpress UI → http://localhost:${PORT}\n`);
  });

  const shutdown = async () => {
    console.log('\nShutting down...');
    await browser.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
