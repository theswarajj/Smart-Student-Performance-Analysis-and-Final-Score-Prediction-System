"""
excel_store.py - the training sheet (training_data.xlsx).

Every prediction you save is added to this Excel file, and every actual score you enter
is written next to it. Retraining reads ONLY from this sheet, so you can open it in Excel,
correct values, add rows, or switch a row off with Use_For_Training = No.
"""
import datetime
import io
import json
import os
import re

import numpy as np
import pandas as pd

import db
import ml_core as ml

PATH = "training_data.xlsx"
SHEET = "Training Data"
GUIDE_SHEET = "How to use"

META_COLS = ["Prediction_ID", "Source", "Student_Name", "Department", "Semester", "Date_Entered"]
COLUMNS = (META_COLS + ml.ALL_FEATURES +
           ["Exam_Stage", "Pred_Exam2_Avg", "Pred_Final_Avg", "Subject_Forecast", "Subject_Marks", "Attendance_Periods",
            "Actual_Score", "Use_For_Training", "Last_Updated"])
REQUIRED = ml.BASE_FEATURES + ["Actual_Score"]

LEVEL_COLS = ["Motivation_Level", "Parental_Involvement", "Access_to_Resources",
              "Teacher_Quality", "Peer_Influence"]
RANGES = {"Hours_Studied": (0, 100), "Attendance": (0, 100), "Previous_Scores": (0, 100),
          "Tutoring_Sessions": (0, 50), "Sleep_Hours": (0, 24), "Physical_Activity": (0, 40),
          "Previous_Grade": (0, 10), "Past_Failures": (0, 20), "Actual_Score": (0, 100)}
TEXT_LEVELS = {"low": 1, "medium": 2, "high": 3, "negative": 1, "neutral": 2, "positive": 3}

ALIASES = {"student": "Student_Name", "name": "Student_Name", "studentname": "Student_Name",
           "actual": "Actual_Score", "actualscore": "Actual_Score", "finalscore": "Actual_Score",
           "examscore": "Actual_Score", "usefortraining": "Use_For_Training"}


class ExcelLocked(Exception):
    """The workbook could not be written (usually because it is open in Excel)."""


def _key(text):
    return re.sub(r"[^a-z0-9]", "", str(text).lower())


_CANONICAL = {_key(c): c for c in COLUMNS}
_CANONICAL.update(ALIASES)


def _normalise_columns(df):
    return df.rename(columns={c: _CANONICAL[_key(c)] for c in df.columns if _key(c) in _CANONICAL})


def _now():
    return datetime.datetime.now().strftime("%Y-%m-%d %H:%M")


# ------------------------------------------------------------------ file i/o
def _guide():
    lines = [
        ["AcadIQ training sheet"],
        ["This file is created and updated by the app. Retraining reads the 'Training Data' sheet."],
        [""],
        ["Rows"],
        ["Source = App: added automatically when you save a prediction. Actual_Score is filled when you enter the real result."],
        ["Source = Uploaded / Manual: rows you added yourself. They need all 11 factor columns and an Actual_Score."],
        ["Rows without Actual_Score are 'pending' and are ignored by retraining."],
        ["Exam_Stage: 1 = predicted after the 1st examination, 2 = after the 2nd. Pred_Exam2_Avg, Pred_Final_Avg and Subject_Forecast (latest > 2nd > final, per subject) are forecasts: information only, not used for training."],
        ["Set Use_For_Training = No to keep a row in the sheet but leave it out of retraining."],
        [""],
        ["Codes"],
        ["Motivation_Level, Parental_Involvement, Access_to_Resources, Teacher_Quality: 1 = Low, 2 = Medium, 3 = High (you may type Low / Medium / High)."],
        ["Peer_Influence: 1 = Negative, 2 = Neutral, 3 = Positive (you may type the words)."],
        ["Hours_Studied = hours per week, Sleep_Hours = hours per day, Physical_Activity = hours per week, Tutoring_Sessions = per month."],
        ["Attendance and Previous_Scores are percentages (0-100). Previous_Grade is out of 10 and Past_Failures is a count (both optional)."],
        ["Actual_Score is the final exam score (0-100)."],
        [""],
        ["Tips"],
        ["Close the file in Excel before saving new predictions in the app, otherwise the sheet cannot be updated."],
        ["Do not rename the column headers."],
    ]
    return pd.DataFrame(lines)


def _style(ws, n_rows):
    from openpyxl.styles import Alignment, Font, PatternFill
    from openpyxl.utils import get_column_letter
    from openpyxl.worksheet.datavalidation import DataValidation
    head_fill = PatternFill("solid", fgColor="1F6F78")
    for cell in ws[1]:
        cell.font = Font(bold=True, color="FFFFFF")
        cell.fill = head_fill
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    ws.freeze_panes = "A2"
    ws.row_dimensions[1].height = 32
    for i, col in enumerate(COLUMNS, 1):
        width = 34 if col in ("Subject_Marks", "Attendance_Periods") else \
            34 if col == "Subject_Forecast" else \
            14 if col in ("Exam_Stage", "Pred_Exam2_Avg", "Pred_Final_Avg") else \
            20 if col in ("Student_Name", "Date_Entered", "Last_Updated") else 16
        ws.column_dimensions[get_column_letter(i)].width = width
    dv = DataValidation(type="list", formula1='"Yes,No"', allow_blank=True)
    ws.add_data_validation(dv)
    dv.add(f"{get_column_letter(COLUMNS.index('Use_For_Training') + 1)}2:"
           f"{get_column_letter(COLUMNS.index('Use_For_Training') + 1)}{max(n_rows + 500, 1000)}")


def _write(df, target):
    out = df.reindex(columns=COLUMNS)
    with pd.ExcelWriter(target, engine="openpyxl") as w:
        out.to_excel(w, sheet_name=SHEET, index=False)
        _guide().to_excel(w, sheet_name=GUIDE_SHEET, index=False, header=False)
        _style(w.sheets[SHEET], len(out))
        w.sheets[GUIDE_SHEET].column_dimensions["A"].width = 130


def save(df, path=PATH):
    tmp = path[:-5] + ".tmp.xlsx" if path.endswith(".xlsx") else path + ".tmp.xlsx"
    _write(df, tmp)
    try:
        os.replace(tmp, path)
    except PermissionError as e:
        if os.path.exists(tmp):
            os.remove(tmp)
        raise ExcelLocked(f"Cannot write {path}. Close it in Excel and try again.") from e


def load(path=PATH):
    if not os.path.exists(path):
        return pd.DataFrame(columns=COLUMNS)
    try:
        sheets = pd.ExcelFile(path).sheet_names
        df = pd.read_excel(path, sheet_name=SHEET if SHEET in sheets else sheets[0])
    except PermissionError as e:
        raise ExcelLocked(f"Cannot read {path}. Close it in Excel and try again.") from e
    return _normalise_columns(df).reindex(columns=COLUMNS)


def ensure_exists(path=PATH):
    """Create the sheet on first use from whatever is already in the database."""
    if not os.path.exists(path):
        save(pd.DataFrame(columns=COLUMNS), path)
        sync_from_db(path)


# --------------------------------------------------------------- validation
def _coerce(df):
    """Numeric copy of the sheet; level words (Low / Medium / High ...) become 1-3."""
    d = df.copy()
    for col in LEVEL_COLS:
        d[col] = d[col].map(lambda v: TEXT_LEVELS.get(str(v).strip().lower(), v)
                            if isinstance(v, str) else v)
    for col in ml.ALL_FEATURES + ["Actual_Score"]:
        d[col] = pd.to_numeric(d[col], errors="coerce")
    return d


def validate(df):
    """Returns the numeric frame and a Series of problems ('' means the row is valid)."""
    d = _coerce(df)
    why = pd.Series("", index=d.index, dtype=object)
    for col in ml.BASE_FEATURES + ["Actual_Score"]:
        if col in LEVEL_COLS:
            bad = ~d[col].isin([1, 2, 3])
            msg = f"{col} must be 1, 2 or 3"
        else:
            lo, hi = RANGES[col]
            bad = d[col].isna() | (d[col] < lo) | (d[col] > hi)
            msg = f"{col} must be a number from {lo} to {hi}"
        why[bad] = why[bad] + msg + "; "
    for col in ml.EXTRA_FEATURES:
        lo, hi = RANGES[col]
        bad = d[col].notna() & ((d[col] < lo) | (d[col] > hi))
        why[bad] = why[bad] + f"{col} must be from {lo} to {hi}; "
    return d, why.str.rstrip("; ")


def training_rows(path=PATH):
    """Rows usable for retraining + a report of what was left out and why."""
    df = load(path)
    d, why = validate(df)
    use = df["Use_For_Training"].astype(str).str.strip().str.lower() != "no"
    pending = d["Actual_Score"].isna()
    ok = use & ~pending & (why == "")
    invalid = [(int(i) + 2, why[i]) for i in df.index[use & ~pending & (why != "")]]
    report = {"total": int(len(df)), "usable": int(ok.sum()),
              "pending": int((use & pending).sum()), "excluded": int((~use).sum()),
              "invalid": invalid}
    out = d.loc[ok, ml.ALL_FEATURES + ["Actual_Score"]].rename(columns={"Actual_Score": ml.TARGET})
    return out.reset_index(drop=True), report


# ----------------------------------------------------------------- app rows
def _subject_text(details):
    if not details:
        return None
    return "; ".join(f"{s['name']} {s['marks']:g}/{s['max']:g}" for s in details.get("subjects", [])) or None


def _forecast_text(details):
    rows = ((details or {}).get("exam") or {}).get("subjects_forecast") or []
    parts = []
    for r in rows:
        steps = [r["Latest"]] + ([r["Pred_Exam2"]] if r.get("Pred_Exam2") is not None else []) + [r["Pred_Final"]]
        parts.append(f"{r['Subject']} " + " > ".join(f"{x:g}" for x in steps))
    return "; ".join(parts) or None


def _period_text(details):
    if not details:
        return None
    return "; ".join(f"{p['name']} {p['attended']:g}/{p['held']:g}" for p in details.get("periods", [])) or None


def _app_row(pid, name, dept, sem, date, values, details, actual=None):
    ex = (details or {}).get("exam") or {}
    row = {"Prediction_ID": int(pid), "Source": "App", "Student_Name": name, "Department": dept,
           "Semester": sem, "Date_Entered": date, "Exam_Stage": ex.get("stage"),
           "Pred_Exam2_Avg": ex.get("pred_exam2"), "Pred_Final_Avg": ex.get("pred_final"),
           "Subject_Forecast": _forecast_text(details),
           "Subject_Marks": _subject_text(details),
           "Attendance_Periods": _period_text(details), "Actual_Score": actual,
           "Use_For_Training": "Yes", "Last_Updated": _now()}
    for f in ml.ALL_FEATURES:
        v = values.get(f)
        row[f] = None if v is None or (isinstance(v, float) and np.isnan(v)) else v
    return row


def _append(df, rows):
    new = pd.DataFrame(rows, columns=COLUMNS)
    return new if df.empty else pd.concat([df, new], ignore_index=True)


def add_prediction(pid, name, dept, sem, values, details=None, path=PATH):
    df = load(path)
    ids = pd.to_numeric(df["Prediction_ID"], errors="coerce")
    df = df[ids != pid]
    save(_append(df, [_app_row(pid, name, dept, sem, _now(), values, details)]), path)


def set_actuals(mapping, path=PATH):
    """mapping {prediction_id: actual_score}. Rows missing from the sheet are synced from the database."""
    df = load(path)
    ids = pd.to_numeric(df["Prediction_ID"], errors="coerce")
    missing = False
    for pid, actual in mapping.items():
        mask = ids == pid
        if mask.any():
            df.loc[mask, "Actual_Score"] = float(actual)
            df.loc[mask, "Last_Updated"] = _now()
            blank = mask & df["Use_For_Training"].isna()
            df.loc[blank, "Use_For_Training"] = "Yes"
        else:
            missing = True
    save(df, path)
    if missing:
        sync_from_db(path)


def sync_from_db(path=PATH):
    """Add database predictions that are not in the sheet yet, and fill blank actual scores.
    Never overwrites values already in the sheet."""
    rows = db.all_prediction_rows()
    df = load(path)
    ids = pd.to_numeric(df["Prediction_ID"], errors="coerce")
    have = set(ids.dropna().astype(int))
    new_rows, filled, skipped = [], 0, 0
    for r in rows.itertuples():
        pid = int(r.pid)
        actual = None if pd.isna(r.actual_score) else float(r.actual_score)
        if pid in have:
            if actual is not None:
                mask = ids == pid
                if df.loc[mask, "Actual_Score"].isna().all():
                    df.loc[mask, "Actual_Score"] = actual
                    df.loc[mask, "Last_Updated"] = _now()
                    filled += 1
            continue
        if not r.inputs_json:
            skipped += 1
            continue
        values = json.loads(r.inputs_json)
        details = json.loads(r.details_json) if r.details_json else None
        new_rows.append(_app_row(pid, r.name, r.department, r.semester, r.date, values, details, actual))
    if new_rows or filled:
        save(_append(df, new_rows), path)
    return {"added": len(new_rows), "filled": filled, "skipped": skipped}


def remove_student_rows(student_name, path=PATH):
    """Remove all rows for a student from the Excel training sheet."""
    df = load(path)
    if df.empty:
        return 0
    mask = df["Student_Name"].astype(str).str.strip().str.lower() == student_name.strip().lower()
    n = int(mask.sum())
    if n > 0:
        save(df[~mask].reset_index(drop=True), path)
    return n


# ------------------------------------------------------------------- upload
def import_excel(file, path=PATH):
    """Append rows from an uploaded Excel file (needs the 11 factor columns and Actual_Score)."""
    xl = pd.ExcelFile(file)
    raw = _normalise_columns(pd.read_excel(xl, sheet_name=SHEET if SHEET in xl.sheet_names else 0))
    missing = [c for c in REQUIRED if c not in raw.columns]
    if missing:
        raise ValueError("Missing column(s): " + ", ".join(missing) + ". Download the template to see the layout.")
    raw = raw.dropna(how="all").reset_index(drop=True)
    for c in COLUMNS:
        if c not in raw.columns:
            raw[c] = np.nan
    d, why = validate(raw)
    good = why == ""
    invalid = [(int(i) + 2, why[i]) for i in raw.index[~good]]

    existing = load(path)
    seen = set(_signature(_coerce(existing)).tolist()) if len(existing) else set()
    sig = _signature(d)
    dup = good & sig.isin(seen)
    keep = good & ~dup & ~sig.duplicated(keep="first")
    add = raw.loc[keep].copy()
    for f in ml.ALL_FEATURES + ["Actual_Score"]:
        add[f] = d.loc[keep, f]
    add["Prediction_ID"] = np.nan
    add["Source"] = "Uploaded"
    add["Student_Name"] = add["Student_Name"].fillna("")
    add["Date_Entered"] = add["Date_Entered"].fillna(_now())
    add["Use_For_Training"] = add["Use_For_Training"].fillna("Yes")
    add["Last_Updated"] = _now()
    if len(add):
        save(_append(existing, add.reindex(columns=COLUMNS).to_dict("records")), path)
    return {"added": int(keep.sum()), "duplicates": int((good & ~keep).sum()), "invalid": invalid}


def _signature(d):
    """One text fingerprint per row (factors + actual score + name), used to spot duplicates."""
    cols = ml.ALL_FEATURES + ["Actual_Score"]
    body = d[cols].apply(lambda r: "|".join("" if pd.isna(v) else f"{v:.3f}" for v in r), axis=1)
    return body + "|" + d["Student_Name"].fillna("").astype(str)


def template_bytes():
    ex = pd.DataFrame([
        {"Student_Name": "Example A", "Department": "CSE", "Semester": 3, "Hours_Studied": 18,
         "Attendance": 82, "Previous_Scores": 74, "Tutoring_Sessions": 2, "Motivation_Level": 2,
         "Parental_Involvement": 2, "Peer_Influence": 2, "Sleep_Hours": 7, "Access_to_Resources": 2,
         "Teacher_Quality": 2, "Physical_Activity": 2, "Previous_Grade": 7.4, "Past_Failures": 0,
         "Actual_Score": 71, "Use_For_Training": "Yes"},
        {"Student_Name": "Example B", "Department": "CSE", "Semester": 3, "Hours_Studied": 9,
         "Attendance": 66, "Previous_Scores": 58, "Tutoring_Sessions": 0, "Motivation_Level": "Low",
         "Parental_Involvement": "Medium", "Peer_Influence": "Negative", "Sleep_Hours": 6,
         "Access_to_Resources": "Medium", "Teacher_Quality": "Medium", "Physical_Activity": 1,
         "Previous_Grade": 5.6, "Past_Failures": 2, "Actual_Score": 60, "Use_For_Training": "Yes"}])
    buf = io.BytesIO()
    _write(ex, buf)
    return buf.getvalue()