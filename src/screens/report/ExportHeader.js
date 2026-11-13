/**
 * Header band of the report IMAGE exports (catering + money): dark band with
 * the app logo, label, title, meta line and "Generated …" — same look as the
 * PDF header (export/reportHtml reportHeaderHtml). Styles `export-banner*`.
 */
import React from 'react';
import { Image, View } from 'react-native';
import { useStyles } from '@/theme';
import { FixedText } from '@/components/ui';

const APP_LOGO = require('@/assets/images/app-logo.png');

export default function ExportHeader({ eyebrow, title, meta, generated }) {
  const s = useStyles();
  return (
    <View style={s.exportBanner}>
      <Image source={APP_LOGO} style={s.exportLogo} resizeMode="contain" />
      <View style={s.exportBannerText}>
        <FixedText style={s.exportBannerEyebrow}>
          {String(eyebrow).toUpperCase()}
        </FixedText>
        <FixedText style={s.exportBannerTitle}>{title}</FixedText>
        {meta ? <FixedText style={s.exportBannerMeta}>{meta}</FixedText> : null}
      </View>
      <FixedText style={s.exportBannerGenerated}>
        {`Generated\n${generated}`}
      </FixedText>
    </View>
  );
}
