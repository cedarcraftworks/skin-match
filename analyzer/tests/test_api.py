from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_healthz():
    assert client.get("/healthz").json() == {"status": "ok"}


def test_normalize_endpoint():
    res = client.post("/normalize", json={"text": "精製水、ＢＧ、ヒアルロン酸ナトリウム"})
    assert res.status_code == 200
    assert res.json() == {"ingredients": ["水", "BG", "ヒアルロン酸Na"]}


def test_judge_endpoint():
    res = client.post(
        "/judge",
        json={
            "candidate": ["水", "エタノール"],
            "records": [
                {"result": "good", "ingredients": ["水"]},
                {"result": "bad", "ingredients": ["水", "エタノール"]},
            ],
        },
    )
    body = res.json()
    assert res.status_code == 200
    assert [f["ingredient"] for f in body["common"]] == ["水"]
    assert [f["ingredient"] for f in body["caution"]] == ["エタノール"]
    assert body["lowData"] is True


def test_insights_endpoint():
    res = client.post(
        "/insights",
        json={
            "records": [
                {"result": "good", "ingredients": ["水", "セラミドNP"]},
                {"result": "bad", "ingredients": ["水", "香料"]},
            ]
        },
    )
    body = res.json()
    assert [f["ingredient"] for f in body["common"]] == ["水", "セラミドNP"]
    assert [f["ingredient"] for f in body["caution"]] == ["香料"]


def test_rejects_unknown_result():
    res = client.post("/judge", json={"candidate": ["水"], "records": [{"result": "maybe", "ingredients": []}]})
    assert res.status_code == 422
