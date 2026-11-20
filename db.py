"""
db.py - SQLite storage (students, inputs, predictions, results, settings, model versions).
Safe to run on your existing student.db: new columns and tables are added automatically.
"""
import datetime
import json
import sqlite3
from contextlib import contextmanager

import numpy as np
import pandas as pd

import ml_core as ml

DB = "student.db"

# model feature name -> (table, column)
ACADEMIC_COLS = {"Attendance": "attendance", "Hours_Studied": "hours_studied",
                 "Previous_Scores": "previous_scores", "Tutoring_Sessions": "tutoring_sessions",
                 "Previous_Grade": "previous_grade", "Past_Failures": "past_failures"}
BEHAVIOUR_COLS = {"Motivation_Level": "motivation", "Parental_Involvement": "parental_involvement",
                  "Peer_Influence": "peer_influence", "Sleep_Hours": "sleep_hours",
                  "Access_to_Resources": "access_to_resources", "Teacher_Quality": "teacher_quality",
                  "Physical_Activity": "physical_activity"}


@contextmanager
def conn():
    c = sqlite3.connect(DB)
    try:
        yield c
        c.commit()
    except Exception:
        c.rollback()
        raise
    finally:
        c.close()


def query(sql, params=()):
    with conn() as c:
        return pd.read_sql(sql, c, params=params)


def _now():
    return datetime.datetime.now().strftime("%Y-%m-%d %H:%M")


def _clean(v):
    """numpy / NaN -> plain python / None so it can go into SQLite and JSON."""
    if v is None:
        return None
    if isinstance(v, (float, np.floating)) and np.isnan(v):
        return None
    if isinstance(v, np.integer):
        return int(v)
    if isinstance(v, np.floating):
        return float(v)
    return v


def _add_column(c, table, column, decl):
    cols = [r[1] for r in c.execute(f"PRAGMA table_info({table})")]
    if column not in cols:
        c.execute(f"ALTER TABLE {table} ADD COLUMN {column} {decl}")


# ------------------------------------------------------------------ set-up
def init_db():
    with conn() as c:
        c.executescript("""
        CREATE TABLE IF NOT EXISTS students(
            id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE,
            department TEXT, semester INTEGER);
        CREATE TABLE IF NOT EXISTS academic_data(
            id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER, date TEXT,
            attendance REAL, hours_studied REAL, previous_scores REAL, tutoring_sessions INTEGER);
        CREATE TABLE IF NOT EXISTS behaviour_data(
            id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER, date TEXT,
            motivation INTEGER, parental_involvement INTEGER, peer_influence INTEGER,
            sleep_hours REAL, access_to_resources INTEGER, teacher_quality INTEGER,
            physical_activity REAL);
        CREATE TABLE IF NOT EXISTS predictions(
            id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER, date TEXT,
            predicted_score REAL, risk_level TEXT);
        CREATE TABLE IF NOT EXISTS results(
            id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER,
            prediction_id INTEGER, actual_score REAL, date TEXT);
        CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY, value TEXT);
        CREATE TABLE IF NOT EXISTS model_versions(
            id INTEGER PRIMARY KEY AUTOINCREMENT, version TEXT UNIQUE, name TEXT,
            trained_at TEXT, source TEXT, n_rows INTEGER, n_real INTEGER,
            features TEXT, mae REAL, rmse REAL, r2 REAL, path TEXT, active INTEGER DEFAULT 0);
        """)
        # upgrades for databases created by the earlier version
        _add_column(c, "academic_data", "previous_grade", "REAL")
        _add_column(c, "academic_data", "past_failures", "INTEGER")
        _add_column(c, "predictions", "inputs_json", "TEXT")
        _add_column(c, "predictions", "model_version", "TEXT")
        _add_column(c, "predictions", "details_json", "TEXT")
    backfill_inputs()


def backfill_inputs():
    """Old predictions: rebuild the saved inputs so they can be used for retraining."""
    with conn() as c:
        todo = c.execute("SELECT id, student_id, date FROM predictions "
                         "WHERE inputs_json IS NULL").fetchall()
        for pid, sid, date in todo:
            a = c.execute("SELECT attendance, hours_studied, previous_scores, tutoring_sessions "
                          "FROM academic_data WHERE student_id=? AND date=? LIMIT 1", (sid, date)).fetchone()
            b = c.execute("SELECT motivation, parental_involvement, peer_influence, sleep_hours, "
                          "access_to_resources, teacher_quality, physical_activity "
                          "FROM behaviour_data WHERE student_id=? AND date=? LIMIT 1", (sid, date)).fetchone()
            if a and b:
                d = dict(zip(["Attendance", "Hours_Studied", "Previous_Scores", "Tutoring_Sessions"], a))
                d.update(zip(["Motivation_Level", "Parental_Involvement", "Peer_Influence", "Sleep_Hours",
                              "Access_to_Resources", "Teacher_Quality", "Physical_Activity"], b))
                c.execute("UPDATE predictions SET inputs_json=? WHERE id=?",
                          (json.dumps({k: _clean(v) for k, v in d.items()}), pid))


# ---------------------------------------------------------------- settings
def get_settings():
    with conn() as c:
        return dict(c.execute("SELECT key, value FROM settings").fetchall())


def set_settings(values: dict):
    with conn() as c:
        for k, v in values.items():
            c.execute("INSERT INTO settings(key, value) VALUES(?, ?) "
                      "ON CONFLICT(key) DO UPDATE SET value=excluded.value", (k, str(v)))


# ------------------------------------------------- students and predictions
def save_prediction(name, dept, sem, values, result, model_version, details=None):
    """Store the student, the inputs, and the prediction. Returns (student_id, prediction_id)."""
    now = _now()
    clean = {k: _clean(values.get(k)) for k in ml.ALL_FEATURES}
    with conn() as c:
        row = c.execute("SELECT id FROM students WHERE name=?", (name,)).fetchone()
        if row:
            sid = row[0]
            c.execute("UPDATE students SET department=?, semester=? WHERE id=?", (dept, sem, sid))
        else:
            sid = c.execute("INSERT INTO students(name, department, semester) VALUES(?,?,?)",
                            (name, dept, sem)).lastrowid
        a_cols = list(ACADEMIC_COLS.values())
        c.execute(f"INSERT INTO academic_data(student_id, date, {', '.join(a_cols)}) "
                  f"VALUES(?, ?, {', '.join('?' * len(a_cols))})",
                  [sid, now] + [clean[f] for f in ACADEMIC_COLS])
        b_cols = list(BEHAVIOUR_COLS.values())
        c.execute(f"INSERT INTO behaviour_data(student_id, date, {', '.join(b_cols)}) "
                  f"VALUES(?, ?, {', '.join('?' * len(b_cols))})",
                  [sid, now] + [clean[f] for f in BEHAVIOUR_COLS])
        pid = c.execute("INSERT INTO predictions(student_id, date, predicted_score, risk_level, "
                        "inputs_json, model_version, details_json) VALUES(?,?,?,?,?,?,?)",
                        (sid, now, result["score"], result["risk"], json.dumps(clean),
                         model_version, json.dumps(details) if details else None)).lastrowid
    return sid, pid


def students():
    return query("SELECT * FROM students ORDER BY name")


def student_predictions(sid):
    return query("""SELECT p.id, p.date, p.predicted_score, p.model_version, r.actual_score
                    FROM predictions p
                    LEFT JOIN results r ON r.prediction_id = p.id
                         AND r.id IN (SELECT MAX(id) FROM results GROUP BY prediction_id)
                    WHERE p.student_id=? ORDER BY p.id""", (sid,))


def student_inputs(pid):
    """The saved input values of one prediction as a dict (or None)."""
    df = query("SELECT inputs_json FROM predictions WHERE id=?", (pid,))
    if df.empty or not df.iloc[0, 0]:
        return None
    return json.loads(df.iloc[0, 0])


def prediction_details(pid):
    """Subject marks and period attendance saved with one prediction (or None)."""
    df = query("SELECT details_json FROM predictions WHERE id=?", (pid,))
    if df.empty or not df.iloc[0, 0]:
        return None
    return json.loads(df.iloc[0, 0])


def latest_predictions():
    return query("""SELECT s.id AS student_id, s.name, s.department, s.semester,
                           p.id AS prediction_id, p.date, p.predicted_score
                    FROM predictions p JOIN students s ON s.id = p.student_id
                    WHERE p.id IN (SELECT MAX(id) FROM predictions GROUP BY student_id)""")


# ------------------------------------------------------------------ results
def save_result(student_id, prediction_id, actual):
    with conn() as c:
        c.execute("DELETE FROM results WHERE prediction_id=?", (prediction_id,))
        c.execute("INSERT INTO results(student_id, prediction_id, actual_score, date) VALUES(?,?,?,?)",
                  (student_id, prediction_id, float(actual), _now()))


def results_joined():
    return query("""SELECT s.name, s.department, p.id AS prediction_id, p.date,
                           p.predicted_score, r.actual_score
                    FROM results r
                    JOIN predictions p ON p.id = r.prediction_id
                    JOIN students s ON s.id = r.student_id
                    WHERE r.id IN (SELECT MAX(id) FROM results GROUP BY prediction_id)""")


def attach_actuals(df):
    """Import actual scores (columns: name, actual_score) onto each student's latest prediction."""
    df = df.rename(columns={c: str(c).strip().lower() for c in df.columns})
    if not {"name", "actual_score"} <= set(df.columns):
        raise ValueError("The file needs the columns: name, actual_score")
    ok, missing, invalid, updates = 0, [], [], {}
    with conn() as c:
        for _, row in df.iterrows():
            name = str(row["name"]).strip()
            score = pd.to_numeric(row["actual_score"], errors="coerce")
            if pd.isna(score) or not 0 <= score <= 100:
                invalid.append(name)
                continue
            s = c.execute("SELECT id FROM students WHERE lower(name)=lower(?)", (name,)).fetchone()
            p = c.execute("SELECT MAX(id) FROM predictions WHERE student_id=?", (s[0],)).fetchone() if s else None
            if not s or not p or p[0] is None:
                missing.append(name)
                continue
            c.execute("DELETE FROM results WHERE prediction_id=?", (p[0],))
            c.execute("INSERT INTO results(student_id, prediction_id, actual_score, date) VALUES(?,?,?,?)",
                      (s[0], p[0], float(score), _now()))
            updates[int(p[0])] = float(score)
            ok += 1
    return {"imported": ok, "not_found": missing, "invalid": invalid, "updates": updates}


def exam_history(student_id=None):
    """One dict per saved prediction: exam stage, latest average, forecasts and the final actual."""
    sql = """SELECT p.id, p.student_id, p.predicted_score, p.inputs_json, p.details_json, r.actual_score
             FROM predictions p
             LEFT JOIN results r ON r.prediction_id = p.id
                  AND r.id IN (SELECT MAX(id) FROM results GROUP BY prediction_id)"""
    params = ()
    if student_id is not None:
        sql += " WHERE p.student_id=?"
        params = (student_id,)
    out = []
    for row in query(sql + " ORDER BY p.id", params).itertuples():
        inputs = json.loads(row.inputs_json) if row.inputs_json else {}
        ex = (json.loads(row.details_json) if row.details_json else {}).get("exam") or {}
        out.append({"id": int(row.id), "student_id": int(row.student_id), "stage": ex.get("stage", 1),
                    "prev": inputs.get("Previous_Scores"), "exam1": ex.get("exam1_avg"),
                    "pred_exam2": ex.get("pred_exam2"),
                    "pred_final": ex.get("pred_final", float(row.predicted_score)),
                    "actual_final": None if pd.isna(row.actual_score) else float(row.actual_score)})
    return out


def progression_samples():
    """(exam1, exam2, final) for students who have all three on record."""
    per = {}
    for h in exam_history():
        s = per.setdefault(h["student_id"], {})
        if h["prev"] is not None:
            s["e1" if h["stage"] == 1 else "e2"] = h["prev"]
        if h["actual_final"] is not None:
            s["final"] = h["actual_final"]
    return [(s["e1"], s["e2"], s["final"]) for s in per.values() if {"e1", "e2", "final"} <= set(s)]


def all_prediction_rows():
    """Every saved prediction with its inputs, details and latest actual score (for the Excel sheet)."""
    return query("""SELECT p.id AS pid, s.name, s.department, s.semester, p.date, p.inputs_json,
                           p.details_json, r.actual_score
                    FROM predictions p JOIN students s ON s.id = p.student_id
                    LEFT JOIN results r ON r.prediction_id = p.id
                         AND r.id IN (SELECT MAX(id) FROM results GROUP BY prediction_id)
                    ORDER BY p.id""")


def get_labelled_rows():
    """Every prediction that has an actual score, with its saved inputs (training data)."""
    df = query("""SELECT p.inputs_json, r.actual_score
                  FROM predictions p JOIN results r ON r.prediction_id = p.id
                  WHERE p.inputs_json IS NOT NULL
                    AND r.id IN (SELECT MAX(id) FROM results GROUP BY prediction_id)""")
    rows = []
    for js, actual in zip(df["inputs_json"], df["actual_score"]):
        d = json.loads(js)
        d[ml.TARGET] = actual
        rows.append(d)
    out = pd.DataFrame(rows, columns=ml.ALL_FEATURES + [ml.TARGET])
    for col in out.columns:
        out[col] = pd.to_numeric(out[col], errors="coerce")
    return out


def get_all_training_rows():
    """Every prediction with saved inputs (for ALL class students).
    Uses actual_score where available, predicted_score as fallback target.
    Returns (DataFrame, report_dict) with counts of actual vs predicted targets."""
    df = query("""SELECT s.name, s.department, p.inputs_json, p.predicted_score, r.actual_score
                  FROM predictions p
                  JOIN students s ON s.id = p.student_id
                  LEFT JOIN results r ON r.prediction_id = p.id
                       AND r.id IN (SELECT MAX(id) FROM results GROUP BY prediction_id)
                  WHERE p.inputs_json IS NOT NULL
                    AND p.id IN (SELECT MAX(id) FROM predictions GROUP BY student_id)""")
    rows = []
    n_actual, n_predicted = 0, 0
    student_names = []
    for _, r in df.iterrows():
        d = json.loads(r["inputs_json"])
        if pd.notna(r["actual_score"]):
            d[ml.TARGET] = float(r["actual_score"])
            n_actual += 1
        else:
            d[ml.TARGET] = float(r["predicted_score"])
            n_predicted += 1
        student_names.append(r["name"])
        rows.append(d)
    if not rows:
        out = pd.DataFrame(columns=ml.ALL_FEATURES + [ml.TARGET])
    else:
        out = pd.DataFrame(rows, columns=ml.ALL_FEATURES + [ml.TARGET])
        for col in out.columns:
            out[col] = pd.to_numeric(out[col], errors="coerce")
    report = {"total": len(rows), "with_actual": n_actual,
              "with_predicted": n_predicted, "students": student_names}
    return out, report


# ----------------------------------------------------------- model versions
def log_model_version(bundle, path):
    m = bundle.get("metrics", {})
    with conn() as c:
        c.execute("UPDATE model_versions SET active=0")
        c.execute("""INSERT OR REPLACE INTO model_versions(version, name, trained_at, source, n_rows,
                     n_real, features, mae, rmse, r2, path, active) VALUES(?,?,?,?,?,?,?,?,?,?,?,1)""",
                  (bundle["version"], bundle["name"], bundle["trained_at"], bundle["source"],
                   bundle["n_rows"], bundle["n_real"], ", ".join(bundle["features"]),
                   m.get("MAE"), m.get("RMSE"), m.get("R2"), path))


def list_versions():
    return query("SELECT * FROM model_versions ORDER BY id DESC")


def set_active_version(version):
    with conn() as c:
        c.execute("UPDATE model_versions SET active=0")
        c.execute("UPDATE model_versions SET active=1 WHERE version=?", (version,))


# --------------------------------------------------------- class management
def add_student(name, dept, sem):
    """Create a student record (no prediction needed). Returns the student id."""
    with conn() as c:
        row = c.execute("SELECT id FROM students WHERE lower(name)=lower(?)", (name.strip(),)).fetchone()
        if row:
            raise ValueError(f"A student named '{name.strip()}' already exists.")
        return c.execute("INSERT INTO students(name, department, semester) VALUES(?,?,?)",
                         (name.strip(), dept, sem)).lastrowid


def delete_student(sid):
    """Cascade-delete a student and ALL their data from every table."""
    with conn() as c:
        # get prediction ids first (needed for results)
        pids = [r[0] for r in c.execute("SELECT id FROM predictions WHERE student_id=?", (sid,)).fetchall()]
        if pids:
            ph = ",".join("?" * len(pids))
            c.execute(f"DELETE FROM results WHERE prediction_id IN ({ph})", pids)
        c.execute("DELETE FROM predictions WHERE student_id=?", (sid,))
        c.execute("DELETE FROM academic_data WHERE student_id=?", (sid,))
        c.execute("DELETE FROM behaviour_data WHERE student_id=?", (sid,))
        c.execute("DELETE FROM students WHERE id=?", (sid,))
    return pids


def update_student(sid, name, dept, sem):
    with conn() as c:
        c.execute("UPDATE students SET name=?, department=?, semester=? WHERE id=?",
                  (name.strip(), dept, sem, sid))


def search_students(term=""):
    """All students, optionally filtered by name substring."""
    if term.strip():
        return query("SELECT * FROM students WHERE name LIKE ? ORDER BY name",
                     (f"%{term.strip()}%",))
    return query("SELECT * FROM students ORDER BY name")


def recent_predictions(limit=10):
    """Most recent predictions with student name and risk info."""
    return query("""SELECT s.name, s.department, s.semester,
                           p.predicted_score, p.risk_level, p.date, p.id AS prediction_id
                    FROM predictions p JOIN students s ON s.id = p.student_id
                    ORDER BY p.id DESC LIMIT ?""", (limit,))


def performance_alerts():
    """Students whose latest score dropped vs previous, or who are newly high-risk."""
    rows = query("""
        SELECT s.id, s.name, s.department, s.semester,
               p1.predicted_score AS latest_score, p1.risk_level AS latest_risk,
               p1.date AS latest_date, p2.predicted_score AS prev_score
        FROM students s
        JOIN predictions p1 ON p1.student_id = s.id
            AND p1.id = (SELECT MAX(id) FROM predictions WHERE student_id = s.id)
        LEFT JOIN predictions p2 ON p2.student_id = s.id
            AND p2.id = (SELECT MAX(id) FROM predictions WHERE student_id = s.id AND id < p1.id)
    """)
    alerts = []
    for _, r in rows.iterrows():
        reasons = []
        if pd.notna(r["prev_score"]) and r["latest_score"] < r["prev_score"] - 2:
            drop = round(float(r["prev_score"] - r["latest_score"]), 1)
            reasons.append(f"Score dropped by {drop} marks (was {r['prev_score']}, now {r['latest_score']})")
        if r["latest_risk"] == "High":
            if pd.isna(r["prev_score"]):
                reasons.append("First prediction is high-risk")
            else:
                reasons.append("Currently in high-risk zone")
        if reasons:
            alerts.append({
                "id": int(r["id"]), "name": r["name"], "department": r["department"],
                "semester": r["semester"], "score": float(r["latest_score"]),
                "risk": r["latest_risk"], "date": r["latest_date"], "reasons": reasons
            })
    return alerts


def bulk_add_students(rows):
    """Add multiple students from a list of dicts [{name, department, semester}].
    Returns {added, skipped (duplicates), errors}."""
    added, skipped, errors = 0, 0, []
    with conn() as c:
        for i, row in enumerate(rows, 1):
            name = str(row.get("name", "")).strip()
            dept = str(row.get("department", "")).strip()
            sem = row.get("semester", 1)
            if not name:
                errors.append(f"Row {i}: missing name")
                continue
            try:
                sem = int(sem)
            except (ValueError, TypeError):
                sem = 1
            existing = c.execute("SELECT id FROM students WHERE lower(name)=lower(?)", (name,)).fetchone()
            if existing:
                skipped += 1
                continue
            c.execute("INSERT INTO students(name, department, semester) VALUES(?,?,?)",
                      (name, dept, sem))
            added += 1
    return {"added": added, "skipped": skipped, "errors": errors}


def all_students_with_scores():
    """All students with their latest prediction score (for comparison)."""
    return query("""
        SELECT s.id, s.name, s.department, s.semester,
               p.predicted_score, p.risk_level, p.date, p.inputs_json
        FROM students s
        LEFT JOIN predictions p ON p.student_id = s.id
            AND p.id = (SELECT MAX(id) FROM predictions WHERE student_id = s.id)
        ORDER BY s.name
    """)