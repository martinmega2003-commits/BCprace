import { Button, View, Text, Pressable, Image, ScrollView } from 'react-native';
import { useState, useEffect } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useRouter } from 'expo-router';
import RunItem from '@/components/RunItem';
import * as Haptics from 'expo-haptics';
import { Alert } from 'react-native';
import WeeklyVolumeStrip from '@/components/WeeklyVolumeStrip';
import WeeklyVolumeChartCard from '@/components/WeeklyVolumeChartCard';



export default function BasicButtonExample() {
   const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://192.168.0.123:3000';

   const [isMenuOpen, setisMenuOpen] = useState(false);
   const [sessionId, setSessionId] = useState<string | null>(null);
   const [chartData, setChartData] = useState({
      labels: [],
      datasets: [{ data: [] }],
   });
   const [chartRange, setChartRange] = useState<'12' | '24' | 'all'>('12');

   const [profile, setProfile] = useState<{
      username: string;
      profile_medium: string | null;
      height_cm: number | null;
      birth_date: string | null;
      rest_heartrate: number | null;
      awrs: number,
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

   const [WeekData, setWeekData] = useState<{
      day: string;
      volume: number;
   }[]>([]);

   const [thisWeekVolume, setThisWeekVolume] = useState(0)

   const [weekChartData, setWeekChartData] = useState({
      labels: [],
      datasets: [{ data: [] }],
      });

   const [dayClicked, setDayClicker] = useState<{
      day: string,
      volume: number,
   }| null>(null)



   const router = useRouter();
   const params = useLocalSearchParams();
   const session = params.session_id;


   const Logout = async () => {
      const URL = `${API_BASE_URL}/api/logout`;
      const Session = sessionId;

      setSessionId(null);
      setChartData({
         labels: [],
         datasets: [{ data: [] }],
      });

      await fetch(`${URL}?session_id=${Session}`);
      router.replace('/');
   };

   async function Sync() {
      if(!sessionId){
         return
      }
      const dataraw = await fetch(`${API_BASE_URL}/api/sync?session_id=${sessionId}`);
      const dataClean = await dataraw.json();
   }

   async function WeeklyVolume() {
      if (!sessionId) {
         setChartData({
            labels: [],
            datasets: [{ data: [] }],
         });
         return;
      }

      if (!sessionId) {
         return;
      } else {
         const data = await fetch(`${API_BASE_URL}/api/weeklyvolume?session_id=${sessionId}`);
         const WeeklyVolumeData = await data.json();
         const WeekDays = WeeklyVolumeData.this_week_days;
         const ThisWeekVolume = WeeklyVolumeData.thisweekvolume;
         const weeklyvolume = WeeklyVolumeData.weekly_volume;
         const visibleVolume =
               chartRange === '12'
                  ? weeklyvolume.slice(-12)
                  : chartRange === '24'
                     ? weeklyvolume.slice(-24)
                     : weeklyvolume;

         setChartData({
            labels: visibleVolume.map((item: { week_start: string }) => {
            const date = new Date(item.week_start);
            return `${date.getDate()}.${date.getMonth() + 1}`;
            }),
            datasets: [{ data: visibleVolume.map((item: { volume: any }) => item.volume) }],
         });

         setWeekData(WeekDays)
         setThisWeekVolume(ThisWeekVolume)
         setWeekChartData({
         labels: WeekDays.map((item: { day: string }) => item.day),
         datasets: [
            {
               data: WeekDays.map((item: { volume: number }) => item.volume),
            },
         ],
         })

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

   async function LoadProfile() {
      if (!sessionId) {
         return;
      } else {
         const profiledata = await fetch(`${API_BASE_URL}/api/me?session_id=${sessionId}`);
         if (!profiledata.ok) {
            return;
         }
         const profileJson = await profiledata.json();
         if (!profileJson.ok) {
            return;
         }
         setProfile({
            username: profileJson.username,
            profile_medium: profileJson.profile_medium,
            height_cm: profileJson.height_cm,
            birth_date: profileJson.birth_date,
            rest_heartrate: profileJson.rest_heartrate,
            awrs: profileJson.awrs,
         });
      }
   }

   const isProfileIncomplete =
      !profile?.birth_date ||
      profile?.height_cm == null ||
      profile?.rest_heartrate == null;

   async function MyProfile() {
      router.push({
         pathname: '/(tabs)/MujProfile',
         params: { session_id: sessionId },
      });
   }

   async function OneRunInfo(activityId: number) {
      router.push({
         pathname: '/(tabs)/RunDetail',
         params: { session_id: sessionId, activity_id: activityId },
      });
   }

   async function LoadActivites() {
      if (!sessionId) {
         return;
      }
      const RawActivity = await fetch(`${API_BASE_URL}/api/activities?session_id=${sessionId}`);
      if (!RawActivity.ok) {
         return;
      }

      const Actvity = await RawActivity.json();
      if (!Actvity.ok) {
         return;
      }

      setActivities(Actvity.Activies);
   }

   useEffect(() => {
      if (session != null && !Array.isArray(session)) {
         setSessionId(session);
      }
   }, [session]);

   useEffect(() => {
   if (sessionId != null) {
      WeeklyVolume();
      Sync();
      LoadProfile();
      LoadActivites();
   }
   }, [sessionId]);


   useEffect(()=>{
      if (sessionId != null) {
      WeeklyVolume();
      }
   },[chartRange])

   useEffect(() => {
      if (!profile) {
         return;
      }

      if (!isProfileIncomplete) {
         return;
      }

      Alert.alert(
  'Chybi udaje',
  'Dopln datum narozeni, vysku a klidovy tep.',
  [
    {
      text: 'Přidat',
      onPress: MyProfile,
    },
  ]
);

   }, [profile, isProfileIncomplete]);



   return (
      <View style={{ flex: 1, alignItems: 'center', paddingTop: 88, paddingBottom: 24 }}>
         <Pressable
            onPress={async () => {
               await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
               setisMenuOpen(prev => !prev);
            }}
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
                  paddingTop: 100,
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
                  <Text>Muj učet</Text>
               </Pressable>

               <View style={{ marginTop: 200 }}>
                  <Button onPress={Logout} title="Logout" />
               </View>
            </View>
         )}

            <WeeklyVolumeChartCard
            chartData={chartData}
            chartRange={chartRange}
            sessionId={sessionId}
            chartConfig={chartConfig}
            onChangeRange={setChartRange}
            />



         <WeeklyVolumeStrip 
                  thisWeekVolume={thisWeekVolume}
                  WeekData={WeekData}
                  onSelectDay={(day) => {
                     if (dayClicked?.day === day.day) {
                        setDayClicker(null);
                        return;
                     }

                     setDayClicker(day);
                     }}

                  selectedDay={dayClicked}>
            </WeeklyVolumeStrip>

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
               Běhy
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
                  <RunItem
                     onPress={() => OneRunInfo(activity.id)}
                     name={activity.name}
                     distance={activity.distance}
                     date={activity.start_date}
                     key={activity.id}
                  ></RunItem>
               ))}
            </ScrollView>
         </View>
      </View>
   );
}
