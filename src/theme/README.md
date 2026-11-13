# Theming

```
src/theme/
  scss/_tokens.scss    all colours + sizes, every one `!default`
  scss/_styles.scss    every class the app uses (forwards the tokens)
  scss/_report.scss    payment report classes (prefixed `report-`)
  scss/_home.scss      Home screen classes (`home-`) + palette classes (`pal-`)
  themes/*.scss        one file per theme × mode, overrides tokens only
                       (default-light.scss, default-dark.scss)
  themes.js            registry: theme id → modes → compiled styles
  ThemeProvider.js     useTheme(), useStyles()
```

**Theme** = a colour set ("default", "blue" …). **Mode** = light / dark.
Each theme × mode is one SCSS file compiled at build time. Switching at
runtime only swaps which compiled object `useStyles()` returns, so it is
instant.

## Rules

- Components get styles with `const s = useStyles();` inside the component.
  Never `import s from '…scss'` in a screen or component, or it won't switch
  theme.
- No colour literals outside `_tokens.scss`. Need a new colour? Add a token.
- Class names must be the same in every theme. Only token values differ.
- Navigation colours come from `.nav-header`, the status bar from the
  registry (`statusBar`).

## Colours in SVG / icons

SVG and icon components take colours as props, not styles. Read them from a
palette class: `<Plus color={s.palOnPrimary.color} />`. To add one: create a
token, then `.pal-name { color: $token; }` in `_home.scss` (or the screen's
partial).

## Dark mode (done for the default theme)

The steps below show how `default-dark.scss` was added; follow the same for
new themes.

## Add a dark mode for a theme

1. Create `themes/default-dark.scss`:
   ```scss
   @use '../scss/styles' with (
     $bg: #0f0f10,
     $surface: #1a1a1c,
     $text: #f5f5f4,
     $muted: #a8a29e,
     $border: #2c2c2e // …any other tokens
   );
   ```
2. Register it in `themes.js`:
   ```js
   import defaultDark from './themes/default-dark.scss';
   // THEMES.default.modes.dark = { styles: defaultDark, statusBar: 'light-content' }
   ```
3. Run `npm run start:reset`. With mode `'system'` the app now follows the
   phone setting.

## Add another theme

Same as above with a new id, e.g. `themes/blue-light.scss` +
`THEMES.blue = { name: 'Blue', modes: { light: … } }`. Change it with
`useTheme().setThemeId('blue')`. A settings screen for this is not built yet
(see docs/PENDING.md). Save the choice through the data layer (`app_meta`).
