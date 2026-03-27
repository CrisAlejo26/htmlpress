import express from 'express';
import puppeteer, { type Browser } from 'puppeteer';
import { resolve, extname, basename } from 'node:path';
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

// Serve project files so HTML relative paths work (e.g. ../assets/images/...)
app.use('/preview', express.static(ROOT_DIR));

// Root redirect
app.get('/', (_req, res) => res.redirect('/ui/'));

// List HTML files in input/
app.get('/api/files', async (_req, res) => {
  if (!existsSync(INPUT_DIR)) return res.json([]);
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

// Generate PDF
app.post('/api/pdf', async (req, res) => {
  const { file, format, customWidth, customHeight, margins, singlePage } =
    req.body;

  const safeName = basename(file);
  const filePath = resolve(INPUT_DIR, safeName);
  if (!existsSync(filePath)) {
    res.status(404).json({ error: 'File not found' });
    return;
  }

  const page = await browser.newPage();

  try {
    await page.setViewport({ width: 860, height: 1200 });

    const url = `http://localhost:${PORT}/preview/input/${encodeURIComponent(safeName)}`;
    await page.goto(url, { waitUntil: 'networkidle0' });

    const pdfMargins = {
      top: `${margins?.top ?? 0}mm`,
      right: `${margins?.right ?? 0}mm`,
      bottom: `${margins?.bottom ?? 0}mm`,
      left: `${margins?.left ?? 0}mm`,
    };

    let pdfBuffer: Uint8Array;

    if (singlePage) {
      const contentHeight = await page.evaluate(() => {
        const el = document.querySelector('#proposal') || document.body;
        return el.scrollHeight;
      });
      const safeHeight = Math.ceil(contentHeight * 1.05);

      pdfBuffer = await page.pdf({
        printBackground: true,
        width: customWidth || '210mm',
        height: `${safeHeight}px`,
        margin: pdfMargins,
      });
    } else if (format === 'custom' && customWidth && customHeight) {
      pdfBuffer = await page.pdf({
        printBackground: true,
        width: customWidth,
        height: customHeight,
        margin: pdfMargins,
      });
    } else {
      pdfBuffer = await page.pdf({
        printBackground: true,
        format: (format as 'A4') || 'A4',
        margin: pdfMargins,
      });
    }

    res.contentType('application/pdf');
    res.send(Buffer.from(pdfBuffer));
  } catch (err) {
    console.error('PDF generation error:', err);
    res.status(500).json({ error: 'PDF generation failed' });
  } finally {
    await page.close();
  }
});

// Save PDF to output directory
app.post('/api/save', async (req, res) => {
  const { file, format, customWidth, customHeight, margins, singlePage } =
    req.body;

  const safeName = basename(file);
  const filePath = resolve(INPUT_DIR, safeName);
  if (!existsSync(filePath)) {
    res.status(404).json({ error: 'File not found' });
    return;
  }

  const page = await browser.newPage();

  try {
    await page.setViewport({ width: 860, height: 1200 });

    const url = `http://localhost:${PORT}/preview/input/${encodeURIComponent(safeName)}`;
    await page.goto(url, { waitUntil: 'networkidle0' });

    const pdfMargins = {
      top: `${margins?.top ?? 0}mm`,
      right: `${margins?.right ?? 0}mm`,
      bottom: `${margins?.bottom ?? 0}mm`,
      left: `${margins?.left ?? 0}mm`,
    };

    const pdfName = safeName.replace(/\.html$/i, '.pdf');
    const outputPath = resolve(OUTPUT_DIR, pdfName);

    let pdfBuffer: Uint8Array;

    if (singlePage) {
      const contentHeight = await page.evaluate(() => {
        const el = document.querySelector('#proposal') || document.body;
        return el.scrollHeight;
      });
      const safeHeight = Math.ceil(contentHeight * 1.05);

      pdfBuffer = await page.pdf({
        path: outputPath,
        printBackground: true,
        width: customWidth || '210mm',
        height: `${safeHeight}px`,
        margin: pdfMargins,
      });
    } else if (format === 'custom' && customWidth && customHeight) {
      pdfBuffer = await page.pdf({
        path: outputPath,
        printBackground: true,
        width: customWidth,
        height: customHeight,
        margin: pdfMargins,
      });
    } else {
      pdfBuffer = await page.pdf({
        path: outputPath,
        printBackground: true,
        format: (format as 'A4') || 'A4',
        margin: pdfMargins,
      });
    }

    res.contentType('application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${pdfName}"`,
    );
    res.send(Buffer.from(pdfBuffer));
  } catch (err) {
    console.error('Save error:', err);
    res.status(500).json({ error: 'Save failed' });
  } finally {
    await page.close();
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
