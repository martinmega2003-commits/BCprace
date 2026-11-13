import React, { useState } from 'react';
import { Pressable, ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  isHealthDataAvailable,
  queryWorkoutSamples,
  requestAuthorization,
  saveWorkoutSample,
  WorkoutActivityType,
  WorkoutTypeIdentifier,
} from '@kingstinct/react-native-healthkit';

// Testovaci obrazovka pro spike: povolit -> zapsat testovaci beh -> precist treninky.
export default function HealthTest() {
  const [log, setLog] = useState<string[]>([]);

  // prida radek do vypisu na obrazovce
  const zapis = (radek: string) => setLog((stary) => [radek, ...stary]);

  const povolit = async () => {
    try {
      if (!isHealthDataAvailable()) {
        zapis('Health na tomto zarizeni neni dostupne.');
        return;
      }
      await requestAuthorization({
        toShare: [WorkoutTypeIdentifier],
        toRead: [WorkoutTypeIdentifier],
      });
      zapis('Opravneni vyzadano.');
    } catch (e) {
      zapis(`Chyba pri povoleni: ${String(e)}`);
    }
  };

  const zapsatTestovaciBeh = async () => {
    try {
      const konec = new Date();
      const zacatek = new Date(konec.getTime() - 30 * 60 * 1000); // pred 30 minutami
      await saveWorkoutSample(WorkoutActivityType.running, [], zacatek, konec, {
        distance: 5000, // metry
      });
      zapis('Testovaci beh (5 km, 30 min) zapsan.');
    } catch (e) {
      zapis(`Chyba pri zapisu: ${String(e)}`);
    }
  };

  const nacistTreninky = async () => {
    try {
      const treninky = await queryWorkoutSamples({ limit: 10, ascending: false });
      zapis(`Nacteno treninku: ${treninky.length}`);
      for (const t of treninky) {
        const km = t.totalDistance ? (t.totalDistance.quantity / 1000).toFixed(2) : '?';
        const delka = `${t.duration.quantity.toFixed(0)} ${t.duration.unit}`; // docasne i s jednotkou, at vidime, co chodi
        zapis(`- typ ${t.workoutActivityType}, ${t.startDate.toLocaleString()}, ${km} km, ${delka}`);
      }
    } catch (e) {
      zapis(`Chyba pri cteni: ${String(e)}`);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, padding: 16, gap: 12, backgroundColor: '#f8fafc' }}>
      <Text style={{ fontSize: 24, fontWeight: '700' }}>Health test</Text>
      <Tlacitko text="1. Povolit pristup" onPress={povolit} />
      <Tlacitko text="2. Zapsat testovaci beh" onPress={zapsatTestovaciBeh} />
      <Tlacitko text="3. Nacist treninky" onPress={nacistTreninky} />
      <ScrollView>
        {log.map((radek, i) => (
          <Text key={i}>{radek}</Text>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function Tlacitko({ text, onPress }: { text: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{ backgroundColor: '#fc4c02', padding: 14, borderRadius: 12, alignItems: 'center' }}
    >
      <Text style={{ color: '#fff', fontWeight: '700' }}>{text}</Text>
    </Pressable>
  );
}
