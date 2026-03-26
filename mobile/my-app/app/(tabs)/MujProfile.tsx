import { Button, View, Text, TextInput } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import { Keyboard } from 'react-native';

export default function MujProfile(){
        const [profile, setProfile] = useState<{
            username: string;
            profile_medium: string | null;
            sex: string | null;
            height_cm: number | null;
            birth_year: number | null;
            weight_kg: number | null;
        } | null>(null);


const [usernameInput, setUsernameInput] = useState('');
const [sexInput, setSexInput] = useState('');
const [heightInput, setHeightInput] = useState('');
const [birthYearInput, setBirthYearInput] = useState('');
const [weightInput, setWeightInput] = useState('');

        const params = useLocalSearchParams();
        const sessionId = params.session_id;

        async  function Back() {
                router.back()
        }


    async function  LoadProfile() {
        if(!sessionId){
            return
        }else{
            const profiledata = await fetch(`http://192.168.50.214:3000/api/me?session_id=${sessionId}`)
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
            birth_year: profileJson.birth_year,
            weight_kg: profileJson.weight_kg,
            })
        }
    }

    async function Ulozit() {
        Keyboard.dismiss()
        const Save = await fetch(`http://192.168.50.214:3000/api/me?session_id=${sessionId}`,{
            method: 'PATCH',
            headers:{
                'Content-Type': 'application/json'
                },
                body: JSON.stringify({username: usernameInput,sex: sexInput, height_cm: heightInput, birth_year: birthYearInput,weight_kg: weightInput})
        })
        if (!Save.ok) {
             return
            }
        
        await LoadProfile()



}

        useEffect(() => {
            if (sessionId != null) {
            LoadProfile()
        }
        }, [sessionId]);

        useEffect(() => {
  if (profile) {
    setHeightInput(profile.height_cm?.toString() ?? '');
    setBirthYearInput(profile.birth_year?.toString() ?? '');
    setUsernameInput(profile.username ?? '');
    setSexInput(profile.sex ?? '');
    setWeightInput(profile.weight_kg?.toString() ?? '');
    setUsernameInput(profile.username?.toString() ?? '');

    
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

    <Text>Rok narozeni</Text>
    <TextInput
      value={birthYearInput}
      onChangeText={setBirthYearInput}
      placeholder="Zadej rok narozeni"
      keyboardType="numbers-and-punctuation"
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

    <Button title="Ulozit" onPress={Ulozit} />

</View>

    )
}
