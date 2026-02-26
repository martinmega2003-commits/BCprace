import { Image } from "expo-image";
import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { Button, Pressable, SafeAreaView, Text, View } from "react-native";

type Profile = {
  athleteId: number;
  firstname: string | null;
  lastname: string | null;
  profileMedium: string | null;
};

type ActivityItem = {
  id: number;
  name?: string | null;
  type?: string | null;
};

export default function HomeScreen() {
  const [message, setMessage] = useState("Načítání...");
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [athleteId, setAthleteId] = useState<string | null>(null);
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);

  async function syncLatestLoggedUser() {
    try {
      const res = await fetch("http://192.168.50.214:3000/api/strava/latest-account");
      const data = await res.json();

      if (data.error) {
        setMessage(data.error);
        return;
      }

      if (data.athleteId) {
        setAthleteId(String(data.athleteId));
        setProfile({
          athleteId: data.athleteId,
          firstname: data.firstname ?? null,
          lastname: data.lastname ?? null,
          profileMedium: data.profileMedium ?? null,
        });
      }
    } catch (error) {
      console.log("latest-account error:", error);
    }
  }

  async function handleLogout() {
    try {
      if (athleteId) {
        const res = await fetch("http://192.168.50.214:3000/api/strava/logout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ athleteId }),
        });

        const data = await res.json();

        if (!res.ok || data.error) {
          setMessage(data.error ?? "Logout se nepovedl");
          return;
        }
      }

      setAthleteId(null);
      setActivities([]);
      setProfile(null);
      setIsMenuOpen(false);
      setMessage("Nejprve se prihlas");
    } catch (error) {
      console.log("logout error:", error);
      setMessage("Chyba pri odhlaseni");
    }
  }

  useEffect(() => {
    async function checkAuth() {
      await syncLatestLoggedUser();
      setIsAuthChecked(true);
    }

    checkAuth();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    if (!athleteId) {
      setMessage("Nejprve se prihlas");
      clearTimeout(timeoutId);
      return;
    }

    async function loadActivities() {
      try {
        const res = await fetch(
          `http://192.168.50.214:3000/api/strava/activities?athleteId=${athleteId}`,
          { signal: controller.signal }
        );

        const data = await res.json();
        console.log("activities response:", data);

        if (data.error) {
          setMessage(data.error);
          return;
        }

        setActivities(data.firstActivity ? [data.firstActivity] : []);
        setMessage("Načteno");
      } catch (error) {
        setMessage("Chyba pri načítání");
        console.log(error);
      } finally {
        clearTimeout(timeoutId);
      }
    }

    loadActivities();

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [athleteId]);

  if (!isAuthChecked) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "white" }}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ color: "black" }}>Kontroluji přihlášení...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!athleteId) {
    return <Redirect href="/login" />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "white" }}>
      <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 8 }}>
        {isMenuOpen && (
          <Pressable
            onPress={() => setIsMenuOpen(false)}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.25)",
              zIndex: 9,
            }}
          />
        )}

        {isMenuOpen && (
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: 260,
              height: "100%",
              backgroundColor: "#f3f4f6",
              padding: 20,
              zIndex: 10,
              borderRightWidth: 1,
              borderRightColor: "#ddd",
            }}
          >
            <Text style={{ color: "black", fontSize: 20, marginBottom: 12 }}>Menu</Text>

            {profile?.profileMedium ? (
              <Image
                source={{ uri: profile.profileMedium }}
                style={{ width: 64, height: 64, borderRadius: 32, marginBottom: 12 }}
              />
            ) : (
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: "#d1d5db",
                  marginBottom: 12,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ color: "#374151", fontWeight: "600" }}>?</Text>
              </View>
            )}

            <Text style={{ color: "black", marginBottom: 16 }}>
              {profile ? `${profile.firstname ?? ""} ${profile.lastname ?? ""}`.trim() || "Nepřihlášený" : "Nepřihlášený"}
            </Text>

            <Button title="Odhlásit se" onPress={handleLogout} />
          </View>
        )}

        <View
          style={{
            marginBottom: 16,
            zIndex: 11,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Pressable
            onPress={() => setIsMenuOpen((prev) => !prev)}
            style={{
              backgroundColor: "#111827",
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 8,
            }}
          >
            <Text style={{ color: "white", fontWeight: "600" }}>
              {isMenuOpen ? "Zavřít" : "Menu"}
            </Text>
          </Pressable>

          <Text style={{ color: "black", fontSize: 18, fontWeight: "600" }}>Moje aktivity</Text>
          <View style={{ width: 64 }} />
        </View>

        <View style={{ marginBottom: 16 }}>
          <Text style={{ color: "black", fontSize: 24 }}>{message}</Text>
          <Text style={{ color: "black" }}>athleteId: {athleteId ?? "null"}</Text>
        </View>

        {activities.slice(0, 5).map((activity) => (
          <View
            key={activity.id}
            style={{
              backgroundColor: "#f9fafb",
              borderWidth: 1,
              borderColor: "#e5e7eb",
              borderRadius: 12,
              padding: 12,
              marginBottom: 10,
            }}
          >
            <Text
              style={{
                color: "#111827",
                fontSize: 16,
                fontWeight: "600",
                marginBottom: 4,
              }}
            >
              {activity.name ?? "Bez názvu"}
            </Text>
            <Text style={{ color: "#6b7280" }}>{activity.type ?? "Unknown type"}</Text>
          </View>
        ))}
      </View>
    </SafeAreaView>
  );
}
