import { Button, View, Text, TextInput } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import { Keyboard } from 'react-native';
import { Alert } from 'react-native';


export default function MujProfile(){
        const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://192.168.0.123:3000';
        const [profile, setProfile] = useState<{
            username: string;
            profile_medium: string | null;
            sex: string | null;
            height_cm: number | null;
            birth_date: string  | null;
            weight_kg: number | null;
            rest_heartrate: number | null;
        } | null>(null);


const [sexInput, setSexInput] = useState('');
const [heightInput, setHeightInput] = useState('');
const [birthDateInput, setBirthDateInput] = useState('');
const [weightInput, setWeightInput] = useState('');
const [restheart, setRestHeart] = useState('');
        const params = useLocalSearchParams();
        const sessionId = params.session_id;

        async  function Back() {
                router.back()
        }


    async function  LoadProfile() {
        if(!sessionId){
            return
        }else{
            const profiledata = await fetch(`${API_BASE_URL}/api/me?session_id=${sessionId}`)
            if (!profiledata.ok) {
                return
            }
        const profileJson = await profiledata.json()
        if (!profileJson.ok) {
            return
        }
        
            setProfile({
            username: profileJson.username,
            profile_medium: profileJson.profile_medium,
            sex: profileJson.sex,
            height_cm: profileJson.height_cm,
            birth_date: profileJson.birth_date,
            weight_kg: profileJson.weight_kg,
            rest_heartrate: profileJson.rest_heartrate
            })
        }
    }

    async function Ulozit() {
        Keyboard.dismiss()
        if (birthDateInput !== '' && !IsValidBirthDate(birthDateInput)) {
          Alert.alert('Chybne datum', 'Zadej datum ve formatu YYYY-MM-DD.');
          return;
        }


        const Save = await fetch(`${API_BASE_URL}/api/me?session_id=${sessionId}`,{
            method: 'PATCH',
            headers:{
                'Content-Type': 'application/json'
                },
            body: JSON.stringify({
              sex: sexInput,
              height_cm: heightInput === '' ? null : Number(heightInput),
              birth_date: birthDateInput === '' ? null : birthDateInput,
              weight_kg: weightInput === '' ? null : Number(weightInput),
              rest_heartrate: restheart === '' ? null : Number(restheart),
            })
        })
        if (!Save.ok) {
             return
            }
        
        await LoadProfile()
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
    `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`
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
              LoadProfile()
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


    return(
<View style={{ padding: 16, gap: 12 }}>

   <Button title="<-" onPress={Back} />

    <Text>Sex</Text>
    <TextInput
      value={sexInput}
      onChangeText={setSexInput}
      placeholder="Zadej pohlavi"
      style={{
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
      }}
    />

    <Text>Vyska (cm)</Text>
    <TextInput
      value={heightInput}
      onChangeText={setHeightInput}
      placeholder="Zadej vysku"
      keyboardType="numbers-and-punctuation"
      style={{
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
      }}
    />

    <Text>Datum narozeni</Text>
  <TextInput
    value={birthDateInput}
    onChangeText={HandleBirthDateChange}
    placeholder="YYYY-MM-DD"
    keyboardType="number-pad"
    maxLength={10}
    autoCorrect={false}
    autoCapitalize="none"
    style={{
      borderWidth: 1,
      borderColor: '#d1d5db',
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
    }}
  />


    <Text>Vaha (kg)</Text>
    <TextInput
      value={weightInput}
      onChangeText={setWeightInput}
      placeholder="Zadej vahu"
      keyboardType="numbers-and-punctuation"
      style={{
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
      }}
    />

      
    <Text>Klidová tepovka (BPM)</Text>
    <TextInput
      value={restheart}
      onChangeText={setRestHeart}
      placeholder="Zadej klidovy tep"
      keyboardType="numbers-and-punctuation"
      style={{
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
      }}
    />

    <Button title="Ulozit" onPress={Ulozit} />

</View>

    )
}
