import { Dimensions, Pressable, Text, View } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';

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

export default function WeeklyVolumeChartCard({
  periods,
  chartRange,
  onChangeRange,
}: WeeklyVolumeChartCardProps) {
  const chartWidth = Math.max(Dimensions.get('window').width - 80, 220);
  const maxValue = periods.length ? Math.max(...periods.map((item) => item.volume)) : 0;
  const chartMaxValue = maxValue > 0 ? Math.ceil(maxValue / 5) * 5 : 5;

  const chartData = periods.map((item) => ({
    value: item.volume,
    label: item.label,
    frontColor: '#fb923c',
  }));

  return (
    <View style={{ width: '92%', marginTop: 18 }}>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
        {RANGE_OPTIONS.map((option) => {
          const isActive = chartRange === option.value;

          return (
            <Pressable
              key={option.value}
              onPress={() => onChangeRange(option.value)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 10,
                backgroundColor: isActive ? '#111827' : '#e5e7eb',
              }}
            >
              <Text
                style={{
                  color: isActive ? '#ffffff' : '#111827',
                  fontSize: 14,
                  fontWeight: '700',
                }}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

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
          height={160}
          maxValue={chartMaxValue}
          noOfSections={4}
          barWidth={14}
          spacing={8}
          disableScroll
          adjustToWidth
        />
      )}
    </View>
  );
}
