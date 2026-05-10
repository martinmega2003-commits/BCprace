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
import { useStore } from 'expo-router/build/global-state/router-store';
import AiInsightCard from '@/components/AiInsightCard';
import Vo2MaxWidget from '@/components/Vo2MaxWidget';
import { RefreshControl } from 'react-native';




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


   const [AiAnswer, setAiAnswer] = useState<{
      status: string,
      ai_badge?: string | null,
      headline: string,
      summary: string,
      risks: string[],
      actions: string[],
      updated_at?: string | null,
    }| null>(null)

   const [vo2maxData, setVo2MaxData] = useState<{
      estimated_vo2max: number | null;
      source_window_days: number | null;
      fresh: boolean;
   } | null>(null);

   const [showDashboardAiInsight, setShowDashboardAiInsight] = useState(true);



   const [aiLoading, setaiLoading] = useState(false);








   const [refreshing, setRefreshing] = useState(false)



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

      if (!WeeklyVolumeData.weekly_volume) {
         setHistoryPeriods([]);
         setWeekData([]);
         setThisWeekVolume(0);
         return;
      }

         const WeekDays = WeeklyVolumeData.this_week_days ?? [];
         const ThisWeekVolume = WeeklyVolumeData.thisweekvolume ?? 0;
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
         console.log("profileJson", profileJson);

         let parsedAiRisks: string[] = [];
         let parsedAiActions: string[] = [];

         try {
            parsedAiRisks = profileJson.ai_risks ? JSON.parse(profileJson.ai_risks) : [];
         } catch {
            parsedAiRisks = [];
         }

         try {
            parsedAiActions = profileJson.ai_actions ? JSON.parse(profileJson.ai_actions) : [];
         } catch {
            parsedAiActions = [];
         }

         setProfile({
            username: profileJson.username,
            profile_medium: profileJson.profile_medium,
            height_cm: profileJson.height_cm,
            birth_date: profileJson.birth_date,
            rest_heartrate: profileJson.rest_heartrate,
            awrs: profileJson.awrs,
         });

         if (profileJson.ai_headline && profileJson.ai_summary) {
            setAiAnswer({
               status: profileJson.ai_status ?? "ok",
               ai_badge: profileJson.ai_badge ?? null,
               headline: profileJson.ai_headline,
               summary: profileJson.ai_summary,
               risks: parsedAiRisks,
               actions: parsedAiActions,
               updated_at: profileJson.ai_updated_at ?? null,
            });
         } else {
            setAiAnswer(null);
         }
      }
   }

   async function LoadVo2Max() {
      if (!sessionId) {
         return;
      }

      const rawVo2Max = await fetch(`${API_BASE_URL}/api/vo2max?session_id=${sessionId}`);
      if (!rawVo2Max.ok) {
         return;
      }

      const vo2MaxJson = await rawVo2Max.json();

      setVo2MaxData({
         estimated_vo2max: vo2MaxJson.estimated_vo2max ?? null,
         source_window_days: vo2MaxJson.source_window_days ?? null,
         fresh: vo2MaxJson.fresh ?? false,
      });
   }

   async function ReloadDashboard() {
      await WeeklyVolume();
      await LoadProfile();
      await LoadVo2Max();
      await LoadActivites();
   }


   async function ScrollReload() {
      setRefreshing(true);
      await Sync();
      await ReloadDashboard();
      setRefreshing(false);

   }




   async function Aicall() {

      if(aiLoading == true){
         return
      }

      setaiLoading(true)

      try {
         if (!sessionId) {
            return;
         }

         const RawAi = await fetch(`${API_BASE_URL}/api/ai?session_id=${sessionId}`);
         if (!RawAi.ok) {
            return;
         }

         const Ai = await RawAi.json();

         if (!Ai.response) {
            return;
         }

         setAiAnswer(Ai.response)
         await LoadProfile()
      } finally {
         setaiLoading(false)
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
      Sync();
      ReloadDashboard()


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
               top: 33,
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
                   <View style={{ flex: 1, justifyContent: 'space-between' }}>
                      <View>
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

                         <View style={{ gap: 10 }}>
                            <Pressable
                               onPress={async () => {
                                  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                  MyProfile();
                               }}
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
                         </View>
                      </View>

                      <Pressable
                         onPress={async () => {
                            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            Logout();
                         }}
                         style={({ pressed }) => ({
                           marginTop: 20,
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
                    onPress={async () => {
                       await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                       setisMenuOpen(false);
                    }}
                    style={{ flex: 1 }}
                 />
             </View>
         </Modal>
         <ScrollView
            refreshControl={
               <RefreshControl
                  refreshing={refreshing}
                  onRefresh={ScrollReload}
               />
            }
            style={{ width: '100%' }}
            contentContainerStyle={{
               alignItems: 'center',
               paddingTop: 30,
               paddingBottom: 32,
            }}
            showsVerticalScrollIndicator={false}
         >
         <View
            style={{
               width: '92%',
               marginBottom: -10,
               flexDirection: 'row',
               justifyContent: 'flex-end',
               gap: 10,
            }}
         >
            <Vo2MaxWidget
               estimatedVo2Max={vo2maxData?.estimated_vo2max ?? null}
               sourceWindowDays={vo2maxData?.source_window_days ?? null}
               fresh={vo2maxData?.fresh ?? false}
            />
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
                  marginTop: 18,
                  backgroundColor: '#ffffff',
                  borderRadius: 24,
                  paddingTop: 15,
                  paddingBottom: 15,
                  paddingRight: 15,
                  paddingLeft: 15,
                  borderWidth: 1,
                  borderColor: '#e5e7eb',
                  gap: 14,
               }}
            >
               <Pressable
                  onPress={async () => {
                     await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                     setShowDashboardAiInsight((prev) => !prev);
                  }}
                  style={{
                     flexDirection: 'row',
                     alignItems: 'center',
                     justifyContent: 'space-between',
                  }}
               >
                  <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '700' }}>
                     AI insight
                  </Text>
                  <Text style={{ color: '#64748b', fontSize: 18, fontWeight: '700' }}>
                     {showDashboardAiInsight ? '−' : '+'}
                  </Text>
               </Pressable>

               {showDashboardAiInsight ? (
                  AiAnswer ? (
                     <AiInsightCard
                        {...AiAnswer}
                        embedded
                        showStars={false}
                        reloading={aiLoading}
                        onReload={async () => {
                           await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                           await Aicall();
                        }}
                     />
                  ) : (
                     <Pressable
                        onPress={async () => {
                           await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                           Aicall();
                        }}
                        style={({ pressed }) => ({
                          backgroundColor: '#111827',
                          borderRadius: 20,
                          paddingVertical: 16,
                          alignItems: 'center',
                          opacity: pressed ? 0.8 : 1,
                       })}
                    >
                       <Text
                          style={{
                             color: '#ffffff',
                             fontSize: 15,
                             fontWeight: '700',
                          }}
                       >
                          {aiLoading ? 'Generating...' : 'Generate AI Insight'}
                       </Text>
                    </Pressable>
                  )
               ) : null}
            </View>

            <View
               style={{
                  width: '92%',
                  marginTop: 12,
                  height: 470,
                  backgroundColor: '#ffffff',
                  borderRadius: 28,
                  padding: 20,
                  borderWidth: 1,
                  borderColor: '#e5e7eb',
                  shadowColor: '#0f172a',
                  shadowOpacity: 0.05,
                  shadowRadius: 12,
                  shadowOffset: { width: 0, height: 4 },
                  elevation: 2,
            }}
         >
            <Text
               style={{
                  color: '#fc4c02',
                  fontSize: 12,
                  fontWeight: '800',
                  letterSpacing: 1.2,
                  marginBottom: 10,
               }}
            >
               Běhy
            </Text>
            <Text
               style={{
                  color: '#0f172a',
                  fontSize: 24,
                  fontWeight: '800',
                  marginBottom: 6,
               }}
            >
               Tvoje aktivity
            </Text>
            <Text
               style={{
                  color: '#475569',
                  fontSize: 14,
                  lineHeight: 21,
                  marginBottom: 14,
               }}
            >
               Poslední běhy na jednom místě.
            </Text>
            <View
               style={{
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  marginBottom: 14,
                  gap: 8,
               }}
            >
               <View style={{ width: '100%', paddingRight: 0, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text
                     style={{
                        color: '#64748b',
                        fontSize: 12,
                        fontWeight: '800',
                        letterSpacing: 0.6,
                        marginBottom: 0,
                     }}
                  >
                     Scroll seznam běhů
                  </Text>
                  <Text
                     style={{
                        color: '#475569',
                        fontSize: 13,
                        lineHeight: 18,
                     }}
                  >
                     Vyber běh a otevři detail aktivity.
                  </Text>
               </View>
               <View
                  style={{
                     backgroundColor: '#111827',
                     borderRadius: 999,
                     paddingHorizontal: 12,
                     paddingVertical: 6,
                     alignSelf: 'flex-start',
                   }}
                >
                  <Text
                     style={{
                        color: '#ffffff',
                        fontSize: 11,
                        fontWeight: '800',
                     }}
                  >
                     {activities.length} běhů
                  </Text>
               </View>
            </View>
            <View
               style={{
                  flex: 1,
                  backgroundColor: '#f8fafc',
                  borderRadius: 22,
                  borderWidth: 1,
                  borderColor: '#e2e8f0',
                  paddingHorizontal: 6,
                  paddingTop: 8,
                  paddingBottom: 8,
                  }}
            >
               <ScrollView
                  nestedScrollEnabled
                  showsVerticalScrollIndicator
                  contentContainerStyle={{ paddingBottom: 12 }}
                >
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
         </ScrollView>
      </View>
   );
}
