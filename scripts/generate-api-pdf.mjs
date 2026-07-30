import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { jsPDF } from 'jspdf';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const mdPath = path.join(root, 'public/docs/regal-meeting-api.md');
const pdfPath = path.join(root, 'public/docs/regal-meeting-api.pdf');

const md = fs.readFileSync(mdPath, 'utf8');

const doc = new jsPDF({ unit: 'pt', format: 'letter' });
doc.setProperties({
  title: 'Regal Meeting API',
  author: 'Spatial Regal Digital Ltd',
  subject: 'Regal Meeting Mobile App API Documentation',
  keywords: 'Regal Meeting, API, Supabase, WebRTC',
});

const margin = 48;
const pageWidth = doc.internal.pageSize.getWidth();
const pageHeight = doc.internal.pageSize.getHeight();
const maxWidth = pageWidth - margin * 2;
let y = margin;

function ensureSpace(needed = 14) {
  if (y + needed > pageHeight - margin) {
    doc.addPage();
    y = margin;
  }
}

function writeLine(text, fontSize = 10, extraGap = 0) {
  const clean = text.replace(/\*\*/g, '').replace(/`/g, '').trim();
  if (!clean) {
    y += fontSize * 0.5;
    return;
  }
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(fontSize);
  const wrapped = doc.splitTextToSize(clean, maxWidth);
  for (const line of wrapped) {
    ensureSpace(fontSize + 2);
    doc.text(line, margin, y);
    y += fontSize + 2;
  }
  y += extraGap;
}

for (const rawLine of md.split('\n')) {
  if (rawLine.startsWith('# ')) {
    writeLine(rawLine.slice(2), 16, 6);
  } else if (rawLine.startsWith('## ')) {
    y += 4;
    writeLine(rawLine.slice(3), 13, 4);
  } else if (rawLine.startsWith('### ')) {
    writeLine(rawLine.slice(4), 11, 3);
  } else if (rawLine.startsWith('---')) {
    y += 8;
  } else {
    writeLine(rawLine, 9, 1);
  }
}

const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
fs.writeFileSync(pdfPath, pdfBuffer);
console.log(`Wrote ${pdfPath} (${pdfBuffer.length} bytes)`);
