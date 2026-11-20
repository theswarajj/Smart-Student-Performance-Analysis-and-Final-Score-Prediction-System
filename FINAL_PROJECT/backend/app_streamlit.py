"""
app.py - Streamlit dashboard + SQLite database.
Run with:  streamlit run app.py
Needs predict.py, models/final_model.pkl and processed_students.csv in the same folder.
"""
import sqlite3
import datetime
import pandas as pd
import streamlit as st
import plotly.express as px
import plotly.graph_objects as go
from predict import predict_student, HIGH_CUTOFF, LOW_CUTOFF

st.set_page_config(page_title="Student Performance Analysis", layout="wide")
DB = "student.db"
LEVEL = {"Low": 1, "Medium": 2, "High": 3}
PEER = {"Negative": 1, "Neutral": 2, "Positive": 3}
RISK_COLORS = {"High": "#d9534f", "Medium": "#f0ad4e", "Low": "#5cb85c"}


# ---------------- Database ----------------
def conn():
    return sqlite3.connect(DB)


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
        """)


def query(sql, params=()):
    with conn() as c:
        return pd.read_sql(sql, c, params=params)


def save_prediction(name, dept, sem, f, result):
    now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
    with conn() as c:
        row = c.execute("SELECT id FROM students WHERE name=?", (name,)).fetchone()
        if row:
            sid = row[0]
            c.execute("UPDATE students SET department=?, semester=? WHERE id=?", (dept, sem, sid))
        else:
            sid = c.execute("INSERT INTO students(name,department,semester) VALUES(?,?,?)",
                            (name, dept, sem)).lastrowid
        c.execute("INSERT INTO academic_data(student_id,date,attendance,hours_studied,"
                  "previous_scores,tutoring_sessions) VALUES(?,?,?,?,?,?)",
                  (sid, now, f["Attendance"], f["Hours_Studied"], f["Previous_Scores"],
                   f["Tutoring_Sessions"]))
        c.execute("INSERT INTO behaviour_data(student_id,date,motivation,parental_involvement,"
                  "peer_influence,sleep_hours,access_to_resources,teacher_quality,physical_activity)"
                  " VALUES(?,?,?,?,?,?,?,?,?)",
                  (sid, now, f["Motivation_Level"], f["Parental_Involvement"], f["Peer_Influence"],
                   f["Sleep_Hours"], f["Access_to_Resources"], f["Teacher_Quality"],
                   f["Physical_Activity"]))
        c.execute("INSERT INTO predictions(student_id,date,predicted_score,risk_level) VALUES(?,?,?,?)",
                  (sid, now, result["predicted_score"], result["risk"]))


# ---------------- Charts ----------------
def radar(values: dict):
    labels = list(values.keys())
    vals = list(values.values())
    fig = go.Figure(go.Scatterpolar(r=vals + vals[:1], theta=labels + labels[:1], fill="toself"))
    fig.update_layout(polar=dict(radialaxis=dict(range=[0, 3], tickvals=[1, 2, 3])),
                      showlegend=False, height=380, margin=dict(t=30, b=30))
    return fig


init_db()
page = st.sidebar.radio("Menu", ["New Prediction", "Student Dashboard", "Class View"])
st.sidebar.caption(f"Risk bands: High < {HIGH_CUTOFF:.0f} | Medium {HIGH_CUTOFF:.0f}-{LOW_CUTOFF:.0f} "
                   f"| Low >= {LOW_CUTOFF:.0f}")
st.title("Smart Student Performance Analysis")

# ---------------- Page 1: New prediction ----------------
if page == "New Prediction":
    st.subheader("Enter student details")
    with st.form("student_form"):
        c1, c2, c3 = st.columns(3)
        name = c1.text_input("Student name")
        dept = c2.text_input("Department")
        sem = c3.number_input("Semester", 1, 8, 1)

        st.markdown("**Academic factors**")
        a1, a2, a3, a4 = st.columns(4)
        attendance = a1.slider("Attendance (%)", 40, 100, 75)
        hours = a2.slider("Study hours per week", 0, 45, 15)
        prev = a3.slider("Previous exam score", 40, 100, 70)
        tutoring = a4.slider("Tutoring sessions per month", 0, 8, 0)

        st.markdown("**Behavioural questionnaire**")
        b1, b2, b3, b4 = st.columns(4)
        motivation = b1.selectbox("Motivation level", list(LEVEL), index=1)
        parental = b2.selectbox("Parental involvement", list(LEVEL), index=1)
        peer = b3.selectbox("Peer influence", list(PEER), index=1)
        resources = b4.selectbox("Access to resources", list(LEVEL), index=1)
        d1, d2, d3 = st.columns(3)
        teacher = d1.selectbox("Teacher quality", list(LEVEL), index=1)
        sleep = d2.slider("Sleep hours per day", 4, 10, 7)
        activity = d3.slider("Physical activity (hrs/week)", 0, 6, 2)
        go_btn = st.form_submit_button("Predict")

    if go_btn:
        if not name.strip():
            st.error("Please enter the student's name.")
        else:
            f = {"Hours_Studied": hours, "Attendance": attendance, "Previous_Scores": prev,
                 "Tutoring_Sessions": tutoring, "Motivation_Level": LEVEL[motivation],
                 "Parental_Involvement": LEVEL[parental], "Peer_Influence": PEER[peer],
                 "Sleep_Hours": sleep, "Access_to_Resources": LEVEL[resources],
                 "Teacher_Quality": LEVEL[teacher], "Physical_Activity": activity}
            r = predict_student(f)
            save_prediction(name.strip(), dept, sem, f, r)

            m1, m2 = st.columns(2)
            m1.metric("Predicted final score", r["predicted_score"])
            m2.markdown(f"### Risk level: <span style='color:{RISK_COLORS[r['risk']]}'>"
                        f"{r['risk']}</span>", unsafe_allow_html=True)

            left, right = st.columns(2)
            with left:
                st.markdown("**Factors affecting the prediction (marks vs average student)**")
                tf = r["top_factors"].reset_index()
                tf.columns = ["Factor", "Impact"]
                fig = px.bar(tf, x="Impact", y="Factor", orientation="h",
                             color=tf["Impact"] > 0,
                             color_discrete_map={True: "#5cb85c", False: "#d9534f"})
                fig.update_layout(showlegend=False, height=380)
                st.plotly_chart(fig, use_container_width=True)
            with right:
                st.markdown("**Behavioural profile (1 = low, 3 = high)**")
                st.plotly_chart(radar({"Motivation": f["Motivation_Level"],
                                       "Parental": f["Parental_Involvement"],
                                       "Peers": f["Peer_Influence"],
                                       "Resources": f["Access_to_Resources"],
                                       "Teacher": f["Teacher_Quality"]}),
                                use_container_width=True)

            st.markdown("**Personalised recommendations (most important first)**")
            if r["weak_areas"]:
                for i, (feat, advice) in enumerate(r["weak_areas"], 1):
                    st.write(f"{i}. **{feat.replace('_', ' ')}**: {advice}")
            else:
                st.success("No major weak areas found. Keep up the good work.")
            st.caption("Predictions are meant to support students, not to label them.")

# ---------------- Page 2: Student dashboard ----------------
elif page == "Student Dashboard":
    students = query("SELECT * FROM students")
    if students.empty:
        st.info("No students yet. Add one on the New Prediction page.")
    else:
        pick = st.selectbox("Select student", students["name"])
        sid = int(students.loc[students["name"] == pick, "id"].iloc[0])
        preds = query("SELECT * FROM predictions WHERE student_id=? ORDER BY id", (sid,))
        latest = preds.iloc[-1]

        c1, c2, c3 = st.columns(3)
        c1.metric("Latest predicted score", latest["predicted_score"])
        c2.metric("Risk level", latest["risk_level"])
        c3.metric("Predictions made", len(preds))

        left, right = st.columns(2)
        with left:
            st.markdown("**Performance trend**")
            fig = px.line(preds, x="date", y="predicted_score", markers=True)
            fig.add_hline(y=HIGH_CUTOFF, line_dash="dash", line_color="#d9534f")
            fig.add_hline(y=LOW_CUTOFF, line_dash="dash", line_color="#5cb85c")
            st.plotly_chart(fig, use_container_width=True)
        with right:
            b = query("SELECT * FROM behaviour_data WHERE student_id=? ORDER BY id DESC LIMIT 1", (sid,)).iloc[0]
            st.markdown("**Latest behavioural profile**")
            st.plotly_chart(radar({"Motivation": b["motivation"], "Parental": b["parental_involvement"],
                                   "Peers": b["peer_influence"], "Resources": b["access_to_resources"],
                                   "Teacher": b["teacher_quality"]}), use_container_width=True)

        st.markdown("**Record actual exam result**")
        with st.form("result_form"):
            opts = {f"#{r.id} | {r.date} | predicted {r.predicted_score}": int(r.id)
                    for r in preds.itertuples()}
            chosen = st.selectbox("Prediction", list(opts))
            actual = st.number_input("Actual final score", 0.0, 100.0, 60.0)
            if st.form_submit_button("Save result"):
                with conn() as c:
                    c.execute("INSERT INTO results(student_id,prediction_id,actual_score,date) "
                              "VALUES(?,?,?,?)", (sid, opts[chosen], actual,
                                                  datetime.datetime.now().strftime("%Y-%m-%d %H:%M")))
                st.success("Result saved.")

        st.markdown("**Prediction history**")
        st.dataframe(preds, use_container_width=True)

# ---------------- Page 3: Class view (teacher) ----------------
else:
    latest = query("""SELECT s.name, s.department, s.semester, p.predicted_score, p.risk_level
                      FROM predictions p JOIN students s ON s.id = p.student_id
                      WHERE p.id IN (SELECT MAX(id) FROM predictions GROUP BY student_id)""")
    if latest.empty:
        st.info("No data yet.")
    else:
        left, right = st.columns(2)
        with left:
            st.markdown("**Risk distribution**")
            counts = latest["risk_level"].value_counts().reset_index()
            counts.columns = ["Risk", "Students"]
            st.plotly_chart(px.bar(counts, x="Risk", y="Students", color="Risk",
                                   color_discrete_map=RISK_COLORS), use_container_width=True)
        with right:
            st.markdown("**High-risk students**")
            st.dataframe(latest[latest["risk_level"] == "High"], use_container_width=True)

        st.markdown("**Predicted vs actual score**")
        pa = query("""SELECT s.name, p.predicted_score, r.actual_score FROM results r
                      JOIN predictions p ON p.id = r.prediction_id
                      JOIN students s ON s.id = r.student_id""")
        if pa.empty:
            st.info("Enter actual results on the Student Dashboard page to see this chart.")
        else:
            fig = px.scatter(pa, x="actual_score", y="predicted_score", hover_name="name")
            lo, hi = float(pa[["actual_score", "predicted_score"]].min().min()), \
                     float(pa[["actual_score", "predicted_score"]].max().max())
            fig.add_trace(go.Scatter(x=[lo, hi], y=[lo, hi], mode="lines", name="Perfect prediction"))
            st.plotly_chart(fig, use_container_width=True)
            mae = (pa["predicted_score"] - pa["actual_score"]).abs().mean()
            st.metric("Mean absolute error", f"{mae:.2f} marks")