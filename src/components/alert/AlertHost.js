/**
 * Renders alerts from alertService. Mount once, near the app root (inside
 * ThemeProvider so it follows the theme).
 */
import React, { useEffect, useRef, useState } from 'react';
import { Modal, Pressable } from 'react-native';
import { useStyles } from '@/theme';
import { registerAlertHost } from './alertService';
import KitAlertCard from './KitAlertCard';

export default function AlertHost() {
  const s = useStyles();
  const [current, setCurrent] = useState(null); // { config, done }
  const [selected, setSelected] = useState([]);
  const doneRef = useRef(null);

  useEffect(
    () =>
      registerAlertHost((config, done) => {
        setSelected(config.selected || []);
        setCurrent({ config, done });
      }),
    [],
  );

  const close = result => {
    if (!current) {
      return;
    }
    const { done } = current;
    setCurrent(null);
    done({
      value: null,
      selected,
      cancelled: false,
      auto: false,
      ...result,
    });
  };
  doneRef.current = close;

  // auto close
  useEffect(() => {
    if (!current?.config.autoCloseMs) {
      return undefined;
    }
    const t = setTimeout(
      () =>
        doneRef.current({
          value: current.config.autoCloseValue ?? true,
          auto: true,
        }),
      current.config.autoCloseMs,
    );
    return () => clearTimeout(t);
  }, [current]);

  if (!current) {
    return null;
  }
  const c = current.config;

  const cancel = () => {
    if (c.cancelable) {
      close({ value: null, cancelled: true });
    }
  };

  const toggle = value => {
    if (c.multiple) {
      setSelected(sel =>
        sel.includes(value) ? sel.filter(v => v !== value) : [...sel, value],
      );
    } else if (c.closeOnSelect) {
      // pick-and-go lists (e.g. Sort): the tapped option is the answer
      close({ value, selected: [value], cancelled: false });
    } else {
      setSelected([value]);
    }
  };

  // every alert uses the redesigned card (hero / header) — see KitAlertCard
  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={cancel}
    >
      <Pressable style={s.kitDialogBackdrop} onPress={cancel}>
        <KitAlertCard
          config={c}
          selected={selected}
          onToggle={toggle}
          onCancel={() => close({ value: null, cancelled: true })}
          onButton={b =>
            close({ value: b.value, cancelled: b.style === 'cancel' })
          }
        />
      </Pressable>
    </Modal>
  );
}
