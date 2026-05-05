import { Pressable, Text, View } from "react-native";
import * as Haptics from 'expo-haptics';



type WeeklyVolumeStripProps  = {
    thisWeekVolume: number;
    
    WeekData:{
        day: string
        volume: number
    }[];

    onSelectDay: (day: { day: string; volume: number }) => void;

    selectedDay: {
        day: string;
        volume: number;
        } | null;

};





export default function WeeklyVolumeStrip({thisWeekVolume, WeekData, onSelectDay, selectedDay}: WeeklyVolumeStripProps){


    const maxWeekDayVolume = Math.max(...WeekData.map((item) => item.volume), 0);


    return(
        <View
            style={{
                width: '92%',
                marginTop: 10,
                backgroundColor: '#ffffff',
                borderRadius: 18,
                paddingHorizontal: 16,
                paddingVertical: 14,
                borderWidth: 1,
                borderColor: '#e5e7eb',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
            }}
        >
            <View>
               <Text
                  style={{
                     color: '#64748b',
                     fontSize: 12,
                     fontWeight: '700',
                     letterSpacing: 0.8,
                     marginBottom: 4,
                  }}
               >
                  {selectedDay ? selectedDay.day : 'TYDENNI OBJEM'}
                </Text>
                <Text
                   style={{
                      color: '#0f172a',
                     fontSize: 22,
                      fontWeight: '700',
                   }}
                >
                  {(selectedDay ? selectedDay.volume : thisWeekVolume).toFixed(1)} km
                </Text>
            </View>
            
            <View
               style={{
                  flexDirection: 'row',
                  alignItems: 'flex-end',
                  gap: 7,
                  height: 58,
               }}
            >
               {WeekData.map((item) => {

                const isActive = selectedDay?.day === item.day            

                return(
                <Pressable
                  key={item.day}
                  onPress={async () => {
                    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onSelectDay(item);
                  }}
                >
                  <View
                     style={{
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        width: 18,
                        gap: 5,
                     }}
                  >
                     <View
                        style={{
                           width: 14,
                           height:
                              maxWeekDayVolume > 0
                                 ? Math.max(6, (item.volume / maxWeekDayVolume) * 38)
                                 : 6,
                           borderRadius: 999,
                           backgroundColor: isActive ? '#c97201' : item.volume > 0 ? 'rgb(252, 76, 2)' : '#cbd5e1',
                        }}
                     />
                     <Text
                        style={{
                           color: '#64748b',
                           fontSize: 10,
                           fontWeight: '600',
                        }}
                     >
                        {item.day}
                     </Text>
                  </View>
                  </Pressable>
            )})}
            </View>

        </View>
    )

}
