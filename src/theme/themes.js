/**
 * Theme registry.
 *
 * A theme is a colour set (e.g. "default", "blue"). Each theme has one
 * compiled stylesheet per mode ("light", "dark"). Every stylesheet is built
 * from the same src/theme/scss/_styles.scss, with different token values,
 * so all of them have exactly the same class names.
 *
 * To add a theme or a dark mode: see src/theme/README.md.
 */
import defaultLight from './themes/default-light.scss';
import defaultDark from './themes/default-dark.scss';

export const MODES = ['light', 'dark'];

export const THEMES = {
  default: {
    name: 'Default',
    modes: {
      light: {
        styles: defaultLight,
        statusBar: 'light-content', // icon colour on the header ('light-content' | 'dark-content')
      },
      dark: {
        styles: defaultDark,
        statusBar: 'light-content',
      },
    },
  },
};

export const DEFAULT_THEME_ID = 'default';
/** First launch (nothing saved yet) starts in light mode — owner's choice. */
export const DEFAULT_MODE = 'light';

/** What the user can pick in Settings. */
export const MODE_CHOICES = ['system', 'light', 'dark'];
