from __future__ import annotations

from pathlib import Path
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

OUTPUT_DIR = Path("output") / Path(__file__).stem

def classify_weekly_volume(km: float) -> str:
    # User-defined levels based on weekly distance (km).
    # Boundaries are inclusive on the lower bound.
    if km < 20:
        return "Rekreacni (0-20)"
    if km < 40:
        return "Pravidelny (20-40)"
    if km < 60:
        return "Pokrocily (40-60)"
    if km <= 100:
        return "Zavodni (60-100)"
    return "Zavodni (100+)"

def load_dataset() -> pd.DataFrame:
    input_path = Path("activities_2024-11-26_to_2025-05-04.csv")
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    output_path = OUTPUT_DIR / "activities_running_only.csv"
    df = pd.read_csv(input_path, encoding="utf-8-sig")

    maska = df["Activity Type"].astype(str).str.strip().str.lower() == "running"
    running_df = df[maska].copy()
    running_df.to_csv(output_path, index=False, encoding="utf-8-sig")

    print(f"Ulozeno {len(running_df)} running aktivit do: {output_path}")
    print(running_df[["Date", "Title", "Distance"]].head())
    return running_df

def compute_weekly_km(df: pd.DataFrame) -> pd.DataFrame:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    weekly_output_path = OUTPUT_DIR / "weekly_running_km.csv"

    prepared = df.copy()
    prepared["Date_parsed"] = pd.to_datetime(prepared["Date"], dayfirst=True, errors="coerce")
    prepared["Distance"] = pd.to_numeric(prepared["Distance"], errors="coerce")
    prepared = prepared.dropna(subset=["Date_parsed", "Distance"])

    # Weeks are Monday to Sunday.
    weekly_df = (
        prepared
        .set_index("Date_parsed")
        .resample("W-MON", label="left", closed="left")["Distance"]
        .sum()
        .reset_index()
        .rename(columns={"Date_parsed": "Week Start", "Distance": "Weekly KM"})
    )
    weekly_df["Weekly KM"] = weekly_df["Weekly KM"].round(2)
    weekly_df["Week End"] = weekly_df["Week Start"] + pd.Timedelta(days=6)
    weekly_df["Level"] = weekly_df["Weekly KM"].apply(lambda x: classify_weekly_volume(float(x)))
    weekly_df.to_csv(weekly_output_path, index=False, encoding="utf-8-sig")

    print(f"Ulozeny tydenni objemy do: {weekly_output_path}")
    # Print full table; it's typically a small number of weeks.
    print(weekly_df[["Week Start", "Week End", "Weekly KM", "Level"]].to_string(index=False))
    return weekly_df

def plot_weekly_km(weekly_df: pd.DataFrame) -> Path:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    plot_path = OUTPUT_DIR / "weekly_running_km.png"

    plt.figure(figsize=(12, 6))
    plt.bar(weekly_df["Week Start"], weekly_df["Weekly KM"], width=5, color="#1f77b4")
    plt.title("Tydenni objem behu (km)")
    plt.xlabel("Tyden od")
    plt.ylabel("Kilometry")
    plt.grid(axis="y", alpha=0.25)
    plt.xticks(rotation=45, ha="right")
    plt.tight_layout()
    plt.savefig(plot_path, dpi=150)
    plt.close()

    print(f"Graf ulozen do: {plot_path}")
    return plot_path

def save_summary(weekly_df: pd.DataFrame) -> Path:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    summary_path = OUTPUT_DIR / "weekly_running_km_summary.csv"

    km = pd.to_numeric(weekly_df["Weekly KM"], errors="coerce").dropna()
    avg_km = float(km.mean()) if not km.empty else 0.0
    median_km = float(km.median()) if not km.empty else 0.0
    level_avg = classify_weekly_volume(avg_km)

    counts = weekly_df["Level"].value_counts().to_dict() if "Level" in weekly_df.columns else {}
    row = {
        "Weeks": int(weekly_df.shape[0]),
        "Period Start": weekly_df["Week Start"].min().date().isoformat() if not weekly_df.empty else "",
        "Period End": weekly_df["Week End"].max().date().isoformat() if not weekly_df.empty else "",
        "Avg Weekly KM": round(avg_km, 2),
        "Median Weekly KM": round(median_km, 2),
        "Min Weekly KM": round(float(km.min()), 2) if not km.empty else "",
        "Max Weekly KM": round(float(km.max()), 2) if not km.empty else "",
        "Overall Level (by avg)": level_avg,
        "Weeks Rekreacni (0-20)": counts.get("Rekreacni (0-20)", 0),
        "Weeks Pravidelny (20-40)": counts.get("Pravidelny (20-40)", 0),
        "Weeks Pokrocily (40-60)": counts.get("Pokrocily (40-60)", 0),
        "Weeks Zavodni (60-100)": counts.get("Zavodni (60-100)", 0),
        "Weeks Zavodni (100+)": counts.get("Zavodni (100+)", 0),
    }

    pd.DataFrame([row]).to_csv(summary_path, index=False, encoding="utf-8-sig")
    return summary_path

if __name__ == '__main__':
    running_df = load_dataset()
    weekly_df = compute_weekly_km(running_df)
    plot_weekly_km(weekly_df)
    summary_path = save_summary(weekly_df)

    avg_km = float(pd.to_numeric(weekly_df["Weekly KM"], errors="coerce").mean())
    print(f"Konecna analyza (prumer tydennich km): {avg_km:.2f} km -> {classify_weekly_volume(avg_km)}")
    print(f"Summary ulozena do: {summary_path}")
