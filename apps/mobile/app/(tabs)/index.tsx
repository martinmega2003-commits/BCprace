import { Image } from 'expo-image';
import { Platform, StyleSheet } from 'react-native';

import { HelloWave } from '@/components/hello-wave';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Link } from 'expo-router';
import { useEffect, useState } from "react";
import { Text, View } from "react-native";





export default function HomeScreen() {
  const [message, setMessage] = useState("Načítání...");
  const [activities, setActivities] = useState<any[]>([]);


  useEffect(() => {
    async function loadGreeting() {
      try{
        const res = await fetch("http://192.168.50.214:3000/api/strava/activities?athleteId=180578501");
        const data = await res.json();
        console.log(data);
        setActivities(Array.isArray(data.activities) ? data.activities : []);
        setMessage("Načteno");

      }catch (error) {
        setMessage("Chyba při načítání");
        console.log(error);
      }
    }
    loadGreeting();
  },[]);


return (
  <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "white" }}>
    <Text style={{ color: "black", fontSize: 24 }}>{message}</Text>
    {activities.slice(0, 5).map((activity) => (
      <Text key={activity.id} style={{ color: "black" }}>
        {activity.name}
      </Text>
    ))}
  </View>
);
}
