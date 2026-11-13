/**
 * Home (redesign v1 — owner's light + dark mockups).
 * Custom app bar (the stack header is hidden for this route), summary card,
 * catering cards with status avatars, hint, and the "New Catering" button.
 */
import React, { useCallback, useState } from 'react';
import { FlatList, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useStyles } from '@/theme';
import { getEarningsData, listCateringsOverview } from '@/data';
import { showError } from '@/components/alert';
import { ROUTES } from '@/navigation/routes';
import HomeAppBar from './home/HomeAppBar';
import HeroCard from './home/HeroCard';
import CateringCard from './home/CateringCard';
import HomeHint from './home/HomeHint';
import NewCateringButton from './home/NewCateringButton';
import CateringSheet from './CateringSheet';

/** The "Start collecting…" hint shows only up to this many caterings (avoids extra scrolling). */
const HINT_MAX_CATERINGS = 3;

export default function HomeScreen({ navigation }) {
  const s = useStyles();
  const [items, setItems] = useState([]);
  const [earnings, setEarnings] = useState(null);
  const [newCatering, setNewCatering] = useState(null); // {} while the card is open

  const load = useCallback(() => {
    let active = true;
    Promise.all([listCateringsOverview(), getEarningsData()])
      .then(([caterings, data]) => {
        if (active) {
          setItems(caterings);
          setEarnings(data);
        }
      })
      .catch(showError);
    return () => {
      active = false;
    };
  }, []);
  useFocusEffect(load);

  return (
    <View style={s.homeScreen}>
      <HomeAppBar onSettings={() => navigation.navigate(ROUTES.SETTINGS)} />
      <FlatList
        data={items}
        keyExtractor={c => String(c.id)}
        contentContainerStyle={s.homeList}
        ListHeaderComponent={<HeroCard data={earnings} />}
        ListFooterComponent={
          items.length <= HINT_MAX_CATERINGS ? <HomeHint /> : null
        }
        renderItem={({ item }) => (
          <CateringCard
            catering={item}
            onPress={() =>
              navigation.navigate(ROUTES.CATERING, { id: item.id })
            }
          />
        )}
      />
      <NewCateringButton onPress={() => setNewCatering({})} />
      <CateringSheet
        catering={newCatering}
        onClose={() => setNewCatering(null)}
        onSaved={({ id }) => {
          setNewCatering(null);
          load();
          // open the new catering, as before
          navigation.navigate(ROUTES.CATERING, { id });
        }}
      />
    </View>
  );
}
