import { Text, View, Pressable } from 'react-native';

type AiAnswer = {
  status: string;
  ai_badge?: string | null;
  headline: string;
  summary: string;
  risks: string[];
  actions: string[];
  updated_at?: string | null;
  onReload?: (() => void | Promise<void>) | null;
  reloading?: boolean;
  embedded?: boolean;
  showStars?: boolean;
};

export default function AiInsightCard({
  status,
  ai_badge,
  headline,
  summary,
  risks,
  actions,
  updated_at,
  onReload,
  reloading = false,
  embedded = false,
  showStars = true,
}: AiAnswer) {
  const statusMeta =
    status === 'high'
      ? {
          label: 'Velké riziko',
          backgroundColor: '#fee2e2',
          color: '#b91c1c',
        }
      : status === 'elevated'
        ? {
            label: 'Zvýšená zátěž',
            backgroundColor: '#ffedd5',
            color: '#c2410c',
          }
        : status === 'ok'
          ? {
              label: 'Stabilní zátěž',
              backgroundColor: '#dcfce7',
              color: '#166534',
            }
          : {
              label: 'Nízká zátěž',
              backgroundColor: '#eff6ff',
              color: '#1d4ed8',
            };

  const formattedUpdatedAt = updated_at
    ? new Date(updated_at).toLocaleString('cs-CZ', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : null;

  const starCount = ai_badge?.endsWith('_star') ? Number(ai_badge.split('_')[0]) : null;
  const stars =
    starCount && starCount >= 1 && starCount <= 5
      ? `${'★'.repeat(starCount)}${'☆'.repeat(5 - starCount)}`
      : null;

  return (
    <View
      style={{
        width: embedded ? '100%' : '92%',
        alignSelf: embedded ? 'stretch' : 'center',
        backgroundColor: '#ffffff',
        borderRadius: 24,
        paddingHorizontal: 20,
        paddingVertical: 18,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        marginTop: embedded ? 0 : 18,
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
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
          }}
        >
          {onReload ? (
            <Pressable
              onPress={onReload}
              style={({ pressed }) => ({
                backgroundColor: '#f8fafc',
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: '#e2e8f0',
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Text
                style={{
                  color: '#334155',
                  fontSize: 11,
                  fontWeight: '700',
                }}
              >
                {reloading ? 'Obnovuji...' : 'Obnovit'}
              </Text>
            </Pressable>
          ) : null}

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

      {showStars && stars ? (
        <Text
          style={{
            color: '#f59e0b',
            fontSize: 16,
            fontWeight: '800',
            letterSpacing: 1,
            marginBottom: 10,
          }}
        >
          {stars}
        </Text>
      ) : null}

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

      {formattedUpdatedAt ? (
        <Text
          style={{
            color: '#64748b',
            fontSize: 12,
            marginBottom: 14,
          }}
        >
          Aktualizovano: {formattedUpdatedAt}
        </Text>
      ) : null}

      <Text
        style={{
          color: '#64748b',
          fontSize: 12,
          fontWeight: '800',
          letterSpacing: 0.8,
          marginBottom: 8,
        }}
      >
        Rizika
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
        Další kroky
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
