import { z } from "zod"

// nejvys tolik bodu v jednom behu (bod za sekundu = ~5,5 hodiny), chrani server pred obrim pozadavkem
export const MAX_BODU = 20000;

// "formicka" pro beh z appky: jak musi vypadat data, aby je server ulozil
export const ulozBehSchema = z.object({
    // udaje o celem behu
    external_id: z.uuid(),
    started_at: z.iso.datetime(),
    elapsed_time_s: z.number().int().min(0).max(86400),   // celkovy cas vcetne pauz (sekundy)
    moving_time_s: z.number().int().min(0).max(86400),    // cas pohybu bez pauz (sekundy)
    distance_m: z.number().min(0).max(500000),

    // body trasy
    body: z.array(
        z.object({
            cas: z.number().int().positive(),
            lat: z.number().min(-90).max(90),
            lon: z.number().min(-180).max(180),
            presnost: z.number().min(0).max(1000),
            segment: z.number().int().nonnegative(),
        })
    ).min(2).max(MAX_BODU),
})
