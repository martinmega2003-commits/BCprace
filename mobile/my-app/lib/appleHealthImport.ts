import {
  isHealthDataAvailable,
  queryWorkoutSamples,
  requestAuthorization,
  WorkoutActivityType,
  WorkoutProxyTyped,
  WorkoutTypeIdentifier,
} from '@kingstinct/react-native-healthkit';


export type ImportActivity = {
  external_id: string;
  sport_type: string;
  started_at: string;
  elapsed_time_s?: number;
  distance_m?: number;
  avg_hr?: number;
  max_hr?: number;
  calories_kcal?: number;
  is_indoor?: boolean;
  source_app?: string;
  device_name?: string;
};
// Prevede cislo sportu z HealthKitu na nas nazev (stejne nazvy jako u GPX a Stravy).
export function prevedTypSportu(typZHealthKitu: WorkoutActivityType): string {
  if (typZHealthKitu === WorkoutActivityType.running) {
    return 'run';
  }
  if (typZHealthKitu === WorkoutActivityType.walking) {
    return 'walk';
  }
  if (typZHealthKitu === WorkoutActivityType.hiking) {
    return 'hike';
  }
  if (typZHealthKitu === WorkoutActivityType.cycling) {
    return 'ride';
  }
  if (typZHealthKitu === WorkoutActivityType.traditionalStrengthTraining) {
    return 'strength';
  }
  if (typZHealthKitu === WorkoutActivityType.functionalStrengthTraining) {
    return 'strength';
  }
  return 'other';
}


// Prevede jeden trenink z HealthKitu do naseho formatu (zatim bez tepu, ten pridame v dalsim kroku).
export function prevedTrenink(trenink: WorkoutProxyTyped): ImportActivity {
  const zacatekMs = trenink.startDate.getTime();
  const konecMs = trenink.endDate.getTime();
  const delkaVSekundach = Math.round((konecMs - zacatekMs) / 1000);

  const aktivita: ImportActivity = {
    external_id: trenink.uuid,
    sport_type: prevedTypSportu(trenink.workoutActivityType),
    started_at: trenink.startDate.toISOString(),
    elapsed_time_s: delkaVSekundach,
    source_app: trenink.sourceRevision.source.name,
  };

  if (trenink.totalDistance) {
    aktivita.distance_m = trenink.totalDistance.quantity;
  }

  if (trenink.totalEnergyBurned) {
    aktivita.calories_kcal = trenink.totalEnergyBurned.quantity;
  }

  if (trenink.device && trenink.device.name) {
    aktivita.device_name = trenink.device.name;
  }

  return aktivita;
}

// Doplni do aktivity prumerny a maximalni tep behem treninku.
// Kdyz tep neni (beh jen s telefonem bez hodinek) nebo chybi opravneni, aktivita zustane bez tepu.
export async function doplnTep(trenink: WorkoutProxyTyped, aktivita: ImportActivity): Promise<void> {
  try {
    const statistikaTepu = await trenink.getStatistic('HKQuantityTypeIdentifierHeartRate', 'count/min');

    if (!statistikaTepu) {
      return;
    }

    if (statistikaTepu.averageQuantity) {
      aktivita.avg_hr = Math.round(statistikaTepu.averageQuantity.quantity);
    }

    if (statistikaTepu.maximumQuantity) {
      aktivita.max_hr = Math.round(statistikaTepu.maximumQuantity.quantity);
    }
  } catch (chyba) {
    console.log('Tep se nepodarilo nacist:', chyba);
  }
}

// Zepta se uzivatele na pristup ke cteni treninku a tepu.
// iOS ukaze okno jen poprve (a znovu jen pri zadosti o novy typ dat), jinak hned pokracuje.
export async function pozadatOOpravneni(): Promise<void> {
  if (!isHealthDataAvailable()) {
    throw new Error('Apple Health neni na tomto zarizeni dostupne.');
  }

  await requestAuthorization({
    toShare: [],
    toRead: [WorkoutTypeIdentifier, 'HKQuantityTypeIdentifierHeartRate'],
  });
}

const VELIKOST_DAVKY = 500;

// Nacte vsechny treninky z Apple Health a posle je na backend.
// Vrati pocet odeslanych treninku.
export async function importovatZAppleHealth(apiBaseUrl: string, sessionId: string): Promise<number> {
  await pozadatOOpravneni();

  const treninky = await queryWorkoutSamples({ limit: 0 });

  const aktivity: ImportActivity[] = [];
  for (const trenink of treninky) {
    const aktivita = prevedTrenink(trenink);
    await doplnTep(trenink, aktivita);
    aktivity.push(aktivita);
  }

  for (let zacatek = 0; zacatek < aktivity.length; zacatek = zacatek + VELIKOST_DAVKY) {
    const davka = aktivity.slice(zacatek, zacatek + VELIKOST_DAVKY);

    const odpoved = await fetch(`${apiBaseUrl}/api/imports?session_id=${sessionId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: 'healthkit', activities: davka }),
    });

    if (!odpoved.ok) {
      throw new Error(`Backend vratil chybu ${odpoved.status}`);
    }
  }

  return aktivity.length;
}
