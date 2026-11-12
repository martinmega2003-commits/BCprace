from helpers import insert_user, scalar, insert_activity

def test_hrr_je_max_minus_klidovy_tep(client):
    insert_user(rest_hr=50, max_hr=190)
    odpoved = client.get("/HRR", params={"user_id": 1})
    assert odpoved.status_code == 200
    assert odpoved.json()["result_HRR"] == 140
    assert scalar("SELECT hrr FROM user_metrics WHERE user_id = 1") == 140



def test_tempo_je_minuty_na_kilometr(client):
    insert_user()
    insert_activity(activity_id=1,user_id=1,distance_m=5000, moving_time_s=1500)
    odpoved = client.get("/avg", params={"user_id": 1})
    assert odpoved.status_code == 200
    assert odpoved.json()["avarage_tempo"] == 5.0
    assert scalar("SELECT pace_min_per_km  FROM activity_metrics  WHERE activity_id = 1") == 5.0


def test_acwr_je_akutni_deleno_chronickou_zatezi(client):
    insert_user()
    insert_activity(1, started_at="2026-05-20T00:00:00Z", trimp=100)  # 1 den  -> akutni i chronicka
    insert_activity(2, started_at="2026-05-16T00:00:00Z", trimp=60)   # 5 dni  -> akutni i chronicka
    insert_activity(3, started_at="2026-05-08T00:00:00Z", trimp=80)   # 13 dni -> jen chronicka
    insert_activity(4, started_at="2026-04-30T00:00:00Z", trimp=40)   # 21 dni -> jen chronicka
    insert_activity(5, started_at="2026-04-01T00:00:00Z", trimp=999)  # 50 dni -> nikam (past)

    odpoved = client.get("/ACWR", params={"user_id": 1})


    assert odpoved.status_code == 200
    assert odpoved.json()["ACWR"] == 2.286
    assert scalar("SELECT acwr FROM user_metrics WHERE user_id = 1") == 2.286

def test_tydenni_objem_scita_jen_behy(client):
    insert_user()
    insert_activity(1, sport_type="run", distance_m=5000, started_at="2026-05-19T10:00:00Z")
    insert_activity(2, sport_type="run", distance_m=7000, started_at="2026-05-20T10:00:00Z")
    insert_activity(3, sport_type="run", distance_m=3000, started_at="2026-05-12T10:00:00Z")
    insert_activity(4, sport_type="walk", distance_m=10000, started_at="2026-05-20T10:00:00Z")

    odpoved = client.get("/weeklyvolume", params={"user_id": 1})


    assert odpoved.status_code == 200
    assert odpoved.json()["all_km"] == 15000
    assert odpoved.json()["thisweekvolume"] == 12.0
    assert odpoved.json()["this_week_days"][1]["volume"] == 5.0
    assert odpoved.json()["this_week_days"][2]["volume"] == 7.0


def test_maximalni_tep_kombinuje_vek_a_namereny_tep(client):
    # narozen 1. 1. 2000 -> "dnes" (21. 5. 2026) mu je 26 -> odhad podle veku 220 - 26 = 194
    insert_user(birth_date="2000-01-01")
    insert_activity(1, max_hr=185)  # nejvyssi nameren tep
    insert_activity(2, max_hr=170)

    odpoved = client.get("/CalHRmax", params={"user_id": 1})

    # vysledek je "prumer" obou hodnot: odmocnina z prumeru jejich druhych mocnin
    ocekavany = round(((194**2 + 185**2) / 2) ** 0.5)
    assert odpoved.status_code == 200
    assert odpoved.json()["vek"] == 26
    assert odpoved.json()["observed"] == 185
    assert odpoved.json()["FINAL"] == ocekavany
    assert scalar("SELECT max_hr FROM users WHERE id = 1") == ocekavany


def test_hrr_bez_klidoveho_tepu_nic_neulozi(client):
    # chybejici data -> endpoint nesmi spadnout ani ulozit nesmysl
    insert_user(rest_hr=None, max_hr=190)

    odpoved = client.get("/HRR", params={"user_id": 1})

    assert odpoved.status_code == 200
    assert odpoved.json() == {"message": "chybi restheartrate"}
    assert scalar("SELECT count(*) FROM user_metrics") == 0


def test_intenzita_a_trimp_se_pocitaji_z_tepu(client):
    insert_user(rest_hr=50, max_hr=200, hrr=150, estimated_vo2max=55)
    insert_activity(1, moving_time_s=3600, avg_hr=150)  # hodina behu s prumernym tepem 150

    client.get("/IntesityCalcul", params={"user_id": 1})
    client.get("/Trimp", params={"user_id": 1})

    # intenzita = (prumerny tep - klidovy) / rezerva = (150 - 50) / 150
    intenzita = round((150 - 50) / 150, 3)
    vo2 = round(3.5 + intenzita * (55 - 3.5), 3)
    # TRIMP = minuty * intenzita^1.92 * 0.64 * e   (Banisteruv vzorec)
    trimp = round(60 * ((150 - 50) / (200 - 50)) ** 1.92 * 0.64 * 2.718281828459045, 3)

    assert scalar("SELECT intensity FROM activity_metrics WHERE activity_id = 1") == intenzita
    assert scalar("SELECT estimated_vo2 FROM activity_metrics WHERE activity_id = 1") == vo2
    assert scalar("SELECT trimp FROM activity_metrics WHERE activity_id = 1") == trimp


def test_vo2max_se_odhadne_z_nedavneho_behu(client):
    insert_user(rest_hr=50, hrr=150)
    # 5 km za 25 minut s tepem 170, rovinka (20 m prevyseni)
    insert_activity(1, distance_m=5000, moving_time_s=1500, avg_speed_ms=5000 / 1500,
                    avg_hr=170, elevation_gain_m=20, started_at="2026-05-20T10:00:00Z")

    odpoved = client.get("/VO2MaxCalcul", params={"user_id": 1})

    vo2_behu = round(3.5 + 0.2 * (5000 / 1500) * 60, 3)    # spotreba kysliku pri danem tempu
    relativni_intenzita = round((170 - 50) / 150, 3)        # jak blizko maxima bezel
    ocekavany = round(3.5 + (vo2_behu - 3.5) / relativni_intenzita, 3)

    assert odpoved.status_code == 200
    assert odpoved.json()["estimated_vo2max"] == ocekavany
    assert odpoved.json()["source_window_days"] == 30     # beh je z poslednich 30 dni
    assert odpoved.json()["fresh"] is True
    assert scalar("SELECT estimated_vo2max FROM user_metrics WHERE user_id = 1") == ocekavany


def test_vo2max_ignoruje_kratke_behy(client):
    insert_user(rest_hr=50, hrr=150)
    # jen 2 km -> moc kratky na spolehlivy odhad (endpoint vyzaduje aspon 3 km a 20 minut)
    insert_activity(1, distance_m=2000, moving_time_s=600, avg_speed_ms=2000 / 600,
                    avg_hr=170, started_at="2026-05-20T10:00:00Z")

    odpoved = client.get("/VO2MaxCalcul", params={"user_id": 1})

    assert odpoved.json()["estimated_vo2max"] is None
    assert scalar("SELECT estimated_vo2max FROM user_metrics WHERE user_id = 1") is None



