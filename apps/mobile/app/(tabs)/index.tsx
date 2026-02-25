import { Image } from 'expo-image';
import { Platform, StyleSheet } from 'react-native';
import { Button, Linking } from "react-native";

import { HelloWave } from '@/components/hello-wave';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Link } from 'expo-router';
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import * as WebBrowser from "expo-web-browser";





export default function HomeScreen() {
  const [message, setMessage] = useState("Načítání...");
  const [activities, setActivities] = useState<any[]>([]);
  const [athleteId, setAthleteId] = useState<string | null>(null);
 
  function handleAuthUrl(url: string) {
  console.log("DEEPLINK URL:", url);
  const parsed = new URL(url);
  const athleteIdParam = parsed.searchParams.get("athleteId");
  if (athleteIdParam) {
    console.log("athleteId from deeplink:", athleteIdParam);
    setAthleteId(athleteIdParam);
  }
}

useEffect(() => {
  async function checkInitialUrl() {
    const initialUrl = await Linking.getInitialURL();
    if (initialUrl) {
      handleAuthUrl(initialUrl);
    }
  }

  checkInitialUrl();

  const sub = Linking.addEventListener("url", (event) => {
    handleAuthUrl(event.url);
  });

  return () => sub.remove();
}, []);


useEffect(() => {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 8000);


  async function loadGreeting() {
    try {
       const res = await fetch(
  `http://192.168.50.214:3000/api/strava/activities`,
  {
    signal: controller.signal,
  }
);

      const data = await res.json();
      console.log("activities response:", data);
      setActivities(data.firstActivity ? [data.firstActivity] : []);
      setMessage("Načteno");
    } catch (e) {
      setMessage("Chyba při načítání");
      console.log(e);
    } finally {
      clearTimeout(t);
    }
  }

  loadGreeting();
  return () => {
    clearTimeout(t);
    controller.abort();
  };
}, []);

return (
  
  <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "white" }}>
    <Text style={{ color: "black", fontSize: 24 }}>{message}</Text>
    <Text style={{ color: "black" }}>athleteId: {athleteId ?? "null"}</Text>

        <Button
  title="Přihlásit přes Stravu"
  onPress={() => WebBrowser.openBrowserAsync("http://192.168.50.214:3000/login")}

      />
    {activities.slice(0, 5).map((firstActivity) => (
      <Text key={firstActivity.id} style={{ color: "black" }}>
        {firstActivity.name}
      </Text>
    ))}
  </View>
  
);
}
