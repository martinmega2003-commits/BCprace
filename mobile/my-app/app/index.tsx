import React, { useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, Text, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';

export default function LoginScreen() {
   const router = useRouter();
   const [isLoading, setIsLoading] = useState(false);
   const [statusMessage, setStatusMessage] = useState<string | null>(null);

   const openUrl = async () => {
      setIsLoading(true);
      setStatusMessage('Pripojuji Stravu...');

      try {
         const URL = 'http://192.168.50.214:3000/api/auth';
         const result = await WebBrowser.openAuthSessionAsync(URL, 'myapp://auth/callback');

         if (result.type != 'success') {
            setStatusMessage('Prihlaseni bylo zruseno.');
            return;
         }

         const parsedURL = Linking.parse(result.url);
         const SessionID = parsedURL?.queryParams?.session_id;

         if (typeof SessionID != 'string') {
            setStatusMessage('Nepodarilo se ziskat session.');
            return;
         }

         router.replace({
            pathname: '/(tabs)/dashboard',
            params: { session_id: SessionID },
         });
      } catch (error) {
         console.log('login error:', error);
         setStatusMessage('Prihlaseni selhalo. Zkus to znovu.');
      } finally {
         setIsLoading(false);
      }
   };

   return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
         <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24 }}>
            <View
               style={{
                  backgroundColor: '#ffffff',
                  borderRadius: 24,
                  padding: 24,
                  borderWidth: 1,
                  borderColor: '#e5e7eb',
               }}
            >
               <Text
                  style={{
                     color: '#fc4c02',
                     fontSize: 13,
                     fontWeight: '700',
                     letterSpacing: 1,
                     marginBottom: 12,
                  }}
               >
                  STRAVA
               </Text>
               <Text
                  style={{
                     color: '#0f172a',
                     fontSize: 30,
                     lineHeight: 36,
                     fontWeight: '700',
                     marginBottom: 10,
                  }}
               >
                  Prihlas se do dashboardu.
               </Text>
               <Text
                  style={{
                     color: '#475569',
                     fontSize: 16,
                     lineHeight: 24,
                     marginBottom: 24,
                  }}
               >
                  Po prihlaseni se hned dostanes ke grafu a svym datum.
               </Text>
               <Pressable
                  onPress={openUrl}
                  disabled={isLoading}
                  style={{
                     backgroundColor: isLoading ? '#fdba74' : '#fc4c02',
                     borderRadius: 18,
                     paddingVertical: 16,
                     paddingHorizontal: 18,
                     alignItems: 'center',
                  }}
               >
                  {isLoading ? (
                     <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <ActivityIndicator color="#ffffff" />
                        <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '700' }}>
                           Prihlasuji...
                        </Text>
                     </View>
                  ) : (
                     <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '700' }}>
                        Pokracovat se Stravou
                     </Text>
                  )}
               </Pressable>
               <Text
                  style={{
                     color: statusMessage ? '#475569' : '#94a3b8',
                     fontSize: 14,
                     lineHeight: 20,
                     marginTop: 14,
                     textAlign: 'center',
                  }}
               >
                  {statusMessage ?? 'Bezpecne prihlaseni pres Strava OAuth.'}
               </Text>
            </View>
         </View>
      </SafeAreaView>
   );
}
