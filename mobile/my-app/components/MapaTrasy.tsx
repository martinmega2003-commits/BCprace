import { useRef } from 'react';
import { Text, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { GpsBod } from '../lib/beh/vypocty';

const ORANZOVA = '#fc4c02';

type Props = {
   body: GpsBod[];
};

export default function MapaTrasy({ body }: Props) {
   const mapa = useRef<MapView>(null);

   if (body.length === 0) {
      return (
         <View style={{ height: 260, justifyContent: 'center', alignItems: 'center' }}>
            <Text>Trasa není k dispozici</Text>
         </View>
      );
   }

   // body rozdelit podle segmentu: po pauze zacina nova cara (mezi segmenty se nekresli spojnice)
   const useky: { latitude: number; longitude: number }[][] = [];
   let aktualniUsek: { latitude: number; longitude: number }[] = [];
   let aktualniSegment = body[0].segment;

   for (let i = 0; i < body.length; i = i + 1) {
      const bod = body[i];
      if (bod.segment !== aktualniSegment) {
         useky.push(aktualniUsek);
         aktualniUsek = [];
         aktualniSegment = bod.segment;
      }
      aktualniUsek.push({ latitude: bod.lat, longitude: bod.lon });
   }
   useky.push(aktualniUsek);

   const vsechnySouradnice: { latitude: number; longitude: number }[] = [];
   for (let i = 0; i < body.length; i = i + 1) {
      vsechnySouradnice.push({ latitude: body[i].lat, longitude: body[i].lon });
   }

   const prvni = vsechnySouradnice[0];
   const posledni = vsechnySouradnice[vsechnySouradnice.length - 1];

   const cary = [];
   for (let i = 0; i < useky.length; i = i + 1) {
      cary.push(
         <Polyline key={i} coordinates={useky[i]} strokeColor={ORANZOVA} strokeWidth={4} />
      );
   }

   return (
      <MapView
         ref={mapa}
         style={{ height: 260, width: '100%' }}
         initialRegion={{
            latitude: prvni.latitude,
            longitude: prvni.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
         }}
         onMapReady={() => {
            if (mapa.current !== null) {
               mapa.current.fitToCoordinates(vsechnySouradnice, {
                  edgePadding: { top: 40, right: 40, bottom: 40, left: 40 },
                  animated: false,
               });
            }
         }}
      >
         {cary}
         <Marker coordinate={prvni} title="Start" pinColor="green" />
         <Marker coordinate={posledni} title="Cíl" pinColor="red" />
      </MapView>
   );
}
