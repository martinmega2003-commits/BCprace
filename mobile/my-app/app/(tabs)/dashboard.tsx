import React from 'react';
import { Button, View, Text, Pressable, Image, ScrollView } from 'react-native';
import { useState, useEffect } from 'react';
import { BarChart } from 'react-native-chart-kit';
import { useLocalSearchParams } from 'expo-router';
import { useRouter } from 'expo-router';
import RunItem from '@/components/RunItem';

export default function BasicButtonExample() {

   const [isMenuOpen, setisMenuOpen] = useState(false)
   const [sessionId, setSessionId] = useState<string | null>(null);
   const [chartData, setChartData] = useState({
      labels: [],
      datasets: [{ data: [] }],
   });
   const [profile, setProfile] = useState<{
   username: string;
   profile_medium: string | null;
   } | null>(null);

   const [activities, setActivities] = useState<{
   id: number;
   name: string;
   distance: number;
   moving_time: number;
   elapsed_time: number;
   type: string;
   start_date: string;
   }[]>([]);



   const router = useRouter()
   const params = useLocalSearchParams();
   const session = params.session_id;

   const Logout = async () => {
      const URL = 'http://192.168.50.214:3000/api/logout';
      const Session = sessionId;

      setSessionId(null);
      setChartData({
         labels: [],
         datasets: [{ data: [] }],
      });



      await fetch(`${URL}?session_id=${Session}`);
      router.replace('/')
   };

   async function WeeklyVolume() {
      if (!sessionId) {
         setChartData({
            labels: [],
            datasets: [{ data: [] }],
         });
         return;
      }

   if(!sessionId){
      return
   }else{
      const data = await fetch(`http://192.168.50.214:3000/api/weeklyvolume?session_id=${sessionId}`);
      const WeeklyVolumeData = await data.json();
      const weeklyvolume = WeeklyVolumeData.weekly_volume;

      setChartData({
         labels: weeklyvolume.map((item: { week: any; }) => `W${item.week}`),
         datasets: [{ data: weeklyvolume.map((item: { volume: any; }) => item.volume) }],
      });
   }
}

   const chartConfig = {
      backgroundGradientFrom: '#ffffff',
      backgroundGradientTo: '#ffffff',
      decimalPlaces: 0,
      color: (opacity = 1) => `rgba(34, 34, 34, ${opacity})`,
      labelColor: (opacity = 1) => `rgba(34, 34, 34, ${opacity})`,
      barPercentage: 0.7,
   };


   async function  LoadProfile() {
      if(!sessionId){
         return
      }else{
         const profiledata = await fetch(`http://192.168.50.214:3000/api/me?session_id=${sessionId}`)
         if (!profiledata.ok) {
                return
            }
         const profileJson = await profiledata.json()
         if (!profileJson.ok) {
            return
            
         }
         setProfile({username: profileJson.username,profile_medium: profileJson.profile_medium})
      }
      
   }

   async function MyProfile() {
      router.push({
         pathname: '/(tabs)/MujProfile',
         params: { session_id: sessionId },
      })
      }


   async function OneRunInfo(activityId: number) {
      router.push({
         pathname: '/(tabs)/RunDetail',
         params: { session_id: sessionId, activity_id: activityId },
      })
      }

      async function LoadActivites() {
         if(!sessionId){
            return
         }
         const RawActivity = await fetch(`http://192.168.50.214:3000/api/activities?session_id=${sessionId}`)
         if(!RawActivity.ok){
            return
         }

         const Actvity = await RawActivity.json()
         if(!Actvity.ok){return}

         setActivities(Actvity.Activies)

      }


   useEffect(() => {
      if (session != null && !Array.isArray(session)) {
         setSessionId(session);
      }
   }, [session]);

   useEffect(() => {
      if (sessionId != null) {
         WeeklyVolume();
         LoadProfile();
         LoadActivites();
      }
   }, [sessionId]);




   return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
         <Pressable
            onPress={() => setisMenuOpen(prev => !prev)}
            style={{
               position: 'absolute',
               top: 20,
               left: 20,
               zIndex: 110,
               backgroundColor: '#111827',
               paddingHorizontal: 16,
               paddingVertical: 10,
               borderRadius: 8,
            }}
         >
            <Text style={{ color: 'white', fontWeight: '600' }}>
               Menu
            </Text>
         </Pressable>
         {isMenuOpen && (
            <View
               style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: 220,
                  height: '100%',
                  backgroundColor: '#f3f4f6',
                  padding: 16,
                  zIndex: 100,
                  paddingTop:100,
               }}
            >
               {profile?.profile_medium ? (
  <Image
    source={{ uri: profile.profile_medium }}
    style={{
      width: 64,
      height: 64,
      borderRadius: 32,
      marginBottom: 12,
    }}
  />
) : (
  <View
    style={{
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: '#d1d5db',
      marginBottom: 12,
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    <Text style={{ color: '#374151', fontWeight: '600' }}>
      {profile?.username?.[0]?.toUpperCase() ?? '?'}
    </Text>
  </View>
)}
               <Text>{profile?.username}</Text>
               <Pressable onPress={MyProfile}>
                  <Text>Můj učet</Text>
               </Pressable>


               <View style={{ marginTop: 200 }}>
               <Button onPress={Logout} title="Logout" />
               </View>
            </View>
         )}
         
         <Text style={{ color: 'blue' }}>{sessionId}</Text>
         <BarChart
            key={sessionId ?? 'logged-out'}
            data={chartData}
            height={220}
            width={1000}
            yAxisLabel=""
            yAxisSuffix=""
            chartConfig={chartConfig}
         />
         <View
            style={{
               width: '92%',
               marginTop: 18,
               maxHeight: 360,
               backgroundColor: '#ffffff',
               borderRadius: 24,
               padding: 18,
               borderWidth: 1,
               borderColor: '#e5e7eb',
            }}
         >
            <Text
               style={{
                  color: '#fc4c02',
                  fontSize: 12,
                  fontWeight: '700',
                  letterSpacing: 1,
                  marginBottom: 8,
               }}
            >
               BĚHY
            </Text>
            <Text
               style={{
                  color: '#0f172a',
                  fontSize: 20,
                  fontWeight: '700',
                  marginBottom: 8,
               }}
            >
               Tvoje aktivity
            </Text>
            <Text
               style={{
                  color: '#475569',
                  fontSize: 14,
                  lineHeight: 20,
                  marginBottom: 12,
               }}
            >
               Vyber beh a otevri detail aktivity.
            </Text>
            <ScrollView showsVerticalScrollIndicator={false}>
               {activities.map((activity) => (
                  <RunItem onPress={() => OneRunInfo(activity.id)} name={activity.name} distance={activity.distance} date={activity.start_date} key={activity.id}></RunItem>
               ))}
            </ScrollView>
         </View>
      </View>
   );
}
