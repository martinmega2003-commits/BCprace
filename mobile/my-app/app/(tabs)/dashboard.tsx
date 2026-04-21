import { View, Text, Pressable, Image, ScrollView, Modal } from 'react-native';
import { useState, useEffect } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useRouter } from 'expo-router';
import RunItem from '@/components/RunItem';
import * as Haptics from 'expo-haptics';
import { Alert } from 'react-native';
import WeeklyVolumeStrip from '@/components/WeeklyVolumeStrip';
import WeeklyVolumeChartCard from '@/components/WeeklyVolumeChartCard';
import AwrsWidget from '@/components/AwrsWidget';



type ChartRange = '12' | '24' | 'all';
type WeeklyVolumeRow = {
   week_start: string;
   volume: number;
};
type HistoryPoint = {
   label: string;
   volume: number;
};

function formatShortDate(dateIso: string) {
   const [, month, day] = dateIso.split('-');
   return `${Number(day)}/${Number(month)}`;
}

function buildHistoryPoints(rows: WeeklyVolumeRow[], range: ChartRange): HistoryPoint[] {
   if (range === '12') {
      return rows.slice(-12).map((item) => ({
         label: formatShortDate(item.week_start),
         volume: item.volume,
      }));
   }

   if (range === '24') {
      const last24 = rows.slice(-24);
      const points: HistoryPoint[] = [];

      for (let index = 0; index < last24.length; index += 2) {
         const chunk = last24.slice(index, index + 2);
         const start = chunk[0];
         const end = chunk[chunk.length - 1];

         points.push({
            label: formatShortDate(end.week_start),
            volume: chunk.reduce((sum, item) => sum + item.volume, 0),
         });
      }

      return points;
   }

   const monthlyMap = new Map<string, HistoryPoint>();

   rows.forEach((item) => {
      const [year, month] = item.week_start.split('-');
      const key = `${year}-${month}`;
      const monthNumber = Number(month);
      const existing = monthlyMap.get(key);

      if (existing) {
         existing.volume += item.volume;
         return;
      }

      monthlyMap.set(key, {
         label: `${monthNumber}/${year.slice(2)}`,
         volume: item.volume,
      });
   });

   return Array.from(monthlyMap.values());
}

export default function BasicButtonExample() {
   const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://192.168.50.214:3000';

   const [isMenuOpen, setisMenuOpen] = useState(false);
   const [sessionId, setSessionId] = useState<string | null>(null);
   const [chartRange, setChartRange] = useState<ChartRange>('12');
   const [historyPeriods, setHistoryPeriods] = useState<{
      label: string;
      volume: number;
   }[]>([]);

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
      setHistoryPeriods([]);

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
         setHistoryPeriods([]);
         return;
      }

      if (!sessionId) {
         return;
      } else {
         const data = await fetch(`${API_BASE_URL}/api/weeklyvolume?session_id=${sessionId}`);
         const WeeklyVolumeData = await data.json();
         const WeekDays = WeeklyVolumeData.this_week_days;
         const ThisWeekVolume = WeeklyVolumeData.thisweekvolume;
         const weeklyvolume = WeeklyVolumeData.weekly_volume as WeeklyVolumeRow[];
         setHistoryPeriods(buildHistoryPoints(weeklyvolume, chartRange));

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
      <View style={{ flex: 1, alignItems: 'center' }}>
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
          <Modal
             visible={isMenuOpen}
             transparent
             animationType="none"
             onRequestClose={() => setisMenuOpen(false)}
          >
             <View
                style={{
                   flex: 1,
                   flexDirection: 'row',
                }}
             >
                <View
                   style={{
                      width: 248,
                      height: '100%',
                      backgroundColor: '#ffffff',
                      paddingHorizontal: 18,
                      paddingTop: 44,
                      paddingBottom: 12,
                      borderRightWidth: 1,
                      borderRightColor: '#e5e7eb',
                      shadowColor: '#0f172a',
                      shadowOpacity: 0.12,
                      shadowRadius: 18,
                      shadowOffset: { width: 4, height: 0 },
                      elevation: 8,
                   }}
                >
                   <Text
                      style={{
                         color: '#fc4c02',
                         fontSize: 12,
                         fontWeight: '900',
                         letterSpacing: 1.4,
                         marginBottom: 16,
                      }}
                   >
                      MENU
                   </Text>
                   {profile?.profile_medium ? (
                      <Image
                         source={{ uri: profile.profile_medium }}
                         style={{
                            width: 58,
                            height: 58,
                            borderRadius: 29,
                            marginBottom: 12,
                            borderWidth: 2,
                            borderColor: '#fed7aa',
                         }}
                      />
                   ) : (
                      <View
                         style={{
                            width: 58,
                            height: 58,
                            borderRadius: 29,
                            backgroundColor: '#fff7ed',
                            marginBottom: 12,
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderWidth: 2,
                            borderColor: '#fed7aa',
                         }}
                      >
                         <Text style={{ color: '#fc4c02', fontWeight: '900' }}>
                            {profile?.username?.[0]?.toUpperCase() ?? '?'}
                         </Text>
                      </View>
                   )}
                   <Text
                      style={{
                         color: '#111827',
                         fontSize: 18,
                         fontWeight: '800',
                         marginBottom: 20,
                      }}
                   >
                      {profile?.username ?? 'Profil'}
                   </Text>

                   <View style={{ gap: 10, flex: 1 }}>
                      <Pressable
                         onPress={MyProfile}
                         style={({ pressed }) => ({
                            backgroundColor: '#fff7ed',
                            borderRadius: 16,
                            paddingHorizontal: 15,
                            paddingVertical: 13,
                            borderWidth: 1,
                            borderColor: '#fed7aa',
                            opacity: pressed ? 0.75 : 1,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                         })}
                      >
                         <Text
                            style={{
                               color: '#9a3412',
                               fontSize: 14,
                               fontWeight: '800',
                            }}
                         >
                            Muj ucet
                         </Text>
                         <Text
                            style={{
                               color: '#fc4c02',
                               fontSize: 16,
                               fontWeight: '900',
                            }}
                         >
                            +
                         </Text>
                      </Pressable>

                      <Pressable
                         onPress={Logout}
                         style={({ pressed }) => ({
                            marginTop: 'auto',
                            marginBottom: '15%',
                            backgroundColor: '#ffffff',
                            borderRadius: 16,
                            paddingHorizontal: 15,
                            paddingVertical: 13,
                            borderWidth: 1,
                            borderColor: '#e5e7eb',
                            opacity: pressed ? 0.75 : 1,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                         })}
                      >
                         <Text
                            style={{
                               color: '#64748b',
                               fontSize: 14,
                               fontWeight: '800',
                            }}
                         >
                            Logout
                         </Text>
                         <Text
                            style={{
                               color: '#ef4444',
                               fontSize: 14,
                               fontWeight: '900',
                            }}
                         >
                            X
                         </Text>
                      </Pressable>
                   </View>
                </View>
                <Pressable
                   onPress={() => setisMenuOpen(false)}
                   style={{ flex: 1 }}
                />
             </View>
          </Modal>
         <View
            style={{
               width: '92%',
               marginBottom: -10,
               alignItems: 'flex-end',
            }}
         >
            <AwrsWidget awrs={profile?.awrs ?? null} />
         </View>

            <WeeklyVolumeChartCard
            periods={historyPeriods}
            chartRange={chartRange}
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
               marginTop: 10,
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
                  marginBottom: 2,
               }}
            >
               Tvoje aktivity
            </Text>
            <Text
               style={{
                  color: '#475569',
                  fontSize: 14,
                  lineHeight: 20,
                  marginBottom: 8,
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
