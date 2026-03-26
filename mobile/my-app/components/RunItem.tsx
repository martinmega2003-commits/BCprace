import { Pressable, Text } from "react-native";


type RunItemProps = {
  name: string;
  onPress: () => void;
};


export default function RunItem({ name, onPress }: RunItemProps) {
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
        </Pressable>
    )
}
