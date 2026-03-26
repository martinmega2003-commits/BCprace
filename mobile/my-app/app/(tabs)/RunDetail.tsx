import { useEffect, useState } from "react"
import {View, Text, Button } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { router } from "expo-router";



export default function RunDetail(){
    
    const [Activity, setActivity] = useState<{
        name : string;
        distance : number;
        mooving_time: number;
        elapsed_time: number;
        type: string;
        start_date: string;
    } | null>(null);

        const params = useLocalSearchParams();
        const sessionId = params.session_id;
        const activityId = params.activity_id;

        async  function Back() {router.back()}
        

async function loadActivity() {
    if (!sessionId || !activityId) {
    return
    }else{
        const rawActivity = await fetch(`http://192.168.50.214:3000/api/activity?session_id=${sessionId}&activity_id=${activityId}`)
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
        })


    }
}

    useEffect(() =>{
        if (sessionId != null ) {
            loadActivity()

        }
    }, [sessionId, activityId])


    return(
        <View>
            <Button title="<-" onPress={Back} />
            <Text>
                {Activity?.name}
            </Text>
            <Text>
                {Activity?.distance}
            </Text>
            <Text>
                {Activity?.mooving_time}
            </Text>
            <Text>
                {Activity?.type}
            </Text>
        </View>
    )


}
