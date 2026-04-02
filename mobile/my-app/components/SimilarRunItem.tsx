import { Pressable, Text, View } from 'react-native';

type SimilarRunItemProps = {
  name: string;
  date: string;
  distance: number;
  pace: number | null;
  isFaster: boolean | null;
  onPress: () => void;
};

function formatPace(pace: number | null) {
  if (pace == null) {
    return '-';
  }

  const minutes = Math.floor(pace);
  const seconds = Math.round((pace - minutes) * 60);
  const normalizedMinutes = seconds === 60 ? minutes + 1 : minutes;
  const normalizedSeconds = seconds === 60 ? 0 : seconds;

  return `${normalizedMinutes}:${normalizedSeconds.toString().padStart(2, '0')} min/km`;
}

export default function SimilarRunItem({
  name,
  date,
  distance,
  pace,
  isFaster,
  onPress,
}: SimilarRunItemProps) {
  const paceColor =
    isFaster == null ? '#fc4c02' : isFaster ? '#16a34a' : '#dc2626';

  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: '#f8fafc',
        borderRadius: 18,
        padding: 14,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        marginBottom: 10,
        gap: 6,
      }}
    >
      <Text
        style={{
          color: '#0f172a',
          fontSize: 16,
          fontWeight: '700',
        }}
      >
        {name}
      </Text>

      <Text
        style={{
          color: '#64748b',
          fontSize: 13,
        }}
      >
        {date}
      </Text>

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 4,
        }}
      >
        <Text
          style={{
            color: '#334155',
            fontSize: 14,
            fontWeight: '600',
          }}
        >
          {(distance / 1000).toFixed(2)} km
        </Text>

        <Text
          style={{
            color: paceColor,
            fontSize: 14,
            fontWeight: '700',
          }}
        >
          {formatPace(pace)}
        </Text>
      </View>
    </Pressable>
  );
}
