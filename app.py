"""
app.py - Smart Student Performance Analysis (Streamlit).
Run with:  python -m streamlit run app.py
Needs db.py, ml_core.py, models/final_model.pkl and processed_students.csv in the same folder.
"""
import io
import json
import os

import numpy as np
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st

import db
import excel_store
import ml_core as ml

st.set_page_config(page_title="Student Performance Analysis", layout="wide",
                   page_icon="🎓", initial_sidebar_state="expanded")

# ---------------------------------------------------------------- CSS theme
THEME_CSS = """
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

/* ── Global ─────────────────────────────────────────────── */
html, body, [class*="css"] {
    font-family: 'Inter', sans-serif !important;
}
.stApp {
    background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%);
}

/* ── Sidebar ────────────────────────────────────────────── */
section[data-testid="stSidebar"] {
    background: linear-gradient(180deg, #0d1117 0%, #161b22 100%) !important;
    border-right: 1px solid rgba(0, 212, 170, 0.15);
}
section[data-testid="stSidebar"] .stRadio label {
    font-size: 0.95rem !important;
    padding: 0.35rem 0.5rem !important;
    border-radius: 8px;
    transition: all 0.2s ease;
}
section[data-testid="stSidebar"] .stRadio label:hover {
    background: rgba(0, 212, 170, 0.08);
}

/* ── Glass cards ────────────────────────────────────────── */
div[data-testid="stExpander"],
div[data-testid="stForm"] {
    background: rgba(255,255,255,0.03) !important;
    border: 1px solid rgba(255,255,255,0.06) !important;
    border-radius: 12px !important;
    backdrop-filter: blur(10px);
}
div.stTabs [data-baseweb="tab-panel"] {
    background: rgba(255,255,255,0.02);
    border-radius: 0 0 12px 12px;
    padding: 1rem;
}

/* ── Metric cards ───────────────────────────────────────── */
div[data-testid="stMetric"] {
    background: linear-gradient(135deg, rgba(0,212,170,0.08), rgba(0,150,255,0.06));
    border: 1px solid rgba(0,212,170,0.12);
    border-radius: 12px;
    padding: 1rem 1.2rem;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
}
div[data-testid="stMetric"]:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0,212,170,0.15);
}
div[data-testid="stMetric"] label {
    color: rgba(255,255,255,0.55) !important;
    font-size: 0.78rem !important;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}
div[data-testid="stMetric"] [data-testid="stMetricValue"] {
    color: #e8e8e8 !important;
    font-weight: 600 !important;
}

/* ── Buttons ────────────────────────────────────────────── */
button[kind="primary"], .stButton > button[kind="primary"] {
    background: linear-gradient(135deg, #00D4AA, #0096FF) !important;
    border: none !important;
    border-radius: 8px !important;
    font-weight: 600 !important;
    letter-spacing: 0.3px;
    transition: all 0.25s ease;
}
button[kind="primary"]:hover {
    box-shadow: 0 6px 20px rgba(0,212,170,0.35) !important;
    transform: translateY(-1px);
}
button[kind="secondary"], .stButton > button:not([kind="primary"]) {
    border: 1px solid rgba(0,212,170,0.25) !important;
    border-radius: 8px !important;
    color: #00D4AA !important;
    transition: all 0.25s ease;
}
button[kind="secondary"]:hover, .stButton > button:not([kind="primary"]):hover {
    background: rgba(0,212,170,0.08) !important;
    border-color: rgba(0,212,170,0.5) !important;
}

/* ── Containers with border ─────────────────────────────── */
div[data-testid="stVerticalBlock"] > div[data-testid="stVerticalBlockBorderWrapper"] {
    background: rgba(255,255,255,0.02) !important;
    border: 1px solid rgba(255,255,255,0.06) !important;
    border-radius: 14px !important;
    backdrop-filter: blur(10px);
}

/* ── Dataframes ─────────────────────────────────────────── */
.stDataFrame {
    border-radius: 10px;
    overflow: hidden;
}

/* ── Risk badges ────────────────────────────────────────── */
.risk-badge {
    display: inline-block;
    padding: 4px 14px;
    border-radius: 20px;
    font-weight: 600;
    font-size: 0.85rem;
    letter-spacing: 0.3px;
}
.risk-high { background: rgba(217,83,79,0.2); color: #ff6b6b; border: 1px solid rgba(217,83,79,0.3); }
.risk-medium { background: rgba(240,173,78,0.2); color: #ffc107; border: 1px solid rgba(240,173,78,0.3); }
.risk-low { background: rgba(92,184,92,0.2); color: #51cf66; border: 1px solid rgba(92,184,92,0.3); }

/* ── Section headers ────────────────────────────────────── */
.section-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 0.8rem 0 0.5rem 0;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid rgba(255,255,255,0.06);
}
.section-header .icon { font-size: 1.3rem; }
.section-header .title { font-size: 1.1rem; font-weight: 600; color: #e8e8e8; }

/* ── Student card ───────────────────────────────────────── */
.student-card {
    background: linear-gradient(135deg, rgba(0,212,170,0.06), rgba(0,150,255,0.04));
    border: 1px solid rgba(0,212,170,0.1);
    border-radius: 14px;
    padding: 1.2rem;
    margin-bottom: 0.5rem;
    transition: transform 0.2s ease;
}
.student-card:hover { transform: translateY(-2px); }
.student-name { font-size: 1.15rem; font-weight: 600; color: #e8e8e8; }
.student-meta { font-size: 0.82rem; color: rgba(255,255,255,0.45); margin-top: 2px; }

/* ── Step indicators ────────────────────────────────────── */
.step-number {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px; height: 28px;
    border-radius: 50%;
    background: linear-gradient(135deg, #00D4AA, #0096FF);
    color: #fff;
    font-weight: 700;
    font-size: 0.85rem;
    margin-right: 8px;
}
.step-label { font-size: 1rem; font-weight: 600; color: #e8e8e8; }

/* ── Page title accent ──────────────────────────────────── */
.page-title {
    font-size: 1.5rem;
    font-weight: 700;
    background: linear-gradient(135deg, #00D4AA, #0096FF);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    margin-bottom: 0.3rem;
}

/* ── Divider ────────────────────────────────────────────── */
hr { border: none; border-top: 1px solid rgba(255,255,255,0.06); margin: 1rem 0; }

/* ── Alert card ─────────────────────────────────────────── */
.alert-card {
    background: rgba(217,83,79,0.08);
    border-left: 4px solid #ff6b6b;
    border-radius: 0 10px 10px 0;
    padding: 0.8rem 1rem;
    margin-bottom: 0.5rem;
}
.alert-name { font-weight: 600; color: #ff6b6b; font-size: 1rem; }
.alert-reason { color: rgba(255,255,255,0.6); font-size: 0.85rem; margin-top: 3px; }

/* ── Quick stat card (home) ─────────────────────────────── */
.home-stat {
    text-align: center;
    padding: 1.5rem 1rem;
}
.home-stat .num {
    font-size: 2.2rem;
    font-weight: 700;
    background: linear-gradient(135deg, #00D4AA, #0096FF);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}
.home-stat .label {
    color: rgba(255,255,255,0.5);
    font-size: 0.82rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-top: 4px;
}

/* ── Report card styling ────────────────────────────────── */
.report-header {
    text-align: center;
    padding: 1.5rem;
    background: linear-gradient(135deg, rgba(0,212,170,0.1), rgba(0,150,255,0.08));
    border-radius: 14px;
    margin-bottom: 1rem;
}
.report-title {
    font-size: 1.4rem;
    font-weight: 700;
    color: #e8e8e8;
}
.report-sub {
    color: rgba(255,255,255,0.5);
    font-size: 0.9rem;
    margin-top: 4px;
}
</style>
"""
st.markdown(THEME_CSS, unsafe_allow_html=True)

LEVEL = {"Low": 1, "Medium": 2, "High": 3}
LEVEL_REV = {1: "Low", 2: "Medium", 3: "High"}
PEER = {"Negative": 1, "Neutral": 2, "Positive": 3}
PEER_REV = {1: "Negative", 2: "Neutral", 3: "Positive"}
RISK_COLORS = {"High": "#ff6b6b", "Medium": "#ffc107", "Low": "#51cf66"}
RISK_BADGE_CLASS = {"High": "risk-high", "Medium": "risk-medium", "Low": "risk-low"}

# Plotly dark template
PLOTLY_TEMPLATE = "plotly_dark"
PLOTLY_LAYOUT = dict(
    paper_bgcolor="rgba(0,0,0,0)",
    plot_bgcolor="rgba(0,0,0,0)",
    font=dict(family="Inter", color="#c8c8c8"),
    margin=dict(t=30, b=30, l=40, r=20),
)


def styled_plotly(fig, **kwargs):
    """Apply consistent dark styling to every Plotly chart."""
    fig.update_layout(template=PLOTLY_TEMPLATE, **PLOTLY_LAYOUT, **kwargs)
    return fig


# ---------------------------------------------------------------- start-up
@st.cache_data
def load_base():
    return ml.load_base_data()


@st.cache_resource
def _load_bundle(mtime):
    return ml.load_bundle(base_df=load_base())


def get_bundle():
    return _load_bundle(os.path.getmtime(ml.ACTIVE_PATH))


@st.cache_data(show_spinner="Training and comparing models. This can take a minute...")
def run_comparison(df):
    return ml.compare_feature_sets(df)


db.init_db()
try:
    BASE = load_base()
    BUNDLE = get_bundle()
except FileNotFoundError as err:
    st.error(str(err))
    st.stop()

if db.list_versions().empty:
    db.log_model_version(BUNDLE, ml.archive_initial() or ml.ACTIVE_PATH)

try:
    excel_store.ensure_exists()
except Exception as err:  # e.g. the file is open in Excel
    st.warning(f"Training sheet not ready: {err}")

SETTINGS = db.get_settings()
HIGH, LOW = ml.compute_thresholds(SETTINGS, BASE[ml.TARGET])

XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


# ----------------------------------------------------------------- helpers
def with_risk(df, col="predicted_score"):
    df = df.copy()
    df["risk_level"] = df[col].map(lambda s: ml.risk_level(s, HIGH, LOW))
    return df


def flash(message, level="success"):
    st.session_state["flash"] = (level, message)


def risk_badge(risk):
    cls = RISK_BADGE_CLASS.get(risk, "risk-medium")
    return f'<span class="risk-badge {cls}">{risk}</span>'


def section_header(icon, title):
    st.markdown(f'<div class="section-header"><span class="icon">{icon}</span>'
                f'<span class="title">{title}</span></div>', unsafe_allow_html=True)


def step_indicator(num, label):
    st.markdown(f'<span class="step-number">{num}</span><span class="step-label">{label}</span>',
                unsafe_allow_html=True)


def page_title(text):
    st.markdown(f'<div class="page-title">{text}</div>', unsafe_allow_html=True)


def chart_width():
    """Replacement for deprecated use_container_width."""
    return {"width": "stretch"} if hasattr(st, "_get_delta_path_str") else {"use_container_width": True}


def st_plotly(fig, **kwargs):
    """st.plotly_chart with correct width kwarg for the installed version."""
    st.plotly_chart(fig, **chart_width(), **kwargs)


def st_df(df, **kwargs):
    """st.dataframe with correct width kwarg for the installed version."""
    st.dataframe(df, **chart_width(), **kwargs)


def excel_update(fn, *args, **kwargs):
    """Update the Excel training sheet. Returns an error message, or None when it worked."""
    try:
        fn(*args, **kwargs)
        return None
    except excel_store.ExcelLocked as e:
        return (f"{e} Your data is safe in the database. Use 'Sync from database' on the "
                "Retrain Model page afterwards.")
    except Exception as e:  # any other file problem
        return (f"The Excel sheet could not be updated ({e}). Use 'Sync from database' on the "
                "Retrain Model page.")


def radar(values: dict):
    labels, vals = list(values.keys()), list(values.values())
    fig = go.Figure(go.Scatterpolar(r=vals + vals[:1], theta=labels + labels[:1],
                                     fill="toself", fillcolor="rgba(0,212,170,0.15)",
                                     line=dict(color="#00D4AA")))
    fig.update_layout(polar=dict(radialaxis=dict(range=[0, 3], tickvals=[1, 2, 3],
                                                  gridcolor="rgba(255,255,255,0.08)"),
                                  angularaxis=dict(gridcolor="rgba(255,255,255,0.08)")),
                      showlegend=False, height=360)
    return styled_plotly(fig)


def behaviour_radar(values):
    def g(k):
        v = values.get(k)
        return 0 if v is None or pd.isna(v) else v
    return radar({"Motivation": g("Motivation_Level"), "Parental": g("Parental_Involvement"),
                  "Peers": g("Peer_Influence"), "Resources": g("Access_to_Resources"),
                  "Teacher": g("Teacher_Quality")})


def factor_chart(contrib, n=7):
    top = contrib.head(n)
    df = pd.DataFrame({"Factor": [ml.pretty(f) for f in top.index], "Impact": top.values.round(2)})
    df["Effect"] = np.where(df["Impact"] >= 0, "Helps", "Hurts")
    fig = px.bar(df, x="Impact", y="Factor", orientation="h", color="Effect",
                 color_discrete_map={"Helps": "#51cf66", "Hurts": "#ff6b6b"})
    fig.update_layout(height=360, yaxis=dict(autorange="reversed"))
    return styled_plotly(fig)


ACTUAL_COLOR, PRED_COLOR = "#4C9BE8", "#F28E2B"


def progress_weight():
    """How far exam 2 sits between exam 1 and the final."""
    s = {**ml.DEFAULT_SETTINGS, **SETTINGS}
    if s["progress_mode"] == "fixed":
        return float(s["progress_fixed"]), 0, False
    return ml.learn_progress_weight(db.progression_samples())


def exam_cards(rows):
    for col, label in zip(st.columns(3), ml.EXAM_LABELS):
        mine = [x for x in rows if x["Exam"] == label]
        act = next((x for x in mine if x["Type"] == "Actual"), None)
        pred = next((x for x in mine if x["Type"] == "Predicted"), None)
        shown = act or pred
        if shown is None:
            col.markdown(f"**{label}**<br><span style='font-size:1.6rem;color:gray'>Not yet</span>",
                         unsafe_allow_html=True)
            continue
        color = ACTUAL_COLOR if shown["Type"] == "Actual" else PRED_COLOR
        extra = ""
        if act and pred:
            extra = f"<br><span style='color:{PRED_COLOR}'>Predicted was {pred['Marks']}</span>"
        elif shown["Type"] == "Predicted" and shown.get("Margin"):
            extra = f"<br><span style='color:gray'>likely {max(0, shown['Marks'] - shown['Margin']):.0f} to " \
                    f"{min(100, shown['Marks'] + shown['Margin']):.0f}</span>"
        col.markdown(f"**{label}**<br><span style='font-size:2rem;color:{color}'>{shown['Marks']}</span>"
                     f"<br><span style='color:{color}'>{shown['Type']}</span>{extra}",
                     unsafe_allow_html=True)


def exam_chart(rows):
    df = pd.DataFrame(rows)
    fig = px.bar(df, x="Exam", y="Marks", color="Type", barmode="group", text="Marks",
                 category_orders={"Exam": ml.EXAM_LABELS},
                 color_discrete_map={"Actual": ACTUAL_COLOR, "Predicted": PRED_COLOR},
                 error_y="Margin" if df["Margin"].gt(0).any() else None, range_y=[0, 105])
    fig.update_layout(height=340)
    return styled_plotly(fig, yaxis_title="Average marks (%)")


def exam_block(rows, note=None):
    section_header("📊", "Examination Forecast")
    exam_cards(rows)
    st_plotly(exam_chart(rows))
    st.caption("Blue = actual marks, orange = predicted marks." + (" " + note if note else ""))


def subject_block(rows, stage):
    if not rows:
        return
    section_header("📚", "Subject-wise Forecast")
    long = pd.DataFrame(ml.subject_chart_rows(rows, stage))
    fig = px.bar(long, x="Subject", y="Marks", color="Type", facet_col="Exam", barmode="group",
                 text="Marks", category_orders={"Exam": ml.EXAM_LABELS},
                 color_discrete_map={"Actual": ACTUAL_COLOR, "Predicted": PRED_COLOR},
                 error_y="Margin" if long["Margin"].gt(0).any() else None, range_y=[0, 105])
    fig.for_each_annotation(lambda an: an.update(text=an.text.split("=")[-1]))
    fig.update_layout(height=360)
    st_plotly(styled_plotly(fig, yaxis_title="Marks (%)"))

    latest_col = f"{ml.EXAM_LABELS[stage - 1]} (actual)"
    table = pd.DataFrame({"Subject": [r["Subject"] for r in rows], latest_col: [r["Latest"] for r in rows]})
    pred_cols = []
    if stage == 1:
        table[f"{ml.EXAM_LABELS[1]} (predicted)"] = [r["Pred_Exam2"] for r in rows]
        pred_cols.append(f"{ml.EXAM_LABELS[1]} (predicted)")
    table[f"{ml.EXAM_LABELS[2]} (predicted)"] = [r["Pred_Final"] for r in rows]
    table["Final likely range"] = [f"{max(0, r['Pred_Final'] - r['Margin_Final']):.0f} to "
                                   f"{min(100, r['Pred_Final'] + r['Margin_Final']):.0f}" for r in rows]
    pred_cols.append(f"{ml.EXAM_LABELS[2]} (predicted)")
    try:
        st.dataframe(table.style.set_properties(subset=[latest_col], **{"color": ACTUAL_COLOR, "font-weight": "bold"})
                     .set_properties(subset=pred_cols, **{"color": PRED_COLOR, "font-weight": "bold"}))
    except Exception:
        st.dataframe(table)
    for level, text in ml.subject_advice(rows):
        getattr(st, level)(text)
    st.caption("Each subject keeps its gap from the student's average and moves with the predicted average. "
               "Single-subject ranges are wider than the average's range, so treat them as a guide.")


def show_result(r, values, forecast=None, forecast_note=None, subject_rows=None, stage=1):
    c1, c2, c3, c4 = st.columns(4)
    c1.metric("Predicted Final Score", r["score"])
    c2.metric("Likely Range (≈95%)", f"{r['low']} – {r['high']}")
    c3.markdown(f"**Risk Level**<br>{risk_badge(r['risk'])}", unsafe_allow_html=True)
    c4.metric("Model", f"{BUNDLE['name']} ({BUNDLE['version']})")
    if forecast:
        exam_block(forecast, forecast_note)
    subject_block(subject_rows, stage)

    for f, v, lo, hi in ml.out_of_range(values, BASE):
        st.warning(f"{ml.pretty(f)} = {v} is outside the training range ({lo:.0f} to {hi:.0f}). "
                   "The prediction is less reliable for this factor.")
    for flag in r["flags"]:
        st.warning(flag)
    if not r["uses_extras"] and any(not pd.isna(values.get(f, np.nan)) for f in ml.EXTRA_FEATURES):
        st.caption("Grade and failures are saved and flagged, but the active model does not use them yet. "
                   "Retrain with the extended feature set to include them.")

    left, right = st.columns(2)
    with left:
        section_header("📈", "Factors Affecting Prediction")
        st_plotly(factor_chart(r["contrib"]))
    with right:
        section_header("🎯", "Behavioural Profile (1–3)")
        st_plotly(behaviour_radar(values))

    section_header("💡", "Personalised Recommendations")
    if r["recommendations"]:
        for i, (feat, advice) in enumerate(r["recommendations"], 1):
            st.write(f"{i}. **{ml.pretty(feat)}**: {advice}")
    else:
        st.success("No major weak areas found. Keep up the good work.")
    st.caption("Predictions are estimates meant to support students, not to label them.")


# ============================================================ PAGE: HOME
def page_home():
    page_title("🏠 Dashboard")
    st.caption("Welcome to AcadIQ — your intelligent student performance analysis system.")

    all_students = db.students()
    latest = db.latest_predictions()
    has_data = not latest.empty

    # ---- Hero stats ----
    with st.container(border=True):
        h1, h2, h3, h4, h5 = st.columns(5)
        h1.markdown(f"<div class='home-stat'><div class='num'>{len(all_students)}</div>"
                    "<div class='label'>Students</div></div>", unsafe_allow_html=True)
        n_preds = int(db.query("SELECT COUNT(*) AS c FROM predictions").iloc[0, 0])
        h2.markdown(f"<div class='home-stat'><div class='num'>{n_preds}</div>"
                    "<div class='label'>Predictions</div></div>", unsafe_allow_html=True)
        if has_data:
            latest_r = with_risk(latest)
            h3.markdown(f"<div class='home-stat'><div class='num'>"
                        f"{int((latest_r['risk_level'] == 'High').sum())}</div>"
                        "<div class='label'>At Risk</div></div>", unsafe_allow_html=True)
            h4.markdown(f"<div class='home-stat'><div class='num'>"
                        f"{round(float(latest['predicted_score'].mean()), 1)}</div>"
                        "<div class='label'>Avg Score</div></div>", unsafe_allow_html=True)
            n_results = int(db.query("SELECT COUNT(*) AS c FROM results").iloc[0, 0])
            h5.markdown(f"<div class='home-stat'><div class='num'>{n_results}</div>"
                        "<div class='label'>Results Recorded</div></div>", unsafe_allow_html=True)
        else:
            h3.markdown("<div class='home-stat'><div class='num'>–</div>"
                        "<div class='label'>At Risk</div></div>", unsafe_allow_html=True)
            h4.markdown("<div class='home-stat'><div class='num'>–</div>"
                        "<div class='label'>Avg Score</div></div>", unsafe_allow_html=True)
            h5.markdown("<div class='home-stat'><div class='num'>–</div>"
                        "<div class='label'>Results</div></div>", unsafe_allow_html=True)

    col_left, col_right = st.columns([3, 2])

    # ---- Recent Predictions ----
    with col_left:
        section_header("🕐", "Recent Predictions")
        recent = db.recent_predictions(8)
        if recent.empty:
            st.info("No predictions yet. Go to **New Prediction** to get started.")
        else:
            for _, r in recent.iterrows():
                risk = r["risk_level"] or "Medium"
                st.markdown(
                    f"<div style='display:flex;justify-content:space-between;align-items:center;"
                    f"padding:0.5rem 0.8rem;border-bottom:1px solid rgba(255,255,255,0.04)'>"
                    f"<div><strong>{r['name']}</strong> "
                    f"<span style='color:rgba(255,255,255,0.35);font-size:0.8rem'>"
                    f"{r['department'] or ''} · Sem {r['semester'] or '?'}</span></div>"
                    f"<div style='display:flex;gap:12px;align-items:center'>"
                    f"<span style='font-weight:600'>{r['predicted_score']}</span>"
                    f"{risk_badge(risk)}"
                    f"<span style='color:rgba(255,255,255,0.3);font-size:0.75rem'>{r['date']}</span>"
                    f"</div></div>",
                    unsafe_allow_html=True)

    # ---- Performance Alerts ----
    with col_right:
        section_header("🔔", "Performance Alerts")
        alerts = db.performance_alerts()
        if not alerts:
            st.success("No alerts — all students are on track! 🎉")
        else:
            for a in alerts[:6]:
                reasons_text = " · ".join(a["reasons"])
                st.markdown(
                    f"<div class='alert-card'>"
                    f"<div class='alert-name'>⚠️ {a['name']} — {a['score']}</div>"
                    f"<div class='alert-reason'>{reasons_text}</div>"
                    f"</div>",
                    unsafe_allow_html=True)
            if len(alerts) > 6:
                st.caption(f"+ {len(alerts) - 6} more alert(s)")

    # ---- Quick score distribution ----
    if has_data:
        section_header("📊", "Score Distribution")
        fig = px.histogram(latest, x="predicted_score", nbins=20,
                           color_discrete_sequence=["#00D4AA"],
                           labels={"predicted_score": "Predicted Score"})
        fig.add_vline(x=HIGH, line_dash="dash", line_color=RISK_COLORS["High"], opacity=0.6)
        fig.add_vline(x=LOW, line_dash="dash", line_color=RISK_COLORS["Low"], opacity=0.6)
        st_plotly(styled_plotly(fig, height=300, showlegend=False))

    # ---- Quick actions ----
    st.markdown("")
    section_header("⚡", "Quick Actions")
    qa1, qa2, qa3, qa4 = st.columns(4)
    if qa1.button("🔮 New Prediction", use_container_width=True):
        st.session_state["nav_page"] = "🔮  New Prediction"
        st.rerun()
    if qa2.button("🏫 Manage Class", use_container_width=True):
        st.session_state["nav_page"] = "🏫  Class Management"
        st.rerun()
    if qa3.button("👥 Compare Students", use_container_width=True):
        st.session_state["nav_page"] = "👥  Student Comparison"
        st.rerun()
    if qa4.button("📊 Class Analytics", use_container_width=True):
        st.session_state["nav_page"] = "📊  Class Analytics"
        st.rerun()


# ======================================================== PAGE: PREDICTION
def page_predict():
    page_title("🔮 New Prediction")

    # ---- Quick Re-predict: pre-fill from session state ----
    prefill = st.session_state.pop("prefill_prediction", None)

    st.caption("Enter student details and factors to generate a performance prediction.")

    with st.container(border=True):
        step_indicator(1, "Student Information")
        c1, c2, c3 = st.columns(3)
        name = c1.text_input("Student name", value=prefill.get("name", "") if prefill else "",
                              placeholder="e.g. Anjali Sharma")
        dept = c2.text_input("Department", value=prefill.get("dept", "") if prefill else "",
                              placeholder="e.g. CSE")
        sem = c3.number_input("Semester", 1, 8, prefill.get("sem", 1) if prefill else 1)

    pf = prefill or {}
    left, right = st.columns(2)

    with left:
        with st.container(border=True):
            step_indicator(2, "Behaviour & Habits")
            st.caption("How the student studies and lives.")
            h1, h2 = st.columns(2)
            hours = h1.number_input("Study hours / week", 0.0, 70.0,
                                     float(pf.get("Hours_Studied", 15.0)), 0.5)
            sleep = h2.number_input("Sleep hours / day", 3.0, 12.0,
                                     float(pf.get("Sleep_Hours", 7.0)), 0.5)
            h3, h4 = st.columns(2)
            activity = h3.number_input("Physical activity (hrs/wk)", 0.0, 20.0,
                                        float(pf.get("Physical_Activity", 2.0)), 0.5)
            tutoring = h4.number_input("Tutoring sessions / month", 0, 20,
                                        int(pf.get("Tutoring_Sessions", 0)))
            st.markdown("---")
            st.markdown("**📋 Questionnaire**")
            q1, q2 = st.columns(2)
            mot_idx = max(0, int(pf.get("Motivation_Level", 2)) - 1) if prefill else 1
            motivation = q1.selectbox("Motivation level", list(LEVEL), index=mot_idx)
            par_idx = max(0, int(pf.get("Parental_Involvement", 2)) - 1) if prefill else 1
            parental = q2.selectbox("Parental involvement", list(LEVEL), index=par_idx)
            q3, q4 = st.columns(2)
            peer_idx = max(0, int(pf.get("Peer_Influence", 2)) - 1) if prefill else 1
            peer = q3.selectbox("Peer influence", list(PEER), index=peer_idx)
            res_idx = max(0, int(pf.get("Access_to_Resources", 2)) - 1) if prefill else 1
            resources = q4.selectbox("Access to resources", list(LEVEL), index=res_idx)
            tq_idx = max(0, int(pf.get("Teacher_Quality", 2)) - 1) if prefill else 1
            teacher = st.selectbox("Teacher quality", list(LEVEL), index=tq_idx)

    details = {}
    with right:
        with st.container(border=True):
            step_indicator(3, "Academic Performance")
            stage_label = st.radio("Latest examination completed",
                                   ["1st examination", "2nd examination"], horizontal=True,
                                   help="After the 1st the app predicts the 2nd and the final. "
                                        "After the 2nd it predicts the final.")
            stage = 1 if stage_label.startswith("1st") else 2
            exam1_avg = None
            if stage == 2:
                e1 = st.number_input("1st examination average (%), optional", 0.0, 100.0, 0.0, 0.5)
                exam1_avg = e1 if e1 > 0 else None
            mode = st.radio("Entry method", ["Subject marks and period attendance", "Enter totals directly"],
                            horizontal=True, label_visibility="collapsed")
            if mode.startswith("Subject"):
                st.markdown(f"**Marks: 3 subjects ({stage_label})**")
                hd = st.columns([3, 2, 2])
                for col, text in zip(hd, ["Subject", "Marks obtained", "Maximum marks"]):
                    col.caption(text)
                subjects = []
                for i in range(3):
                    a, b, c = st.columns([3, 2, 2])
                    sname = a.text_input("Subject", f"Subject {i + 1}", key=f"sub_name_{i}",
                                         label_visibility="collapsed")
                    marks = b.number_input("Marks obtained", 0.0, 1000.0, 70.0, 0.5, key=f"sub_marks_{i}",
                                           label_visibility="collapsed")
                    mx = c.number_input("Maximum marks", 1.0, 1000.0, 100.0, 1.0, key=f"sub_max_{i}",
                                        label_visibility="collapsed")
                    subjects.append((sname.strip() or f"Subject {i + 1}", marks, mx))
                st.markdown("**Attendance: 3 periods**")
                hd = st.columns([3, 2, 2])
                for col, text in zip(hd, ["Period", "Classes held", "Classes attended"]):
                    col.caption(text)
                periods = []
                for i in range(3):
                    a, b, c = st.columns([3, 2, 2])
                    pname = a.text_input("Period", f"Period {i + 1}", key=f"per_name_{i}",
                                         label_visibility="collapsed")
                    held = b.number_input("Classes held", 0, 500, 40, key=f"per_held_{i}",
                                          label_visibility="collapsed")
                    att = c.number_input("Classes attended", 0, 500, 32, key=f"per_att_{i}",
                                         label_visibility="collapsed")
                    periods.append((pname.strip() or f"Period {i + 1}", held, att))

                summary = ml.summarise_academic(subjects, periods)
                for e in summary["errors"]:
                    st.error(e)
                if not summary["errors"]:
                    st.info(f"Average mark: **{summary['previous_scores']}%**  ·  "
                            f"Overall attendance: **{summary['attendance']}%**  "
                            "(auto-fed to model)")
                prev, attendance = summary["previous_scores"], summary["attendance"]
                errors = summary["errors"]
                details = {"subjects": summary["subjects"], "periods": summary["periods"]}
            else:
                errors = []
                details = {}
                pf_prev = float(pf.get("Previous_Scores", 70)) if prefill else 70
                pf_att = float(pf.get("Attendance", 75)) if prefill else 75
                prev = st.slider(f"Average marks of the {stage_label} (%)", 40, 100,
                                 min(100, max(40, int(pf_prev))))
                attendance = st.slider("Attendance (%)", 40, 100,
                                       min(100, max(40, int(pf_att))))

            with st.expander("📎 Academic record (optional)"):
                g1, g2 = st.columns(2)
                grade = g1.number_input("Previous semester grade (CGPA, 0–10)", 0.0, 10.0, 0.0, 0.1)
                failures = g2.selectbox("Past failures / backlog subjects",
                                        ["Not recorded", 0, 1, 2, 3, 4, 5])

    st.markdown("")
    save_col, btn_col = st.columns([1, 1])
    save = save_col.checkbox("Save this prediction to the database", value=True)
    if not btn_col.button("🔮  Predict", type="primary", use_container_width=True):
        return
    if errors:
        st.error("Please fix the academic entries above first.")
        return
    if save and not name.strip():
        st.error("Please enter the student's name, or untick 'Save this prediction'.")
        return

    values = {"Hours_Studied": hours, "Attendance": attendance, "Previous_Scores": prev,
              "Tutoring_Sessions": tutoring, "Motivation_Level": LEVEL[motivation],
              "Parental_Involvement": LEVEL[parental], "Peer_Influence": PEER[peer],
              "Sleep_Hours": sleep, "Access_to_Resources": LEVEL[resources],
              "Teacher_Quality": LEVEL[teacher], "Physical_Activity": activity,
              "Previous_Grade": grade if grade > 0 else np.nan,
              "Past_Failures": np.nan if failures == "Not recorded" else failures}
    r = ml.predict_one(BUNDLE, values, HIGH, LOW)
    rmse = float(BUNDLE["metrics"].get("RMSE") or 2.5)
    weight, n_used, learned = progress_weight()
    forecast = ml.forecast_exams(stage, prev, r["score"], rmse, weight, exam1_avg)
    pred2 = next((x["Marks"] for x in forecast if x["Exam"] == ml.EXAM_LABELS[1] and x["Type"] == "Predicted"), None)
    details = dict(details or {})
    sub_rows = ml.forecast_subjects(stage, details.get("subjects", []), r["score"], rmse, weight)
    details["exam"] = {"stage": stage, "latest_avg": prev, "exam1_avg": exam1_avg, "weight": weight,
                       "pred_exam2": pred2, "pred_final": r["score"], "subjects_forecast": sub_rows}
    if stage == 1:
        how = (f"2nd examination = 1st + {weight:.0%} of the way to the predicted final "
               + (f"(learned from {n_used} students)." if learned else "(assumed until 5 students have all three exams)."))
    else:
        how = "Final predicted from the 2nd examination average and the other factors."
    if save:
        _, pid = db.save_prediction(name.strip(), dept, sem, values, r, BUNDLE["version"], details)
        problem = excel_update(excel_store.add_prediction, pid, name.strip(), dept, sem, values, details)
        if problem:
            st.warning("Saved to the database. " + problem)
        else:
            st.success(f"Saved prediction for {name.strip()} (database and {excel_store.PATH}).")
    show_result(r, values, forecast, how, sub_rows, stage)


# ====================================================== PAGE: STUDENT VIEW
def page_student():
    page_title("👤 Student Dashboard")
    stu = db.students()
    if stu.empty:
        st.info("No students yet. Add one on the **New Prediction** page or the **Class Management** page.")
        return
    pick = st.selectbox("Select student", stu["name"], label_visibility="collapsed",
                        help="Choose a student to view their dashboard")
    sid = int(stu.loc[stu["name"] == pick, "id"].iloc[0])
    preds = with_risk(db.student_predictions(sid))
    if preds.empty:
        st.info("No predictions for this student yet. Go to **New Prediction** to create one.")
        return
    latest = preds.iloc[-1]
    inputs = db.student_inputs(int(latest["id"]))
    student_dept = stu.loc[stu["name"] == pick, "department"].iloc[0] or "N/A"
    student_sem = stu.loc[stu["name"] == pick, "semester"].iloc[0] or "?"

    # ---- Profile card ----
    with st.container(border=True):
        pc1, pc2, pc3, pc4, pc5 = st.columns([2, 2, 2, 2, 2])
        pc1.markdown(f"<div class='student-name'>👤 {pick}</div>"
                     f"<div class='student-meta'>{student_dept} · Semester {student_sem}</div>",
                     unsafe_allow_html=True)
        pc2.metric("Latest Score", latest["predicted_score"])
        pc3.markdown(f"**Risk**<br>{risk_badge(latest['risk_level'])}", unsafe_allow_html=True)
        pc4.metric("Predictions", len(preds))
        pc5.metric("Actual Score", "–" if pd.isna(latest["actual_score"]) else latest["actual_score"])

    # ---- Quick actions row ----
    qa1, qa2, qa3 = st.columns(3)
    if qa1.button("🔄 Quick Re-predict", use_container_width=True,
                  help="Open New Prediction pre-filled with this student's last inputs"):
        pf = {"name": pick, "dept": student_dept, "sem": int(student_sem) if student_sem != "?" else 1}
        if inputs:
            pf.update(inputs)
        st.session_state["prefill_prediction"] = pf
        st.session_state["nav_page"] = "🔮  New Prediction"
        st.rerun()
    if qa2.button("📄 Download Report", use_container_width=True,
                  help="Download a summary report card for this student"):
        st.session_state["show_report"] = sid
    if qa3.button("👥 Compare", use_container_width=True,
                  help="Compare this student with another"):
        st.session_state["compare_student"] = pick
        st.session_state["nav_page"] = "👥  Student Comparison"
        st.rerun()

    # ---- Report Card Generation ----
    if st.session_state.get("show_report") == sid:
        _generate_report_card(pick, student_dept, student_sem, preds, inputs, latest)

    # ---- Tabbed layout ----
    tab_overview, tab_exams, tab_history = st.tabs(["📊 Overview", "📈 Examinations & Subjects", "📋 History"])

    with tab_overview:
        left, right = st.columns(2)
        with left:
            section_header("📈", "Performance Trend")
            fig = px.line(preds, x="date", y="predicted_score", markers=True,
                          line_shape="spline", color_discrete_sequence=["#00D4AA"])
            if preds["actual_score"].notna().any():
                fig.add_trace(go.Scatter(x=preds["date"], y=preds["actual_score"], mode="markers",
                                         name="Actual", marker=dict(size=12, symbol="diamond", color=ACTUAL_COLOR)))
            fig.add_hline(y=HIGH, line_dash="dash", line_color=RISK_COLORS["High"], opacity=0.5)
            fig.add_hline(y=LOW, line_dash="dash", line_color=RISK_COLORS["Low"], opacity=0.5)
            st_plotly(styled_plotly(fig))
        with right:
            section_header("🎯", "Behavioural Profile")
            if inputs:
                st_plotly(behaviour_radar(inputs))
            else:
                st.info("No saved inputs for this prediction.")

        details_data = db.prediction_details(int(latest["id"]))
        if details_data and (details_data.get("subjects") or details_data.get("periods")):
            s_col, p_col = st.columns(2)
            with s_col:
                section_header("📝", "Subject Marks (Latest)")
                sdf = pd.DataFrame(details_data.get("subjects", []))
                if not sdf.empty:
                    fig = px.bar(sdf, x="name", y="percent", text="percent", range_y=[0, 100],
                                 labels={"name": "Subject", "percent": "Marks (%)"},
                                 color_discrete_sequence=["#00D4AA"])
                    st_plotly(styled_plotly(fig))
            with p_col:
                section_header("📅", "Attendance by Period (Latest)")
                pdf = pd.DataFrame(details_data.get("periods", []))
                if not pdf.empty:
                    fig = px.line(pdf, x="name", y="percent", markers=True, range_y=[0, 100],
                                 labels={"name": "Period", "percent": "Attendance (%)"},
                                 color_discrete_sequence=["#0096FF"])
                    fig.add_hline(y=75, line_dash="dash", line_color=RISK_COLORS["High"], opacity=0.5)
                    st_plotly(styled_plotly(fig))

        if inputs:
            section_header("💡", "Current Advice")
            r = ml.predict_one(BUNDLE, inputs, HIGH, LOW)
            for flag in r["flags"]:
                st.warning(flag)
            if r["recommendations"]:
                for i, (feat, advice) in enumerate(r["recommendations"], 1):
                    st.write(f"{i}. **{ml.pretty(feat)}**: {advice}")
            else:
                st.success("No major weak areas found.")

    with tab_exams:
        hist = db.exam_history(sid)
        s1 = [h for h in hist if h["stage"] == 1 and h["prev"] is not None]
        s2 = [h for h in hist if h["stage"] == 2 and h["prev"] is not None]
        e1 = s1[-1]["prev"] if s1 else (s2[-1]["exam1"] if s2 else None)
        e2_act = s2[-1]["prev"] if s2 else None
        e2_pred = next((h["pred_exam2"] for h in reversed(s1) if h["pred_exam2"] is not None), None)
        f_act = next((h["actual_final"] for h in reversed(hist) if h["actual_final"] is not None), None)
        rows = []
        if e1 is not None:
            rows.append({"Exam": ml.EXAM_LABELS[0], "Marks": round(float(e1), 1), "Type": "Actual", "Margin": 0.0})
        if e2_pred is not None:
            rows.append({"Exam": ml.EXAM_LABELS[1], "Marks": round(float(e2_pred), 1), "Type": "Predicted", "Margin": 0.0})
        if e2_act is not None:
            rows.append({"Exam": ml.EXAM_LABELS[1], "Marks": round(float(e2_act), 1), "Type": "Actual", "Margin": 0.0})
        rows.append({"Exam": ml.EXAM_LABELS[2], "Marks": round(float(hist[-1]["pred_final"]), 1),
                     "Type": "Predicted", "Margin": 0.0})
        if f_act is not None:
            rows.append({"Exam": ml.EXAM_LABELS[2], "Marks": round(float(f_act), 1), "Type": "Actual", "Margin": 0.0})
        exam_block(rows, "Enter the 2nd examination marks with a new prediction (choose '2nd examination') "
                         "and the final result in the form below.")
        last_details = db.prediction_details(hist[-1]["id"]) or {}
        subject_block((last_details.get("exam") or {}).get("subjects_forecast"), hist[-1]["stage"])

        if s1 and s2:
            f1 = ((db.prediction_details(s1[-1]["id"]) or {}).get("exam") or {}).get("subjects_forecast") or []
            got = {x["name"].strip().lower(): x["percent"]
                   for x in (db.prediction_details(s2[-1]["id"]) or {}).get("subjects", [])}
            check = [{"Subject": x["Subject"], "Predicted (2nd)": x["Pred_Exam2"],
                      "Actual (2nd)": got.get(x["Subject"].strip().lower())} for x in f1]
            check = [c for c in check if c["Actual (2nd)"] is not None]
            if check:
                cdf = pd.DataFrame(check)
                cdf["Difference"] = (cdf["Actual (2nd)"] - cdf["Predicted (2nd)"]).round(1)
                section_header("🔍", "2nd Exam: Predicted vs Actual")
                st.dataframe(cdf)

    with tab_history:
        section_header("📝", "Record Actual Exam Result")
        with st.form("result_form"):
            opts = {f"#{r.id} | {r.date} | predicted {r.predicted_score}": int(r.id) for r in preds.itertuples()}
            chosen = st.selectbox("Prediction", list(opts), index=len(opts) - 1)
            actual = st.number_input("Actual final score", 0.0, 100.0, 60.0)
            if st.form_submit_button("💾  Save Result", type="primary"):
                db.save_result(sid, opts[chosen], actual)
                problem = excel_update(excel_store.set_actuals, {opts[chosen]: actual})
                if problem:
                    flash("Result saved in the database. " + problem, "warning")
                else:
                    flash(f"Result saved and written to {excel_store.PATH}.")
                st.rerun()
        section_header("📋", "Prediction History")
        st_df(preds)
        st.download_button("⬇️  Download History (CSV)", preds.to_csv(index=False),
                           file_name=f"{pick}_history.csv", mime="text/csv")


def _generate_report_card(name, dept, sem, preds, inputs, latest):
    """Render a downloadable student report card."""
    with st.container(border=True):
        section_header("📄", "Student Report Card")
        # Build text report
        lines = [
            "=" * 60,
            "         STUDENT PERFORMANCE REPORT CARD",
            "         AcadIQ — Smart Student Performance Analysis",
            "=" * 60,
            "",
            f"  Student:     {name}",
            f"  Department:  {dept}",
            f"  Semester:    {sem}",
            f"  Report Date: {pd.Timestamp.now().strftime('%Y-%m-%d %H:%M')}",
            "",
            "-" * 60,
            "  LATEST PREDICTION",
            "-" * 60,
            f"  Predicted Score:  {latest['predicted_score']}",
            f"  Risk Level:       {latest['risk_level']}",
            f"  Actual Score:     {'Not recorded' if pd.isna(latest['actual_score']) else latest['actual_score']}",
            f"  Model Version:    {latest.get('model_version', 'N/A')}",
            f"  Date:             {latest['date']}",
            "",
        ]
        if inputs:
            lines += [
                "-" * 60,
                "  BEHAVIOUR & HABITS",
                "-" * 60,
                f"  Study Hours/Week:     {inputs.get('Hours_Studied', 'N/A')}",
                f"  Sleep Hours/Day:      {inputs.get('Sleep_Hours', 'N/A')}",
                f"  Physical Activity:    {inputs.get('Physical_Activity', 'N/A')} hrs/wk",
                f"  Tutoring Sessions:    {inputs.get('Tutoring_Sessions', 'N/A')} /month",
                f"  Motivation:           {LEVEL_REV.get(inputs.get('Motivation_Level'), 'N/A')}",
                f"  Parental Involvement: {LEVEL_REV.get(inputs.get('Parental_Involvement'), 'N/A')}",
                f"  Peer Influence:       {PEER_REV.get(inputs.get('Peer_Influence'), 'N/A')}",
                f"  Access to Resources:  {LEVEL_REV.get(inputs.get('Access_to_Resources'), 'N/A')}",
                f"  Teacher Quality:      {LEVEL_REV.get(inputs.get('Teacher_Quality'), 'N/A')}",
                "",
            ]
            # Recommendations
            r = ml.predict_one(BUNDLE, inputs, HIGH, LOW)
            if r["recommendations"]:
                lines += [
                    "-" * 60,
                    "  RECOMMENDATIONS",
                    "-" * 60,
                ]
                for i, (feat, advice) in enumerate(r["recommendations"], 1):
                    lines.append(f"  {i}. {ml.pretty(feat)}: {advice}")
                lines.append("")

        lines += [
            "-" * 60,
            "  PREDICTION HISTORY",
            "-" * 60,
        ]
        for _, p in preds.iterrows():
            actual_str = f"actual: {p['actual_score']}" if pd.notna(p["actual_score"]) else "no result"
            lines.append(f"  {p['date']}  |  predicted: {p['predicted_score']}  |  {actual_str}  |  risk: {p['risk_level']}")

        lines += ["", "=" * 60, "  Generated by AcadIQ", "=" * 60]
        report_text = "\n".join(lines)

        st.text_area("Report Preview", report_text, height=300)
        st.download_button("⬇️  Download Report (.txt)", report_text,
                           file_name=f"{name.replace(' ', '_')}_report.txt", mime="text/plain")
        if st.button("✖️ Close Report"):
            st.session_state.pop("show_report", None)
            st.rerun()


# ================================================ PAGE: STUDENT COMPARISON
def page_compare():
    page_title("👥 Student Comparison")
    st.caption("Compare two students side-by-side on scores, risk, and behavioural profiles.")

    all_stu = db.all_students_with_scores()
    if len(all_stu) < 2:
        st.info("Need at least 2 students with predictions to compare. Add more students first.")
        return

    with_pred = all_stu[all_stu["predicted_score"].notna()]
    if len(with_pred) < 2:
        st.info("Need at least 2 students with predictions. Make predictions first.")
        return

    names = list(with_pred["name"])
    pre_select = st.session_state.pop("compare_student", None)
    idx1 = names.index(pre_select) if pre_select and pre_select in names else 0
    idx2 = min(idx1 + 1, len(names) - 1) if idx1 + 1 < len(names) else 0

    c1, c2 = st.columns(2)
    s1 = c1.selectbox("Student A", names, index=idx1, key="cmp_a")
    s2 = c2.selectbox("Student B", names, index=idx2, key="cmp_b")

    if s1 == s2:
        st.warning("Please select two different students to compare.")
        return

    r1 = with_pred[with_pred["name"] == s1].iloc[0]
    r2 = with_pred[with_pred["name"] == s2].iloc[0]
    i1 = json.loads(r1["inputs_json"]) if pd.notna(r1.get("inputs_json")) else None
    i2 = json.loads(r2["inputs_json"]) if pd.notna(r2.get("inputs_json")) else None

    # ---- Score comparison ----
    with st.container(border=True):
        sc1, sc_vs, sc2 = st.columns([2, 1, 2])
        risk1 = r1["risk_level"] or ml.risk_level(float(r1["predicted_score"]), HIGH, LOW)
        risk2 = r2["risk_level"] or ml.risk_level(float(r2["predicted_score"]), HIGH, LOW)
        sc1.markdown(f"<div style='text-align:center'><div class='student-name'>{s1}</div>"
                     f"<div class='student-meta'>{r1['department'] or 'N/A'} · Sem {r1['semester'] or '?'}</div>"
                     f"<div style='font-size:2.5rem;font-weight:700;color:#00D4AA;margin:0.5rem 0'>"
                     f"{r1['predicted_score']}</div>"
                     f"{risk_badge(risk1)}</div>", unsafe_allow_html=True)
        sc_vs.markdown("<div style='text-align:center;padding-top:2rem'>"
                       "<span style='font-size:1.5rem;color:rgba(255,255,255,0.3);font-weight:700'>VS</span>"
                       "</div>", unsafe_allow_html=True)
        sc2.markdown(f"<div style='text-align:center'><div class='student-name'>{s2}</div>"
                     f"<div class='student-meta'>{r2['department'] or 'N/A'} · Sem {r2['semester'] or '?'}</div>"
                     f"<div style='font-size:2.5rem;font-weight:700;color:#0096FF;margin:0.5rem 0'>"
                     f"{r2['predicted_score']}</div>"
                     f"{risk_badge(risk2)}</div>", unsafe_allow_html=True)

    # ---- Radar comparison ----
    if i1 and i2:
        section_header("🎯", "Behavioural Profile Comparison")
        def g(inp, k):
            v = inp.get(k)
            return 0 if v is None or (isinstance(v, float) and np.isnan(v)) else v

        cats = ["Motivation", "Parental", "Peers", "Resources", "Teacher"]
        keys = ["Motivation_Level", "Parental_Involvement", "Peer_Influence", "Access_to_Resources", "Teacher_Quality"]
        v1 = [g(i1, k) for k in keys]
        v2 = [g(i2, k) for k in keys]

        fig = go.Figure()
        fig.add_trace(go.Scatterpolar(r=v1 + v1[:1], theta=cats + cats[:1], fill="toself",
                                       name=s1, fillcolor="rgba(0,212,170,0.12)",
                                       line=dict(color="#00D4AA")))
        fig.add_trace(go.Scatterpolar(r=v2 + v2[:1], theta=cats + cats[:1], fill="toself",
                                       name=s2, fillcolor="rgba(0,150,255,0.12)",
                                       line=dict(color="#0096FF")))
        fig.update_layout(polar=dict(radialaxis=dict(range=[0, 3], tickvals=[1, 2, 3],
                                                      gridcolor="rgba(255,255,255,0.08)"),
                                      angularaxis=dict(gridcolor="rgba(255,255,255,0.08)")),
                          height=400)
        st_plotly(styled_plotly(fig))

        # ---- Factor comparison table ----
        section_header("📊", "Factor-by-Factor Comparison")
        factor_names = {"Hours_Studied": "Study Hours/wk", "Attendance": "Attendance %",
                        "Previous_Scores": "Previous Scores %", "Tutoring_Sessions": "Tutoring/month",
                        "Sleep_Hours": "Sleep Hours/day", "Physical_Activity": "Activity hrs/wk",
                        "Motivation_Level": "Motivation", "Parental_Involvement": "Parental",
                        "Peer_Influence": "Peer Influence", "Access_to_Resources": "Resources",
                        "Teacher_Quality": "Teacher Quality"}
        comp_rows = []
        for feat, label in factor_names.items():
            va = i1.get(feat)
            vb = i2.get(feat)
            va_str = "–" if va is None or (isinstance(va, float) and np.isnan(va)) else f"{va:g}"
            vb_str = "–" if vb is None or (isinstance(vb, float) and np.isnan(vb)) else f"{vb:g}"
            comp_rows.append({"Factor": label, s1: va_str, s2: vb_str})
        st_df(pd.DataFrame(comp_rows))
    else:
        st.info("Both students need saved prediction inputs for a full comparison.")


# ============================================ PAGE: CLASS MANAGEMENT
def page_class_manage():
    page_title("🏫 Class Management")
    st.caption("Add students, manage the class roster, and remove students when needed.")

    all_students = db.students()
    latest = db.latest_predictions()
    if not latest.empty:
        latest = with_risk(latest)

    k1, k2, k3, k4 = st.columns(4)
    k1.metric("Total Students", len(all_students))
    high_risk = int((latest["risk_level"] == "High").sum()) if not latest.empty else 0
    k2.metric("At Risk", high_risk)
    avg_score = round(float(latest["predicted_score"].mean()), 1) if not latest.empty else "–"
    k3.metric("Avg Predicted Score", avg_score)
    low_risk = int((latest["risk_level"] == "Low").sum()) if not latest.empty else 0
    k4.metric("On Track", low_risk)

    tab_add, tab_bulk, tab_roster = st.tabs(["➕ Add Student", "📥 Bulk Add (CSV)", "📋 Class Roster"])

    with tab_add:
        with st.container(border=True):
            section_header("➕", "Add a New Student")
            st.caption("Add a student to the class. They can later receive predictions.")
            ac1, ac2, ac3 = st.columns(3)
            new_name = ac1.text_input("Student Name", placeholder="e.g. Rahul Kumar", key="add_name")
            new_dept = ac2.text_input("Department", placeholder="e.g. CSE", key="add_dept")
            new_sem = ac3.number_input("Semester", 1, 8, 1, key="add_sem")
            if st.button("➕  Add Student", type="primary"):
                if not new_name.strip():
                    st.error("Please enter the student's name.")
                elif not new_dept.strip():
                    st.error("Please enter the department.")
                else:
                    try:
                        db.add_student(new_name.strip(), new_dept.strip(), new_sem)
                        flash(f"✅ {new_name.strip()} has been added to the class.")
                        st.rerun()
                    except ValueError as e:
                        st.error(str(e))

    with tab_bulk:
        with st.container(border=True):
            section_header("📥", "Bulk Add Students from CSV")
            st.caption("Upload a CSV file with columns: **name**, **department**, **semester**")
            st.download_button("⬇️  Download CSV Template",
                               "name,department,semester\nRahul Kumar,CSE,3\nPriya Singh,ECE,5\n",
                               file_name="students_template.csv", mime="text/csv")
            csv_file = st.file_uploader("Upload CSV file", type="csv", key="bulk_csv")
            if csv_file is not None and st.button("📥  Import Students", type="primary"):
                try:
                    df = pd.read_csv(csv_file)
                    df.columns = [c.strip().lower() for c in df.columns]
                    if "name" not in df.columns:
                        st.error("CSV must have a 'name' column.")
                    else:
                        rows = df.to_dict("records")
                        res = db.bulk_add_students(rows)
                        msg = f"✅ Added {res['added']} student(s)."
                        if res["skipped"]:
                            msg += f" Skipped {res['skipped']} duplicate(s)."
                        if res["errors"]:
                            msg += " Errors: " + "; ".join(res["errors"][:5])
                        flash(msg, "warning" if res["errors"] else "success")
                        st.rerun()
                except Exception as e:
                    st.error(f"Could not read the file: {e}")

    with tab_roster:
        search = st.text_input("🔍 Search students", placeholder="Type to filter...", key="search_students")
        filtered = db.search_students(search)

        if filtered.empty:
            st.info("No students found." + (" Try a different search." if search else " Add students above."))
            return

        roster = filtered.copy()
        if not latest.empty:
            merged = roster.merge(
                latest[["student_id", "predicted_score", "risk_level"]].rename(columns={"student_id": "id"}),
                on="id", how="left")
        else:
            merged = roster.copy()
            merged["predicted_score"] = None
            merged["risk_level"] = None

        section_header("📋", f"Class Roster ({len(merged)} students)")
        for idx, row in merged.iterrows():
            with st.container(border=True):
                rc1, rc2, rc3, rc4, rc5 = st.columns([3, 2, 1.5, 2, 1.5])
                rc1.markdown(f"<div class='student-name'>{row['name']}</div>"
                             f"<div class='student-meta'>{row['department'] or 'N/A'} · "
                             f"Semester {row['semester'] or '?'}</div>", unsafe_allow_html=True)
                if pd.notna(row.get("predicted_score")):
                    rc2.metric("Score", row["predicted_score"])
                else:
                    rc2.markdown("<span style='color:rgba(255,255,255,0.3);font-size:0.85rem'>No prediction</span>",
                                unsafe_allow_html=True)
                if pd.notna(row.get("risk_level")):
                    rc3.markdown(f"<br>{risk_badge(row['risk_level'])}", unsafe_allow_html=True)
                else:
                    rc3.markdown("")
                rc4.markdown("")
                if rc5.button("🗑️ Delete", key=f"del_{row['id']}",
                              help=f"Remove {row['name']} from the class"):
                    st.session_state[f"confirm_del_{row['id']}"] = True

                if st.session_state.get(f"confirm_del_{row['id']}", False):
                    st.warning(f"⚠️ **Delete {row['name']}?** This removes ALL their data. Cannot be undone.")
                    cc1, cc2, cc3 = st.columns([1, 1, 4])
                    if cc1.button("✅ Yes, delete", key=f"confirm_yes_{row['id']}", type="primary"):
                        student_name = row["name"]
                        db.delete_student(int(row["id"]))
                        try:
                            excel_store.remove_student_rows(student_name)
                        except Exception:
                            pass
                        st.session_state.pop(f"confirm_del_{row['id']}", None)
                        flash(f"🗑️ {student_name} has been removed.")
                        st.rerun()
                    if cc2.button("❌ Cancel", key=f"confirm_no_{row['id']}"):
                        st.session_state.pop(f"confirm_del_{row['id']}", None)
                        st.rerun()


# ================================================ PAGE: CLASS OVERVIEW
def page_class():
    page_title("📊 Class Overview")
    latest = db.latest_predictions()
    if latest.empty:
        st.info("No data yet. Make predictions on the **New Prediction** page first.")
        return
    latest = with_risk(latest)

    f1, f2 = st.columns(2)
    depts = f1.multiselect("Department", sorted(latest["department"].dropna().unique()))
    sems = f2.multiselect("Semester", sorted(latest["semester"].dropna().unique()))
    if depts:
        latest = latest[latest["department"].isin(depts)]
    if sems:
        latest = latest[latest["semester"].isin(sems)]
    if latest.empty:
        st.info("No students match the filters.")
        return

    k1, k2, k3 = st.columns(3)
    k1.metric("Students", len(latest))
    k2.metric("High-risk", int((latest["risk_level"] == "High").sum()))
    k3.metric("Avg Score", round(float(latest["predicted_score"].mean()), 1))

    left, right = st.columns(2)
    with left:
        section_header("📊", "Risk Distribution")
        counts = (latest["risk_level"].value_counts()
                  .reindex(["High", "Medium", "Low"], fill_value=0).reset_index())
        counts.columns = ["Risk", "Students"]
        fig = px.bar(counts, x="Risk", y="Students", color="Risk", color_discrete_map=RISK_COLORS)
        st_plotly(styled_plotly(fig))
    with right:
        section_header("⚠️", "High-risk Students")
        hr = latest.loc[latest["risk_level"] == "High",
                        ["name", "department", "semester", "predicted_score", "risk_level"]]
        if hr.empty:
            st.success("No high-risk students! 🎉")
        else:
            st_df(hr)

    st.download_button("⬇️  Download Class List (CSV)", latest.to_csv(index=False),
                       file_name="class_view.csv", mime="text/csv")

    section_header("🎯", "Predicted vs Actual Score")
    pa = db.results_joined()
    if pa.empty:
        st.info("Enter actual results on the Student Dashboard page to see this chart.")
    else:
        fig = px.scatter(pa, x="actual_score", y="predicted_score", hover_name="name",
                         color_discrete_sequence=["#00D4AA"])
        lo = float(pa[["actual_score", "predicted_score"]].min().min())
        hi = float(pa[["actual_score", "predicted_score"]].max().max())
        fig.add_trace(go.Scatter(x=[lo, hi], y=[lo, hi], mode="lines", name="Perfect prediction",
                                 line=dict(dash="dash", color="rgba(255,255,255,0.3)")))
        st_plotly(styled_plotly(fig))
        st.metric("Mean Absolute Error", f"{(pa['predicted_score'] - pa['actual_score']).abs().mean():.2f} marks")


# ================================================ PAGE: CLASS ANALYTICS
def page_analytics():
    page_title("📊 Class Analytics")
    st.caption("Deep-dive analytics across your class: distributions, department comparisons, and trends.")

    latest = db.latest_predictions()
    if latest.empty:
        st.info("No predictions yet. Make predictions first to see analytics.")
        return
    latest = with_risk(latest)

    tab_dist, tab_dept, tab_trends = st.tabs(["📈 Score Distribution", "🏢 Department Comparison", "📅 Semester Trends"])

    with tab_dist:
        section_header("📈", "Score Distribution")
        fig = px.histogram(latest, x="predicted_score", nbins=25, color="risk_level",
                           color_discrete_map=RISK_COLORS, barmode="overlay",
                           labels={"predicted_score": "Predicted Score", "risk_level": "Risk Level"})
        fig.add_vline(x=HIGH, line_dash="dash", line_color=RISK_COLORS["High"], opacity=0.6,
                      annotation_text="High risk")
        fig.add_vline(x=LOW, line_dash="dash", line_color=RISK_COLORS["Low"], opacity=0.6,
                      annotation_text="Low risk")
        st_plotly(styled_plotly(fig, height=400))

        section_header("📊", "Score Statistics")
        stats = latest["predicted_score"].describe().round(1)
        s1, s2, s3, s4, s5 = st.columns(5)
        s1.metric("Mean", stats["mean"])
        s2.metric("Median", stats["50%"])
        s3.metric("Std Dev", stats["std"])
        s4.metric("Min", stats["min"])
        s5.metric("Max", stats["max"])

        section_header("🥧", "Risk Breakdown")
        risk_counts = latest["risk_level"].value_counts().reindex(["High", "Medium", "Low"], fill_value=0)
        fig = px.pie(values=risk_counts.values, names=risk_counts.index,
                     color=risk_counts.index, color_discrete_map=RISK_COLORS, hole=0.4)
        fig.update_traces(textinfo="label+percent+value")
        st_plotly(styled_plotly(fig, height=350))

    with tab_dept:
        depts = latest["department"].dropna().unique()
        if len(depts) < 2:
            st.info("Need students in at least 2 departments for comparison.")
        else:
            section_header("🏢", "Average Score by Department")
            dept_stats = latest.groupby("department")["predicted_score"].agg(["mean", "count", "std"]).round(1)
            dept_stats.columns = ["Avg Score", "Students", "Std Dev"]
            dept_stats = dept_stats.sort_values("Avg Score", ascending=False)
            fig = px.bar(dept_stats.reset_index(), x="department", y="Avg Score",
                         text="Avg Score", color="Avg Score",
                         color_continuous_scale=["#ff6b6b", "#ffc107", "#51cf66"],
                         labels={"department": "Department"})
            st_plotly(styled_plotly(fig, height=350))
            st_df(dept_stats)

            section_header("📊", "Risk by Department")
            risk_dept = pd.crosstab(latest["department"], latest["risk_level"])
            risk_dept = risk_dept.reindex(columns=["High", "Medium", "Low"], fill_value=0)
            fig = px.bar(risk_dept.reset_index(), x="department", y=["High", "Medium", "Low"],
                         barmode="group", color_discrete_map=RISK_COLORS,
                         labels={"department": "Department", "value": "Students"})
            st_plotly(styled_plotly(fig, height=350))

    with tab_trends:
        section_header("📅", "Score by Semester")
        sems = latest["semester"].dropna().unique()
        if len(sems) < 2:
            st.info("Need students in at least 2 semesters for trend analysis.")
        else:
            sem_stats = latest.groupby("semester")["predicted_score"].agg(["mean", "count"]).round(1)
            sem_stats.columns = ["Avg Score", "Students"]
            fig = px.line(sem_stats.reset_index(), x="semester", y="Avg Score",
                          markers=True, text="Avg Score",
                          color_discrete_sequence=["#00D4AA"],
                          labels={"semester": "Semester"})
            st_plotly(styled_plotly(fig, height=350))
            st_df(sem_stats)

        section_header("📈", "Prediction Timeline")
        all_preds = db.query("SELECT date, predicted_score FROM predictions ORDER BY id")
        if not all_preds.empty:
            all_preds["date"] = pd.to_datetime(all_preds["date"], errors="coerce")
            daily = all_preds.groupby(all_preds["date"].dt.date)["predicted_score"].mean().reset_index()
            daily.columns = ["Date", "Avg Score"]
            fig = px.line(daily, x="Date", y="Avg Score", markers=True,
                          color_discrete_sequence=["#0096FF"])
            st_plotly(styled_plotly(fig, height=300))


# ================================================ PAGE: MODEL ANALYSIS
def page_analysis():
    page_title("🧠 Model Analysis")
    tab1, tab2, tab3 = st.tabs(["🏷️ Active Model", "⚖️ Compare Models", "🎯 Real-world Accuracy"])

    with tab1:
        m = BUNDLE["metrics"]
        c1, c2, c3, c4 = st.columns(4)
        c1.metric("Model", BUNDLE["name"])
        c2.metric("R² (test)", m.get("R2", "–"))
        c3.metric("MAE (marks)", m.get("MAE", "–"))
        c4.metric("RMSE (marks)", m.get("RMSE", "–"))
        st.caption(f"Version {BUNDLE['version']} · trained {BUNDLE['trained_at']} · "
                   f"{BUNDLE['n_rows']} rows ({BUNDLE['n_real']} from your students) · "
                   f"source: {BUNDLE['source']}")
        if BUNDLE.get("metrics_note"):
            st.info(BUNDLE["metrics_note"])
        imp, kind = ml.global_importance(BUNDLE)
        if imp.empty:
            st.info(kind)
        else:
            section_header("📊", f"Feature Importance — {kind}")
            imp = imp.assign(Feature=imp["Feature"].map(ml.pretty))
            fig = px.bar(imp, x="Value", y="Feature", orientation="h",
                         color_discrete_sequence=["#00D4AA"])
            fig.update_layout(height=420, yaxis=dict(autorange="reversed"))
            st_plotly(styled_plotly(fig))
            st_df(imp.round(3))
        st.markdown("**Features used:** " + ", ".join(ml.pretty(f) for f in BUNDLE["features"]))
        missing = [f for f in ml.EXTRA_FEATURES if f not in BUNDLE["features"]]
        if missing:
            st.caption("Not used yet: " + ", ".join(ml.pretty(f) for f in missing)
                       + ". Include them from the Retrain Model page once enough students have actual scores.")

    with tab2:
        st.write("Trains Ridge, Random Forest and XGBoost on the base dataset with and without the "
                 "behavioural factors. Use this table in your report.")
        if st.button("🔄  Run Comparison", type="primary"):
            st.session_state["comparison"] = run_comparison(BASE)
        comp = st.session_state.get("comparison")
        if comp is not None:
            st_df(comp)
            fig = px.bar(comp, x="Model", y="R2", color="Feature set", barmode="group")
            st_plotly(styled_plotly(fig))
            best = comp.sort_values("R2").groupby("Feature set").tail(1).set_index("Feature set")["R2"]
            if {"Academic only", "Academic + behavioural"} <= set(best.index):
                st.success(f"Best R² rises from {best['Academic only']:.3f} to "
                           f"{best['Academic + behavioural']:.3f} with behavioural factors.")

    with tab3:
        pa = db.results_joined()
        if pa.empty:
            st.info("No actual results yet. Add them on the Student Dashboard page.")
        else:
            err = pa["predicted_score"] - pa["actual_score"]
            k1, k2, k3, k4 = st.columns(4)
            k1.metric("Records", len(pa))
            k2.metric("MAE", f"{err.abs().mean():.2f}")
            k3.metric("RMSE", f"{np.sqrt((err ** 2).mean()):.2f}")
            k4.metric("Bias", f"{err.mean():+.2f}")
            left, right = st.columns(2)
            with left:
                fig = px.scatter(pa, x="actual_score", y="predicted_score", hover_name="name",
                                 color_discrete_sequence=["#00D4AA"])
                lo = float(pa[["actual_score", "predicted_score"]].min().min())
                hi = float(pa[["actual_score", "predicted_score"]].max().max())
                fig.add_trace(go.Scatter(x=[lo, hi], y=[lo, hi], mode="lines", name="Perfect",
                                         line=dict(dash="dash", color="rgba(255,255,255,0.3)")))
                st_plotly(styled_plotly(fig))
            with right:
                fig = px.histogram(err.rename("Prediction error"), nbins=15,
                                   color_discrete_sequence=["#0096FF"])
                st_plotly(styled_plotly(fig))
            band = with_risk(pa).assign(error=err.abs()).groupby("risk_level")["error"].agg(["count", "mean"])
            section_header("📊", "Error by Risk Band")
            st_df(band.rename(columns={"count": "Students", "mean": "MAE"}).round(2))


# ================================================ PAGE: RETRAIN
def page_retrain():
    page_title("🔧 Retrain Model")

    # ---- Data source selection (top-level) ----
    section_header("📂", "Training Data Source")
    source_mode = st.radio(
        "Where should training data come from?",
        ["🏫 Class students (from database)",
         "📄 Excel training sheet",
         "📄 Excel training sheet + base dataset"],
        horizontal=True,
        help="'Class students' uses the students you added and predicted in the app. "
             "'Excel training sheet' uses the training_data.xlsx file."
    )

    use_db_students = source_mode.startswith("🏫")
    use_excel_only = source_mode == "📄 Excel training sheet"
    use_excel_plus_base = source_mode.startswith("📄 Excel training sheet + base")

    # ============================================================
    # PATH A: Class students from database
    # ============================================================
    if use_db_students:
        st.caption("Training from the students you've added in the app. "
                   "Each student's latest prediction inputs are used as features. "
                   "Actual scores are used where available; predicted scores fill in the rest.")

        db_rows, db_report = db.get_all_training_rows()

        with st.container(border=True):
            section_header("👥", "Class Training Data")
            k1, k2, k3, k4 = st.columns(4)
            k1.metric("Total Students", db_report["total"])
            k2.metric("With Actual Score", db_report["with_actual"])
            k3.metric("Using Predicted Score", db_report["with_predicted"])
            all_students_count = len(db.students())
            no_pred = all_students_count - db_report["total"]
            k4.metric("No Prediction Yet", no_pred)

            if db_report["students"]:
                with st.expander(f"👁️ Students included ({db_report['total']})"):
                    for i, name in enumerate(db_report["students"], 1):
                        st.write(f"{i}. {name}")

            if db_report["with_predicted"] > 0:
                st.info(f"ℹ️ {db_report['with_predicted']} student(s) don't have actual exam results yet. "
                        "Their predicted scores are used as targets. Add actual scores on the "
                        "Student Dashboard for better accuracy.")

            if not db_rows.empty:
                with st.expander("👁️ Preview training data"):
                    st_df(db_rows.head(50))

        if db_rows.empty:
            st.warning("No students with predictions found. Go to **New Prediction** to add some first.")
            return

        n_real = len(db_rows)

        # Training options
        section_header("⚙️", "Training Options")
        combine_base = st.checkbox("Also include base dataset (for more training data)",
                                   value=n_real < 30,
                                   help="Combines your class data with the base dataset. "
                                        "Recommended when you have fewer than 30 students.")
        if combine_base:
            weight = st.slider("Weight per class student row", 1, 50, 10,
                               help="Higher = model adapts faster to your students' data.")
        else:
            weight = 1

        n_ext = int(db_rows[ml.EXTRA_FEATURES].notna().all(axis=1).sum()) if n_real else 0
        feat_label = st.radio("Features", ["Standard (11 factors)", "Extended (adds grade and failures)"],
                              horizontal=True)
        if n_ext > 0:
            st.caption(f"{n_ext} of {n_real} students also have grade and failure count.")

        names = st.multiselect("Models", ml.available_models(), default=ml.available_models())

        need = ml.MIN_REAL_ONLY if not combine_base else ml.MIN_REAL
        can_run = n_real >= need and bool(names)
        if n_real < need:
            st.warning(f"Need {need}+ students with predictions (have {n_real}). "
                       f"{'Add more predictions or enable base dataset.' if not combine_base else 'Add more predictions.'}")

        if st.button("🚀  Train and Compare", type="primary", disabled=not can_run, key="train_db"):
            with st.spinner("Training models on class data..."):
                src = "real" if not combine_base else "base+real"
                frame = ml.assemble_frame(BASE, db_rows, src)
                wanted = ml.ALL_FEATURES if feat_label.startswith("Extended") else ml.BASE_FEATURES
                feats, dropped = ml.select_features(frame, wanted)
                results = ml.train_candidates(frame, feats, weight, names)
            st.session_state["retrain"] = {
                "frame": frame, "features": feats, "dropped": dropped,
                "weight": weight, "results": results,
                "source": f"class students ({db_report['total']} students, "
                          f"{db_report['with_actual']} actual + {db_report['with_predicted']} predicted)"
                          + (" + base dataset" if combine_base else "")
            }

    # ============================================================
    # PATH B: Excel training sheet (original flow)
    # ============================================================
    else:
        st.caption("Retraining reads from the Excel training sheet.")
        empty = pd.DataFrame(columns=ml.ALL_FEATURES + [ml.TARGET])
        try:
            labelled, rep = excel_store.training_rows()
        except excel_store.ExcelLocked as e:
            labelled, rep = empty, {"total": 0, "usable": 0, "pending": 0, "excluded": 0, "invalid": []}
            st.error(str(e))

        section_header("📄", "Training Sheet")
        st.code(os.path.abspath(excel_store.PATH), language=None)
        k1, k2, k3, k4 = st.columns(4)
        k1.metric("Rows in Sheet", rep["total"])
        k2.metric("Ready for Training", rep["usable"])
        k3.metric("Waiting for Score", rep["pending"])
        k4.metric("Need Fixing", len(rep["invalid"]))
        if rep["excluded"]:
            st.caption(f"{rep['excluded']} row(s) switched off with Use_For_Training = No.")

        b1, b2 = st.columns(2)
        if os.path.exists(excel_store.PATH):
            with open(excel_store.PATH, "rb") as fh:
                b1.download_button("⬇️  Download Training Sheet", fh.read(),
                                   file_name="training_data.xlsx", mime=XLSX_MIME)
        if b2.button("🔄  Sync from Database"):
            try:
                res = excel_store.sync_from_db()
                flash(f"Added {res['added']} row(s) and filled {res['filled']} actual score(s).")
            except excel_store.ExcelLocked as e:
                flash(str(e), "error")
            st.rerun()

        with st.expander("📎 Add rows from an Excel file"):
            st.write("Each row needs the 11 factor columns and the Actual_Score.")
            st.download_button("⬇️  Download Blank Template", excel_store.template_bytes(),
                               file_name="training_template.xlsx", mime=XLSX_MIME)
            up = st.file_uploader("Excel file (.xlsx)", type="xlsx", key="xlsx_upload")
            if up is not None and st.button("Add these rows"):
                try:
                    res = excel_store.import_excel(up)
                    msg = f"Added {res['added']} row(s)."
                    if res["duplicates"]:
                        msg += f" Skipped {res['duplicates']} duplicate(s)."
                    if res["invalid"]:
                        msg += " Problems: " + "; ".join(f"row {r}: {why}" for r, why in res["invalid"][:5])
                    flash(msg, "warning" if res["invalid"] else "success")
                except (ValueError, excel_store.ExcelLocked) as e:
                    flash(str(e), "error")
                except Exception as e:
                    flash(f"Could not read the file: {e}", "error")
                st.rerun()

        with st.expander("📊 Import actual scores from CSV"):
            st.download_button("⬇️  Download CSV Template", "name,actual_score\nAnu,72\nRahul,58\n",
                               file_name="actual_scores_template.csv", mime="text/csv")
            csv_up = st.file_uploader("CSV file", type="csv", key="csv_upload")
            if csv_up is not None and st.button("Import scores"):
                try:
                    res = db.attach_actuals(pd.read_csv(csv_up))
                    msg = f"Imported {res['imported']} score(s)."
                    if res["updates"]:
                        problem = excel_update(excel_store.set_actuals, res["updates"])
                        msg += " " + (problem or "Excel sheet updated too.")
                    if res["not_found"]:
                        msg += f" Not found: {', '.join(res['not_found'][:10])}."
                    if res["invalid"]:
                        msg += f" Invalid: {', '.join(res['invalid'][:10])}."
                    flash(msg)
                except Exception as e:
                    flash(f"Could not import: {e}", "error")
                st.rerun()

        if rep["invalid"]:
            with st.expander(f"⚠️ {len(rep['invalid'])} row(s) need fixing"):
                st_df(pd.DataFrame(rep["invalid"], columns=["Excel row", "Problem"]))
        if len(labelled):
            with st.expander("👁️ Preview training rows"):
                st_df(labelled.head(100))

        n_real = rep["usable"]
        n_ext = int(labelled[ml.EXTRA_FEATURES].notna().all(axis=1).sum()) if n_real else 0
        st.caption(f"{n_ext} of the ready rows also have grade and failure count.")

        section_header("⚙️", "Training Options")
        real_only = use_excel_only
        weight = st.slider("Weight per sheet row", 1, 50, 10,
                           help="Higher = adapts faster to your college data.")
        feat_label = st.radio("Features", ["Standard (11 factors)", "Extended (adds grade and failures)"],
                              horizontal=True)
        names = st.multiselect("Models", ml.available_models(), default=ml.available_models())

        need = ml.MIN_REAL_ONLY if real_only else ml.MIN_REAL
        can_run = n_real >= need and bool(names)
        if n_real < need:
            st.warning(f"Need {need}+ rows with actual score (has {n_real}).")
        elif n_real < 20 and not real_only:
            st.info("Small sample: add more actual scores for a stronger effect.")

        if st.button("🚀  Train and Compare", type="primary", disabled=not can_run, key="train_excel"):
            with st.spinner("Training models..."):
                src = "real" if real_only else "base+real"
                frame = ml.assemble_frame(BASE, labelled, src)
                wanted = ml.ALL_FEATURES if feat_label.startswith("Extended") else ml.BASE_FEATURES
                feats, dropped = ml.select_features(frame, wanted)
                results = ml.train_candidates(frame, feats, weight, names)
            st.session_state["retrain"] = {"frame": frame, "features": feats, "dropped": dropped,
                                           "weight": weight, "results": results,
                                           "source": f"{excel_store.PATH} only" if real_only
                                           else f"base dataset + {excel_store.PATH}"}

    # ============================================================
    # Common: show results & activate model (shared by both paths)
    # ============================================================
    rt = st.session_state.get("retrain")
    if rt:
        section_header("📊", "Results (20% Test Split)")
        if rt["dropped"]:
            st.info(f"Not enough rows for: {', '.join(ml.pretty(f) for f in rt['dropped'])}")
        table = pd.DataFrame(rt["results"])
        st_df(table)
        fig = px.bar(table, x="Model", y="R2", text="R2", color_discrete_sequence=["#00D4AA"])
        st_plotly(styled_plotly(fig))
        best = int(table["R2"].idxmax())
        choice = st.selectbox("Model to activate", list(table["Model"]), index=best)
        if st.button("✅  Activate Selected Model", type="primary"):
            row = next(r for r in rt["results"] if r["Model"] == choice)
            bundle, path = ml.finalize_model(choice, rt["frame"], rt["features"], rt["weight"],
                                             row, rt["source"])
            db.log_model_version(bundle, path)
            st.cache_resource.clear()
            st.session_state.pop("retrain", None)
            flash(f"{choice} ({bundle['version']}) is now active.")
            st.rerun()

    section_header("📦", "Model Versions")
    versions = db.list_versions()
    if not versions.empty:
        st_df(versions[["version", "name", "trained_at", "source", "n_rows", "n_real",
                        "mae", "rmse", "r2", "active"]])
        inactive = versions[versions["active"] == 0]
        if not inactive.empty:
            old = st.selectbox("Restore an earlier version", list(inactive["version"]))
            if st.button("🔄  Make This Version Active"):
                path = inactive.loc[inactive["version"] == old, "path"].iloc[0]
                if os.path.exists(path):
                    ml.activate_version(path)
                    db.set_active_version(old)
                    st.cache_resource.clear()
                    flash(f"Version {old} restored.")
                    st.rerun()
                else:
                    st.error("That model file no longer exists.")


# ================================================ PAGE: SETTINGS
def page_settings():
    page_title("⚙️ Settings")

    with st.container(border=True):
        section_header("🎯", "Risk Thresholds")
        s = {**ml.DEFAULT_SETTINGS, **SETTINGS}
        pct_mode = s["threshold_mode"] == "percentile"
        method = st.radio("How should the cut-offs be set?",
                          ["Percentile of historical scores", "Fixed marks"],
                          index=0 if pct_mode else 1, horizontal=True)
        c1, c2 = st.columns(2)
        if method.startswith("Percentile"):
            hp = c1.slider("High risk: below this percentile", 5, 45, int(float(s["high_pct"])))
            lp = c2.slider("Low risk: at or above this percentile", 55, 95, int(float(s["low_pct"])))
            new, valid = {"threshold_mode": "percentile", "high_pct": hp, "low_pct": lp}, True
        else:
            hf = c1.number_input("High risk: below (marks)", 0.0, 100.0, float(s["high_fixed"]), 0.5)
            lf = c2.number_input("Low risk: at or above (marks)", 0.0, 100.0, float(s["low_fixed"]), 0.5)
            new, valid = {"threshold_mode": "fixed", "high_fixed": hf, "low_fixed": lf}, hf < lf
            if not valid:
                st.error("High-risk cut-off must be lower than Low-risk cut-off.")

        hi_cut, lo_cut = ml.compute_thresholds({**s, **new}, BASE[ml.TARGET])
        m1, m2 = st.columns(2)
        m1.metric("High Risk Below", f"{hi_cut:.1f}")
        m2.metric("Low Risk From", f"{lo_cut:.1f}")

        scores = BASE[ml.TARGET]
        fig = px.histogram(scores, nbins=40, color_discrete_sequence=["#0096FF"])
        fig.add_vline(x=hi_cut, line_dash="dash", line_color=RISK_COLORS["High"])
        fig.add_vline(x=lo_cut, line_dash="dash", line_color=RISK_COLORS["Low"])
        fig.update_layout(showlegend=False, xaxis_title="Exam score (base dataset)")
        st_plotly(styled_plotly(fig))

        def bands(series):
            return series.map(lambda x: ml.risk_level(x, hi_cut, lo_cut)).value_counts() \
                .reindex(["High", "Medium", "Low"], fill_value=0)

        table = pd.DataFrame({"Base dataset": bands(scores)})
        saved = db.latest_predictions()
        if not saved.empty:
            table["Your students"] = bands(saved["predicted_score"])
        st.markdown("**Students in each band with these settings**")
        st_df(table)

        b1, b2 = st.columns(2)
        if b1.button("💾  Save Thresholds", type="primary", disabled=not valid):
            db.set_settings(new)
            flash("Thresholds saved.")
            st.rerun()
        if b2.button("🔄  Reset to Default"):
            db.set_settings({k: ml.DEFAULT_SETTINGS[k] for k in ml.THRESHOLD_KEYS})
            flash("Thresholds reset.")
            st.rerun()
        st.caption("Risk levels are re-calculated from current thresholds automatically.")


def settings_forecast():
    st.markdown("")
    with st.container(border=True):
        section_header("📈", "Examination Forecast Settings")
        s = {**ml.DEFAULT_SETTINGS, **SETTINGS}
        learned_w, n_used, learned = ml.learn_progress_weight(db.progression_samples())
        st.write("After the 1st examination, the app predicts the final, then places the "
                 "2nd examination between the two.")
        st.caption(f"Learned from students with all three examinations: {n_used} found"
                   + (f", median {learned_w:.0%}." if learned else ". At least 5 needed."))
        mode = st.radio("Method", ["Learn from my students (automatic)", "Fixed value"],
                        index=0 if s["progress_mode"] == "auto" else 1, horizontal=True)
        fixed = st.slider("Fixed position of 2nd examination", 0.0, 1.0, float(s["progress_fixed"]), 0.05,
                          disabled=mode.startswith("Learn"))
        if st.button("💾  Save Forecast Setting", type="primary"):
            db.set_settings({"progress_mode": "auto" if mode.startswith("Learn") else "fixed",
                             "progress_fixed": fixed})
            flash("Forecast setting saved.")
            st.rerun()


# ================================================================ MAIN
PAGES = {
    "🏠  Home": page_home,
    "🔮  New Prediction": page_predict,
    "👤  Student Dashboard": page_student,
    "👥  Student Comparison": page_compare,
    "🏫  Class Management": page_class_manage,
    "📊  Class Overview": page_class,
    "📊  Class Analytics": page_analytics,
    "🧠  Model Analysis": page_analysis,
    "🔧  Retrain Model": page_retrain,
    "⚙️  Settings": page_settings,
}

# ---- Sidebar ----
with st.sidebar:
    st.markdown("## 🎓 AcadIQ")
    st.caption("Smart Student Performance Analysis")
    st.markdown("---")

    # Handle programmatic navigation
    nav_override = st.session_state.pop("nav_page", None)
    page_list = list(PAGES.keys())
    default_idx = page_list.index(nav_override) if nav_override and nav_override in page_list else 0

    st.markdown("**NAVIGATE**")
    page = st.radio("Navigation", page_list, index=default_idx, label_visibility="collapsed")

    st.markdown("---")
    st.markdown("**Active Model**")
    st.caption(f"🏷️ {BUNDLE['name']} ({BUNDLE['version']})")
    st.caption(f"🎯 High < {HIGH:.1f} | Med {HIGH:.1f}–{LOW:.1f} | Low ≥ {LOW:.1f}")

# ---- Flash messages ----
message = st.session_state.pop("flash", None)
if message:
    level, text = message
    getattr(st, level)(text)

# ---- Render page ----
PAGES[page]()
if page == "⚙️  Settings":
    settings_forecast()