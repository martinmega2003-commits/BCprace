import { Pressable, Text, View } from "react-native";
import * as Haptics from 'expo-haptics';


type RunItemProps = {
    name: string;
    distance: number;
    date: string;

    onPress: () => void;
};


export default function RunItem({ name, distance, date, onPress }: RunItemProps) {
    const formattedDate = Number.isNaN(new Date(date).getTime())
        ? date
        : new Date(date).toLocaleDateString('cs-CZ');

    return(
        <Pressable
            onPress={async () => {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onPress();
            }}
            style={({ pressed }) => ({
                width: '100%',
                alignSelf: 'stretch',
                backgroundColor: '#ffffff',
                borderWidth: 1,
                borderColor: '#e2e8f0',
                borderRadius: 18,
                paddingHorizontal: 18,
                paddingVertical: 16,
                marginBottom: 12,
                opacity: pressed ? 0.82 : 1,
                minHeight: 76,
                justifyContent: 'center',
            })}
        >
            <Text style={{ color: '#0f172a', fontSize: 15, fontWeight: '700', lineHeight: 20 }}>{name}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
                <Text style={{ color: '#fc4c02', fontSize: 13, fontWeight: '800' }}>
                    {(distance / 1000).toFixed(2)} km
                </Text>
                <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '600' }}>
                    {formattedDate}
                </Text>
            </View>
        </Pressable>
    )
}
