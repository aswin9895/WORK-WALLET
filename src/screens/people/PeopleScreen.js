/**
 * People (redesign v1 — owner's light + dark mockups, light layout for both).
 * Gradient header, intro block, person cards, "+ Add person".
 *
 * "+ Add person" sits right under the list; when the list is long enough to
 * scroll it is pinned to the bottom instead (owner's rule). The list footer
 * always has the same height in both cases, so switching never loops.
 */
import React, { useCallback, useState } from 'react';
import { FlatList, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus } from 'lucide-react-native';
import { mdiAccountGroup } from '@mdi/js';
import { useStyles } from '@/theme';
import { IntroBlock, KitButton, ScreenHeader } from '@/components/kit';
import { BottomWave } from '@/components/graphics/Waves';
import { listPeople } from '@/data';
import { showError } from '@/components/alert';
import PersonCard from './PersonCard';
import PersonSheet from './PersonSheet';

const BUTTON_HEIGHT = 48; // = .kit-cta height
const BUTTON_GAP = 16; // space above the button and above the screen bottom

export default function PeopleScreen({ navigation }) {
  const s = useStyles();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState([]);
  const [sheetPerson, setSheetPerson] = useState(null); // null | {} | person
  const [viewportH, setViewportH] = useState(0);
  const [contentH, setContentH] = useState(0);

  const load = useCallback(() => {
    listPeople().then(setItems).catch(showError);
  }, []);
  useFocusEffect(load);

  const footerH = BUTTON_GAP + BUTTON_HEIGHT + BUTTON_GAP + insets.bottom;
  const pinned = viewportH > 0 && contentH > viewportH + 1;

  const addButton = (
    <KitButton
      title="Add person"
      shape="pill"
      Icon={Plus}
      onPress={() => setSheetPerson({})}
    />
  );

  return (
    <View style={s.kitScreen}>
      <BottomWave color={s.palBottomWave.color} style={s.kitBottomWave} />
      <ScreenHeader title="People" onBack={() => navigation.goBack()} />
      <FlatList
        data={items}
        keyExtractor={p => String(p.id)}
        contentContainerStyle={s.kitContentList}
        onLayout={e => setViewportH(e.nativeEvent.layout.height)}
        onContentSizeChange={(w, h) => setContentH(h)}
        ListHeaderComponent={
          <IntroBlock
            iconPath={mdiAccountGroup}
            title="People"
            subtitle="Manage your team and rates"
          />
        }
        renderItem={({ item }) => (
          <PersonCard person={item} onPress={() => setSheetPerson(item)} />
        )}
        ListFooterComponent={
          <View style={[s.kitCtaInline, { height: footerH }]}>
            {pinned ? null : addButton}
          </View>
        }
      />
      {pinned ? (
        <View style={[s.kitCtaFixed, { bottom: insets.bottom + BUTTON_GAP }]}>
          {addButton}
        </View>
      ) : null}
      <PersonSheet
        person={sheetPerson}
        onClose={() => setSheetPerson(null)}
        onSaved={() => {
          setSheetPerson(null);
          load();
        }}
      />
    </View>
  );
}
