import { Text, View } from 'react-native';

type AwrsWidgetProps = {
  awrs: number | null;
};

function getAwrsInfo(awrs: number | null) {
  if (awrs == null) {
    return {
      label: 'Bez dat',
      value: '-',
      color: '#64748b',
      backgroundColor: '#f8fafc',
      borderColor: '#e2e8f0',
      dotColor: '#94a3b8',
    };
  }

  if (awrs < 0.8) {
    return {
      label: 'Malo treninku',
      value: awrs.toFixed(2),
      color: '#b45309',
      backgroundColor: '#fffbeb',
      borderColor: '#fde68a',
      dotColor: '#f59e0b',
    };
  }

  if (awrs <= 1.3) {
    return {
      label: 'Idealni zatizeni',
      value: awrs.toFixed(2),
      color: '#15803d',
      backgroundColor: '#f0fdf4',
      borderColor: '#bbf7d0',
      dotColor: '#22c55e',
    };
  }

  if (awrs <= 1.5) {
    return {
      label: 'Lehce zvysene',
      value: awrs.toFixed(2),
      color: '#c2410c',
      backgroundColor: '#fff7ed',
      borderColor: '#fed7aa',
      dotColor: '#f97316',
    };
  }

  return {
    label: 'Nebezpeci pretizeni',
    value: awrs.toFixed(2),
    color: '#b91c1c',
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    dotColor: '#ef4444',
  };
}

export default function AwrsWidget({ awrs }: AwrsWidgetProps) {
  const info = getAwrsInfo(awrs);

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
          AWRS
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
    </View>
  );
}
