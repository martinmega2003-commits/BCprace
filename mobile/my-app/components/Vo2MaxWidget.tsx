import { Text, View } from 'react-native';

type Vo2MaxWidgetProps = {
  estimatedVo2Max: number | null;
  sourceWindowDays: number | null;
  fresh: boolean;
};

function getVo2Info(estimatedVo2Max: number | null, fresh: boolean) {
  if (estimatedVo2Max == null) {
    return {
      label: 'Bez odhadu',
      value: '-',
      color: '#64748b',
      backgroundColor: '#f8fafc',
      borderColor: '#e2e8f0',
      dotColor: '#94a3b8',
      note: 'Chybi vhodny beh',
    };
  }

  return {
    label: fresh ? 'Aktualni odhad' : 'Starsi odhad',
    value: estimatedVo2Max.toFixed(1),
    color: '#1d4ed8',
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    dotColor: '#3b82f6',
    note: fresh ? 'Poslednich 30 dni' : 'Fallback z 90 dni',
  };
}

export default function Vo2MaxWidget({
  estimatedVo2Max,
  sourceWindowDays,
  fresh,
}: Vo2MaxWidgetProps) {
  const info = getVo2Info(estimatedVo2Max, fresh);

  return (
    <View
      style={{
        minWidth: 130,
        backgroundColor: info.backgroundColor,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: info.borderColor,
        paddingHorizontal: 14,
        paddingVertical: 9,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          marginBottom: 2,
        }}
      >
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 999,
            backgroundColor: info.dotColor,
          }}
        />
        <Text
          style={{
            color: '#64748b',
            fontSize: 10,
            fontWeight: '800',
            letterSpacing: 1.1,
          }}
        >
          VO2MAX
        </Text>
      </View>
      <Text
        style={{
          color: info.color,
          fontSize: 21,
          fontWeight: '900',
          lineHeight: 24,
        }}
      >
        {info.value}
      </Text>
      <Text
        style={{
          color: info.color,
          fontSize: 11,
          fontWeight: '700',
          marginTop: 1,
        }}
      >
        {info.label}
      </Text>
      <Text
        style={{
          color: '#64748b',
          fontSize: 10,
          fontWeight: '600',
          marginTop: 4,
        }}
      >
        {estimatedVo2Max == null
          ? info.note
          : sourceWindowDays
            ? `${sourceWindowDays} dni`
            : info.note}
      </Text>
    </View>
  );
}
