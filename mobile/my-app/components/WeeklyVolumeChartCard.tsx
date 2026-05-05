import { useState } from 'react';
import { Dimensions, Pressable, Text, View } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import * as Haptics from 'expo-haptics';

type ChartRange = '12' | '24' | 'all';

type WeeklyVolumeChartCardProps = {
  periods: {
    label: string;
    volume: number;
  }[];
  chartRange: ChartRange;
  onChangeRange: (range: ChartRange) => void;
};

const RANGE_OPTIONS: { label: string; value: ChartRange }[] = [
  { label: '3M', value: '12' },
  { label: '6M', value: '24' },
  { label: 'All', value: 'all' },
];

function formatKm(value: number) {
  return `${value.toFixed(1).replace('.', ',')} km`;
}

export default function WeeklyVolumeChartCard({
  periods,
  chartRange,
  onChangeRange,
}: WeeklyVolumeChartCardProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<{
    index: number;
    label: string;
    volume: number;
  } | null>(null);

  const chartWidth = Math.max(Dimensions.get('window').width - 96, 220);
  const maxValue = periods.length ? Math.max(...periods.map((item) => item.volume)) : 0;
  const chartMaxValue = maxValue > 0 ? Math.ceil(maxValue / 5) * 5 : 5;
  const barWidth = chartRange === '12' ? 17 : chartRange === '24' ? 15 : 14.2;
  const spacing = chartRange === '12' ? 8 : chartRange === '24' ? 8 : 5.5;

  const chartData = periods.map((item, index) => ({
    value: item.volume,
    label: item.label,
    frontColor: selectedPeriod?.index === index ? '#ea580c' : '#fb923c',
    labelTextStyle: {
      color: '#64748b',
      fontSize: 11,
      fontWeight: '600' as const,
    },
    onPress: () => {
      setSelectedPeriod((current) =>
        current?.index === index
          ? null
          : {
              index,
              label: item.label,
              volume: item.volume,
            },
      );
    },
  }));

  return (
    <View
      style={{
        width: '92%',
        marginTop: 20,
        backgroundColor: '#ffffff',
        borderRadius: 20,
        padding: 14,
        borderWidth: 1,
        borderColor: '#e5e7eb',
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          marginBottom: 12,
        }}
      >
        <Text
          style={{
            color: '#0f172a',
            fontSize: 16,
            fontWeight: '800',
          }}
        >
          Volume
        </Text>

        <View style={{ flexDirection: 'row', gap: 6 }}>
          {RANGE_OPTIONS.map((option) => {
            const isActive = chartRange === option.value;

            return (
              <Pressable
                key={option.value}
                onPress={async () => {
                  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedPeriod(null);
                  onChangeRange(option.value);
                }}
                style={{
                  paddingHorizontal: 11,
                  paddingVertical: 7,
                  borderRadius: 999,
                  backgroundColor: isActive ? '#111827' : '#f1f5f9',
                }}
              >
                <Text
                  style={{
                    color: isActive ? '#ffffff' : '#334155',
                    fontSize: 13,
                    fontWeight: '800',
                  }}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {selectedPeriod && (
        <View
          style={{
            alignSelf: 'flex-start',
            backgroundColor: '#fff7ed',
            borderRadius: 999,
            paddingHorizontal: 12,
            paddingVertical: 7,
            marginBottom: 8,
          }}
        >
          <Text
            style={{
              color: '#9a3412',
              fontSize: 13,
              fontWeight: '700',
            }}
          >
            {selectedPeriod.label} - {formatKm(selectedPeriod.volume)}
          </Text>
        </View>
      )}

      {periods.length === 0 ? (
        <Text
          style={{
            color: '#64748b',
            fontSize: 14,
            textAlign: 'center',
            paddingVertical: 48,
          }}
        >
          Zatim bez dat.
        </Text>
      ) : (
        <BarChart
          data={chartData}
          width={chartWidth}
          height={180}
          maxValue={chartMaxValue}
          noOfSections={4}
          barWidth={barWidth}
          labelsExtraHeight={35}
          xAxisTextNumberOfLines={1}
          labelWidth={44}
          spacing={spacing}
          rotateLabel
          disableScroll
          adjustToWidth
          roundedTop
          roundedBottom
          isAnimated
          animationDuration={500}
          rulesColor="#e2e8f0"
          xAxisColor="#cbd5e1"
          yAxisThickness={0}
          yAxisTextStyle={{
            color: '#64748b',
            fontSize: 11,
            fontWeight: '600',
          }}
          xAxisLabelTextStyle={{
            color: '#64748b',
            fontSize: 11,
            fontWeight: '600',
          }}
        />
      )}
    </View>
  );
}
