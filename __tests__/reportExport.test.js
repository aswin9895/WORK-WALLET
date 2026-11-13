import {
  detailsTable,
  recipientsText,
  reportExportModel,
  summaryTable,
} from '../src/domain/reportTableModel';
import {
  buildReportHtml,
  escapeHtml,
  pageOrientation,
  pageSize,
} from '../src/export/reportHtml';

jest.mock('react-native-html-to-pdf', () => ({
  generatePDF: jest.fn(async () => ({ filePath: '/cache/tmp123.pdf' })),
}));
jest.mock('react-native-blob-util', () => ({
  fs: {
    dirs: { CacheDir: '/cache' },
    exists: jest.fn(async () => false),
    mkdir: jest.fn(async () => {}),
    unlink: jest.fn(async () => {}),
    cp: jest.fn(async () => {}),
  },
  media: { copyToMediaStore: jest.fn(async () => 'content://x') },
}));
jest.mock('react-native-share', () => ({
  __esModule: true,
  default: { open: jest.fn(async () => ({ success: true })) },
}));
// light theme export colours (SCSS isn't compiled in jest)
jest.mock('../src/theme/themes', () => {
  const pal = color => ({ color });
  const styles = {
    palExportPage: pal('#fff'),
    palExportText: pal('#111'),
    palExportMuted: pal('#666'),
    palExportAccent: pal('#e50'),
    palExportAccentDark: pal('#c40'),
    palExportHeadBg: pal('#fed'),
    palExportZebra: pal('#fafafa'),
    palExportBorder: pal('#eee'),
    palExportTotalBg: pal('#fff1e4'),
    palExportBannerBg: pal('#15121f'),
    palExportBannerText: pal('#ffffff'),
    palExportBannerMuted: pal('#d6d3d1'),
    palExportBannerAccent: pal('#fb923c'),
  };
  return {
    DEFAULT_THEME_ID: 'default',
    THEMES: { default: { modes: { light: { styles } } } },
  };
});
jest.mock('react-native-view-shot', () => ({
  captureRef: jest.fn(async () => 'file:///cache/shot.png'),
}));

const fields = {
  date: true,
  place: true,
  session: true,
  people: true,
  amounts: true,
  extras: true,
  total: true,
};
const report = {
  peopleRows: [
    { key: 'p1', label: 'Aswin', quantity: '2', rate: '₹700', total: 1400 },
    { key: 'b', label: 'Boys', quantity: '3', rate: '3 × ₹600', total: 1800 },
  ],
  extraRows: [
    {
      key: 'e1',
      label: 'Loading',
      quantity: '2',
      rate: '2 × ₹100',
      total: 200,
      recipients: ['Aswin', 'Akhil'],
      unassigned: false,
    },
  ],
  details: [
    {
      id: 7,
      date: '2026-11-12',
      place: 'Hall <A&B>',
      session: 'Lunch',
      total: 3400,
      peopleRows: [
        { key: 'x', label: 'Aswin', quantity: '1', rate: '₹700', total: 700 },
      ],
      extraRows: [
        {
          key: 'y',
          label: 'Petrol',
          quantity: '1',
          rate: '₹500',
          total: 500,
          recipients: [],
          unassigned: true,
        },
      ],
    },
  ],
  grandTotal: 3400,
};

describe('report table model (shared by screen, PDF and image)', () => {
  test('summary: columns follow fields; extras rows marked', () => {
    const m = summaryTable(report, fields);
    expect(m.columns.map(c => c.key)).toEqual([
      'label',
      'quantity',
      'rate',
      'amount',
      'recipients',
    ]);
    expect(m.rows).toHaveLength(3);
    expect(m.rows[2]).toMatchObject({
      isExtra: true,
      cells: { label: 'Loading', recipients: 'Aswin, Akhil' },
    });
    const noAmounts = summaryTable(report, { ...fields, amounts: false });
    expect(noAmounts.columns.map(c => c.key)).not.toContain('amount');
  });

  test('details: one row per work, hidden fields drop columns', () => {
    const m = detailsTable(report, { ...fields, place: false });
    expect(m.columns.map(c => c.key)).not.toContain('place');
    expect(m.rows[0].cells.number).toBe('1');
    expect(m.rows[0].cells.extras).toContain('Unassigned expense');
  });

  test('recipientsText', () => {
    expect(recipientsText({ recipients: ['A'], unassigned: true })).toBe(
      'A · Unassigned expense',
    );
    expect(recipientsText({ recipients: [], unassigned: false })).toBe('');
  });

  test('export model follows report type', () => {
    expect(
      reportExportModel(report, { type: 'summary', fields }),
    ).toMatchObject({
      details: null,
      grandTotal: '₹3,400',
      worksCount: 1,
      showTotal: true,
    });
    expect(
      reportExportModel(report, { type: 'details', fields }).summary,
    ).toBeNull();
    const both = reportExportModel(report, { type: 'both', fields });
    expect(both.summary && both.details).toBeTruthy();
  });
});

describe('PDF template', () => {
  const colors = {
    page: '#fff',
    text: '#111',
    muted: '#666',
    accent: '#e50',
    accentDark: '#c40',
    headBg: '#fed',
    zebra: '#fafafa',
    border: '#eee',
    totalBg: '#fff1e4',
    bannerBg: '#15121f',
    bannerText: '#ffffff',
    bannerMuted: '#d6d3d1',
    bannerAccent: '#fb923c',
  };
  const info = {
    cateringName: 'NANMA <&> "Co"',
    type: 'both',
    typeLabel: 'Both',
    periodLabel: 'All time',
    statusLabel: 'To collect',
    generatedLabel: '12-Nov-26, 10:35',
  };

  test('escapes user text', () => {
    expect(escapeHtml(`<a href="x">'&'</a>\nnext`)).toBe(
      '&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;<br>next',
    );
    const html = buildReportHtml(
      reportExportModel(report, { type: 'both', fields }),
      info,
      colors,
    );
    expect(html).toContain('NANMA &lt;&amp;&gt; &quot;Co&quot;');
    // dark header band with the app logo (from the Android assets)
    expect(html).toContain('<img class="logo" src="data:image/png;base64,');
    expect(html).toContain('background: #15121f');
    expect(html).toContain('Created with Work &amp; Wallet');
    expect(html).toContain('Hall &lt;A&amp;B&gt;');
    expect(html).not.toContain('<A&B>');
  });

  test('sections, extras heading, totals; headings not repeated per page', () => {
    const html = buildReportHtml(
      reportExportModel(report, { type: 'both', fields }),
      info,
      colors,
    );
    expect(html).toContain('<h2>Payment summary</h2>');
    // Both → details begin on a new page
    expect(html).toContain('<h2 class="new-page">Work details</h2>');
    expect(html).toContain('page-break-before: always');
    expect(html).toContain('<tr class="sub"><td colspan="5">Extras</td></tr>');
    expect(html).toContain('Grand total');
    expect(html).toContain('₹3,400');
    expect(html).toContain('thead { display: table-row-group; }');
    expect(html).not.toContain('table-header-group');
    expect(html).toContain(
      'Both &nbsp;·&nbsp; All time &nbsp;·&nbsp; To collect',
    );
    const noTotal = buildReportHtml(
      reportExportModel(report, {
        type: 'summary',
        fields: { ...fields, total: false },
      }),
      { ...info, type: 'summary' },
      colors,
    );
    expect(noTotal).not.toContain('Grand total');
    expect(noTotal).not.toContain('Work details');
    // details only → no page break before it (no blank first page)
    const detailsOnly = buildReportHtml(
      reportExportModel(report, { type: 'details', fields }),
      { ...info, type: 'details' },
      colors,
    );
    expect(detailsOnly).toContain('<h2>Work details</h2>');
    expect(detailsOnly).not.toContain('class="new-page"');
  });

  test('portrait for summary only, landscape when details are included', () => {
    expect(pageOrientation('summary')).toBe('portrait');
    expect(pageOrientation('details')).toBe('landscape');
    expect(pageOrientation('both')).toBe('landscape');
    expect(pageSize('summary')).toEqual({ width: 595, height: 842 });
    expect(pageSize('both')).toEqual({ width: 842, height: 595 });
  });
});

describe('export service', () => {
  const svc = require('../src/export/reportExport');

  test('safe file names', () => {
    expect(svc.exportFileBase('NANMA & Co', '12-Nov-26')).toBe(
      'NANMA-Co-report-12-Nov-26',
    );
    expect(svc.exportFileBase('../../etc', '')).toBe('etc-report');
    expect(svc.exportFileBase('', '12-Nov-26')).toBe(
      'Catering-report-12-Nov-26',
    );
  });

  test('PDF: page size by type, copied to a clean cache name', async () => {
    const { generatePDF } = require('react-native-html-to-pdf');
    const { fs } = require('react-native-blob-util');
    const file = await svc.createReportPdf(
      reportExportModel(report, { type: 'both', fields }),
      { type: 'both', cateringName: 'NANMA' },
      'NANMA-report-12-Nov-26',
    );
    expect(generatePDF).toHaveBeenCalledWith(
      expect.objectContaining({
        width: 842,
        height: 595,
        baseURL: 'file:///android_asset/',
        fileName: 'NANMA-report-12-Nov-26',
      }),
    );
    expect(fs.cp).toHaveBeenCalledWith(
      '/cache/tmp123.pdf',
      '/cache/exports/NANMA-report-12-Nov-26.pdf',
    );
    expect(file).toEqual({
      path: '/cache/exports/NANMA-report-12-Nov-26.pdf',
      fileName: 'NANMA-report-12-Nov-26.pdf',
      mime: 'application/pdf',
    });
  });

  test('share uses a file:// url; save picks Downloads or Pictures', async () => {
    const Share = require('react-native-share').default;
    const { media } = require('react-native-blob-util');
    const pdf = {
      path: '/cache/exports/a.pdf',
      fileName: 'a.pdf',
      mime: 'application/pdf',
    };
    await svc.shareExport(pdf);
    expect(Share.open).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'file:///cache/exports/a.pdf',
        type: 'application/pdf',
      }),
    );
    expect(await svc.saveExport(pdf)).toBe('Downloads/WorkAndWallet/a.pdf');
    expect(media.copyToMediaStore).toHaveBeenLastCalledWith(
      { name: 'a.pdf', parentFolder: 'WorkAndWallet', mime: 'application/pdf' },
      'Download',
      '/cache/exports/a.pdf',
    );
    const png = {
      path: '/cache/exports/a.png',
      fileName: 'a.png',
      mime: 'image/png',
    };
    expect(await svc.saveExport(png)).toBe('Pictures/WorkAndWallet/a.png');
    expect(media.copyToMediaStore).toHaveBeenLastCalledWith(
      expect.anything(),
      'Image',
      '/cache/exports/a.png',
    );
  });

  test('image: scaled to 1600px wide; refuses huge images', async () => {
    const { captureRef } = require('react-native-view-shot');
    const ref = { current: {} };
    const file = await svc.createReportImage(
      ref,
      { width: 800, height: 1200 },
      'r',
    );
    expect(captureRef).toHaveBeenCalledWith(
      ref,
      expect.objectContaining({ format: 'png', width: 1600, height: 2400 }),
    );
    expect(file.fileName).toBe('r.png');
    await expect(
      svc.createReportImage(ref, { width: 800, height: 9000 }, 'r'),
    ).rejects.toThrow('too long for one image');
    await expect(
      svc.createReportImage({ current: null }, null, 'r'),
    ).rejects.toThrow('not ready');
  });
});
