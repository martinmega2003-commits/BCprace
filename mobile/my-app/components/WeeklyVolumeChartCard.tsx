import { Dimensions, Pressable, Text, View } from "react-native";
import { BarChart } from 'react-native-chart-kit';


type WeeklyVolumeChartCardProps = {
  chartData: {
    labels: string[];
    datasets: { data: number[] }[];
    };
    sessionId: string | null
    chartRange: '12' | '24' | 'all';
    onChangeRange: (range: '12' | '24' | 'all') => void;
    chartConfig: {
            backgroundGradientFrom: string;
            backgroundGradientTo: string;
            decimalPlaces: number;
            color: (opacity?: number) => string;
            labelColor: (opacity?: number) => string;
            barPercentage: number;
};

};


export default function WeeklyVolumeChartCard({chartData, chartRange, sessionId, chartConfig, onChangeRange}: WeeklyVolumeChartCardProps){
    const chartWidth = Math.max(Dimensions.get('window').width - 48, 260);

    return(
        <View
            style={{
                width: '92%',
                marginTop: 16,
                backgroundColor: '#ffffff',
                borderRadius: 24,
                padding: 18,
                borderWidth: 1,
                borderColor: '#e5e7eb',
            }}
        >
            <View
                style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: 12,
                    marginBottom: 16,
                }}
            >
                <View style={{ flex: 1 }}>
                    <Text
                        style={{
                            color: '#fc4c02',
                            fontSize: 12,
                            fontWeight: '700',
                            letterSpacing: 1,
                            marginBottom: 8,
                        }}
                    >
                        HISTORY VOLUME
                    </Text>
                    <Text
                        style={{
                            color: '#0f172a',
                            fontSize: 20,
                            fontWeight: '700',
                            marginBottom: 8,
                        }}
                    >
                        Historie objemu
                    </Text>
                    <Text
                        style={{
                            color: '#475569',
                            fontSize: 14,
                            lineHeight: 20,
                        }}
                    >
                        Sleduj objem svych bezeckych tydnu v case.
                    </Text>
                </View>

                <View
                    style={{
                        flexDirection: 'row',
                        gap: 8,
                    }}
                >
                    <Pressable
                        onPress={() => onChangeRange('12')}
                        style={{
                            backgroundColor: chartRange === '12' ? '#111827' : '#e5e7eb',
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                            borderRadius: 999,
                        }}
                    >
                        <Text style={{ color: chartRange === '12' ? '#ffffff' : '#334155', fontWeight: '700', fontSize: 12 }}>3M</Text>
                    </Pressable>

                    <Pressable
                        onPress={() => onChangeRange('24')}
                        style={{
                            backgroundColor: chartRange === '24' ? '#111827' : '#e5e7eb',
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                            borderRadius: 999,
                        }}
                    >
                        <Text style={{ color: chartRange === '24' ? '#ffffff' : '#334155', fontWeight: '700', fontSize: 12 }}>6M</Text>
                    </Pressable>

                    <Pressable
                        onPress={() => onChangeRange('all')}
                        style={{
                            backgroundColor: chartRange === 'all' ? '#111827' : '#e5e7eb',
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                            borderRadius: 999,
                        }}
                    >
                        <Text style={{ color: chartRange === 'all' ? '#ffffff' : '#334155', fontWeight: '700', fontSize: 12 }}>All</Text>
                    </Pressable>
                </View>
            </View>

            <View
                style={{
                    backgroundColor: '#f8fafc',
                    borderRadius: 22,
                    paddingTop: 16,
                    paddingRight: 8,
                    paddingBottom: 6,
                    overflow: 'hidden',
                }}
            >
                <BarChart
                    key={sessionId ?? 'logged-out'}
                    data={chartData}
                    height={220}
                    width={chartWidth}
                    yAxisLabel=""
                    yAxisSuffix=""
                    chartConfig={chartConfig}
                    fromZero
                    withInnerLines={false}
                    style={{
                        borderRadius: 18,
                    }}
                />
            </View>
        </View>
    )
    
}
