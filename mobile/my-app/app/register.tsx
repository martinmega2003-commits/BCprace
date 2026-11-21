import React, { useRef, useState } from 'react';
import {
   Alert,
   KeyboardAvoidingView,
   Platform,
   Pressable,
   ScrollView,
   StyleSheet,
   Text,
   TextInput,
   View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';




const ORANZOVA = '#fc4c02';
// stejne pravidlo jako v backendu (sandbox: password min 8 znaku)
const MIN_DELKA_HESLA = 8;
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://10.0.2.2:3000';

export default function RegisterScreen() {
   const router = useRouter();

   const [jmeno, setJmeno] = useState('');
   const [email, setEmail] = useState('');
   const [heslo, setHeslo] = useState('');
   const [hesloZnovu, setHesloZnovu] = useState('');
   const [zobrazitHeslo, setZobrazitHeslo] = useState(false);
   // ktere policko je prave aktivni (kvuli oranzovemu okraji)
   const [aktivniPole, setAktivniPole] = useState<'jmeno' | 'email' | 'heslo' | 'hesloZnovu' | null>(null);
   // pojistka proti dvojimu odeslani: true, dokud ceka na odpoved serveru
   const [odesilam, setOdesilam] = useState(false);
   // stejna pojistka, ale zmeni se OKAMZITE (useState se projevi az pri dalsim vykresleni,
   // takze dve rychla tuknuti za sebou by ho jeste videla jako false)
   const odesilaSe = useRef(false);

   const hesloJeKratke = heslo.length > 0 && heslo.length < MIN_DELKA_HESLA;
   const heslaSeNeshoduji = hesloZnovu.length > 0 && heslo !== hesloZnovu;

   // tlacitko jde zmacknout, jen kdyz je vse vyplnene a hesla sedi
   const lzeRegistrovat =
      jmeno.trim().length > 0 &&
      email.trim().length > 0 &&
      email.includes('@') &&
      heslo.length >= MIN_DELKA_HESLA &&
      heslo === hesloZnovu;

   async function registrovat() {
      // uz se odesila -> druhe zavolani ignorujeme
      if (odesilaSe.current) {
         return;
      }
      odesilaSe.current = true;
      setOdesilam(true);

      try {
         const odpoved = await fetch(`${API_BASE_URL}/api/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: jmeno.trim(), email: email.trim(), password: heslo }),
         });

         // 201 = ucet vytvoren
         if (odpoved.ok) {
            Alert.alert('Hotovo', 'Účet je vytvořený, teď se přihlas.');
            return;
         }

         // 409 = ucet s timto e-mailem uz existuje
         if (odpoved.status === 409) {
            Alert.alert('Registrace se nepovedla', 'Účet s tímto e-mailem už existuje.');
            return;
         }

         // 400 = spatna data (backend posle duvod v "error")
         if (odpoved.status === 400) {
            const data = await odpoved.json();
            Alert.alert('Registrace se nepovedla', data.error);
            return;
         }

         // jina chyba na serveru (napr. 500)
         Alert.alert('Registrace se nepovedla', `Chyba serveru (${odpoved.status}). Zkus to později.`);
      } catch {
         // server nebezi nebo telefon nema sit
         Alert.alert('Registrace se nepovedla', 'Nepodařilo se spojit se serverem.');
      } finally {
         // probehne vzdy (uspech i chyba) -> tlacitko jde zase pouzit
         odesilaSe.current = false;
         setOdesilam(false);
      }
   }





   return (
      <SafeAreaView style={styles.obrazovka}>
         {/* sipka zpet na prihlaseni (levy horni roh) */}
         <Pressable onPress={() => router.back()} hitSlop={12} style={styles.zpet}>
            <Ionicons name="chevron-back" size={28} color="#0f172a" />
         </Pressable>
         {/* posune obsah nahoru, aby klavesnice nezakryla policka */}
         <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
         >
            <ScrollView
               contentContainerStyle={styles.obsah}
               keyboardShouldPersistTaps="handled"
            >
               <View style={styles.karta}>
                  <Text style={styles.znacka}>BCPRACE</Text>
                  <Text style={styles.nadpis}>Vytvoř si účet</Text>
                  <Text style={styles.podnadpis}>
                     Pár údajů a můžeš začít sbírat svoje tréninky.
                  </Text>

                  <Text style={styles.popisek}>Jméno</Text>
                  <TextInput
                     value={jmeno}
                     onChangeText={setJmeno}
                     placeholder="Jak ti máme říkat"
                     placeholderTextColor="#94a3b8"
                     autoCapitalize="words"
                     autoComplete="name"
                     textContentType="name"
                     returnKeyType="next"
                     onFocus={() => setAktivniPole('jmeno')}
                     onBlur={() => setAktivniPole(null)}
                     style={[styles.policko, aktivniPole === 'jmeno' && styles.polickoAktivni]}
                  />

                  <Text style={styles.popisek}>E-mail</Text>
                  <TextInput
                     value={email}
                     onChangeText={setEmail}
                     placeholder="jmeno@email.cz"
                     placeholderTextColor="#94a3b8"
                     keyboardType="email-address"
                     autoCapitalize="none"
                     autoCorrect={false}
                     autoComplete="email"
                     textContentType="emailAddress"
                     returnKeyType="next"
                     onFocus={() => setAktivniPole('email')}
                     onBlur={() => setAktivniPole(null)}
                     style={[styles.policko, aktivniPole === 'email' && styles.polickoAktivni]}
                  />

                  <Text style={styles.popisek}>Heslo</Text>
                  <View style={[styles.policko, styles.polickoSHeslem, aktivniPole === 'heslo' && styles.polickoAktivni]}>
                     <TextInput
                        value={heslo}
                        onChangeText={setHeslo}
                        placeholder={`Aspoň ${MIN_DELKA_HESLA} znaků`}
                        placeholderTextColor="#94a3b8"
                        secureTextEntry={!zobrazitHeslo}
                        autoCapitalize="none"
                        autoCorrect={false}
                        autoComplete="new-password"
                        textContentType="newPassword"
                        returnKeyType="next"
                        onFocus={() => setAktivniPole('heslo')}
                        onBlur={() => setAktivniPole(null)}
                        style={styles.vstupHesla}
                     />
                     <Pressable onPress={() => setZobrazitHeslo(!zobrazitHeslo)} hitSlop={10}>
                        <Text style={styles.zobrazitHeslo}>
                           {zobrazitHeslo ? 'Skrýt' : 'Zobrazit'}
                        </Text>
                     </Pressable>
                  </View>
                  {hesloJeKratke && (
                     <Text style={styles.chyba}>Heslo musí mít aspoň {MIN_DELKA_HESLA} znaků.</Text>
                  )}

                  <Text style={styles.popisek}>Heslo znovu</Text>
                  <TextInput
                     value={hesloZnovu}
                     onChangeText={setHesloZnovu}
                     placeholder="Zopakuj heslo"
                     placeholderTextColor="#94a3b8"
                     secureTextEntry={!zobrazitHeslo}
                     autoCapitalize="none"
                     autoCorrect={false}
                     autoComplete="new-password"
                     textContentType="newPassword"
                     returnKeyType="done"
                     onSubmitEditing={registrovat}
                     onFocus={() => setAktivniPole('hesloZnovu')}
                     onBlur={() => setAktivniPole(null)}
                     style={[styles.policko, aktivniPole === 'hesloZnovu' && styles.polickoAktivni]}
                  />
                  {heslaSeNeshoduji && (
                     <Text style={styles.chyba}>Hesla se neshodují.</Text>
                  )}

                  <Pressable
                  
                     onPress={async () => {
                        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        registrovat();
                                 }}
                     disabled={!lzeRegistrovat || odesilam}
                     style={({ pressed }) => [
                        styles.tlacitko,
                        
                        !lzeRegistrovat && styles.tlacitkoNeaktivni,
                        pressed && styles.tlacitkoZmacknute,
                     ]}
                  >
                     <Text style={styles.tlacitkoText}>Vytvořit účet</Text>
                  </Pressable>

                  <View style={styles.prepnout}>
                     <Text style={styles.prepnoutText}>Už máš účet? </Text>
                     <Pressable onPress={() => router.back()} hitSlop={10}>
                        <Text style={styles.prepnoutOdkaz}>Přihlas se</Text>
                     </Pressable>
                  </View>
               </View>
            </ScrollView>
         </KeyboardAvoidingView>
      </SafeAreaView>
   );
}

// Stejne styly jako na prihlaseni (app/index.tsx), az jich bude vic, dame je do jednoho souboru.
const styles = StyleSheet.create({
   zpet: {
      alignSelf: 'flex-start',
      marginTop: 8,
      marginLeft: 12,
      padding: 4,
   },
   obrazovka: {
      flex: 1,
      backgroundColor: '#f8fafc',
   },
   obsah: {
      flexGrow: 1,
      justifyContent: 'center',
      paddingHorizontal: 24,
      paddingVertical: 32,
   },
   karta: {
      backgroundColor: '#ffffff',
      borderRadius: 24,
      padding: 24,
      borderWidth: 1,
      borderColor: '#e5e7eb',
      shadowColor: '#0f172a',
      shadowOpacity: 0.06,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 3,
   },
   znacka: {
      color: ORANZOVA,
      fontSize: 13,
      fontWeight: '800',
      letterSpacing: 1.4,
      marginBottom: 12,
   },
   nadpis: {
      color: '#0f172a',
      fontSize: 30,
      lineHeight: 36,
      fontWeight: '700',
      marginBottom: 8,
   },
   podnadpis: {
      color: '#475569',
      fontSize: 16,
      lineHeight: 24,
      marginBottom: 28,
   },
   popisek: {
      color: '#334155',
      fontSize: 14,
      fontWeight: '600',
      marginBottom: 8,
   },
   policko: {
      backgroundColor: '#f8fafc',
      borderWidth: 1.5,
      borderColor: '#e2e8f0',
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 16,
      color: '#0f172a',
      marginBottom: 18,
   },
   polickoAktivni: {
      borderColor: ORANZOVA,
      backgroundColor: '#ffffff',
   },
   polickoSHeslem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 0,
   },
   vstupHesla: {
      flex: 1,
      paddingVertical: 14,
      fontSize: 16,
      color: '#0f172a',
   },
   zobrazitHeslo: {
      color: ORANZOVA,
      fontSize: 14,
      fontWeight: '700',
      marginLeft: 12,
   },
   chyba: {
      color: '#dc2626',
      fontSize: 13,
      marginTop: -10,
      marginBottom: 14,
   },
   tlacitko: {
      backgroundColor: ORANZOVA,
      borderRadius: 16,
      paddingVertical: 16,
      alignItems: 'center',
      marginTop: 6,
   },
   tlacitkoNeaktivni: {
      backgroundColor: '#fdba74',
   },
   tlacitkoZmacknute: {
      opacity: 0.85,
   },
   tlacitkoText: {
      color: '#ffffff',
      fontSize: 16,
      fontWeight: '700',
   },
   prepnout: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: 20,
   },
   prepnoutText: {
      color: '#64748b',
      fontSize: 15,
   },
   prepnoutOdkaz: {
      color: ORANZOVA,
      fontSize: 15,
      fontWeight: '700',
   },
});
