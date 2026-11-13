/**
 * Report export: create a PDF (from the HTML template) or a PNG (captured
 * from ReportExportView), then share it or save it to Downloads / Pictures.
 * Everything is local — no network.
 *
 * Libraries: react-native-html-to-pdf, react-native-view-shot,
 * react-native-share, react-native-blob-util (all native → rebuild after
 * changing them).
 *
 * The native libraries are loaded lazily (inside the functions): an app
 * build that doesn't include them yet then only fails the export action
 * with a clear message, instead of crashing at start-up.
 */
import { PermissionsAndroid, Platform } from 'react-native';
import { DEFAULT_THEME_ID, THEMES } from '@/theme/themes';
import { buildReportHtml, pageSize } from './reportHtml';

/** Folder inside Downloads / Pictures where saved reports go. */
export const SAVE_FOLDER = 'WorkAndWallet';

export const PDF_MIME = 'application/pdf';
export const PNG_MIME = 'image/png';

/** Largest image we create; very long reports should use PDF instead. */
export const MAX_IMAGE_HEIGHT_PX = 16000;
export const IMAGE_WIDTH_PX = 1600;

/** "NANMA & Co" + '2026-11-12' → "NANMA-Co-report-12-Nov-26" (safe file name). */
export function exportFileBase(cateringName, dayLabel) {
  const clean = value =>
    String(value || '')
      .replace(/[^A-Za-z0-9 _-]/g, '')
      .trim()
      .replace(/[\s_]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  const name = clean(cateringName) || 'Catering';
  const day = clean(dayLabel);
  return `${name}-report${day ? `-${day}` : ''}`.slice(0, 80);
}

/** Export colours from the LIGHT default theme (exports never use dark). */
export function exportColors() {
  const st = THEMES[DEFAULT_THEME_ID].modes.light.styles;
  return {
    page: st.palExportPage.color,
    text: st.palExportText.color,
    muted: st.palExportMuted.color,
    accent: st.palExportAccent.color,
    accentDark: st.palExportAccentDark.color,
    headBg: st.palExportHeadBg.color,
    zebra: st.palExportZebra.color,
    border: st.palExportBorder.color,
    totalBg: st.palExportTotalBg.color,
    bannerBg: st.palExportBannerBg.color,
    bannerText: st.palExportBannerText.color,
    bannerMuted: st.palExportBannerMuted.color,
    bannerAccent: st.palExportBannerAccent.color,
  };
}

/** Load a native export library, or explain that a rebuild is needed. */
function nativeLib(name) {
  try {
    switch (name) {
      case 'pdf':
        return require('react-native-html-to-pdf');
      case 'shot':
        return require('react-native-view-shot');
      case 'share':
        return require('react-native-share').default;
      default:
        return require('react-native-blob-util');
    }
  } catch (e) {
    throw new Error(
      'Export needs the latest app build. Rebuild and reinstall the app (npm run android).',
    );
  }
}

const stripScheme = p => String(p).replace(/^file:\/\//, '');
const withScheme = p => (String(p).startsWith('file://') ? p : `file://${p}`);

/** Copy a temp file to the cache under a clean name (so shares show it). */
async function cleanCopy(tempPath, fileName) {
  const { fs } = nativeLib('blob');
  const dir = `${fs.dirs.CacheDir}/exports`;
  if (!(await fs.exists(dir))) {
    await fs.mkdir(dir);
  }
  const dest = `${dir}/${fileName}`;
  if (await fs.exists(dest)) {
    await fs.unlink(dest);
  }
  await fs.cp(stripScheme(tempPath), dest);
  return dest;
}

/**
 * Create the PDF. Returns { path, fileName, mime }.
 * model = reportExportModel(...), info = labels (see buildReportHtml).
 */
export function createReportPdf(model, info, fileBase) {
  const html = buildReportHtml(model, info, exportColors());
  return createHtmlPdf(html, pageSize(info.type), fileBase);
}

/**
 * Any report HTML → PDF in the cache (also the money report).
 * size = { width, height } in PDF points (always passed: the library keeps
 * the last page size otherwise). Returns { path, fileName, mime }.
 */
export async function createHtmlPdf(html, { width, height }, fileBase) {
  const { generatePDF } = nativeLib('pdf');
  const result = await generatePDF({
    html,
    fileName: fileBase,
    width,
    height,
    baseURL: 'file:///android_asset/',
    shouldPrintBackgrounds: true,
  });
  if (!result?.filePath) {
    throw new Error('The PDF could not be created.');
  }
  const fileName = `${fileBase}.pdf`;
  return {
    path: await cleanCopy(result.filePath, fileName),
    fileName,
    mime: PDF_MIME,
  };
}

/**
 * Capture the (off-screen) export view as a PNG.
 * layout = the view's measured { width, height } in dp.
 */
export async function createReportImage(viewRef, layout, fileBase) {
  if (!viewRef?.current || !layout?.width || !layout?.height) {
    throw new Error('The report image is not ready yet. Please try again.');
  }
  const width = IMAGE_WIDTH_PX;
  const height = Math.round((layout.height * width) / layout.width);
  if (height > MAX_IMAGE_HEIGHT_PX) {
    throw new Error(
      'This report is too long for one image. Please use PDF instead, or choose fewer works.',
    );
  }
  const { captureRef } = nativeLib('shot');
  const uri = await captureRef(viewRef, {
    format: 'png',
    result: 'tmpfile',
    width,
    height,
  });
  const fileName = `${fileBase}.png`;
  return {
    path: await cleanCopy(uri, fileName),
    fileName,
    mime: PNG_MIME,
  };
}

/** Open Android's share menu (WhatsApp, Drive, email …). */
export async function shareExport(file) {
  const Share = nativeLib('share');
  await Share.open({
    url: withScheme(file.path),
    type: file.mime,
    filename: file.fileName,
    title: file.fileName,
    failOnCancel: false,
  });
}

/** Android 9 and older need the storage permission to write to Downloads. */
async function ensureLegacyWritePermission() {
  if (Platform.OS !== 'android' || Platform.Version >= 29) {
    return;
  }
  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
  );
  if (result !== PermissionsAndroid.RESULTS.GRANTED) {
    throw new Error('Storage permission is needed to save the file.');
  }
}

/**
 * Save to Downloads/WorkAndWallet (PDF) or Pictures/WorkAndWallet (image).
 * Returns a short "where" label for the success message.
 */
export async function saveExport(file) {
  await ensureLegacyWritePermission();
  const { media } = nativeLib('blob');
  const isImage = file.mime === PNG_MIME;
  await media.copyToMediaStore(
    { name: file.fileName, parentFolder: SAVE_FOLDER, mime: file.mime },
    isImage ? 'Image' : 'Download',
    stripScheme(file.path),
  );
  return `${isImage ? 'Pictures' : 'Downloads'}/${SAVE_FOLDER}/${
    file.fileName
  }`;
}
