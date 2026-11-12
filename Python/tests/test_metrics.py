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





