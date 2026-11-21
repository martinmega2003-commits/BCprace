import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { nactiToken, ulozToken } from "@/lib/token"

const ORANZOVA = '#fc4c02';
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://10.0.2.2:3000';


export default function LoginScreen() {
   const router = useRouter();

   const [email, setEmail] = useState('test@gmail.com');
   const [heslo, setHeslo] = useState('testovaciheslo');
   const [zobrazitHeslo, setZobrazitHeslo] = useState(false);
   // ktere policko je prave aktivni (kvuli oranzovemu okraji)
   const [aktivniPole, setAktivniPole] = useState<'email' | 'heslo' | null>(null);
   // pojistka proti dvojimu odeslani: true, dokud ceka na odpoved serveru (kvuli sedemu tlacitku)
   const [odesilam, setOdesilam] = useState(false);
   // stejna pojistka, ale zmeni se OKAMZITE (useState se projevi az pri dalsim vykresleni)
   const odesilaSe = useRef(false);
   
   // tlacitko jde zmacknout, jen kdyz je vyplneny email i heslo
   const lzePrihlasit = email.trim().length > 0 && heslo.length > 0;

   // DOCASNE: prihlaseni pres odkaz myapp://auth/callback?session_id=... (dokud neni backend loginu)
   const handleAuthCallback = useCallback((url: string) => {
      const parsedURL = Linking.parse(url);
      const SessionID = parsedURL?.queryParams?.session_id;

      if (typeof SessionID !== 'string') {
         return false;
      }

      router.replace({
         pathname: '/(tabs)/dashboard',
         params: { session_id: SessionID },
      });

      return true;
   }, [router]);

   useEffect(() => {
      const subscription = Linking.addEventListener('url', ({ url }) => {
         handleAuthCallback(url);
      });

      Linking.getInitialURL().then((url) => {
         if (url) {
            handleAuthCallback(url);
         }
      });

      return () => {
         subscription.remove();
      };
   }, [handleAuthCallback]);

   async function prihlasit() {
      // uz se prihlasuje -> druhe zavolani (dvojklik, Enter + tuknuti) ignorujeme
      if (odesilaSe.current) {
         return;
      }
      odesilaSe.current = true;
      setOdesilam(true);

         try {
         const odpoved = await fetch(`${API_BASE_URL}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email.trim(), password: heslo }),
         });

         // 200 = prihlaseni probehlo
         if (odpoved.ok) {
            const data = await odpoved.json()
            await ulozToken(data.token);
            router.replace('/(tabs)/dashboard');
            Alert.alert('Přihlášeno', `Vítej zpátky! ${data.username} `);
            return;
         }

         // 401 = spatny e-mail nebo heslo (schvalne nerikame, ktere z toho)
         if (odpoved.status === 401) {
            Alert.alert('Přihlášení se nepovedlo', 'Špatný e-mail nebo heslo.');
            return;
         }

         // 403 = ucet existuje, ale e-mail jeste neni overeny
         if (odpoved.status === 403) {
            Alert.alert('Přihlášení se nepovedlo', 'Nejdřív si ověř e-mail.');
            return;
         }

         // 400 = chybi e-mail nebo heslo (backend posle duvod v "error")
         if (odpoved.status === 400) {
            const data = await odpoved.json();
            Alert.alert('Přihlášení se nepovedlo', data.error);
            return;
         }

         // jina chyba na serveru (napr. 500)
         Alert.alert('Přihlášení se nepovedlo', `Chyba serveru (${odpoved.status}). Zkus to později.`);
         } catch {
         // server nebezi nebo telefon nema sit
         Alert.alert('Přihlášení se nepovedlo', 'Nepodařilo se spojit se serverem.');
         } finally {
         // probehne vzdy (uspech i chyba) -> tlacitko jde zase pouzit
         odesilaSe.current = false;
         setOdesilam(false);
         }
   }

   return (
      <SafeAreaView style={styles.obrazovka}>
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
                  <Text style={styles.nadpis}>Vítej zpátky</Text>
                  <Text style={styles.podnadpis}>
                     Přihlas se a pokračuj ve svých trénincích.
                  </Text>

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
                        placeholder="Tvoje heslo"
                        placeholderTextColor="#94a3b8"
                        secureTextEntry={!zobrazitHeslo}
                        autoCapitalize="none"
                        autoCorrect={false}
                        autoComplete="password"
                        textContentType="password"
                        returnKeyType="done"
                        onSubmitEditing={prihlasit}
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

                  <Pressable
                     onPress={prihlasit}
                     disabled={!lzePrihlasit || odesilam}
                     style={({ pressed }) => [
                        styles.tlacitko,
                        !lzePrihlasit && styles.tlacitkoNeaktivni,
                        pressed && styles.tlacitkoZmacknute,
                     ]}
                  >
                     <Text style={styles.tlacitkoText}>Přihlásit se</Text>
                  </Pressable>

                  <View style={styles.registrace}>
                     <Text style={styles.registraceText}>Nemáš účet? </Text>
                     <Pressable onPress={() => router.push('/register')} hitSlop={10}>
                        <Text style={styles.registraceOdkaz}>Zaregistruj se</Text>
                     </Pressable>
                  </View>
               </View>

               {/* DOCASNE: testovaci obrazovka Apple Health */}
               <Pressable onPress={() => router.push('/healthtest')} style={styles.healthTest}>
                  <Text style={styles.healthTestText}>Health test</Text>
               </Pressable>
            </ScrollView>
         </KeyboardAvoidingView>
      </SafeAreaView>
   );
}

const styles = StyleSheet.create({
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
   registrace: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: 20,
   },
   registraceText: {
      color: '#64748b',
      fontSize: 15,
   },
   registraceOdkaz: {
      color: ORANZOVA,
      fontSize: 15,
      fontWeight: '700',
   },
   healthTest: {
      marginTop: 24,
      alignItems: 'center',
      paddingVertical: 8,
   },
   healthTestText: {
      color: '#94a3b8',
      fontSize: 13,
      fontWeight: '600',
   },
});
