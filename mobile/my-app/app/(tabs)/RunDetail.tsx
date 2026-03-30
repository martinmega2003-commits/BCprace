import { useEffect, useState } from "react"
import {View, Text, Button } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { router } from "expo-router";



export default function RunDetail(){
    const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://192.168.0.123:3000';
    
    const [Activity, setActivity] = useState<{
        name : string;
        distance : number;
        mooving_time: number;
        elapsed_time: number;
        type: string;
        start_date: string;
        average_cadence: number | null;
        average_speed: number | null;
        max_speed: number | null;
        average_heartrate: number | null;
        max_heartrate: number | null;
    } | null>(null);

        const params = useLocalSearchParams();
        const sessionId = params.session_id;
        const activityId = params.activity_id;

        async  function Back() {router.back()}
        

async function loadActivity() {
    if (!sessionId || !activityId) {
    return
    }else{
        const rawActivity = await fetch(`${API_BASE_URL}/api/activity?session_id=${sessionId}&activity_id=${activityId}`)
            if(!rawActivity.ok){return}
        const ActivityJson = await rawActivity.json()
            if (!ActivityJson.ok) {return}

        const activityData = ActivityJson.Activity
            if (!activityData) {return}

        setActivity({
        name: activityData.name,
        distance: activityData.distance,
        mooving_time: activityData.moving_time,
        elapsed_time: activityData.elapsed_time,
        type: activityData.type,
        start_date: activityData.start_date,
        average_cadence: activityData.average_cadence,
        average_speed: activityData.average_speed,
        max_speed: activityData.max_speed,
        average_heartrate: activityData.average_speed,
        max_heartrate: activityData.max_heartrate,
        })



    }
}

    useEffect(() =>{
        if (sessionId != null ) {
            loadActivity()

        }
    }, [sessionId, activityId])


    return(
<View style={{ padding: 16, gap: 8 }}>
  <Button title="<-" onPress={Back} />

  <Text>{Activity?.name ?? 'Beh'}</Text>
  <Text>Distance: {Activity ? `${(Activity.distance / 1000).toFixed(2)} km` : '-'}</Text>
  <Text>Moving time: {Activity?.mooving_time ?? '-'}</Text>
  <Text>Type: {Activity?.type ?? '-'}</Text>
  <Text>AVG cadence: {Activity?.average_cadence ?? '-'}</Text>
  <Text>AVG speed: {Activity?.average_speed ?? '-'}</Text>
  <Text>Max speed: {Activity?.max_speed ?? '-'}</Text>
  <Text>AVG heartrate: {Activity?.average_heartrate ?? '-'}</Text>
  <Text>Max heartrate: {Activity?.max_heartrate ?? '-'}</Text>
</View>

    )


}
