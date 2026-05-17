// Quarterly IFTA report PDF. Uses pdfkit. One page per report, table grows
// downward; pdfkit handles page breaks if the jurisdiction list is long.

const PDFDocument = require('pdfkit');

const QUARTER_LABEL = { 1: 'Q1 (Jan-Mar)', 2: 'Q2 (Apr-Jun)', 3: 'Q3 (Jul-Sep)', 4: 'Q4 (Oct-Dec)' };

function money(n) {
  const sign = n < 0 ? '-' : '';
  return `${sign}$${Math.abs(n).toFixed(2)}`;
}

function renderReport(report, truck, stream) {
  const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
  doc.pipe(stream);

  // Header
  doc.fontSize(18).text('IFTA Quarterly Fuel Tax Report', { align: 'left' });
  doc.moveDown(0.3);
  doc.fontSize(10).fillColor('#555')
     .text(`Truck: ${truck.name || truck.unit_number || `#${truck.id}`}    `
         + `Period: ${report.year} ${QUARTER_LABEL[report.quarter]}    `
         + `Fleet MPG: ${report.fleetMpg.toFixed(3)}`);
  doc.fillColor('black');
  doc.moveDown(1);

  // Column layout
  const cols = [
    { key: 'jurisdiction',     label: 'Juris', width: 40 },
    { key: 'miles',            label: 'Miles', width: 60, align: 'right' },
    { key: 'gallonsPurchased', label: 'Gal Bought', width: 65, align: 'right' },
    { key: 'taxableGallons',   label: 'Taxable Gal', width: 65, align: 'right' },
    { key: 'rate',             label: 'Rate', width: 50, align: 'right' },
    { key: 'taxOwed',          label: 'Tax Owed', width: 70, align: 'right' },
    { key: 'taxPaid',          label: 'Tax Paid', width: 70, align: 'right' },
    { key: 'net',              label: 'Net', width: 70, align: 'right' },
  ];

  const startX = doc.x;
  const drawRow = (values, opts = {}) => {
    const y = doc.y;
    let x = startX;
    doc.fontSize(opts.bold ? 10 : 9);
    if (opts.bold) doc.font('Helvetica-Bold'); else doc.font('Helvetica');
    cols.forEach((c, i) => {
      doc.text(String(values[i]), x, y, { width: c.width, align: c.align || 'left' });
      x += c.width;
    });
    doc.font('Helvetica');
    doc.y = y + (opts.bold ? 16 : 14);
    doc.x = startX;
  };

  drawRow(cols.map(c => c.label), { bold: true });
  doc.moveTo(startX, doc.y - 4).lineTo(startX + cols.reduce((s, c) => s + c.width, 0), doc.y - 4).stroke();

  for (const line of report.lines) {
    drawRow([
      line.jurisdiction + (line.missingRate ? '*' : ''),
      line.miles.toFixed(0),
      line.gallonsPurchased.toFixed(3),
      line.taxableGallons.toFixed(3),
      line.rate.toFixed(4),
      money(line.taxOwed),
      money(line.taxPaid),
      money(line.net),
    ]);
  }

  doc.moveTo(startX, doc.y).lineTo(startX + cols.reduce((s, c) => s + c.width, 0), doc.y).stroke();
  drawRow([
    'TOTAL',
    report.totals.miles.toFixed(0),
    report.totals.gallonsPurchased.toFixed(3),
    report.totals.taxableGallons.toFixed(3),
    '',
    money(report.totals.taxOwed),
    money(report.totals.taxPaid),
    money(report.totals.net),
  ], { bold: true });

  doc.moveDown(1.5);
  const owedOrCredit = report.totals.net >= 0
    ? `Net tax owed this quarter: ${money(report.totals.net)}`
    : `Net credit this quarter: ${money(-report.totals.net)}`;
  doc.fontSize(11).font('Helvetica-Bold').text(owedOrCredit);
  doc.font('Helvetica');

  if (report.lines.some(l => l.missingRate)) {
    doc.moveDown(0.5);
    doc.fontSize(8).fillColor('#a00')
       .text('* Tax rate missing for this jurisdiction in ifta_tax_rates table. Totals exclude tax for that row.');
    doc.fillColor('black');
  }

  doc.moveDown(2);
  doc.fontSize(7).fillColor('#888')
     .text(`Generated ${new Date().toISOString()} by Noble Dispatch IFTA module. `
         + `This report is a working draft — verify against carrier records before filing.`);

  doc.end();
}

module.exports = { renderReport };
