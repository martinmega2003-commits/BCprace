// Po kazde zmene treninku prepocita metriky uzivatele v Pythonu (tep, zatez, VO2max...).
// Poradi je dulezite: napr. Trimp potrebuje HRmax a HRR spocitane predtim.
export async function prepocitatMetriky(userId: number): Promise<void> {
    const pythonApiUrl = process.env.PYTHON_API_URL ?? "http://127.0.0.1:8000";

    await fetch(`${pythonApiUrl}/CalHRmax?user_id=${userId}`);
    await fetch(`${pythonApiUrl}/HRR?user_id=${userId}`);
    await fetch(`${pythonApiUrl}/VO2MaxCalcul?user_id=${userId}`);
    await fetch(`${pythonApiUrl}/IntesityCalcul?user_id=${userId}`);
    await fetch(`${pythonApiUrl}/avg?user_id=${userId}`);
    await fetch(`${pythonApiUrl}/Trimp?user_id=${userId}`);
    await fetch(`${pythonApiUrl}/ACWR?user_id=${userId}`);
}
