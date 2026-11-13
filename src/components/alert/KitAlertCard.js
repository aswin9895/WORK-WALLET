/**
 * The alert card (owner's mockups). AlertHost renders EVERY alert with it;
 * `layout` defaults to 'header' when there are options, else 'hero':
 *
 *   layout 'hero'   — big icon on a soft blob, centred title + message;
 *                     1–2 buttons side by side, 3+ stacked full width
 *                     (Back up data)
 *   layout 'header' — icon tile + title + subtitle on top, optional
 *                     `optionsTitle`, option cards with icon tiles and a
 *                     radio (Export report)
 *
 * Extra config (only for these layouts):
 *   iconPath           — @mdi/js path (hero icon / header tile)
 *   subtitle           — header layout: line under the title
 *   optionsTitle       — e.g. 'Export format'
 *   options[].iconPath — icon in the option's tile
 *   options[].tone     — 'red' | 'blue' tile colours (default: accent)
 *   buttons[].Icon     — lucide icon before the label
 *   buttons[].wide     — own full-width row; other buttons share a row
 *   tone 'danger' | 'success' — hero icon + blob in red / green
 *                        (default orange). No iconPath → info / warning /
 *                        check icon by tone.
 * Button styles: primary → gradient, default → tonal, cancel → outline,
 * destructive → red.
 * A close (X) button is shown when the alert is cancelable.
 */
import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import {
  mdiAlertCircle,
  mdiCheckBold,
  mdiCheckCircle,
  mdiClose,
  mdiInformation,
} from '@mdi/js';
import { useStyles } from '@/theme';
import { FixedText } from '@/components/ui';
import KitButton from '@/components/kit/KitButton';
import MdiIcon from '@/components/graphics/MdiIcon';

const VARIANT = {
  primary: 'primary',
  default: 'tonal',
  cancel: 'outline',
  destructive: 'danger',
};

/** Hero colours + default icon by tone. */
const HERO = {
  danger: {
    blob: 'kitDialogBlobDanger',
    icon: 'palDialogHeroDanger',
    path: mdiAlertCircle,
  },
  success: {
    blob: 'kitDialogBlobSuccess',
    icon: 'palDialogHeroSuccess',
    path: mdiCheckCircle,
  },
};

const TILE = {
  red: { box: 'kitDialogOptionTileRed', icon: 'palDialogTileRed' },
  blue: { box: 'kitDialogOptionTileBlue', icon: 'palDialogTileBlue' },
};

/** [a, b, WIDE, c] → [[a, b], [WIDE], [c]]; stack → one per row */
function buttonRows(buttons, stack) {
  const rows = [];
  let row = [];
  for (const b of buttons) {
    if (b.wide || stack) {
      if (row.length) {
        rows.push(row);
        row = [];
      }
      rows.push([b]);
    } else {
      row.push(b);
    }
  }
  if (row.length) {
    rows.push(row);
  }
  return rows;
}

export default function KitAlertCard({
  config: c,
  selected,
  onToggle,
  onButton,
  onCancel,
}) {
  const s = useStyles();
  const layout = c.layout || (c.options?.length ? 'header' : 'hero');
  const hero = layout === 'hero';
  const tone = HERO[c.tone];
  const heroPath = c.iconPath || (tone ? tone.path : mdiInformation);

  const close = c.cancelable ? (
    <Pressable
      onPress={onCancel}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Close"
      style={({ pressed }) => [s.kitDialogClose, pressed && s.btnPressed]}
    >
      <MdiIcon path={mdiClose} size={20} color={s.palDialogClose.color} />
    </Pressable>
  ) : null;

  const top = hero ? (
    <>
      <View style={s.kitDialogHero}>
        <View style={[s.kitDialogBlob, tone && s[tone.blob]]} />
        <MdiIcon
          path={heroPath}
          size={84}
          color={tone ? s[tone.icon].color : s.palDialogHeroFrom.color}
          gradientTo={tone ? undefined : s.palDialogHeroTo.color}
        />
      </View>
      {c.title ? (
        <FixedText style={s.kitDialogTitleCenter}>{c.title}</FixedText>
      ) : null}
      {c.message ? (
        // long messages (e.g. a pay list) scroll inside the card
        <ScrollView style={s.kitDialogMessageScroll}>
          <FixedText style={s.kitDialogMessageCenter}>{c.message}</FixedText>
        </ScrollView>
      ) : null}
    </>
  ) : (
    <>
      <View style={s.kitDialogHead}>
        {c.iconPath ? (
          <View style={s.kitTile}>
            <MdiIcon path={c.iconPath} size={26} color={s.palTileIcon.color} />
          </View>
        ) : null}
        <View style={[s.kitDialogHeadText, !c.iconPath && s.kitNoMargin]}>
          {c.title ? (
            <FixedText style={s.kitDialogTitle}>{c.title}</FixedText>
          ) : null}
          {c.subtitle ? (
            <FixedText style={s.kitDialogSubtitle}>{c.subtitle}</FixedText>
          ) : null}
        </View>
      </View>
      {c.message ? (
        <FixedText style={[s.kitDialogSubtitle, s.kitDialogMessageGap]}>
          {c.message}
        </FixedText>
      ) : null}
    </>
  );

  const options = c.options?.length ? (
    <>
      {c.optionsTitle ? (
        <FixedText style={s.kitDialogSection}>{c.optionsTitle}</FixedText>
      ) : null}
      <ScrollView style={s.kitDialogOptions}>
        {c.options.map(o => {
          const on = selected.includes(o.value);
          const tile = TILE[o.tone];
          return (
            <Pressable
              key={String(o.value)}
              accessibilityRole={c.multiple ? 'checkbox' : 'radio'}
              accessibilityState={{ checked: on }}
              style={[s.kitDialogOption, on && s.kitDialogOptionOn]}
              onPress={() => onToggle(o.value)}
            >
              {o.iconPath ? (
                <View style={[s.kitDialogOptionTile, tile && s[tile.box]]}>
                  <MdiIcon
                    path={o.iconPath}
                    size={26}
                    color={tile ? s[tile.icon].color : s.palTileIcon.color}
                  />
                </View>
              ) : null}
              <View
                style={[s.kitDialogOptionBody, !o.iconPath && s.kitNoMargin]}
              >
                <FixedText style={s.kitDialogOptionLabel}>{o.label}</FixedText>
                {o.description ? (
                  <FixedText style={s.kitDialogOptionText}>
                    {o.description}
                  </FixedText>
                ) : null}
              </View>
              <View
                style={[
                  s.kitDialogRadio,
                  on && s.kitDialogRadioOn,
                  on && c.multiple && s.kitDialogCheckOn,
                  c.multiple && s.kitDialogCheck,
                ]}
              >
                {on && c.multiple ? (
                  <MdiIcon
                    path={mdiCheckBold}
                    size={14}
                    color={s.palOnDialogRadio.color}
                  />
                ) : null}
                {on && !c.multiple ? <View style={s.kitDialogRadioDot} /> : null}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </>
  ) : null;

  const rows = buttonRows(c.buttons, hero && c.buttons.length > 2);

  return (
    // claims touches so a tap on the card doesn't reach the backdrop
    <View style={s.kitDialog} onStartShouldSetResponder={() => true}>
      {top}
      {options}
      {c.autoCloseMs ? (
        <FixedText style={s.kitDialogAutoNote}>Closes automatically</FixedText>
      ) : null}
      <View style={[s.kitDialogButtons, hero && s.kitDialogButtonsHero]}>
        {rows.map((row, i) => (
          <View key={i} style={s.kitDialogBtnRow}>
            {row.map(b => {
              const needsPick =
                c.requireSelection && b.style !== 'cancel' && !selected.length;
              return (
                <KitButton
                  key={b.text}
                  title={b.text}
                  Icon={b.Icon}
                  variant={VARIANT[b.style || 'default']}
                  disabled={needsPick}
                  style={s.kitBtnFlex}
                  onPress={() => onButton(b)}
                />
              );
            })}
          </View>
        ))}
      </View>
      {close}
    </View>
  );
}
