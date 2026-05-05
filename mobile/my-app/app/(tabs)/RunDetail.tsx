import { useEffect, useState } from "react"
import {View, Text, ScrollView, Pressable } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { router } from "expo-router";
import SimilarRunItem from "@/components/SimilarRunItem";
import * as Haptics from 'expo-haptics';


export default function RunDetail(){
    const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://192.168.50.214:3000';
    
const [Activity, setActivity] = useState<{
      id: number;
      user_id: number;
      name: string;
      distance: number;
      mooving_time: number;
      elapsed_time: number;
      type: string;
      start_date: string;
      average_cadence: number | null;
      average_speed: number | null;
      max_speed: number | null;
      average_heartrate: number | null;
      max_heartrate: number | null;
      intensity: number | null;
      trimp: number | null;
      pace_min_per_km: number | null;
      created_at: string;
      paceBaseline: number | null;
      paceDelta: number | null;
    } | null>(null);

    const [recentRuns, setRecentRuns] = useState<{
      id: number;
      name: string;
      distance: number;
      start_date: string;
      pace_min_per_km: number | null;
    }[]>([]);

        const params = useLocalSearchParams();
        const sessionId = params.session_id;
        const activityId = params.activity_id;

        async  function Back() {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
          router.back()
        
        }

function formatDistance(distance: number | null | undefined) {
    if (distance == null) {
        return '-';
    }

    return `${(distance / 1000).toFixed(2)} km`;
}

function formatDuration(seconds: number | null | undefined) {
    if (seconds == null) {
        return '-';
    }

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
        return `${hours} h ${minutes} min`;
    }

    return `${minutes} min`;
}

function formatSpeed(speed: number | null | undefined) {
    if (speed == null) {
        return '-';
    }

    return `${(speed * 3.6).toFixed(1)} km/h`;
}

function formatPace(pace: number | null | undefined) {
    if (pace == null) {
        return '-';
    }

    const minutes = Math.floor(pace);
    const seconds = Math.round((pace - minutes) * 60);
    const normalizedMinutes = seconds === 60 ? minutes + 1 : minutes;
    const normalizedSeconds = seconds === 60 ? 0 : seconds;

    return `${normalizedMinutes}:${normalizedSeconds.toString().padStart(2, '0')} min/km`;
}

function formatHeartRate(value: number | null | undefined) {
    if (value == null) {
        return '-';
    }

    return `${Math.round(value)} bpm`;
}

function formatCadence(value: number | null | undefined) {
    if (value == null) {
        return '-';
    }

    return `${value.toFixed(1)} spm`;
}

function formatNumber(value: number | null | undefined) {
    if (value == null) {
        return '-';
    }

    return value.toFixed(3);
}
function formatPercent(value: number | null | undefined) {
  if (value == null) {
    return '-';
  }

  return `${(value * 100).toFixed(1)} %`;
}


function formatDate(value: string | null | undefined) {
    if (!value) {
        return '-';
    }

    return new Date(value).toLocaleString('cs-CZ', {
        dateStyle: 'medium',
        timeStyle: 'short',
    });
}

function formatPaceDelta(value: number | null | undefined) {
    if (value == null) {
        return '-';
    }

    return `${Math.abs(value).toFixed(2)} min`;
}

function paceDeltaInfo(delta: number | null | undefined) {
    if (delta == null) {
        return {
            text: 'Bez srovnani s podobnymi behy',
            color: '#64748b',
        };
    }

    if (delta < 0) {
        return {
            text: `↑ ${formatPaceDelta(delta)} lepsi`,
            color: '#16a34a',
        };
    }

    if (delta > 0) {
        return {
            text: `↓ ${formatPaceDelta(delta)} horsi`,
            color: '#dc2626',
        };
    }

    return {
        text: '→ stejne jako obvykle',
        color: '#64748b',
    };
}

function intensityLabel(value: number | null | undefined) {
    if (value == null) {
        return 'Bez dat';
    }

    if (value < 0.6) {
        return 'Lehky beh';
    }

    if (value < 0.8) {
        return 'Stredni tempo';
    }

    if (value < 0.9) {
        return 'Vyssi intenzita';
    }

    return 'Velmi vysoka intenzita';
}

function trimpMinuteInfo(value: number | null | undefined) {
    if (value == null) {
        return {
            text: 'Bez dat',
            color: '#64748b',
        };
    }

    if (value < 1) {
        return {
            text: 'Easy training',
            color: '#16a34a',
        };
    }

    if (value < 2.2) {
        return {
            text: 'Moderate training',
            color: '#f59e0b',
        };
    }

    return {
        text: 'Hard training',
        color: '#dc2626',
    };
}

function totalLoadInfo(value: number | null | undefined) {
    if (value == null) {
        return {
            text: 'Bez dat',
            color: '#64748b',
        };
    }

    if (value < 70) {
        return {
            text: 'Nizka celkova zatez',
            color: '#16a34a',
        };
    }

    if (value <= 140) {
        return {
            text: 'Stredni celkova zatez',
            color: '#f59e0b',
        };
    }

    return {
        text: 'Vysoka celkova zatez',
        color: '#dc2626',
    };
}

async function loadActivity() {
    if (!sessionId || !activityId) {
    return
    }else{
        const rawActivity = await fetch(`${API_BASE_URL}/api/activity?session_id=${sessionId}&activity_id=${activityId}`)
            if(!rawActivity.ok){return}
        const ActivityJson = await rawActivity.json()
            if (!ActivityJson.ok) {return}
          setRecentRuns(ActivityJson.RecentRuns ?? [])

        const activityData = ActivityJson.Activity
            if (!activityData) {return}

        setActivity({
        id: activityData.id,
        user_id: activityData.user_id,
        name: activityData.name,
        distance: activityData.distance,
        mooving_time: activityData.moving_time,
        elapsed_time: activityData.elapsed_time,
        type: activityData.type,
        start_date: activityData.start_date,
        average_cadence: activityData.average_cadence,
        average_speed: activityData.average_speed,
        max_speed: activityData.max_speed,
        average_heartrate: activityData.average_heartrate,
        max_heartrate: activityData.max_heartrate,
        intensity: activityData.intensity,
        trimp: activityData.trimp,
        pace_min_per_km: activityData.pace_min_per_km,
        created_at: activityData.created_at,
        paceBaseline: ActivityJson.paceBaseline,
        paceDelta: ActivityJson.paceDelta
        })

    }
}

    useEffect(() =>{
        if (sessionId != null ) {
            loadActivity()

        }
    }, [sessionId, activityId])

    const paceInfo = paceDeltaInfo(Activity?.paceDelta);
    const trimpPerMinute =
        Activity?.trimp != null && Activity?.mooving_time
            ? Activity.trimp / (Activity.mooving_time / 60)
            : null;
    const trimpMinuteLabel = trimpMinuteInfo(trimpPerMinute);
    const totalLoadLabel = totalLoadInfo(Activity?.trimp);

    return(
<ScrollView
  contentContainerStyle={{ padding: 16, gap: 16, backgroundColor: '#f8fafc' }}
>
  <Pressable
    onPress={Back}
    style={{
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: '#ffffff',
      borderRadius: 999,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: '#e5e7eb',
    }}
  >
    <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '700' }}>
      ←
    </Text>
    <Text style={{ color: '#0f172a', fontSize: 14, fontWeight: '600' }}>
      Zpet
    </Text>
  </Pressable>

  <View
    style={{
      backgroundColor: '#ffffff',
      borderRadius: 24,
      padding: 20,
      borderWidth: 1,
      borderColor: '#e5e7eb',
      gap: 8,
    }}
  >
    <Text
      style={{
        color: '#fc4c02',
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1,
      }}
    >
      DETAIL BEHU
    </Text>
    <Text
      style={{
        color: '#0f172a',
        fontSize: 24,
        fontWeight: '700',
      }}
    >
      {Activity?.name ?? 'Beh'}
    </Text>
    <Text style={{ color: '#475569', fontSize: 15 }}>
      {Activity?.type ?? '-'} • {formatDate(Activity?.start_date)}
    </Text>
  </View>

  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
    <View
      style={{
        width: '48%',
        backgroundColor: '#ffffff',
        borderRadius: 18,
        padding: 16,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        gap: 6,
      }}
    >
      <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '600' }}>Vzdalenost</Text>
      <Text style={{ color: '#0f172a', fontSize: 20, fontWeight: '700' }}>
        {formatDistance(Activity?.distance)}
      </Text>
    </View>

    <View
      style={{
        width: '48%',
        backgroundColor: '#ffffff',
        borderRadius: 18,
        padding: 16,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        gap: 6,
      }}
    >
      <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '600' }}>Cas pohybu</Text>
      <Text style={{ color: '#0f172a', fontSize: 20, fontWeight: '700' }}>
        {formatDuration(Activity?.mooving_time)}
      </Text>
    </View>

    <View
      style={{
        width: '48%',
        backgroundColor: '#ffffff',
        borderRadius: 18,
        padding: 16,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        gap: 6,
      }}
    >
      <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '600' }}>Tempo</Text>
      <Text style={{ color: '#0f172a', fontSize: 20, fontWeight: '700' }}>
        {formatPace(Activity?.pace_min_per_km)}
      </Text>
      <Text style={{ color: paceInfo.color, fontSize: 13, lineHeight: 18 }}>
        {paceInfo.text}
      </Text>
    </View>

    <View
      style={{
        width: '48%',
        backgroundColor: '#ffffff',
        borderRadius: 18,
        padding: 16,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        gap: 6,
      }}
    >
      <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '600' }}>Kadence</Text>
      <Text style={{ color: '#0f172a', fontSize: 20, fontWeight: '700' }}>
        {formatCadence(Activity?.average_cadence)}
      </Text>
    </View>

    <View
      style={{
        width: '48%',
        backgroundColor: '#ffffff',
        borderRadius: 18,
        padding: 16,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        gap: 6,
      }}
    >
      <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '600' }}>Prumerna rychlost</Text>
      <Text style={{ color: '#0f172a', fontSize: 20, fontWeight: '700' }}>
        {formatSpeed(Activity?.average_speed)}
      </Text>
    </View>

    <View
      style={{
        width: '48%',
        backgroundColor: '#ffffff',
        borderRadius: 18,
        padding: 16,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        gap: 6,
      }}
    >
      <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '600' }}>Max rychlost</Text>
      <Text style={{ color: '#0f172a', fontSize: 20, fontWeight: '700' }}>
        {formatSpeed(Activity?.max_speed)}
      </Text>
    </View>
  </View>

  <View
    style={{
      backgroundColor: '#ffffff',
      borderRadius: 24,
      padding: 20,
      borderWidth: 1,
      borderColor: '#e5e7eb',
      gap: 14,
    }}
  >
    <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '700' }}>
      Tep a zatez
    </Text>

    <View style={{ gap: 10 }}>
      <Text style={{ color: '#475569', fontSize: 15 }}>
        Prumerny tep: <Text style={{ color: '#0f172a', fontWeight: '700' }}>{formatHeartRate(Activity?.average_heartrate)}</Text>
      </Text>
      <Text style={{ color: '#475569', fontSize: 15 }}>
        Maximalni tep v tomto behu: <Text style={{ color: '#0f172a', fontWeight: '700' }}>{formatHeartRate(Activity?.max_heartrate)}</Text>
      </Text>
      <Text style={{ color: '#475569', fontSize: 15 }}>
        Intenzita: <Text style={{ color: '#0f172a', fontWeight: '700' }}>{formatPercent(Activity?.intensity)}</Text>
      </Text>
      <Text style={{ color: '#475569', fontSize: 15 }}>
        Interpretace: <Text style={{ color: '#0f172a', fontWeight: '700' }}>{intensityLabel(Activity?.intensity)}</Text>
      </Text>
      <Text style={{ color: '#475569', fontSize: 15 }}>
        Celkova zatez: <Text style={{ color: '#0f172a', fontWeight: '700' }}>{formatNumber(Activity?.trimp)}</Text>
      </Text>
      <Text style={{ color: totalLoadLabel.color, fontSize: 15, fontWeight: '700' }}>
        {totalLoadLabel.text}
      </Text>
      <Text style={{ color: '#475569', fontSize: 15 }}>
        Intenzita za minutu: <Text style={{ color: '#0f172a', fontWeight: '700' }}>{formatNumber(trimpPerMinute)}</Text>
      </Text>
      <Text style={{ color: trimpMinuteLabel.color, fontSize: 15, fontWeight: '700' }}>
        {trimpMinuteLabel.text}
      </Text>
    </View>
  </View>
  <View
    style={{
      backgroundColor: '#ffffff',
      borderRadius: 24,
      padding: 20,
      borderWidth: 1,
      borderColor: '#e5e7eb',
      gap: 14,
    }}
  >
    <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '700' }}>
  Podobne behy
    </Text> 
    {recentRuns.map((run)=>(
      <SimilarRunItem
        key={run.id}
        name={run.name}
        date={formatDate(run.start_date)}
        distance={run.distance}
        pace= {run.pace_min_per_km}
        isFaster={Activity?.pace_min_per_km != null && run.pace_min_per_km != null ? run.pace_min_per_km < Activity.pace_min_per_km : null}

        onPress={()=>
          router.push({
            pathname:'/(tabs)/RunDetail',
        params: { session_id: sessionId, activity_id: run.id },
          })
        }
      
      >


      </SimilarRunItem>
    ))}



    </View>
    
</ScrollView>

    )


}
