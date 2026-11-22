import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { usePreventRemove, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as Crypto from 'expo-crypto';
import { useZaznamBehu } from '../lib/beh/zaznam';
import { ulozPosledniBeh } from '../lib/beh/poslednibeh';
import { vytvorTestovaciBeh } from '../lib/beh/testovaciBeh';
import {
   aktualniTempo,
   celkovaVzdalenost,
   filtrujBody,
   formatCasu,
   formatTempa,
   prumerneTempo,
} from '../lib/beh/vypocty';

const ORANZOVA = '#fc4c02';

export default function Beh() {
   const router = useRouter();
   const zaznam = useZaznamBehu();

   // behem behu (bezi / pauza) se sipka zpet zepta, jestli zahodit
   const behRozbehnuty = zaznam.stav === 'bezi' || zaznam.stav === 'pauza';

   const vypnoutZeptani = usePreventRemove(behRozbehnuty, ({ repeat }) => {
      Alert.alert('Zahodit rozběhnutý běh?', 'Zaznamenaná trasa se nedá obnovit.', [
         { text: 'Pokračovat v běhu', style: 'cancel' },
         {
            text: 'Zahodit',
            style: 'destructive',
            onPress: () => {
               vypnoutZeptani();
               repeat();
            },
         },
      ]);
   });

   const filtrovaneBody = filtrujBody(zaznam.body);
   const vzdalenostM = celkovaVzdalenost(filtrovaneBody);
   const vzdalenostKm = vzdalenostM / 1000;
   const aktualni = aktualniTempo(filtrovaneBody, Date.now());
   // pod 20 m je to jen sum GPS, tempo by vyslo nesmyslne -> zobrazit "--:--"
   let prumerne: number | null = null;
   if (vzdalenostM >= 20) {
      prumerne = prumerneTempo(vzdalenostM, zaznam.casPohybuS);
   }

   function ukoncitBeh() {
      Alert.alert('Ukončit běh?', undefined, [
         { text: 'Ne', style: 'cancel' },
         {
            text: 'Ano',
            onPress: () => {
               zaznam.ukoncit();

               let zacatekBehu = Date.now();
               if (zaznam.zacatek !== null) {
                  zacatekBehu = zaznam.zacatek;
               }

               ulozPosledniBeh({
                  externalId: Crypto.randomUUID(),
                  zacatek: zacatekBehu,
                  celkovyCasS: zaznam.celkovyCasS,
                  casPohybuS: zaznam.casPohybuS,
                  body: filtrovaneBody,
               });

               vypnoutZeptani();
               router.replace('/beh-souhrn');
            },
         },
      ]);
   }

   async function lehkyKlepnuti() {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
   }

   // ----- stav GPS nahore -----
   let gpsTecka = '#9ca3af';
   let gpsText = 'Hledám GPS…';
   if (zaznam.stav === 'pripraveno' || zaznam.stav === 'bezi' || zaznam.stav === 'pauza') {
      gpsTecka = '#22c55e';
      gpsText = 'GPS připraveno';
   }

   if (zaznam.stav === 'zamitnuto') {
      return (
         <SafeAreaView style={styles.obrazovka}>
            <View style={styles.stredovy}>
               <Text style={styles.nadpisZamitnuto}>Poloha není povolená</Text>
               <Text style={styles.textZamitnuto}>
                  Bez přístupu k poloze nejde zaznamenat trasu běhu. Povol ho v nastavení telefonu.
               </Text>
               <Pressable
                  onPress={() => Linking.openSettings()}
                  style={({ pressed }) => [styles.tlacitko, { opacity: pressed ? 0.75 : 1 }]}
               >
                  <Text style={styles.tlacitkoText}>Otevřít nastavení</Text>
               </Pressable>
            </View>
         </SafeAreaView>
      );
   }

   return (
      <SafeAreaView style={styles.obrazovka}>
         <View style={styles.gpsRadek}>
            <View style={[styles.gpsTecka, { backgroundColor: gpsTecka }]} />
            <Text style={styles.gpsText}>{gpsText}</Text>
         </View>

         <View style={styles.stredovy}>
            <Text style={styles.popisek}>ČAS</Text>
            <Text style={styles.velkyCas}>{formatCasu(zaznam.casPohybuS)}</Text>

            <Text style={styles.popisek}>VZDÁLENOST (km)</Text>
            <Text style={styles.hodnota}>{vzdalenostKm.toFixed(2)}</Text>

            <View style={styles.dvaSloupce}>
               <View style={styles.sloupec}>
                  <Text style={styles.popisek}>TEMPO</Text>
                  <Text style={styles.hodnotaMensi}>{formatTempa(aktualni)}</Text>
               </View>
               <View style={styles.sloupec}>
                  <Text style={styles.popisek}>PRŮMĚR</Text>
                  <Text style={styles.hodnotaMensi}>{formatTempa(prumerne)}</Text>
               </View>
            </View>
         </View>

         <View style={styles.tlacitka}>
            {__DEV__ ? (
               <Pressable
                  onPress={() => {
                     ulozPosledniBeh(vytvorTestovaciBeh());
                     vypnoutZeptani();
                     router.replace('/beh-souhrn');
                  }}
                  style={{ paddingVertical: 10, alignItems: 'center' }}
               >
                  <Text style={{ color: '#64748b', fontSize: 13 }}>[dev] Nahrát testovací běh</Text>
               </Pressable>
            ) : null}
            {zaznam.stav === 'cekam-na-gps' || zaznam.stav === 'pripraveno' ? (
               <Pressable
                  disabled={zaznam.stav === 'cekam-na-gps'}
                  onPress={async () => {
                     await lehkyKlepnuti();
                     zaznam.start();
                  }}
                  style={({ pressed }) => [
                     styles.tlacitko,
                     {
                        backgroundColor: zaznam.stav === 'cekam-na-gps' ? '#d1d5db' : ORANZOVA,
                        opacity: pressed ? 0.75 : 1,
                     },
                  ]}
               >
                  <Text style={styles.tlacitkoText}>Start</Text>
               </Pressable>
            ) : null}

            {zaznam.stav === 'bezi' ? (
               <View style={styles.dvaTlacitka}>
                  <Pressable
                     onPress={async () => {
                        await lehkyKlepnuti();
                        zaznam.pauza();
                     }}
                     style={({ pressed }) => [styles.tlacitkoPulka, { opacity: pressed ? 0.75 : 1 }]}
                  >
                     <Text style={styles.tlacitkoText}>Pauza</Text>
                  </Pressable>
                  <Pressable
                     onPress={async () => {
                        await lehkyKlepnuti();
                        ukoncitBeh();
                     }}
                     style={({ pressed }) => [styles.tlacitkoPulkaStop, { opacity: pressed ? 0.75 : 1 }]}
                  >
                     <Text style={styles.tlacitkoText}>Stop</Text>
                  </Pressable>
               </View>
            ) : null}

            {zaznam.stav === 'pauza' ? (
               <View style={styles.dvaTlacitka}>
                  <Pressable
                     onPress={async () => {
                        await lehkyKlepnuti();
                        zaznam.pokracovat();
                     }}
                     style={({ pressed }) => [styles.tlacitkoPulka, { opacity: pressed ? 0.75 : 1 }]}
                  >
                     <Text style={styles.tlacitkoText}>Pokračovat</Text>
                  </Pressable>
                  <Pressable
                     onPress={async () => {
                        await lehkyKlepnuti();
                        ukoncitBeh();
                     }}
                     style={({ pressed }) => [styles.tlacitkoPulkaStop, { opacity: pressed ? 0.75 : 1 }]}
                  >
                     <Text style={styles.tlacitkoText}>Stop</Text>
                  </Pressable>
               </View>
            ) : null}
         </View>
      </SafeAreaView>
   );
}

const styles = StyleSheet.create({
   obrazovka: {
      flex: 1,
      backgroundColor: '#ffffff',
      paddingHorizontal: 20,
   },
   gpsRadek: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingTop: 8,
   },
   gpsTecka: {
      width: 10,
      height: 10,
      borderRadius: 5,
   },
   gpsText: {
      color: '#475569',
      fontSize: 14,
      fontWeight: '600',
   },
   stredovy: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 6,
   },
   popisek: {
      color: '#94a3b8',
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 1,
      marginTop: 14,
   },
   velkyCas: {
      color: '#0f172a',
      fontSize: 72,
      fontWeight: '900',
   },
   hodnota: {
      color: '#0f172a',
      fontSize: 48,
      fontWeight: '800',
   },
   dvaSloupce: {
      flexDirection: 'row',
      gap: 40,
   },
   sloupec: {
      alignItems: 'center',
   },
   hodnotaMensi: {
      color: '#0f172a',
      fontSize: 30,
      fontWeight: '800',
   },
   tlacitka: {
      paddingBottom: 24,
   },
   tlacitko: {
      backgroundColor: ORANZOVA,
      borderRadius: 16,
      paddingVertical: 18,
      alignItems: 'center',
   },
   tlacitkoText: {
      color: '#ffffff',
      fontSize: 18,
      fontWeight: '800',
   },
   dvaTlacitka: {
      flexDirection: 'row',
      gap: 12,
   },
   tlacitkoPulka: {
      flex: 1,
      backgroundColor: ORANZOVA,
      borderRadius: 16,
      paddingVertical: 18,
      alignItems: 'center',
   },
   tlacitkoPulkaStop: {
      flex: 1,
      backgroundColor: '#334155',
      borderRadius: 16,
      paddingVertical: 18,
      alignItems: 'center',
   },
   nadpisZamitnuto: {
      color: '#0f172a',
      fontSize: 22,
      fontWeight: '800',
   },
   textZamitnuto: {
      color: '#475569',
      fontSize: 15,
      textAlign: 'center',
      marginBottom: 16,
   },
});
