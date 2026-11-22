import { useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { GpsBod, MAX_PRESNOST_M } from './vypocty';

export type StavBehu = 'cekam-na-gps' | 'pripraveno' | 'bezi' | 'pauza' | 'zamitnuto';



export function useZaznamBehu() { 
    const [stav, setStav] = useState<StavBehu>('cekam-na-gps')
    const [body, setBody] = useState<GpsBod[]>([])
    const [casPohybuS, setCasPohybuS] = useState(0)
    const [celkovyCasS, setCelkovyCasS] = useState(0)
    const [zacatek, setZacatek] = useState<number | null>(null)
    const [posledniPresnost, setPosledniPresnost] = useState<number | null>(null)
    
    const stavRef = useRef<StavBehu>('cekam-na-gps')
    const sledovani = useRef<Location.LocationSubscription | null>(null)
    const segment = useRef(0)
        
    useEffect(() => {
        let obrazovkaJeAktivni = true

        async function zacniSledovat() {
            const opravneni = await Location.requestForegroundPermissionsAsync()
            if (opravneni.status !== 'granted') {
                setStav('zamitnuto')
                return
            }

            const noveSledovani = await Location.watchPositionAsync(
                { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 0 },
                (poloha) => {
                    setPosledniPresnost(poloha.coords.accuracy)
                    const presnost = poloha.coords.accuracy
                    if (presnost !== null && presnost <= MAX_PRESNOST_M) {
                        setStav((staryStav) => {
                            if (staryStav === 'cekam-na-gps') {
                                return 'pripraveno'
                            }
                            return staryStav
                        })
                    }
                    if (presnost !== null && stavRef.current === 'bezi') {
                        const novyBod: GpsBod = {
                            cas: poloha.timestamp,
                            lat: poloha.coords.latitude,
                            lon: poloha.coords.longitude,
                            presnost: presnost,
                            segment: segment.current,
                        }
                        setBody((stareBody) => [...stareBody, novyBod])
                    }
                }
            )

            // obrazovka mezitim zmizela -> hned zrusit, jinak by sledovani bezelo furt
            if (obrazovkaJeAktivni == false) {
                noveSledovani.remove()
                return
            }
            sledovani.current = noveSledovani
        }

        zacniSledovat()

        return () => {
            obrazovkaJeAktivni = false
            if (sledovani.current !== null) {
                sledovani.current.remove()
                sledovani.current = null
            }
        }
    }, [])

    useEffect(() => {
        stavRef.current = stav
    }, [stav])

    useEffect(() => {
        if (zacatek === null) {
            return
        }

    const interval = setInterval(() => {
        if (stavRef.current === 'bezi') {
            setCasPohybuS((staryCas) => staryCas + 1)
        }
        setCelkovyCasS((Date.now() - zacatek) / 1000)
        }, 1000)

        return () => {
            clearInterval(interval)
        }
    }, [zacatek])

    function start() {
        setStav('bezi')
        setZacatek(Date.now())
        activateKeepAwakeAsync()
    }

    function pauza() {
        setStav('pauza')
        segment.current = segment.current + 1
    }

    function pokracovat() {
        setStav('bezi')
    }

    function ukoncit() {
        if (sledovani.current !== null) {
            sledovani.current.remove()
            sledovani.current = null
        }
        setZacatek(null)
        setStav('pripraveno')
        deactivateKeepAwake()
    }

    return {
        stav,
        body,
        casPohybuS,
        celkovyCasS,
        zacatek,
        posledniPresnost,
        start,
        pauza,
        pokracovat,
        ukoncit,
    }
}