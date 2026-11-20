import os, glob, joblib
import pandas as pd
import numpy as np
import kagglehub
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.linear_model import Ridge
from sklearn.ensemble import RandomForestRegressor
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from xgboost import XGBRegressor

# 1. Load data
path = kagglehub.dataset_download("lainguyn123/student-performance-factors")
df = pd.read_csv(glob.glob(os.path.join(path, "*.csv"))[0])
print(df.shape)

# 2. Preprocess
df = df.dropna()
level = {"Low": 1, "Medium": 2, "High": 3}
for col in ["Motivation_Level", "Parental_Involvement",
            "Access_to_Resources", "Teacher_Quality"]:
    df[col] = df[col].map(level)
df["Peer_Influence"] = df["Peer_Influence"].map({"Negative": 1, "Neutral": 2, "Positive": 3})
df = df.dropna()

# 3. Feature groups
academic = ["Hours_Studied", "Attendance", "Previous_Scores", "Tutoring_Sessions"]
behaviour = ["Motivation_Level", "Parental_Involvement", "Peer_Influence",
             "Sleep_Hours", "Access_to_Resources", "Teacher_Quality",
             "Physical_Activity"]
target = "Exam_Score"

# 4. Models (Ridge now uses scaling)
def get_models():
    return {
        "Ridge": make_pipeline(StandardScaler(), Ridge(alpha=1.0)),
        "RandomForest": RandomForestRegressor(n_estimators=200, random_state=42),
        "XGBoost": XGBRegressor(n_estimators=300, learning_rate=0.05,
                                max_depth=4, random_state=42),
    }

def evaluate(features, label):
    X, y = df[features], df[target]
    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, random_state=42)
    print(f"\n=== {label} ===")
    results = {}
    for name, m in get_models().items():
        cv = cross_val_score(m, X_tr, y_tr, cv=5, scoring="r2").mean()
        m.fit(X_tr, y_tr)
        p = m.predict(X_te)
        mae = mean_absolute_error(y_te, p)
        rmse = np.sqrt(mean_squared_error(y_te, p))
        r2 = r2_score(y_te, p)
        results[name] = r2
        print(f"{name:13s} CV-R2={cv:.3f} MAE={mae:.2f} RMSE={rmse:.2f} R2={r2:.3f}")
    return results

# 5. Academic-only vs academic + behavioural
evaluate(academic, "Academic only")
res = evaluate(academic + behaviour, "Academic + Behavioural")

# 6. Retrain best model on all data and save
best = max(res, key=res.get)
print("\nBest model:", best)
features = academic + behaviour
final = get_models()[best].fit(df[features], df[target])

# 7. Show Ridge coefficients (useful for the explainability section of your report)
if best == "Ridge":
    coefs = final.named_steps["ridge"].coef_
    imp = pd.Series(coefs, index=features).sort_values(key=abs, ascending=False)
    print("\nStandardised coefficients (impact on exam score):")
    print(imp.round(3))

os.makedirs("models", exist_ok=True)
joblib.dump({"model": final, "features": features}, "models/final_model.pkl")
df.to_csv("processed_students.csv", index=False)
print("\nSaved models/final_model.pkl and processed_students.csv")