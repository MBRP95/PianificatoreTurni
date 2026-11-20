#!/usr/bin/env python3
"""Unisce Turni Verona Giallo + Rosso in un unico archivio JSON (stesso personale)."""
from __future__ import annotations

import json
import re
import sys
from collections import defaultdict
from datetime import date, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GIALLO = ROOT / "samples/excel/Turni_Verona_Giallo_2026.xlsx"
ROSSO = ROOT / "samples/excel/Turni_Verona_Rosso_2026.xlsx"
OUT = ROOT / "samples/archivi/verona-2026/dati/turni/pianificatore-turni-2026.json"

SKIP_NAMES = {"RISORSA", "TOTALE STRAO", "CHIUSURA", "NOTE", "LEGENDA"}
OTHER_MARKERS = {"VF", "FW", "VR"}


def is_other(val: str | None) -> bool:
    if not val:
        return False
    u = val.strip().upper()
    if u in OTHER_MARKERS:
        return True
    return u.startswith("VF ") or u.startswith("FW ") or u.startswith("VR ")


def is_skip_cell(val: str | None) -> bool:
    if not val:
        return True
    u = val.strip().upper()
    return u in {"CHIUSO", "CHIUSURA", "0", "0.5", "0,5"}


def looks_like_hours(val: str) -> bool:
    s = val.strip()
    return bool(re.search(r"\d{1,2}([.:]\d{2})?\s*[-–]\s*\d{1,2}", s))


def is_real_shift(val: str | None) -> bool:
    """Turno/assenza significativa (non LIBERO/VF/vuoto da riga fantasma)."""
    if not val or is_skip_cell(val) or is_other(val):
        return False
    u = val.strip().upper()
    if u in {"LIBERO", "LIB", "RIPOSO"}:
        return False
    return True


def _ym(ds: str) -> tuple[int, int]:
    return int(ds[:4]), int(ds[5:7])


def _months_apart(earlier: str, later: str) -> int:
    ey, em = _ym(earlier)
    ly, lm = _ym(later)
    return (ly - ey) * 12 + (lm - em)


def employment_bounds(cal: dict[str, str], team_last_real: str) -> tuple[str, str]:
    """startDate = primo turno reale; endDate = ultimo turno reale se poi
    non compare più alcun turno/assenza reale (≥1 mese) mentre il team continua.
    I soli LIBERO/righe vuote nei mesi dopo non contano come ancora in forza
    (es. Irina: continuo fino a ottobre, poi uscita — non 'ripresa').
    """
    real = sorted(ds for ds, v in cal.items() if is_real_shift(v))
    if not real:
        return "2026-01-01", ""
    start, last_real = real[0], real[-1]
    end = ""
    if team_last_real and _months_apart(last_real, team_last_real) >= 1:
        end = last_real
    return start, end


def load_excel(path: Path) -> tuple[dict[str, dict[str, str]], list[str]]:
    import openpyxl

    wb = openpyxl.load_workbook(path, data_only=True)
    data: dict[str, dict[str, str]] = defaultdict(dict)
    order: list[str] = []
    for sn in wb.sheetnames:
        ws = wb[sn]
        for r in range(1, ws.max_row + 1):
            if str(ws.cell(r, 1).value or "").strip().upper() != "RISORSA":
                continue
            dates: dict[int, str] = {}
            for c in range(3, 10):
                v = ws.cell(r, c).value
                if isinstance(v, datetime):
                    dates[c] = v.date().isoformat()
                elif isinstance(v, date):
                    dates[c] = v.isoformat()
            if len(dates) < 3:
                continue
            weekdays = {"LUNEDI", "MARTEDI", "MERCOLEDI", "GIOVEDI", "VENERDI", "SABATO", "DOMENICA"}
            for pr in range(r + 1, min(r + 16, ws.max_row + 1)):
                # stop before the next week block
                a1 = str(ws.cell(pr, 1).value or "").strip().upper()
                if a1 == "RISORSA":
                    break
                hdr = sum(
                    1
                    for c in range(3, 10)
                    if str(ws.cell(pr, c).value or "").strip().upper() in weekdays
                )
                if hdr >= 3:
                    break
                more_dates = sum(
                    1
                    for c in range(3, 10)
                    if isinstance(ws.cell(pr, c).value, (datetime, date))
                )
                if more_dates >= 3:
                    break
                raw = ws.cell(pr, 1).value
                if raw is None or str(raw).strip() == "":
                    continue
                name = str(raw).strip()
                if name.upper() in SKIP_NAMES or name.upper().startswith("TOTALE"):
                    continue
                if name not in order:
                    order.append(name)
                for c, ds in dates.items():
                    val = ws.cell(pr, c).value
                    if val is None or val == "":
                        continue
                    data[name][ds] = str(val).strip()
    return data, order


def prefer(g: str | None, r: str | None) -> str | None:
    """Sceglie il valore giornaliero dai due negozi (VF/FW = nell'altro store)."""
    if g and is_skip_cell(g):
        g = None
    if r and is_skip_cell(r):
        r = None
    if g and is_other(g):
        return r
    if r and is_other(r):
        return g
    if g and not r:
        return g
    if r and not g:
        return r
    if not g and not r:
        return None
    if g == r:
        return g
    # conflitto: preferisci orario reale / assenza giustificata su LIBERO
    score = []
    for src, val in (("g", g), ("r", r)):
        u = val.upper()
        s = 0
        if looks_like_hours(val):
            s += 5
        if u in {"FERIE", "MALATTIA", "FESTIVO", "CONGEDO"} or "PERMESSO" in u or "PAR" in u:
            s += 4
        if u in {"MODENA", "VERONA", "BOLOGNA", "PADOVA", "FUORI SEDE"}:
            s += 2
        if u in {"LIBERO", "LIB", "RIPOSO"}:
            s += 1
        score.append((s, 1 if src == "r" else 0, val))  # a parità preferisci Rosso (più completo)
    score.sort(reverse=True)
    return score[0][2]


def slug_id(name: str, i: int) -> str:
    base = re.sub(r"[^a-z0-9]+", "", name.lower())[:18] or "p"
    return f"v{i}_{base}"


def main() -> int:
    if not GIALLO.exists() or not ROSSO.exists():
        print("Excel Verona mancanti in samples/excel/", file=sys.stderr)
        return 1
    g, order_g = load_excel(GIALLO)
    r, order_r = load_excel(ROSSO)
    order = list(dict.fromkeys(order_g + order_r))

    # calendari grezzi per tutti (servono per capire fino a quando il team ha turni)
    raw_by_name: dict[str, dict[str, str]] = {}
    for name in order:
        raw_cal: dict[str, str] = {}
        dates = set(g.get(name, {})) | set(r.get(name, {}))
        for ds in sorted(dates):
            if not ds.startswith("2026-"):
                continue
            val = prefer(g.get(name, {}).get(ds), r.get(name, {}).get(ds))
            if not val:
                continue
            raw_cal[ds] = val
        raw_by_name[name] = raw_cal

    team_last_real = ""
    for cal in raw_by_name.values():
        for ds, v in cal.items():
            if is_real_shift(v) and ds > team_last_real:
                team_last_real = ds
    print(f"Ultimo turno reale del team: {team_last_real or '—'}")

    people = []
    turni: dict[str, dict] = {}
    for i, name in enumerate(order, start=1):
        pid = slug_id(name, i)
        raw_cal = raw_by_name[name]
        start, end = employment_bounds(raw_cal, team_last_real)
        # Override noti (Excel si ferma a metà mese / soli LIBERO dopo):
        # Irina: in continuo fino a ottobre, uscita a fine mese (non il 15/10).
        if "MARCHETTI" in name.upper() and (not end or end.startswith("2026-10")):
            end = "2026-10-31"
        # tieni solo i giorni in forza (niente LIBERO fantasma dopo l'uscita)
        cal = {
            ds: v
            for ds, v in raw_cal.items()
            if ds >= start and (not end or ds <= end)
        }
        people.append(
            {
                "id": pid,
                "name": name,
                "store": "VERONA",
                "hoursWeek": 40,
                "startDate": start,
                "endDate": end,
                "ferieRes": 0,
                "parRes": 0,
            }
        )
        turni[pid] = cal
        print(f"  {name}: {start} → {end or 'in forza'} ({len(cal)} giorni)")

    state = {
        "year": 2026,
        "archiveId": "verona",
        "archiveLabel": "Verona (Giallo + Rosso)",
        "people": people,
        "turni": turni,
        "maturato": {},
        "goduto": {},
        "updatedAt": datetime.now().astimezone().replace(microsecond=0).isoformat(),
        "source": {
            "giallo": GIALLO.name,
            "rosso": ROSSO.name,
            "note": "Stesso personale; VF/FW risolti; start/end da primo/ultimo turno reale.",
        },
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")
    n_cells = sum(len(v) for v in turni.values())
    print(f"Wrote {OUT} — {len(people)} persone, {n_cells} celle turno")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
