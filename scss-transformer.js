/**
 * Metro transformer that lets us `import styles from './x.scss'` (or .css).
 *
 * Pipeline: SCSS --(sass)--> CSS --(css-to-react-native-transform)--> style object
 * Class names are camelCased:  .work-card  ->  styles.workCard
 *
 * Raw React Native props the CSS converter can't parse (e.g. boxShadow with
 * spread, used for glows) are written with an `rn-` prefix and passed
 * through as-is:   rn-box-shadow: 0px 0px 24px 2px rgba(…)  ->  boxShadow
 *
 * Every other file is passed to the normal React Native babel transformer.
 *
 * NOTE: Metro caches transformed files. After editing a shared partial
 * (e.g. src/theme/scss/_tokens.scss) run `npm run start:reset` so files that
 * @use it are rebuilt.
 */
const path = require('path');
const {pathToFileURL} = require('url');
const sass = require('sass');
const cssToRN = require('css-to-react-native-transform').default;
const upstream = require('@react-native/metro-babel-transformer');

const camel = name => name.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());

/** rnBoxShadow -> boxShadow (see header comment). */
function passThroughRaw(style) {
  const out = {};
  Object.keys(style).forEach(k => {
    const m = /^rn([A-Z])(.*)$/.exec(k);
    out[m ? m[1].toLowerCase() + m[2] : k] = style[k];
  });
  return out;
}

function styleFileToJs(src, filename) {
  const css = filename.endsWith('.scss')
    ? sass.compileString(src, {
        url: pathToFileURL(filename),
        loadPaths: [path.dirname(filename), path.join(__dirname, 'src/theme/scss')],
      }).css
    : src;

  const raw = cssToRN(css);
  const styles = {};
  Object.keys(raw).forEach(key => {
    styles[camel(key)] = passThroughRaw(raw[key]);
  });
  return `module.exports = ${JSON.stringify(styles)};`;
}

module.exports.transform = function ({src, filename, options}) {
  if (filename.endsWith('.scss') || filename.endsWith('.css')) {
    return upstream.transform({
      src: styleFileToJs(src, filename),
      filename,
      options,
    });
  }
  return upstream.transform({src, filename, options});
};

module.exports.getCacheKey = function () {
  return 'scss-transformer-v3';
};
