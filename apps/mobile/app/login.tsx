import { Button, Text, View } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { useRouter } from "expo-router";



export default function LoginScreen() {
    const router = useRouter();


async function handleLoginPress() {
    await WebBrowser.openBrowserAsync("http://192.168.50.214:3000/api/strava/auth");

    const res = await fetch("http://192.168.50.214:3000/api/strava/latest-account");
    const data = await res.json();    


    if (data.athleteId) {
        router.replace("/");
    }
    }


return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 20, backgroundColor: "white" }}>
      <Text style={{ color: "black", fontSize: 24, marginBottom: 12 }}>
        Přihlášení
      </Text>
      <Text style={{ color: "black", marginBottom: 16, textAlign: "center" }}>
        Pro pokračování se přihlas přes Stravu.
      </Text>
      <Button title="Přihlásit přes Stravu" onPress={handleLoginPress} />
    </View>
  );
}
