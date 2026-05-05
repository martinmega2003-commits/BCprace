import { Alert, Animated, Image, Keyboard, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';


export default function MujProfile() {
  const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://192.168.50.214:3000';
  const [profile, setProfile] = useState<{
    username: string;
    profile_medium: string | null;
    sex: string | null;
    height_cm: number | null;
    birth_date: string | null;
    weight_kg: number | null;
    rest_heartrate: number | null;
  } | null>(null);

  const [sexInput, setSexInput] = useState('');
  const [heightInput, setHeightInput] = useState('');
  const [birthDateInput, setBirthDateInput] = useState('');
  const [weightInput, setWeightInput] = useState('');
  const [restheart, setRestHeart] = useState('');
  const [saveBanner, setSaveBanner] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const saveToastOffset = useRef(new Animated.Value(12)).current;
  const saveToastOpacity = useRef(new Animated.Value(0)).current;
  const params = useLocalSearchParams();
  const sessionId = params.session_id;

  async function Back() {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
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
        sex: profileJson.sex,
        height_cm: profileJson.height_cm,
        birth_date: profileJson.birth_date,
        weight_kg: profileJson.weight_kg,
        rest_heartrate: profileJson.rest_heartrate,
      });
    }
  }

  async function Ulozit() {
    Keyboard.dismiss();
    if (birthDateInput !== '' && !IsValidBirthDate(birthDateInput)) {
      Alert.alert('Chybne datum', 'Zadej datum ve formatu YYYY-MM-DD.');
      return;
    }

    const Save = await fetch(`${API_BASE_URL}/api/me?session_id=${sessionId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sex: sexInput,
        height_cm: heightInput === '' ? null : Number(heightInput),
        birth_date: birthDateInput === '' ? null : birthDateInput,
        weight_kg: weightInput === '' ? null : Number(weightInput),
        rest_heartrate: restheart === '' ? null : Number(restheart),
      }),
    });
    if (!Save.ok) {
      setSaveBanner({ type: 'error', message: 'Profil se nepodarilo ulozit.' });
      return;
    }

    await LoadProfile();
    setSaveBanner({ type: 'success', message: 'Profil byl ulozen.' });
  }

  function HandleBirthDateChange(text: string) {
    const digits = text.replace(/\D/g, '').slice(0, 8);

    if (digits.length <= 4) {
      setBirthDateInput(digits);
      return;
    }

    if (digits.length <= 6) {
      setBirthDateInput(`${digits.slice(0, 4)}-${digits.slice(4)}`);
      return;
    }

    setBirthDateInput(
      `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`,
    );
  }

  function IsValidBirthDate(value: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return false;
    }

    const [yearText, monthText, dayText] = value.split('-');
    const year = Number(yearText);
    const month = Number(monthText);
    const day = Number(dayText);

    const date = new Date(year, month - 1, day);

    const isRealDate =
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day;

    if (!isRealDate) {
      return false;
    }

    const today = new Date();

    if (date > today) {
      return false;
    }

    if (year < 1900) {
      return false;
    }

    return true;
  }

  useEffect(() => {
    if (sessionId != null) {
      LoadProfile();
    }
  }, [sessionId]);

  useEffect(() => {
    if (profile) {
      setHeightInput(profile.height_cm?.toString() ?? '');
      setBirthDateInput(profile.birth_date ?? '');
      setSexInput(profile.sex ?? '');
      setWeightInput(profile.weight_kg?.toString() ?? '');
      setRestHeart(profile.rest_heartrate?.toString() ?? '');
    }
  }, [profile]);

  useEffect(() => {
    if (!saveBanner) {
      return;
    }

    Animated.parallel([
      Animated.timing(saveToastOpacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(saveToastOffset, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();

    const timeout = setTimeout(() => {
      Animated.parallel([
        Animated.timing(saveToastOpacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(saveToastOffset, {
          toValue: 12,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) {
          setSaveBanner(null);
        }
      });
    }, 1900);

    return () => clearTimeout(timeout);
  }, [saveBanner]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#f8fafc' }}
      contentContainerStyle={{
        paddingHorizontal: 18,
        paddingTop: 15,
        paddingBottom: 42,
      }}
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
      marginBottom: 18,
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
          borderWidth: 1,
          borderColor: '#e5e7eb',
          padding: 18,
          marginBottom: 16,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
          }}
        >
          {profile?.profile_medium ? (
            <Image
              source={{ uri: profile.profile_medium }}
              style={{
                width: 62,
                height: 62,
                borderRadius: 31,
                borderWidth: 2,
                borderColor: '#fed7aa',
              }}
            />
          ) : (
            <View
              style={{
                width: 62,
                height: 62,
                borderRadius: 31,
                backgroundColor: '#fff7ed',
                borderWidth: 2,
                borderColor: '#fed7aa',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: '#fc4c02', fontSize: 22, fontWeight: '900' }}>
                {profile?.username?.[0]?.toUpperCase() ?? '?'}
              </Text>
            </View>
          )}

          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: '#fc4c02',
                fontSize: 11,
                fontWeight: '900',
                letterSpacing: 1.2,
                marginBottom: 4,
              }}
            >
              MUJ PROFIL
            </Text>
            <Text
              style={{
                color: '#0f172a',
                fontSize: 21,
                fontWeight: '900',
              }}
            >
              {profile?.username ?? 'Profil'}
            </Text>
            <Text
              style={{
                color: '#64748b',
                fontSize: 13,
                fontWeight: '600',
                marginTop: 4,
              }}
            >
              Udaje pro vypocet treninkove zateze.
            </Text>
          </View>
        </View>
      </View>

      <View
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 24,
          borderWidth: 1,
          borderColor: '#e5e7eb',
          padding: 18,
          gap: 12,
        }}
      >
        <Text
          style={{
            color: '#0f172a',
            fontSize: 18,
            fontWeight: '900',
            marginBottom: 4,
          }}
        >
          Osobni udaje
        </Text>

        <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '800' }}>
          Sex
        </Text>
        <TextInput
          value={sexInput}
          onChangeText={setSexInput}
          placeholder="Zadej pohlavi"
          placeholderTextColor="#94a3b8"
          style={{
            borderWidth: 1,
            borderColor: '#e5e7eb',
            backgroundColor: '#f8fafc',
            borderRadius: 14,
            paddingHorizontal: 14,
            paddingVertical: 12,
            color: '#0f172a',
            fontWeight: '700',
          }}
        />

        <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '800' }}>
          Vyska (cm)
        </Text>
        <TextInput
          value={heightInput}
          onChangeText={setHeightInput}
          placeholder="Zadej vysku"
          placeholderTextColor="#94a3b8"
          keyboardType="numbers-and-punctuation"
          style={{
            borderWidth: 1,
            borderColor: '#e5e7eb',
            backgroundColor: '#f8fafc',
            borderRadius: 14,
            paddingHorizontal: 14,
            paddingVertical: 12,
            color: '#0f172a',
            fontWeight: '700',
          }}
        />

        <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '800' }}>
          Datum narozeni
        </Text>
        <TextInput
          value={birthDateInput}
          onChangeText={HandleBirthDateChange}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#94a3b8"
          keyboardType="number-pad"
          maxLength={10}
          autoCorrect={false}
          autoCapitalize="none"
          style={{
            borderWidth: 1,
            borderColor: '#e5e7eb',
            backgroundColor: '#f8fafc',
            borderRadius: 14,
            paddingHorizontal: 14,
            paddingVertical: 12,
            color: '#0f172a',
            fontWeight: '700',
          }}
        />

        <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '800' }}>
          Vaha (kg)
        </Text>
        <TextInput
          value={weightInput}
          onChangeText={setWeightInput}
          placeholder="Zadej vahu"
          placeholderTextColor="#94a3b8"
          keyboardType="numbers-and-punctuation"
          style={{
            borderWidth: 1,
            borderColor: '#e5e7eb',
            backgroundColor: '#f8fafc',
            borderRadius: 14,
            paddingHorizontal: 14,
            paddingVertical: 12,
            color: '#0f172a',
            fontWeight: '700',
          }}
        />

        <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '800' }}>
          Klidova tepovka (BPM)
        </Text>
        <TextInput
          value={restheart}
          onChangeText={setRestHeart}
          placeholder="Zadej klidovy tep"
          placeholderTextColor="#94a3b8"
          keyboardType="numbers-and-punctuation"
          style={{
            borderWidth: 1,
            borderColor: '#e5e7eb',
            backgroundColor: '#f8fafc',
            borderRadius: 14,
            paddingHorizontal: 14,
            paddingVertical: 12,
            color: '#0f172a',
            fontWeight: '700',
          }}
        />

        <View style={{ marginTop: 8 }}>
          {saveBanner ? (
            <Animated.View
              style={{
                alignSelf: 'center',
                marginBottom: 10,
                backgroundColor: saveBanner.type === 'success' ? '#dcfce7' : '#fee2e2',
                borderColor: saveBanner.type === 'success' ? '#86efac' : '#fca5a5',
                borderWidth: 1,
                borderRadius: 999,
                paddingHorizontal: 14,
                paddingVertical: 8,
                opacity: saveToastOpacity,
                transform: [{ translateY: saveToastOffset }],
              }}
            >
              <Text
                style={{
                  color: saveBanner.type === 'success' ? '#166534' : '#b91c1c',
                  fontSize: 12,
                  fontWeight: '800',
                }}
              >
                {saveBanner.message}
              </Text>
            </Animated.View>
          ) : null}
          <Pressable
            onPress={async () => {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              Ulozit();
            }}
            style={({ pressed }) => ({
              backgroundColor: '#fc4c02',
              borderRadius: 16,
              paddingVertical: 14,
              alignItems: 'center',
              opacity: pressed ? 0.8 : 1,
            })}
          >

            <Text style={{ color: '#ffffff', fontSize: 15, fontWeight: '900' }}>
              Ulozit
            </Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}
