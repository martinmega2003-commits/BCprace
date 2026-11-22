import { useRouter } from 'expo-router';
import { nactiPosledniBeh, smazPosledniBeh } from '../lib/beh/poslednibeh';
import { celkovaVzdalenost, formatCasu, formatTempa, mezicasy, prumerneTempo } from '../lib/beh/vypocty';
import { useRef, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ulozBeh } from '../lib/beh/odeslani';
import MapaTrasy from '../components/MapaTrasy';

export default function BehSouhrn() {
   const router = useRouter();
   const beh = nactiPosledniBeh();
   const [odesilam, setOdesilam] = useState(false);
   // zmeni se OKAMZITE (useState az pri dalsim vykresleni), proto pojistka i v ref
   const odesilaSe = useRef(false);

   // nic v pameti (napr. appka se restartovala) -> zpet na dashboard
   useEffect(() => {
      if (beh === null) {
         router.replace('/(tabs)/dashboard');
      }
   }, [beh, router]);

   if (beh === null) {
      return null;
   }

   const vzdalenostM = celkovaVzdalenost(beh.body);
   const tempo = prumerneTempo(vzdalenostM, beh.casPohybuS);

   // jeden radek na kazdy dokonceny kilometr: "km 1   5:52"
   const casyKilometru = mezicasy(beh.body);
   const radkyMezicasu = [];
   for (let i = 0; i < casyKilometru.length; i = i + 1) {
      radkyMezicasu.push(
         <View key={i} style={styles.radekKilometru}>
            <Text style={styles.radekKilometruText}>km {i + 1}</Text>
            <Text style={styles.radekKilometruText}>{formatTempa(casyKilometru[i])}</Text>
         </View>
      );
   }

   async function ulozit() {
      if (odesilaSe.current === true) {
         return;
      }
      if (beh === null) {
         return;
      }
      odesilaSe.current = true;
      setOdesilam(true);

      try {
         await ulozBeh(beh);
         smazPosledniBeh();
         router.replace('/(tabs)/dashboard');
      } catch (chyba) {
         let zprava = 'Běh zůstal v paměti, zkus to znovu.';
         if (chyba instanceof Error) {
            zprava = chyba.message;
         }
         Alert.alert('Uložení se nepovedlo', zprava);
         odesilaSe.current = false;
         setOdesilam(false);
      }
   }

   function zahodit() {
      Alert.alert('Zahodit běh?', 'Zaznamenaná trasa se nedá obnovit.', [
         { text: 'Ne', style: 'cancel' },
         {
            text: 'Zahodit',
            style: 'destructive',
            onPress: () => {
               smazPosledniBeh();
               router.replace('/(tabs)/dashboard');
            },
         },
      ]);
   }

   return (
      <SafeAreaView style={styles.obrazovka} edges={['bottom']}>
         <ScrollView contentContainerStyle={styles.obsah}>
            <Text style={styles.nadpis}>Hotovo, dobrý běh!</Text>

            <View style={styles.mapaRamecek}>
               <MapaTrasy body={beh.body} />
            </View>

            <View style={styles.karta}>
               <Text style={styles.popisek}>VZDÁLENOST</Text>
               <Text style={styles.velkaHodnota}>{(vzdalenostM / 1000).toFixed(2)} km</Text>

               <View style={styles.dvaSloupce}>
                  <View style={styles.sloupec}>
                     <Text style={styles.popisek}>ČAS</Text>
                     <Text style={styles.hodnota}>{formatCasu(beh.casPohybuS)}</Text>
                  </View>
                  <View style={styles.sloupec}>
                     <Text style={styles.popisek}>PRŮMĚRNÉ TEMPO</Text>
                     <Text style={styles.hodnota}>{formatTempa(tempo)} /km</Text>
                  </View>
               </View>
            </View>

            {casyKilometru.length > 0 ? (
               <View style={styles.karta}>
                  <Text style={styles.popisek}>KILOMETRY</Text>
                  {radkyMezicasu}
               </View>
            ) : null}

            <Pressable
               onPress={ulozit}
               disabled={odesilam}
               style={({ pressed }) => [
                  styles.tlacitkoUlozit,
                  { opacity: pressed || odesilam ? 0.6 : 1 },
               ]}
            >
               <Text style={styles.tlacitkoUlozitText}>{odesilam ? 'Ukládám…' : 'Uložit běh'}</Text>
            </Pressable>

            <Pressable
               onPress={zahodit}
               disabled={odesilam}
               style={({ pressed }) => [styles.tlacitkoZahodit, { opacity: pressed ? 0.6 : 1 }]}
            >
               <Text style={styles.tlacitkoZahoditText}>Zahodit</Text>
            </Pressable>
         </ScrollView>
      </SafeAreaView>
   );
}

const ORANZOVA = '#fc4c02';

const styles = StyleSheet.create({
   obrazovka: {
      flex: 1,
      backgroundColor: '#f8fafc',
   },
   obsah: {
      padding: 16,
      gap: 16,
   },
   nadpis: {
      color: '#0f172a',
      fontSize: 24,
      fontWeight: '800',
   },
   mapaRamecek: {
      borderRadius: 20,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: '#e5e7eb',
   },
   karta: {
      backgroundColor: '#ffffff',
      borderRadius: 20,
      padding: 18,
      borderWidth: 1,
      borderColor: '#e5e7eb',
      gap: 6,
   },
   popisek: {
      color: '#94a3b8',
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 1,
   },
   velkaHodnota: {
      color: '#0f172a',
      fontSize: 40,
      fontWeight: '900',
   },
   dvaSloupce: {
      flexDirection: 'row',
      gap: 16,
      marginTop: 10,
   },
   sloupec: {
      flex: 1,
      gap: 4,
   },
   hodnota: {
      color: '#0f172a',
      fontSize: 22,
      fontWeight: '800',
   },
   radekKilometru: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 6,
      borderBottomWidth: 1,
      borderBottomColor: '#f1f5f9',
   },
   radekKilometruText: {
      color: '#0f172a',
      fontSize: 16,
      fontWeight: '600',
   },
   tlacitkoUlozit: {
      backgroundColor: ORANZOVA,
      borderRadius: 16,
      paddingVertical: 18,
      alignItems: 'center',
   },
   tlacitkoUlozitText: {
      color: '#ffffff',
      fontSize: 18,
      fontWeight: '800',
   },
   tlacitkoZahodit: {
      borderRadius: 16,
      paddingVertical: 14,
      alignItems: 'center',
   },
   tlacitkoZahoditText: {
      color: '#dc2626',
      fontSize: 16,
      fontWeight: '700',
   },
});
