import { Text, View } from 'react-native';

type AiAnswer = {
  status: string;
  headline: string;
  summary: string;
  risks: string[];
  actions: string[];
};

export default function AiInsightCard({
  status,
  headline,
  summary,
  risks,
  actions,
}: AiAnswer) {
  const statusMeta =
    status === 'high'
      ? {
          label: 'High Risk',
          backgroundColor: '#fee2e2',
          color: '#b91c1c',
        }
      : status === 'elevated'
        ? {
            label: 'Elevated',
            backgroundColor: '#ffedd5',
            color: '#c2410c',
          }
        : status === 'ok'
          ? {
              label: 'Stable',
              backgroundColor: '#dcfce7',
              color: '#166534',
            }
          : {
              label: 'Low Load',
              backgroundColor: '#eff6ff',
              color: '#1d4ed8',
            };

  return (
    <View
      style={{
        width: '92%',
        alignSelf: 'center',
        backgroundColor: '#ffffff',
        borderRadius: 24,
        paddingHorizontal: 20,
        paddingVertical: 18,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        marginTop: 18,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 14,
        }}
      >
        <Text
          style={{
            color: '#fc4c02',
            fontSize: 12,
            fontWeight: '800',
            letterSpacing: 1,
          }}
        >
          AI INSIGHT
        </Text>

        <View
          style={{
            backgroundColor: statusMeta.backgroundColor,
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 999,
          }}
        >
          <Text
            style={{
              color: statusMeta.color,
              fontSize: 11,
              fontWeight: '700',
            }}
          >
            {statusMeta.label}
          </Text>
        </View>
      </View>

      <Text
        style={{
          color: '#0f172a',
          fontSize: 22,
          fontWeight: '800',
          marginBottom: 10,
        }}
      >
        {headline}
      </Text>

      <Text
        style={{
          color: '#475569',
          fontSize: 15,
          lineHeight: 22,
          marginBottom: 18,
        }}
      >
        {summary}
      </Text>

      <Text
        style={{
          color: '#64748b',
          fontSize: 12,
          fontWeight: '800',
          letterSpacing: 0.8,
          marginBottom: 8,
        }}
      >
        RISKS
      </Text>

      {risks.map((risk) => (
        <Text
          key={risk}
          style={{
            color: '#334155',
            fontSize: 14,
            lineHeight: 20,
            marginBottom: 6,
          }}
        >
          - {risk}
        </Text>
      ))}

      <Text
        style={{
          color: '#64748b',
          fontSize: 12,
          fontWeight: '800',
          letterSpacing: 0.8,
          marginTop: 10,
          marginBottom: 8,
        }}
      >
        NEXT STEPS
      </Text>

      {actions.map((action) => (
        <Text
          key={action}
          style={{
            color: '#0f172a',
            fontSize: 14,
            lineHeight: 20,
            marginBottom: 6,
          }}
        >
          - {action}
        </Text>
      ))}
    </View>
  );
}

