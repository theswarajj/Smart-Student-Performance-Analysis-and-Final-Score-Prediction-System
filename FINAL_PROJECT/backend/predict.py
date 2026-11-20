"""
predict.py – load the trained model and expose prediction utilities.
Used by the backend API (app.py) to predict student final scores,
classify risk, compute feature contributions, and generate recommendations.

Supports hot-reloading the model after retraining with any model architecture
(Ridge, RandomForest, GradientBoosting, XGBoost).
"""
import os
import joblib
import pandas as pd
import numpy as np

MODEL_PATH = "models/final_model.pkl"
DATA_PATH = "processed_students.csv"

# ── Global mutable state (reloaded on retrain) ──────────────────
bundle = joblib.load(MODEL_PATH)
model = bundle["model"]
FEATURES = bundle.get("features", [
    "Hours_Studied", "Attendance", "Previous_Scores", "Tutoring_Sessions",
    "Motivation_Level", "Parental_Involvement", "Peer_Influence",
    "Sleep_Hours", "Access_to_Resources", "Teacher_Quality", "Physical_Activity"
])

ref = pd.read_csv(DATA_PATH)
ref = ref.drop("Exam_Score", axis=1, errors="ignore")

_all_preds = model.predict(ref[FEATURES])
HIGH_CUTOFF = float(pd.Series(_all_preds).quantile(0.25))
LOW_CUTOFF = float(pd.Series(_all_preds).quantile(0.75))


def get_model():
    return model


def get_features():
    return FEATURES


def get_cutoffs():
    return HIGH_CUTOFF, LOW_CUTOFF


def reload_model():
    """Reload the model from disk after retraining. Updates all globals."""
    global bundle, model, FEATURES, HIGH_CUTOFF, LOW_CUTOFF, ref

    bundle = joblib.load(MODEL_PATH)
    model = bundle["model"]
    FEATURES = bundle.get("features", FEATURES)

    ref = pd.read_csv(DATA_PATH)
    ref = ref.drop("Exam_Score", axis=1, errors="ignore")

    _all_preds = model.predict(ref[FEATURES])
    HIGH_CUTOFF = float(pd.Series(_all_preds).quantile(0.25))
    LOW_CUTOFF = float(pd.Series(_all_preds).quantile(0.75))

    return {
        "features": FEATURES,
        "high_cutoff": float(HIGH_CUTOFF),
        "low_cutoff": float(LOW_CUTOFF),
        "version": bundle.get("version", "initial"),
    }


def risk_level(score):
    """Classify predicted score into High / Medium / Low risk."""
    if score < HIGH_CUTOFF:
        return "High"
    elif score < LOW_CUTOFF:
        return "Medium"
    else:
        return "Low"


def contributions(features: dict) -> pd.Series:
    """
    Compute per-feature contribution to the predicted score
    relative to the average student (in marks).
    Works reliably for Linear models (Ridge), Trees (Random Forest), and Boosting.
    """
    scaler = model.named_steps.get("standardscaler") if hasattr(model, "named_steps") else None
    if scaler is not None and hasattr(scaler, "mean_") and hasattr(scaler, "scale_"):
        means = dict(zip(FEATURES, scaler.mean_))
        scales = {f: (scaler.scale_[i] if scaler.scale_[i] != 0 else 1.0) for i, f in enumerate(FEATURES)}
    else:
        means = {f: float(ref[f].mean()) if f in ref.columns else 0.0 for f in FEATURES}
        scales = {f: (float(ref[f].std()) if f in ref.columns and ref[f].std() != 0 else 1.0) for f in FEATURES}

    est = model.steps[-1][1] if hasattr(model, "steps") else model

    impact = {}
    if hasattr(est, "coef_"):
        coefs = dict(zip(FEATURES, est.coef_))
        for f in FEATURES:
            scale_val = scales.get(f, 1.0)
            diff = features.get(f, means.get(f, 0.0)) - means.get(f, 0.0)
            impact[f] = float(coefs.get(f, 0.0)) * diff / (scale_val if scale_val != 0 else 1.0)
    elif hasattr(est, "feature_importances_"):
        importances = dict(zip(FEATURES, est.feature_importances_))
        for f in FEATURES:
            scale_val = scales.get(f, 1.0)
            diff = features.get(f, means.get(f, 0.0)) - means.get(f, 0.0)
            norm_diff = diff / (scale_val if scale_val != 0 else 1.0)
            # Tree importances are positive weights; direction comes from feature deviation
            impact[f] = float(norm_diff * importances.get(f, 0.0) * 8.0)
    else:
        for f in FEATURES:
            impact[f] = float(features.get(f, 0.0) - means.get(f, 0.0))

    return pd.Series(impact).sort_values()


RULES = {
    "Attendance":           (lambda v: v < 85, "Improve class attendance. Aim for 85% or higher."),
    "Hours_Studied":        (lambda v: v < 20, "Increase weekly study hours with a fixed timetable (target 20+ hours)."),
    "Previous_Scores":      (lambda v: v < 65, "Revise the fundamentals from earlier topics to close knowledge gaps."),
    "Tutoring_Sessions":    (lambda v: v < 1,  "Attend tutoring or doubt-clearing sessions once or twice a month."),
    "Motivation_Level":     (lambda v: v < 2,  "Set short-term goals and track small wins to build motivation."),
    "Parental_Involvement": (lambda v: v < 2,  "Share your study plan with family or a mentor for regular check-ins."),
    "Peer_Influence":       (lambda v: v < 2,  "Join a positive study group and spend time with focused peers."),
    "Access_to_Resources":  (lambda v: v < 2,  "Use the college library, online notes and free learning platforms."),
    "Teacher_Quality":      (lambda v: v < 2,  "Supplement lectures with video courses and ask teachers for extra help."),
    "Physical_Activity":    (lambda v: v < 2,  "Add light exercise a few times a week to improve focus."),
    "Sleep_Hours":          (lambda v: v < 6,  "Aim for 7-8 hours of sleep to support concentration and memory."),
}


def recommendations(features: dict):
    """Return a list of (factor, advice) tuples sorted by impact."""
    contribs = contributions(features)
    student = []
    for feat in contribs.index:  # worst impact first
        if feat in RULES:
            check, advice = RULES[feat]
            if check(features.get(feat, 0)):
                student.append((feat, advice))
    return student


def predict_student(features: dict) -> dict:
    """
    Main entry point: predict final score from a feature dict.
    Returns dict with predicted_score, risk, top_factors, weak_areas.
    """
    row = pd.DataFrame([features])[FEATURES]
    score = round(float(model.predict(row)[0]), 1)
    return {
        "predicted_score": score,
        "risk": risk_level(score),
        "top_factors": contributions(features),
        "weak_areas": recommendations(features),
    }


if __name__ == "__main__":
    print(f"Risk thresholds -> High: < {HIGH_CUTOFF:.1f} | Medium: {HIGH_CUTOFF:.1f}-{LOW_CUTOFF:.1f} | Low: >= {LOW_CUTOFF:.1f}\n")
    sample = dict(zip(FEATURES, [12, 68, 65, 1, 2, 2, 1, 6, 2, 2, 2]))
    r = predict_student(sample)
    print("Predicted score:", r["predicted_score"])
    print("Risk level     :", r["risk"])
    print("\nTop factors (marks above/below the average student):", r["top_factors"])
    print("\nRecommendations (most important first):")
    for i, (feat, advice) in enumerate(r["weak_areas"], 1):
        print(f"{i}. [{feat}] {advice}")
