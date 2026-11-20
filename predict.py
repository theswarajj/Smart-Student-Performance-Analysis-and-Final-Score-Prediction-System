import joblib
import pandas as pd

# ---------- Load model and reference data ----------
bundle = joblib.load("models/final_model.pkl")
model, FEATURES = bundle["model"], bundle["features"]
ref = pd.read_csv("processed_students.csv")

# ---------- Risk thresholds (taken from the data) ----------
HIGH_CUTOFF = ref["Exam_Score"].quantile(0.25)   # below this = High risk
LOW_CUTOFF = ref["Exam_Score"].quantile(0.75)    # at/above this = Low risk


def risk_level(score):
    if score < HIGH_CUTOFF:
        return "High"
    if score < LOW_CUTOFF:
        return "Medium"
    return "Low"


# ---------- Explainability ----------
def contributions(x_df):
    """Per-feature contribution (marks) vs the average student.
    For Ridge this equals the SHAP value; tree models fall back to SHAP."""
    if hasattr(model, "named_steps"):
        scaler = model.named_steps["standardscaler"]
        ridge = model.named_steps["ridge"]
        z = scaler.transform(x_df[FEATURES])[0]
        return pd.Series(ridge.coef_ * z, index=FEATURES)
    import shap
    explainer = shap.TreeExplainer(model)
    return pd.Series(explainer.shap_values(x_df[FEATURES])[0], index=FEATURES)


# ---------- Recommendation rules ----------
RULES = {
    "Attendance": (lambda v: v < 80, "Improve class attendance. Aim for 85% or higher."),
    "Hours_Studied": (lambda v: v < 20, "Increase weekly study hours with a fixed timetable (target 20+ hours)."),
    "Previous_Scores": (lambda v: v < 70, "Revise the fundamentals from earlier topics to close knowledge gaps."),
    "Tutoring_Sessions": (lambda v: v < 1, "Attend tutoring or doubt-clearing sessions once or twice a month."),
    "Motivation_Level": (lambda v: v <= 1, "Set short-term goals and track small wins to build motivation."),
    "Parental_Involvement": (lambda v: v <= 1, "Share your study plan with family or a mentor for regular check-ins."),
    "Peer_Influence": (lambda v: v <= 1, "Join a positive study group and spend time with focused peers."),
    "Access_to_Resources": (lambda v: v <= 1, "Use the college library, online notes and free learning platforms."),
    "Teacher_Quality": (lambda v: v <= 1, "Supplement lectures with video courses and ask teachers for extra help."),
    "Physical_Activity": (lambda v: v < 2, "Add light exercise a few times a week to improve focus."),
    "Sleep_Hours": (lambda v: v < 6, "Aim for 7-8 hours of sleep to support concentration and memory."),
}


def recommendations(student, contrib):
    items = []
    for feat, (is_weak, advice) in RULES.items():
        if feat in student and is_weak(student[feat]):
            items.append((contrib.get(feat, 0), feat, advice))
    items.sort(key=lambda t: t[0])   # biggest negative impact first
    return [(feat, advice) for _, feat, advice in items]


# ---------- Main function ----------
def predict_student(student: dict):
    x = pd.DataFrame([student])[FEATURES]
    score = float(max(0, min(100, model.predict(x)[0])))
    contrib = contributions(x)
    return {
        "predicted_score": round(score, 1),
        "risk": risk_level(score),
        "top_factors": contrib.sort_values(key=abs, ascending=False).head(5).round(2),
        "weak_areas": recommendations(student, contrib),
    }


if __name__ == "__main__":
    print(f"Risk thresholds -> High: < {HIGH_CUTOFF:.1f} | "
          f"Medium: {HIGH_CUTOFF:.1f}-{LOW_CUTOFF:.1f} | Low: >= {LOW_CUTOFF:.1f}\n")

    # Low=1, Medium=2, High=3 | Peer_Influence: Negative=1, Neutral=2, Positive=3
    sample = {
        "Hours_Studied": 12, "Attendance": 68, "Previous_Scores": 65,
        "Tutoring_Sessions": 0, "Motivation_Level": 1,
        "Parental_Involvement": 2, "Peer_Influence": 1, "Sleep_Hours": 6,
        "Access_to_Resources": 2, "Teacher_Quality": 2, "Physical_Activity": 1,
    }
    r = predict_student(sample)
    print("Predicted score:", r["predicted_score"])
    print("Risk level     :", r["risk"])
    print("\nTop factors (marks above/below the average student):")
    print(r["top_factors"])
    print("\nRecommendations (most important first):")
    for i, (feat, advice) in enumerate(r["weak_areas"], 1):
        print(f"{i}. [{feat}] {advice}")