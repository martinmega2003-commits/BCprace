import React, { useCallback, useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context'

export default function LoginScreen() {
   const router = useRouter();

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
                  BCPRACE
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
           
               <Text
                  style={{
                     color: '#94a3b8',
                     fontSize: 14,
                     lineHeight: 20,
                     marginTop: 14,
                     textAlign: 'center',
                  }}
               >
                  Prihlaseni e-mailem se pripravuje.
               </Text>
               {/* docasne: obejiti loginu pro Apple Health spike */}
               <Pressable
                  onPress={() => router.push('/healthtest')}
                  style={{ marginTop: 16, paddingVertical: 12, alignItems: 'center' }}
               >
                  <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '600' }}>
                     Health test
                  </Text>
               </Pressable>
            </View>
         </View>
      </SafeAreaView>
   );
}
