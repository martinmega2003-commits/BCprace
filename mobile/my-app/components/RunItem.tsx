import { Pressable, Text, View } from "react-native";


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
            onPress={onPress}
            style={{
                backgroundColor: '#f3f4f6',
                borderWidth: 1,
                borderColor: '#e5e7eb',
                borderRadius: 10,
                paddingHorizontal: 14,
                paddingVertical: 12,
                marginBottom: 10,
            }}
        >
            <Text style={{ color: '#111827', fontWeight: '600' }}>{name}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 }}>
                <Text style={{ color: '#64748b', fontSize: 13, fontWeight: '600' }}>
                    {(distance / 1000).toFixed(2)} km
                </Text>
                <Text style={{ color: '#94a3b8', fontSize: 12, fontWeight: '500' }}>
                    {formattedDate}
                </Text>
            </View>
        </Pressable>
    )
}
