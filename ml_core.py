"""
ml_core.py - all machine-learning logic (no Streamlit code in here).

Handles: loading the active model, predicting, explaining, recommending,
risk thresholds, retraining and model versioning.
"""
import datetime
import os
import shutil

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import cross_val_score, train_test_split
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

# ----------------------------------------------------------------- settings
MODEL_DIR = "models"
ACTIVE_PATH = os.path.join(MODEL_DIR, "final_model.pkl")
INITIAL_PATH = os.path.join(MODEL_DIR, "model_initial.pkl")
DATA_PATH = "processed_students.csv"
TARGET = "Exam_Score"

ACADEMIC = ["Hours_Studied", "Attendance", "Previous_Scores", "Tutoring_Sessions"]
BEHAVIOUR = ["Motivation_Level", "Parental_Involvement", "Peer_Influence",
             "Sleep_Hours", "Access_to_Resources", "Teacher_Quality", "Physical_Activity"]
BASE_FEATURES = ACADEMIC + BEHAVIOUR                       # the 11 dataset factors
EXTRA_FEATURES = ["Previous_Grade", "Past_Failures"]      # academic-record factors
ALL_FEATURES = BASE_FEATURES + EXTRA_FEATURES
DEFAULT_REFERENCE = {"Previous_Grade": 7.0, "Past_Failures": 0.5}

MODEL_NAMES = ["Ridge", "RandomForest", "XGBoost"]
MIN_EXTRA_ROWS = 20      # grade/failure columns need this many real records to be used
MIN_REAL = 1             # minimum labelled students to retrain with real data (base+real)
MIN_REAL_ONLY = 30       # minimum labelled students to train on them alone


def pretty(feature):
    return feature.replace("_", " ")


# --------------------------------------------------------------------- data
def load_base_data(path=DATA_PATH):
    if not os.path.exists(path):
        raise FileNotFoundError(
            f"'{path}' not found. Run download.py first (it creates the dataset and the model).")
    df = pd.read_csv(path)
    return df[BASE_FEATURES + [TARGET]].dropna().reset_index(drop=True)


def assemble_frame(base_df, real_df, source):
    """source: 'base+real' or 'real'. Extra columns are NaN for the base dataset."""
    parts = []
    if source == "base+real":
        b = base_df[BASE_FEATURES + [TARGET]].copy()
        for f in EXTRA_FEATURES:
            b[f] = np.nan
        b["_real"] = False
        parts.append(b)
    if real_df is not None and len(real_df):
        r = real_df[ALL_FEATURES + [TARGET]].dropna(subset=BASE_FEATURES + [TARGET]).copy()
        r["_real"] = True
        parts.append(r)
    if not parts:
        raise ValueError("No training data available.")
    return pd.concat(parts, ignore_index=True)


def select_features(frame, wanted):
    """Keep extra features only when enough real records contain them."""
    keep, dropped = [], []
    real = frame[frame["_real"]]
    for f in wanted:
        if f in EXTRA_FEATURES and real[f].notna().sum() < MIN_EXTRA_ROWS:
            dropped.append(f)
        else:
            keep.append(f)
    return keep, dropped


# ------------------------------------------------------------------- models
def available_models():
    names = ["Ridge", "RandomForest"]
    try:
        import xgboost  # noqa: F401
        names.append("XGBoost")
    except ImportError:
        pass
    return names


def make_model(name):
    if name == "Ridge":
        return make_pipeline(SimpleImputer(strategy="median"), StandardScaler(), Ridge(alpha=1.0))
    if name == "RandomForest":
        return make_pipeline(SimpleImputer(strategy="median"),
                             RandomForestRegressor(n_estimators=200, min_samples_leaf=2,
                                                   random_state=42, n_jobs=-1))
    if name == "XGBoost":
        from xgboost import XGBRegressor
        return XGBRegressor(n_estimators=300, learning_rate=0.05, max_depth=4, random_state=42)
    raise ValueError(f"Unknown model: {name}")


def model_label(model):
    est = model.steps[-1][1] if hasattr(model, "steps") else model
    return {"Ridge": "Ridge", "RandomForestRegressor": "RandomForest",
            "XGBRegressor": "XGBoost"}.get(type(est).__name__, type(est).__name__)


def fit_model(model, X, y, weights=None):
    if weights is None:
        return model.fit(X, y)
    if hasattr(model, "steps"):
        return model.fit(X, y, **{f"{model.steps[-1][0]}__sample_weight": weights})
    return model.fit(X, y, sample_weight=weights)


def evaluate(model, X, y):
    p = model.predict(X)
    return {"MAE": round(float(mean_absolute_error(y, p)), 3),
            "RMSE": round(float(np.sqrt(mean_squared_error(y, p))), 3),
            "R2": round(float(r2_score(y, p)), 3)}


def compare_feature_sets(base_df, cv=3):
    """Academic-only vs academic + behavioural, on the base dataset."""
    rows = []
    for label, feats in [("Academic only", ACADEMIC), ("Academic + behavioural", BASE_FEATURES)]:
        X, y = base_df[feats], base_df[TARGET]
        Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.2, random_state=42)
        for name in available_models():
            cvr2 = cross_val_score(make_model(name), Xtr, ytr, cv=cv, scoring="r2").mean()
            model = make_model(name).fit(Xtr, ytr)
            rows.append({"Feature set": label, "Model": name,
                         "CV R2": round(float(cvr2), 3), **evaluate(model, Xte, yte)})
    return pd.DataFrame(rows)


# ----------------------------------------------------------------- retrain
def train_candidates(frame, features, real_weight, names, cv=3, seed=42):
    """Train each candidate on 80 percent and score it on the other 20 percent."""
    X, y = frame[features], frame[TARGET]
    real = frame["_real"].to_numpy()
    weights = np.where(real, float(real_weight), 1.0)
    idx = np.arange(len(frame))
    tr, te = train_test_split(idx, test_size=0.2, random_state=seed)
    results = []
    for name in names:
        cvr2 = cross_val_score(make_model(name), X.iloc[tr], y.iloc[tr], cv=cv, scoring="r2").mean()
        model = fit_model(make_model(name), X.iloc[tr], y.iloc[tr], weights[tr])
        m = evaluate(model, X.iloc[te], y.iloc[te])
        te_real = te[real[te]]
        real_mae = None
        if len(te_real) >= 2:
            real_mae = round(float(mean_absolute_error(
                y.iloc[te_real], model.predict(X.iloc[te_real]))), 3)
        results.append({"Model": name, "CV R2": round(float(cvr2), 3), **m,
                        "Real-student MAE": real_mae, "Real in test": int(len(te_real))})
    return results


def finalize_model(name, frame, features, real_weight, metrics, source):
    """Refit the chosen model on ALL data, save a versioned file and make it active."""
    os.makedirs(MODEL_DIR, exist_ok=True)
    archive_initial()
    X, y = frame[features], frame[TARGET]
    weights = np.where(frame["_real"].to_numpy(), float(real_weight), 1.0)
    model = fit_model(make_model(name), X, y, weights)
    version = datetime.datetime.now().strftime("v%Y%m%d-%H%M%S")
    bundle = {
        "model": model, "features": features, "name": name, "version": version,
        "trained_at": datetime.datetime.now().strftime("%Y-%m-%d %H:%M"),
        "metrics": {k: metrics[k] for k in ("MAE", "RMSE", "R2", "CV R2") if k in metrics},
        "n_rows": int(len(frame)), "n_real": int(frame["_real"].sum()),
        "source": source, "real_weight": float(real_weight),
        "reference": {f: float(frame[f].mean()) for f in features},
    }
    path = os.path.join(MODEL_DIR, f"model_{version}.pkl")
    joblib.dump(bundle, path)
    shutil.copyfile(path, ACTIVE_PATH)
    return bundle, path


def archive_initial():
    """Keep a copy of the very first model so it can always be restored."""
    if os.path.exists(ACTIVE_PATH) and not os.path.exists(INITIAL_PATH):
        shutil.copyfile(ACTIVE_PATH, INITIAL_PATH)
    return INITIAL_PATH if os.path.exists(INITIAL_PATH) else None


def activate_version(path):
    shutil.copyfile(path, ACTIVE_PATH)


# ------------------------------------------------------------ load / predict
def load_bundle(path=ACTIVE_PATH, base_df=None):
    """Load the active model. Also accepts the older {'model','features'} format."""
    if not os.path.exists(path):
        raise FileNotFoundError(f"'{path}' not found. Run download.py first.")
    b = dict(joblib.load(path))
    feats = b["features"]
    base = base_df if base_df is not None else load_base_data()
    b.setdefault("name", model_label(b["model"]))
    b.setdefault("version", "initial")
    b.setdefault("trained_at", datetime.datetime.fromtimestamp(
        os.path.getmtime(path)).strftime("%Y-%m-%d %H:%M"))
    b.setdefault("reference", {
        f: float(base[f].mean()) if f in base.columns else DEFAULT_REFERENCE.get(f, 0.0)
        for f in feats})
    b.setdefault("n_rows", int(len(base)))
    b.setdefault("n_real", 0)
    b.setdefault("source", "base dataset")
    b.setdefault("real_weight", 1.0)
    if not b.get("metrics") and all(f in base.columns for f in feats):
        b["metrics"] = evaluate(b["model"], base[feats], base[TARGET])
        b["metrics_note"] = "In-sample estimate (older model). Retrain once to record proper test metrics."
    b.setdefault("metrics", {})
    return b


def global_importance(bundle):
    """Return (DataFrame, description) of overall feature importance."""
    est = bundle["model"].steps[-1][1] if hasattr(bundle["model"], "steps") else bundle["model"]
    feats = bundle["features"]
    if hasattr(est, "coef_") and len(np.ravel(est.coef_)) == len(feats):
        vals, kind = np.ravel(est.coef_), "Standardised coefficient (marks per 1 standard deviation)"
    elif hasattr(est, "feature_importances_") and len(est.feature_importances_) == len(feats):
        vals, kind = np.asarray(est.feature_importances_), "Relative importance"
    else:
        return pd.DataFrame(columns=["Feature", "Value"]), "Not available for this model"
    df = pd.DataFrame({"Feature": feats, "Value": vals})
    return df.reindex(df["Value"].abs().sort_values(ascending=False).index).reset_index(drop=True), kind


def contributions(bundle, x):
    """Marks gained or lost versus an average student, per factor.
    Each factor is swapped for its training average and the change in prediction is measured.
    For Ridge this equals the exact SHAP value; for tree models it is an approximation."""
    model, feats, ref = bundle["model"], bundle["features"], bundle["reference"]
    x = x[feats].astype(float)
    base = float(model.predict(x)[0])
    rows = np.repeat(x.to_numpy(), len(feats), axis=0)
    for i, f in enumerate(feats):
        if not np.isnan(rows[i, i]):
            rows[i, i] = ref[f]
    out = base - model.predict(pd.DataFrame(rows, columns=feats))
    out[np.isnan(x.to_numpy()[0])] = 0.0
    return pd.Series(out, index=feats)


# ---------------------------------------------------------- recommendations
RULES = {
    "Attendance": (lambda v: v < 80, "Improve class attendance. Aim for 85% or higher."),
    "Hours_Studied": (lambda v: v < 20, "Increase weekly study hours with a fixed timetable (target 20+ hours)."),
    "Previous_Scores": (lambda v: v < 70, "Revise fundamentals from earlier topics to close knowledge gaps."),
    "Tutoring_Sessions": (lambda v: v < 1, "Attend tutoring or doubt-clearing sessions once or twice a month."),
    "Motivation_Level": (lambda v: v <= 1, "Set short-term goals and track small wins to build motivation."),
    "Parental_Involvement": (lambda v: v <= 1, "Share your study plan with family or a mentor for regular check-ins."),
    "Peer_Influence": (lambda v: v <= 1, "Join a positive study group and spend time with focused peers."),
    "Access_to_Resources": (lambda v: v <= 1, "Use the college library, online notes and free learning platforms."),
    "Teacher_Quality": (lambda v: v <= 1, "Supplement lectures with video courses and ask teachers for extra help."),
    "Physical_Activity": (lambda v: v < 2, "Add light exercise a few times a week to improve focus."),
    "Sleep_Hours": (lambda v: v < 6, "Aim for 7-8 hours of sleep to support concentration and memory."),
    "Previous_Grade": (lambda v: v < 6, "Strengthen basics with a bridge course or peer tutoring in weak subjects."),
    "Past_Failures": (lambda v: v >= 1, "Make a plan to clear backlog subjects, with remedial classes and a revision schedule."),
}


def _has(v):
    return v is not None and not pd.isna(v)


def recommend(values, contrib):
    """Advice for weak areas, with the costliest weakness first."""
    items = []
    for feat, (is_weak, advice) in RULES.items():
        v = values.get(feat)
        if _has(v) and is_weak(v):
            items.append((float(contrib.get(feat, 0.0)), feat, advice))
    items.sort(key=lambda t: t[0])
    return [(f, a) for _, f, a in items]


def record_flags(values):
    flags = []
    fails, grade = values.get("Past_Failures"), values.get("Previous_Grade")
    if _has(fails) and fails >= 1:
        flags.append(f"{int(fails)} past failure(s) / backlog subject(s) on record.")
    if _has(grade) and grade < 6:
        flags.append(f"Previous semester grade is {grade:.1f} out of 10 (below 6).")
    return flags


def out_of_range(values, base_df):
    """Inputs outside the range the model was trained on (predictions less reliable)."""
    out = []
    for f in BASE_FEATURES:
        v = values.get(f)
        if _has(v) and f in base_df.columns:
            lo, hi = float(base_df[f].min()), float(base_df[f].max())
            if v < lo or v > hi:
                out.append((f, v, lo, hi))
    return out


# ---------------------------------------------------------------- thresholds
DEFAULT_SETTINGS = {"threshold_mode": "percentile", "high_pct": "25", "low_pct": "75",
                    "high_fixed": "65", "low_fixed": "69",
                    "progress_mode": "auto", "progress_fixed": "0.5"}
THRESHOLD_KEYS = ("threshold_mode", "high_pct", "low_pct", "high_fixed", "low_fixed")


def compute_thresholds(settings, scores):
    s = {**DEFAULT_SETTINGS, **(settings or {})}
    if s["threshold_mode"] == "fixed":
        high, low = float(s["high_fixed"]), float(s["low_fixed"])
    else:
        high = float(np.percentile(scores, float(s["high_pct"])))
        low = float(np.percentile(scores, float(s["low_pct"])))
    return (high, low) if high <= low else (low, high)


def risk_level(score, high_cut, low_cut):
    if score < high_cut:
        return "High"
    if score < low_cut:
        return "Medium"
    return "Low"


# ------------------------------------------------- subject marks / attendance
def summarise_academic(subjects, periods):
    """subjects: [(name, marks, max_marks)]  periods: [(name, classes_held, classes_attended)]
    Returns the model inputs (Previous_Scores %, Attendance %), detail lists and any errors."""
    errors, sub_detail, per_detail = [], [], []
    for name, marks, mx in subjects:
        if mx <= 0:
            errors.append(f"{name}: maximum marks must be above 0.")
        elif marks > mx:
            errors.append(f"{name}: marks ({marks:g}) are above the maximum ({mx:g}).")
        else:
            sub_detail.append({"name": name, "marks": float(marks), "max": float(mx),
                               "percent": round(100.0 * marks / mx, 1)})
    held_total = attended_total = 0.0
    for name, held, attended in periods:
        if attended > held:
            errors.append(f"{name}: classes attended ({attended:g}) are more than classes held ({held:g}).")
        elif held > 0:
            held_total += held
            attended_total += attended
            per_detail.append({"name": name, "held": float(held), "attended": float(attended),
                               "percent": round(100.0 * attended / held, 1)})
    if held_total <= 0 and not any("attended" in e for e in errors):
        errors.append("Enter classes held for at least one period.")
    return {
        "previous_scores": round(float(np.mean([d["percent"] for d in sub_detail])), 1) if sub_detail else None,
        "attendance": round(100.0 * attended_total / held_total, 1) if held_total > 0 else None,
        "subjects": sub_detail, "periods": per_detail, "errors": errors,
    }


# --------------------------------------------------------- exam forecast
EXAM_LABELS = ["1st Examination", "2nd Examination", "Final Examination"]
DEFAULT_PROGRESS = 0.5


def learn_progress_weight(samples, default=DEFAULT_PROGRESS, min_n=5):
    """samples: [(exam1, exam2, final)] of real students. Returns (weight, n_used, learned).
    weight = how far exam 2 sits on the way from exam 1 to the final (0 = same as exam 1, 1 = same as final)."""
    ws = [min(max((e2 - e1) / (f - e1), 0.0), 1.0) for e1, e2, f in samples if abs(f - e1) >= 3]
    if len(ws) >= min_n:
        return float(np.median(ws)), len(ws), True
    return float(default), len(ws), False


def forecast_exams(stage, latest_avg, final_pred, rmse, weight, exam1_avg=None):
    """Rows for the three-examination picture (marks are average percentages).
    stage 1: exam 1 is done -> exam 2 and final are predicted.
    stage 2: exam 2 is done -> only the final is predicted."""
    def c(x):
        return round(float(np.clip(x, 0, 100)), 1)
    margin = 1.96 * rmse
    if stage == 1:
        exam2 = latest_avg + weight * (final_pred - latest_avg)
        return [{"Exam": EXAM_LABELS[0], "Marks": c(latest_avg), "Type": "Actual", "Margin": 0.0},
                {"Exam": EXAM_LABELS[1], "Marks": c(exam2), "Type": "Predicted",
                 "Margin": round(margin * weight, 1)},
                {"Exam": EXAM_LABELS[2], "Marks": c(final_pred), "Type": "Predicted",
                 "Margin": round(margin, 1)}]
    rows = []
    if exam1_avg is not None:
        rows.append({"Exam": EXAM_LABELS[0], "Marks": c(exam1_avg), "Type": "Actual", "Margin": 0.0})
    rows.append({"Exam": EXAM_LABELS[1], "Marks": c(latest_avg), "Type": "Actual", "Margin": 0.0})
    rows.append({"Exam": EXAM_LABELS[2], "Marks": c(final_pred), "Type": "Predicted",
                 "Margin": round(margin, 1)})
    return rows


SUBJECT_ALERT = 50.0   # a predicted subject mark below this (percent) is flagged


def forecast_subjects(stage, subjects, final_pred, rmse, weight):
    """Per-subject forecast. Each subject keeps its gap from the student's average, and all subjects
    move together with the predicted average (so the subject forecasts always average to the model's
    predicted final). subjects: [{'name', 'percent'}] from the latest examination."""
    if not subjects:
        return []
    avg = float(np.mean([s["percent"] for s in subjects]))
    shift = final_pred - avg
    margin = 1.96 * rmse * float(np.sqrt(len(subjects)))   # single subjects are noisier than the average
    rows = []
    for s in subjects:
        latest = float(s["percent"])
        final = float(np.clip(latest + shift, 0, 100))
        exam2 = float(np.clip(latest + weight * shift, 0, 100)) if stage == 1 else None
        rows.append({"Subject": s["name"], "Latest": round(latest, 1),
                     "Pred_Exam2": None if exam2 is None else round(exam2, 1),
                     "Pred_Final": round(final, 1),
                     "Margin_Exam2": round(margin * weight, 1) if stage == 1 else None,
                     "Margin_Final": round(margin, 1), "Weak": final < SUBJECT_ALERT})
    return rows


def subject_chart_rows(rows, stage):
    """Long-format rows for the subject chart (one panel per examination)."""
    out = []
    for r in rows:
        out.append({"Subject": r["Subject"], "Exam": EXAM_LABELS[stage - 1], "Type": "Actual",
                    "Marks": r["Latest"], "Margin": 0.0})
        if stage == 1:
            out.append({"Subject": r["Subject"], "Exam": EXAM_LABELS[1], "Type": "Predicted",
                        "Marks": r["Pred_Exam2"], "Margin": r["Margin_Exam2"]})
        out.append({"Subject": r["Subject"], "Exam": EXAM_LABELS[2], "Type": "Predicted",
                    "Marks": r["Pred_Final"], "Margin": r["Margin_Final"]})
    return out


def subject_advice(rows):
    """[(level, text)] where level is 'warning' or 'info'."""
    out = []
    for r in rows:
        if r["Weak"]:
            out.append(("warning", f"{r['Subject']}: predicted final {r['Pred_Final']}% is below "
                                   f"{SUBJECT_ALERT:.0f}%. Plan extra revision and ask the teacher for help."))
    if len(rows) > 1:
        weakest = min(rows, key=lambda r: r["Pred_Final"])
        strongest = max(rows, key=lambda r: r["Pred_Final"])
        if not weakest["Weak"]:
            out.append(("info", f"Weakest subject: {weakest['Subject']} ({weakest['Pred_Final']}% predicted). "
                                f"Give it the most revision time."))
        out.append(("info", f"Strongest subject: {strongest['Subject']} ({strongest['Pred_Final']}% predicted)."))
    return out


# ------------------------------------------------------------------ predict
def predict_one(bundle, values, high_cut, low_cut):
    feats = bundle["features"]
    x = pd.DataFrame([{f: values.get(f, np.nan) for f in feats}]).astype(float)
    score = float(np.clip(bundle["model"].predict(x)[0], 0, 100))
    rmse = float(bundle.get("metrics", {}).get("RMSE") or 2.5)
    contrib = contributions(bundle, x)
    return {
        "score": round(score, 1),
        "low": round(max(0.0, score - 1.96 * rmse), 1),
        "high": round(min(100.0, score + 1.96 * rmse), 1),
        "risk": risk_level(score, high_cut, low_cut),
        "contrib": contrib.reindex(contrib.abs().sort_values(ascending=False).index),
        "recommendations": recommend(values, contrib),
        "flags": record_flags(values),
        "uses_extras": any(f in feats for f in EXTRA_FEATURES),
    }