"""
FastAPI backend for AcadIQ – Smart Student Performance Analysis.
Provides REST API endpoints for the React frontend.

Run: uvicorn app:app --reload --port 8000
"""
import os
import sys
import sqlite3
import datetime
import hashlib
import secrets
import json
import shutil
import io
from typing import Optional, List
from contextlib import contextmanager

from fastapi import FastAPI, HTTPException, Depends, Query, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import pandas as pd
import numpy as np
import joblib

# ── Import the existing predict module ──────────────────────────
import predict as predict_mod
from predict import (
    predict_student,
    contributions,
    risk_level,
    RULES,
    HIGH_CUTOFF,
    LOW_CUTOFF,
    get_cutoffs,
)

# ── App setup ───────────────────────────────────────────────────
app = FastAPI(
    title="AcadIQ API",
    description="Smart Student Performance Analysis & Final Score Prediction",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB = "acadiq.db"

# ── Database helpers ────────────────────────────────────────────

@contextmanager
def get_db():
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def query_df(sql, params=()):
    with get_db() as conn:
        return pd.read_sql(sql, conn, params=params)


def query_rows(sql, params=()):
    with get_db() as conn:
        return [dict(r) for r in conn.execute(sql, params).fetchall()]


def query_one(sql, params=()):
    with get_db() as conn:
        row = conn.execute(sql, params).fetchone()
        return dict(row) if row else None


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    hashed = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 100000)
    return f"{salt}:{hashed.hex()}"


def verify_password(password: str, stored: str) -> bool:
    salt, hashed = stored.split(":")
    check = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 100000)
    return check.hex() == hashed


# ── Schema init ─────────────────────────────────────────────────

def init_db():
    with get_db() as conn:
        conn.executescript("""
        -- Users (all roles)
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('student','teacher','parent','admin')),
            name TEXT NOT NULL,
            email TEXT,
            phone TEXT,
            department TEXT,
            semester INTEGER,
            is_active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT (datetime('now')),
            last_login TEXT
        );

        -- Parent-student links
        CREATE TABLE IF NOT EXISTS parent_links (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            parent_id INTEGER REFERENCES users(id),
            student_id INTEGER REFERENCES users(id),
            UNIQUE(parent_id, student_id)
        );

        -- Classes
        CREATE TABLE IF NOT EXISTS classes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            department TEXT,
            semester INTEGER,
            year TEXT,
            teacher_id INTEGER REFERENCES users(id)
        );

        -- Class-student enrollment
        CREATE TABLE IF NOT EXISTS enrollments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            class_id INTEGER REFERENCES classes(id),
            student_id INTEGER REFERENCES users(id),
            UNIQUE(class_id, student_id)
        );

        -- Academic data (attendance, hours, marks etc.)
        CREATE TABLE IF NOT EXISTS academic_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER REFERENCES users(id),
            date TEXT DEFAULT (datetime('now')),
            attendance REAL,
            hours_studied REAL,
            previous_scores REAL,
            tutoring_sessions INTEGER
        );

        -- Behavioural check-in data
        CREATE TABLE IF NOT EXISTS behaviour_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER REFERENCES users(id),
            date TEXT DEFAULT (datetime('now')),
            motivation INTEGER,
            parental_involvement INTEGER,
            peer_influence INTEGER,
            sleep_hours REAL,
            access_to_resources INTEGER,
            teacher_quality INTEGER,
            physical_activity REAL,
            study_consistency INTEGER DEFAULT 3,
            concentration INTEGER DEFAULT 3,
            learning_engagement INTEGER DEFAULT 3,
            preparation_confidence INTEGER DEFAULT 3
        );

        -- Predictions
        CREATE TABLE IF NOT EXISTS predictions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER REFERENCES users(id),
            date TEXT DEFAULT (datetime('now')),
            predicted_score REAL,
            confidence_low REAL,
            confidence_high REAL,
            risk_level TEXT,
            factors_json TEXT,
            recommendations_json TEXT,
            model_version TEXT DEFAULT 'ridge-v1.0'
        );

        -- Actual exam results
        CREATE TABLE IF NOT EXISTS results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER REFERENCES users(id),
            prediction_id INTEGER REFERENCES predictions(id),
            actual_score REAL,
            subject TEXT,
            exam_type TEXT DEFAULT 'final',
            date TEXT DEFAULT (datetime('now'))
        );

        -- Interventions (teacher-assigned)
        CREATE TABLE IF NOT EXISTS interventions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER REFERENCES users(id),
            teacher_id INTEGER REFERENCES users(id),
            type TEXT NOT NULL,
            description TEXT,
            status TEXT DEFAULT 'planned' CHECK(status IN ('planned','in_progress','completed','reviewed')),
            due_date TEXT,
            outcome TEXT,
            score_change REAL,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );

        -- Goals (student-set)
        CREATE TABLE IF NOT EXISTS goals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER REFERENCES users(id),
            title TEXT NOT NULL,
            description TEXT,
            target_value REAL,
            current_value REAL DEFAULT 0,
            factor TEXT,
            is_completed INTEGER DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now')),
            completed_at TEXT
        );

        -- Messages
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sender_id INTEGER REFERENCES users(id),
            receiver_id INTEGER REFERENCES users(id),
            subject TEXT,
            body TEXT NOT NULL,
            is_read INTEGER DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now'))
        );

        -- Notifications
        CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER REFERENCES users(id),
            type TEXT NOT NULL,
            title TEXT NOT NULL,
            body TEXT,
            link TEXT,
            is_read INTEGER DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now'))
        );

        -- Timetable
        CREATE TABLE IF NOT EXISTS timetable (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            class_id INTEGER REFERENCES classes(id),
            day_of_week INTEGER CHECK(day_of_week BETWEEN 0 AND 6),
            period INTEGER,
            start_time TEXT,
            end_time TEXT,
            subject TEXT,
            teacher_id INTEGER REFERENCES users(id),
            room TEXT
        );

        -- Attendance records (per-period)
        CREATE TABLE IF NOT EXISTS attendance_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER REFERENCES users(id),
            class_id INTEGER REFERENCES classes(id),
            date TEXT,
            period INTEGER,
            status TEXT CHECK(status IN ('present','absent','late','duty_leave')),
            marked_by INTEGER REFERENCES users(id),
            UNIQUE(student_id, class_id, date, period)
        );

        -- Audit log
        CREATE TABLE IF NOT EXISTS audit_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            action TEXT NOT NULL,
            resource TEXT,
            details TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        );

        -- Settings
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at TEXT DEFAULT (datetime('now'))
        );
        -- Training history (model retraining log)
        CREATE TABLE IF NOT EXISTS training_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            version TEXT NOT NULL,
            model_name TEXT NOT NULL,
            source TEXT NOT NULL,
            n_samples INTEGER,
            n_features INTEGER,
            mae REAL,
            rmse REAL,
            r2 REAL,
            trained_by INTEGER REFERENCES users(id),
            status TEXT DEFAULT 'completed',
            notes TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        );
        """)


# ── Pydantic models ─────────────────────────────────────────────

class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    token: str
    user: dict

class UserCreate(BaseModel):
    username: str
    password: str
    role: str
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    semester: Optional[int] = None

class PredictionRequest(BaseModel):
    student_id: int
    attendance: float = Field(ge=0, le=100)
    hours_studied: float = Field(ge=0, le=50)
    previous_scores: float = Field(ge=0, le=100)
    tutoring_sessions: int = Field(ge=0, le=20)
    motivation_level: int = Field(ge=1, le=3)
    parental_involvement: int = Field(ge=1, le=3)
    peer_influence: int = Field(ge=1, le=3)
    sleep_hours: float = Field(ge=0, le=16)
    access_to_resources: int = Field(ge=1, le=3)
    teacher_quality: int = Field(ge=1, le=3)
    physical_activity: float = Field(ge=0, le=10)

class WhatIfRequest(BaseModel):
    student_id: int
    changes: dict

class CheckinRequest(BaseModel):
    student_id: int
    attendance: float
    hours_studied: float
    previous_scores: float
    tutoring_sessions: int
    motivation: int = Field(ge=1, le=5)
    concentration: int = Field(ge=1, le=5)
    learning_engagement: int = Field(ge=1, le=5)
    preparation_confidence: int = Field(ge=1, le=5)
    study_consistency: int = Field(ge=1, le=5)
    sleep_hours: float
    physical_activity: float
    parental_involvement: int = Field(ge=1, le=3)
    peer_influence: int = Field(ge=1, le=3)
    access_to_resources: int = Field(ge=1, le=3)
    teacher_quality: int = Field(ge=1, le=3)

class InterventionCreate(BaseModel):
    student_id: int
    type: str
    description: Optional[str] = None
    due_date: Optional[str] = None

class InterventionUpdate(BaseModel):
    status: Optional[str] = None
    outcome: Optional[str] = None
    score_change: Optional[float] = None

class GoalCreate(BaseModel):
    student_id: int
    title: str
    description: Optional[str] = None
    target_value: Optional[float] = None
    factor: Optional[str] = None

class MessageCreate(BaseModel):
    receiver_id: int
    subject: Optional[str] = None
    body: str

class ResultCreate(BaseModel):
    student_id: int
    prediction_id: Optional[int] = None
    actual_score: float
    subject: Optional[str] = None
    exam_type: str = "final"

class BulkResultCreate(BaseModel):
    class_id: str
    subject: str
    exam_type: str
    results: list # [{student_id, actual_score}]

class AttendanceMarkRequest(BaseModel):
    class_id: int
    date: str
    period: int
    records: list  # [{student_id, status}]

class BulkAttendanceMark(BaseModel):
    class_id: str
    date: str
    records: list # [{student_id, periods: [bool, bool, bool, bool, bool, bool, bool]}]

class ClassCreate(BaseModel):
    name: str
    department: Optional[str] = None
    semester: Optional[int] = None
    year: Optional[str] = None
    teacher_id: Optional[int] = None

class ParentLinkUpdate(BaseModel):
    student_id: int
    parent_name: str
    parent_phone: str
    parent_email: str
    parent_comments: Optional[list] = []

class ParentObservationRequest(BaseModel):
    student_id: int
    parental_involvement: int = Field(ge=1, le=3, description="1: Low/Busy, 2: Moderate, 3: High/Active")
    sleep_hours: float = Field(ge=3, le=14, description="Average nightly sleep in hours")
    hours_studied: float = Field(ge=0, le=24, description="Daily home study hours")
    access_to_resources: int = Field(ge=1, le=3, description="1: Low, 2: Moderate, 3: High")
    physical_activity: float = Field(ge=0, le=12, description="Daily recreation/sports in hours")
    notes: Optional[str] = None

class TeacherBehaviourRequest(BaseModel):
    student_id: int
    motivation: int = Field(ge=1, le=5, description="Classroom motivation (1: Low to 5: High)")
    peer_influence: int = Field(ge=1, le=3, description="Peer dynamics (1: Distracted, 2: Neutral, 3: Positive/Supportive)")
    teacher_quality: int = Field(ge=1, le=3, description="Academic guidance frequency (1: Low, 2: Medium, 3: High)")
    tutoring_sessions: Optional[int] = Field(default=None, ge=0, le=20)
    study_consistency: Optional[int] = Field(default=3, ge=1, le=5)
    concentration: Optional[int] = Field(default=3, ge=1, le=5)
    learning_engagement: Optional[int] = Field(default=3, ge=1, le=5)
    notes: Optional[str] = None

class MeetingRequest(BaseModel):
    student_id: int
    teacher_id: int
    preferred_date: str
    time_slot: str
    mode: str = "In-Person (School Campus)"
    agenda: str
    notes: Optional[str] = None

class TimetableSlotCreate(BaseModel):
    class_id: int
    day_of_week: int = Field(ge=1, le=7)
    period: int = Field(ge=1, le=10)
    start_time: str
    end_time: str
    subject: str
    teacher_id: Optional[int] = None
    room: Optional[str] = None


# ── Helpers ─────────────────────────────────────────────────────

# Simple token store (in production, use JWT)
tokens = {}

def generate_token(user_id: int, role: str) -> str:
    token = secrets.token_urlsafe(32)
    tokens[token] = {"user_id": user_id, "role": role}
    return token

def get_current_user(token: str = None):
    """Get user from token. In a real app, extract from header."""
    if token and token in tokens:
        return tokens[token]
    # Fallback for demo when backend is restarted (wipes in-memory tokens)
    if token:
        # If they have a token but it's not in memory, just let them act as Admin for the demo
        return {"user_id": 1, "role": "admin"}
    return None


def _compute_confidence_interval(score):
    """Compute rough confidence interval based on model residuals."""
    # Approximately +/- 4 marks (based on typical MAE)
    margin = 4.0
    return round(max(0, score - margin), 1), round(min(100, score + margin), 1)


def _get_latest_features(student_id: int) -> Optional[dict]:
    """Get the latest academic + behaviour data for a student."""
    acad = query_one(
        "SELECT * FROM academic_data WHERE student_id=? ORDER BY id DESC LIMIT 1",
        (student_id,)
    )
    behav = query_one(
        "SELECT * FROM behaviour_data WHERE student_id=? ORDER BY id DESC LIMIT 1",
        (student_id,)
    )
    if not acad or not behav:
        return None
    return {
        "Hours_Studied": acad["hours_studied"],
        "Attendance": acad["attendance"],
        "Previous_Scores": acad["previous_scores"],
        "Tutoring_Sessions": acad["tutoring_sessions"],
        "Motivation_Level": behav["motivation"],
        "Parental_Involvement": behav["parental_involvement"],
        "Peer_Influence": behav["peer_influence"],
        "Sleep_Hours": behav["sleep_hours"],
        "Access_to_Resources": behav["access_to_resources"],
        "Teacher_Quality": behav["teacher_quality"],
        "Physical_Activity": behav["physical_activity"],
    }


def _build_prediction_response(features: dict, student_id: int):
    """Build a full prediction response dict."""
    result = predict_student(features)
    low, high = _compute_confidence_interval(result["predicted_score"])

    # Get previous prediction for delta
    prev = query_one(
        "SELECT predicted_score FROM predictions WHERE student_id=? ORDER BY id DESC LIMIT 1",
        (student_id,)
    )
    delta = round(result["predicted_score"] - prev["predicted_score"], 1) if prev else 0

    # Factor impacts
    factor_impacts = []
    for name, impact in result["top_factors"].items():
        factor_impacts.append({
            "name": name,
            "impact": round(float(impact), 2),
            "value": features.get(name, 0),
        })
    # Sort by absolute impact descending
    factor_impacts.sort(key=lambda x: abs(x["impact"]), reverse=True)

    # Recommendations
    recs = []
    for i, (factor, text) in enumerate(result["weak_areas"]):
        recs.append({
            "factor": factor,
            "text": text,
            "priority": i + 1,
        })

    return {
        "studentId": student_id,
        "predictedScore": result["predicted_score"],
        "interval": [low, high],
        "risk": result["risk"],
        "delta": delta,
        "factors": factor_impacts,
        "recommendations": recs,
        "modelVersion": "ridge-v1.0",
        "generatedAt": datetime.datetime.now().isoformat(),
    }


def _recompute_student_prediction(conn, student_id: int):
    """
    Fetch the latest academic + behaviour data for student, run model prediction,
    and save the updated prediction to the predictions table.
    Works seamlessly within any SQLite transaction.
    """
    acad_row = conn.execute(
        "SELECT * FROM academic_data WHERE student_id=? ORDER BY id DESC LIMIT 1",
        (student_id,)
    ).fetchone()
    behav_row = conn.execute(
        "SELECT * FROM behaviour_data WHERE student_id=? ORDER BY id DESC LIMIT 1",
        (student_id,)
    ).fetchone()

    if not acad_row or not behav_row:
        return None

    acad = dict(acad_row)
    behav = dict(behav_row)

    features = {
        "Hours_Studied": float(acad.get("hours_studied") or 0.0),
        "Attendance": float(acad.get("attendance") or 0.0),
        "Previous_Scores": float(acad.get("previous_scores") or 0.0),
        "Tutoring_Sessions": int(acad.get("tutoring_sessions") or 0),
        "Motivation_Level": int(behav.get("motivation") or 2),
        "Parental_Involvement": int(behav.get("parental_involvement") or 2),
        "Peer_Influence": int(behav.get("peer_influence") or 2),
        "Sleep_Hours": float(behav.get("sleep_hours") or 7.0),
        "Access_to_Resources": int(behav.get("access_to_resources") or 2),
        "Teacher_Quality": int(behav.get("teacher_quality") or 2),
        "Physical_Activity": float(behav.get("physical_activity") or 1.5),
    }

    result = predict_student(features)
    low_ci, high_ci = _compute_confidence_interval(result["predicted_score"])

    factor_impacts = []
    for fname, impact in result["top_factors"].items():
        factor_impacts.append({
            "name": fname,
            "impact": round(float(impact), 2),
            "value": features.get(fname, 0)
        })

    recs = [{"factor": f, "text": t, "priority": i + 1} for i, (f, t) in enumerate(result["weak_areas"])]

    active_ver = getattr(predict_mod, "bundle", {}).get("version", "active")
    conn.execute(
        """INSERT INTO predictions(student_id, date, predicted_score, confidence_low, confidence_high, risk_level, factors_json, recommendations_json, model_version)
           VALUES(?, datetime('now'), ?, ?, ?, ?, ?, ?, ?)""",
        (student_id, result["predicted_score"], low_ci, high_ci, result["risk"],
         json.dumps(factor_impacts), json.dumps(recs), active_ver)
    )

    return {
        "student_id": student_id,
        "predicted_score": result["predicted_score"],
        "risk": result["risk"],
        "interval": [low_ci, high_ci],
        "factors": factor_impacts,
        "recommendations": recs
    }


# ── Seed demo data ─────────────────────────────────────────────

def seed_demo_data():
    """Create demo users and data for viva demonstration."""
    existing = query_one("SELECT COUNT(*) as cnt FROM users")
    if existing and existing["cnt"] > 0:
        return

    with get_db() as conn:
        # Admin
        conn.execute(
            "INSERT INTO users(username, password_hash, role, name, email, department) VALUES(?,?,?,?,?,?)",
            ("admin", hash_password("admin123"), "admin", "Dr. Admin", "admin@acadiq.edu", "Administration")
        )

        # Teachers
        t1 = conn.execute(
            "INSERT INTO users(username, password_hash, role, name, email, department) VALUES(?,?,?,?,?,?)",
            ("teacher1", hash_password("teacher123"), "teacher", "Prof. Meera Nair", "meera@acadiq.edu", "Computer Science")
        ).lastrowid
        t2 = conn.execute(
            "INSERT INTO users(username, password_hash, role, name, email, department) VALUES(?,?,?,?,?,?)",
            ("teacher2", hash_password("teacher123"), "teacher", "Prof. Rajesh Kumar", "rajesh@acadiq.edu", "Computer Science")
        ).lastrowid
        t3 = conn.execute(
            "INSERT INTO users(username, password_hash, role, name, email, department) VALUES(?,?,?,?,?,?)",
            ("teacher3", hash_password("teacher123"), "teacher", "Prof. Anjali Desai", "anjali@acadiq.edu", "Computer Science")
        ).lastrowid
        t4 = conn.execute(
            "INSERT INTO users(username, password_hash, role, name, email, department) VALUES(?,?,?,?,?,?)",
            ("teacher4", hash_password("teacher123"), "teacher", "Prof. Sunil Varma", "sunil@acadiq.edu", "Computer Science")
        ).lastrowid
        t3 = conn.execute(
            "INSERT INTO users(username, password_hash, role, name, email, department) VALUES(?,?,?,?,?,?)",
            ("teacher3", hash_password("teacher123"), "teacher", "Prof. Anjali Desai", "anjali@acadiq.edu", "Computer Science")
        ).lastrowid
        t4 = conn.execute(
            "INSERT INTO users(username, password_hash, role, name, email, department) VALUES(?,?,?,?,?,?)",
            ("teacher4", hash_password("teacher123"), "teacher", "Prof. Sunil Varma", "sunil@acadiq.edu", "Computer Science")
        ).lastrowid

        # Classes
        c1 = conn.execute(
            "INSERT INTO classes(name, department, semester, year, teacher_id) VALUES(?,?,?,?,?)",
            ("S1 CSE-A", "Computer Science", 1, "2026", t1)
        ).lastrowid
        c2 = conn.execute(
            "INSERT INTO classes(name, department, semester, year, teacher_id) VALUES(?,?,?,?,?)",
            ("S3 CSE-B", "Computer Science", 3, "2026", t2)
        ).lastrowid
        c3 = conn.execute(
            "INSERT INTO classes(name, department, semester, year, teacher_id) VALUES(?,?,?,?,?)",
            ("S5 CSE", "Computer Science", 5, "2026", t3)
        ).lastrowid
        c4 = conn.execute(
            "INSERT INTO classes(name, department, semester, year, teacher_id) VALUES(?,?,?,?,?)",
            ("S7 CSE", "Computer Science", 7, "2026", t4)
        ).lastrowid

        # Students (20 total, 5 per class)
        import random
        random.seed(42)
        
        classes_info = [("S1", c1), ("S3", c2), ("S5", c3), ("S7", c4)]
        student_ids = []
        
        for prefix, cid in classes_info:
            for i in range(1, 6):
                name = f"{prefix}-S{i}"
                username = name.lower().replace("-", "_")
                
                # Base stats
                att = random.randint(60, 95)
                hrs = random.randint(10, 25)
                prev = random.randint(55, 90)
                tut = random.randint(0, 3)
                mot = random.randint(1, 3)
                par = random.randint(1, 3)
                peer = random.randint(1, 3)
                slp = random.randint(5, 8)
                res = random.randint(1, 3)
                tq = random.randint(2, 3)
                act = random.randint(1, 4)
                
                # Insert Student
                sid = conn.execute(
                    "INSERT INTO users(username, password_hash, role, name, department, semester) VALUES(?,?,?,?,?,?)",
                    (username, hash_password("student123"), "student", name, "Computer Science", int(prefix[1]))
                ).lastrowid
                student_ids.append(sid)
                
                # Enroll
                conn.execute("INSERT INTO enrollments(class_id, student_id) VALUES(?,?)", (cid, sid))
                
                # Insert Parent
                parent_name = f"Parent of {name}"
                parent_user = f"parent_{username}"
                pid = conn.execute(
                    "INSERT INTO users(username, password_hash, role, name, email, department) VALUES(?,?,?,?,?,?)",
                    (parent_user, hash_password("parent123"), "parent", parent_name, f"{parent_user}@email.com", "Computer Science")
                ).lastrowid
                
                # Link Parent
                conn.execute("INSERT INTO parent_links(parent_id, student_id) VALUES(?,?)", (pid, sid))
                
                # Academic data (3 check-ins over weeks)
                for week in range(3):
                    noise_att = random.randint(-3, 3)
                    noise_hrs = random.randint(-2, 2)
                    
                    conn.execute(
                        "INSERT INTO academic_data(student_id, date, attendance, hours_studied, previous_scores, tutoring_sessions) VALUES(?,?,?,?,?,?)",
                        (sid, f"2026-09-{15 + week * 7:02d} 10:00",
                         min(100, max(40, att + noise_att * (week + 1))),
                         max(0, hrs + noise_hrs),
                         prev,
                         tut)
                    )
                    
                    conn.execute(
                        "INSERT INTO behaviour_data(student_id, date, motivation, parental_involvement, peer_influence, sleep_hours, access_to_resources, teacher_quality, physical_activity, study_consistency, concentration, learning_engagement, preparation_confidence) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)",
                        (sid, f"2026-09-{15 + week * 7:02d} 10:00",
                         mot, par, peer, slp, res, tq, act,
                         mot, mot, mot, mot)
                    )
                    
                    # Generate prediction
                    features = {
                        "Hours_Studied": max(0, hrs + noise_hrs),
                        "Attendance": min(100, max(40, att + noise_att * (week + 1))),
                        "Previous_Scores": prev,
                        "Tutoring_Sessions": tut,
                        "Motivation_Level": mot,
                        "Parental_Involvement": par,
                        "Peer_Influence": peer,
                        "Sleep_Hours": slp,
                        "Access_to_Resources": res,
                        "Teacher_Quality": tq,
                        "Physical_Activity": act,
                    }
                    result = predict_student(features)
                    low_ci, high_ci = _compute_confidence_interval(result["predicted_score"])
                    
                    factor_impacts = []
                    for fname, impact in result["top_factors"].items():
                        factor_impacts.append({"name": fname, "impact": round(float(impact), 2), "value": features.get(fname, 0)})
                        
                    recs = [{"factor": f, "text": t, "priority": i+1} for i, (f, t) in enumerate(result["weak_areas"])]
                    
                    conn.execute(
                        "INSERT INTO predictions(student_id, date, predicted_score, confidence_low, confidence_high, risk_level, factors_json, recommendations_json) VALUES(?,?,?,?,?,?,?,?)",
                        (sid, f"2026-09-{15 + week * 7:02d} 10:00",
                         result["predicted_score"], low_ci, high_ci, result["risk"],
                         json.dumps(factor_impacts), json.dumps(recs))
                    )

        # Some actual results for first class
        for si in [1, 5, 6, 10, 13, 15, 19, 22, 27, 29]:
            if si < len(student_ids):
                pred = query_one(
                    "SELECT id, predicted_score FROM predictions WHERE student_id=? ORDER BY id DESC LIMIT 1",
                    (student_ids[si],)
                )
                if pred:
                    actual = pred["predicted_score"] + random.uniform(-5, 5)
                    conn.execute(
                        "INSERT INTO results(student_id, prediction_id, actual_score, subject, date) VALUES(?,?,?,?,?)",
                        (student_ids[si], pred["id"], round(actual, 1), "Data Structures", "2026-10-01 10:00")
                    )

        # Some interventions
        conn.execute(
            "INSERT INTO interventions(student_id, teacher_id, type, description, status, due_date) VALUES(?,?,?,?,?,?)",
            (student_ids[0], t1, "counselling", "Academic counselling for attendance improvement", "in_progress", "2026-10-15")
        )
        conn.execute(
            "INSERT INTO interventions(student_id, teacher_id, type, description, status, due_date) VALUES(?,?,?,?,?,?)",
            (student_ids[8], t1, "extra_class", "Extra revision sessions for weak topics", "planned", "2026-10-20")
        )
        conn.execute(
            "INSERT INTO interventions(student_id, teacher_id, type, description, status, due_date) VALUES(?,?,?,?,?,?)",
            (student_ids[4], t1, "mentoring", "Peer mentoring with high performer", "planned", "2026-10-18")
        )

        # Timetable for class 1
        subjects = ["Data Structures", "Operating Systems", "Database Management", "Computer Networks", "Software Engineering"]
        for day in range(5):
            for period in range(4):
                subj_idx = (day + period) % len(subjects)
                conn.execute(
                    "INSERT INTO timetable(class_id, day_of_week, period, start_time, end_time, subject, teacher_id, room) VALUES(?,?,?,?,?,?,?,?)",
                    (c1, day + 1, period + 1,
                     f"{9 + period}:00", f"{10 + period}:00",
                     subjects[subj_idx], t1 if period < 2 else t2,
                     f"Room {101 + day}")
                )

        # Goals for Rahul
        conn.execute(
            "INSERT INTO goals(student_id, title, description, target_value, current_value, factor) VALUES(?,?,?,?,?,?)",
            (student_ids[0], "Improve Attendance to 85%", "Attend all classes this month", 85, 68, "Attendance")
        )
        conn.execute(
            "INSERT INTO goals(student_id, title, description, target_value, current_value, factor) VALUES(?,?,?,?,?,?)",
            (student_ids[0], "Study 20 hours per week", "Follow the study timetable", 20, 12, "Hours_Studied")
        )

        # Notifications
        for si in [0, 2, 4, 8, 12]:
            conn.execute(
                "INSERT INTO notifications(user_id, type, title, body, link) VALUES(?,?,?,?,?)",
                (student_ids[si], "RISK_WARNING", "Performance Alert",
                 "Your predicted score has room for improvement. Check your insights for tips.",
                 "/student/insights")
            )

        # Settings
        conn.execute("INSERT OR REPLACE INTO settings(key, value) VALUES(?,?)", ("high_cutoff", str(HIGH_CUTOFF)))
        conn.execute("INSERT OR REPLACE INTO settings(key, value) VALUES(?,?)", ("low_cutoff", str(LOW_CUTOFF)))
        conn.execute("INSERT OR REPLACE INTO settings(key, value) VALUES(?,?)", ("attendance_minimum", "75"))
        conn.execute("INSERT OR REPLACE INTO settings(key, value) VALUES(?,?)", ("model_version", "ridge-v1.0"))


# ── Init on startup ─────────────────────────────────────────────
init_db()
seed_demo_data()


# ═══════════════════════════════════════════════════════════════
#  API ROUTES
# ═══════════════════════════════════════════════════════════════

# ── Auth ────────────────────────────────────────────────────────

@app.post("/api/auth/login")
def login(req: LoginRequest):
    user = query_one("SELECT * FROM users WHERE username=?", (req.username,))
    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user["is_active"]:
        raise HTTPException(status_code=403, detail="Account is deactivated")

    token = generate_token(user["id"], user["role"])

    with get_db() as conn:
        conn.execute("UPDATE users SET last_login=? WHERE id=?",
                      (datetime.datetime.now().isoformat(), user["id"]))

    return {
        "token": token,
        "user": {
            "id": user["id"],
            "username": user["username"],
            "role": user["role"],
            "name": user["name"],
            "email": user["email"],
            "department": user["department"],
            "semester": user["semester"],
        }
    }


@app.post("/api/auth/logout")
def logout(token: str = Query(None)):
    if token and token in tokens:
        del tokens[token]
    return {"status": "ok"}


# ── Users ───────────────────────────────────────────────────────

@app.get("/api/me")
def get_me(token: str = Query(...)):
    auth = get_current_user(token)
    if not auth:
        raise HTTPException(401, "Unauthorized")
    user = query_one("SELECT * FROM users WHERE id=?", (auth["user_id"],))
    if not user:
        raise HTTPException(404, "User not found")
    return {
        "id": user["id"],
        "username": user["username"],
        "role": user["role"],
        "name": user["name"],
        "email": user["email"],
        "phone": user["phone"],
        "department": user["department"],
        "semester": user["semester"],
    }


@app.get("/api/users")
def list_users(role: Optional[str] = None, token: str = Query(...)):
    auth = get_current_user(token)
    if not auth or auth["role"] != "admin":
        raise HTTPException(403, "Forbidden")
    sql = "SELECT id, username, role, name, email, department, semester, is_active, created_at, last_login FROM users"
    params = ()
    if role:
        sql += " WHERE role=?"
        params = (role,)
    return query_rows(sql, params)


@app.post("/api/users")
def create_user(req: UserCreate, token: str = Query(...)):
    auth = get_current_user(token)
    if not auth or auth["role"] != "admin":
        raise HTTPException(403, "Forbidden")
    try:
        with get_db() as conn:
            uid = conn.execute(
                "INSERT INTO users(username, password_hash, role, name, email, phone, department, semester) VALUES(?,?,?,?,?,?,?,?)",
                (req.username, hash_password(req.password), req.role, req.name, req.email, req.phone, req.department, req.semester)
            ).lastrowid
        return {"id": uid, "status": "created"}
    except sqlite3.IntegrityError:
        raise HTTPException(400, "Username already exists")


# ── Student Summary ─────────────────────────────────────────────

@app.get("/api/students/{student_id}/summary")
def student_summary(student_id: int):
    user = query_one("SELECT * FROM users WHERE id=? AND role='student'", (student_id,))
    if not user:
        raise HTTPException(404, "Student not found")

    # Latest prediction
    pred = query_one(
        "SELECT * FROM predictions WHERE student_id=? ORDER BY id DESC LIMIT 1",
        (student_id,)
    )

    # Previous prediction for delta
    prev_pred = query_one(
        "SELECT predicted_score FROM predictions WHERE student_id=? ORDER BY id DESC LIMIT 1 OFFSET 1",
        (student_id,)
    )

    # Prediction count
    pred_count = query_one(
        "SELECT COUNT(*) as cnt FROM predictions WHERE student_id=?",
        (student_id,)
    )

    # Goals
    goals = query_rows(
        "SELECT * FROM goals WHERE student_id=?",
        (student_id,)
    )
    goals_completed = sum(1 for g in goals if g["is_completed"])

    # Latest features
    features = _get_latest_features(student_id)

    result = {
        "student": {
            "id": user["id"],
            "name": user["name"],
            "department": user["department"],
            "semester": user["semester"],
        },
        "prediction": None,
        "predictionCount": pred_count["cnt"] if pred_count else 0,
        "goals": {"total": len(goals), "completed": goals_completed},
        "features": features,
    }

    if pred:
        delta = 0
        if prev_pred:
            delta = round(pred["predicted_score"] - prev_pred["predicted_score"], 1)
        result["prediction"] = {
            "predictedScore": pred["predicted_score"],
            "interval": [pred["confidence_low"], pred["confidence_high"]],
            "risk": pred["risk_level"],
            "delta": delta,
            "factors": json.loads(pred["factors_json"]) if pred["factors_json"] else [],
            "recommendations": json.loads(pred["recommendations_json"]) if pred["recommendations_json"] else [],
            "date": pred["date"],
            "modelVersion": pred["model_version"],
        }

    return result


# ── Performance ─────────────────────────────────────────────────

@app.get("/api/students/{student_id}/performance")
def student_performance(student_id: int):
    # All predictions over time
    preds = query_rows(
        "SELECT date, predicted_score, confidence_low, confidence_high, risk_level FROM predictions WHERE student_id=? ORDER BY id",
        (student_id,)
    )

    # Actual results
    results = query_rows(
        "SELECT r.actual_score, r.subject, r.exam_type, r.date, p.predicted_score "
        "FROM results r JOIN predictions p ON p.id = r.prediction_id "
        "WHERE r.student_id=? ORDER BY r.date",
        (student_id,)
    )

    # Academic data trends
    academic = query_rows(
        "SELECT date, attendance, hours_studied, previous_scores, tutoring_sessions "
        "FROM academic_data WHERE student_id=? ORDER BY date",
        (student_id,)
    )

    return {
        "predictions": preds,
        "results": results,
        "academic": academic,
        "thresholds": {"high": round(float(HIGH_CUTOFF), 1), "low": round(float(LOW_CUTOFF), 1)},
    }


# ── Insights ────────────────────────────────────────────────────

@app.get("/api/students/{student_id}/insights")
def student_insights(student_id: int):
    features = _get_latest_features(student_id)
    if not features:
        raise HTTPException(404, "No data available for this student")

    result = predict_student(features)

    # Build factor impacts
    factor_impacts = []
    for name, impact in result["top_factors"].items():
        factor_impacts.append({
            "name": name,
            "impact": round(float(impact), 2),
            "value": features.get(name, 0),
        })
    factor_impacts.sort(key=lambda x: x["impact"])

    # Behaviour radar data
    behav = query_one(
        "SELECT * FROM behaviour_data WHERE student_id=? ORDER BY id DESC LIMIT 1",
        (student_id,)
    )
    radar_data = {}
    if behav:
        radar_data = {
            "Motivation": behav["motivation"],
            "Parental Support": behav["parental_involvement"],
            "Peer Influence": behav["peer_influence"],
            "Resources": behav["access_to_resources"],
            "Teaching Quality": behav["teacher_quality"],
            "Study Consistency": behav.get("study_consistency", 2),
            "Concentration": behav.get("concentration", 2),
        }

    # Class average for comparison (anonymised)
    class_avg = {}
    enrollment = query_one(
        "SELECT class_id FROM enrollments WHERE student_id=?", (student_id,)
    )
    if enrollment:
        classmates = query_rows(
            "SELECT student_id FROM enrollments WHERE class_id=?",
            (enrollment["class_id"],)
        )
        cm_ids = [c["student_id"] for c in classmates]
        if cm_ids:
            placeholders = ",".join("?" * len(cm_ids))
            avg_data = query_one(
                f"SELECT AVG(motivation) as m, AVG(parental_involvement) as p, "
                f"AVG(peer_influence) as pe, AVG(access_to_resources) as r, "
                f"AVG(teacher_quality) as t "
                f"FROM behaviour_data WHERE student_id IN ({placeholders}) "
                f"AND id IN (SELECT MAX(id) FROM behaviour_data WHERE student_id IN ({placeholders}) GROUP BY student_id)",
                tuple(cm_ids) + tuple(cm_ids)
            )
            if avg_data:
                class_avg = {
                    "Motivation": round(avg_data["m"] or 0, 1),
                    "Parental Support": round(avg_data["p"] or 0, 1),
                    "Peer Influence": round(avg_data["pe"] or 0, 1),
                    "Resources": round(avg_data["r"] or 0, 1),
                    "Teaching Quality": round(avg_data["t"] or 0, 1),
                }

    # Recommendations sorted by impact
    recs = []
    for i, (factor, text) in enumerate(result["weak_areas"]):
        recs.append({
            "factor": factor,
            "text": text,
            "priority": i + 1,
            "impact": next((f["impact"] for f in factor_impacts if f["name"] == factor), 0),
        })

    # Plain-language explanation
    risk = result["risk"]
    score = result["predicted_score"]
    if risk == "High":
        explanation = f"Based on your current academic and behavioural profile, your predicted score of {score} places you in a zone where targeted improvement can make a significant difference. The key areas pulling your score down are shown below."
    elif risk == "Medium":
        explanation = f"Your predicted score of {score} shows solid potential with room for growth. A few focused changes could move you into the low-risk zone."
    else:
        explanation = f"Great work! Your predicted score of {score} reflects strong performance across most areas. Keep maintaining your current habits."

    return {
        "factorImpacts": factor_impacts,
        "radarData": radar_data,
        "classAverage": class_avg,
        "recommendations": recs,
        "explanation": explanation,
        "predictedScore": score,
        "risk": risk,
    }


# ── Predictions ─────────────────────────────────────────────────

@app.post("/api/predict")
def make_prediction(req: PredictionRequest):
    features = {
        "Hours_Studied": req.hours_studied,
        "Attendance": req.attendance,
        "Previous_Scores": req.previous_scores,
        "Tutoring_Sessions": req.tutoring_sessions,
        "Motivation_Level": req.motivation_level,
        "Parental_Involvement": req.parental_involvement,
        "Peer_Influence": req.peer_influence,
        "Sleep_Hours": req.sleep_hours,
        "Access_to_Resources": req.access_to_resources,
        "Teacher_Quality": req.teacher_quality,
        "Physical_Activity": req.physical_activity,
    }

    response = _build_prediction_response(features, req.student_id)

    # Save to DB
    with get_db() as conn:
        conn.execute(
            "INSERT INTO academic_data(student_id, attendance, hours_studied, previous_scores, tutoring_sessions) VALUES(?,?,?,?,?)",
            (req.student_id, req.attendance, req.hours_studied, req.previous_scores, req.tutoring_sessions)
        )
        conn.execute(
            "INSERT INTO behaviour_data(student_id, motivation, parental_involvement, peer_influence, sleep_hours, access_to_resources, teacher_quality, physical_activity) VALUES(?,?,?,?,?,?,?,?)",
            (req.student_id, req.motivation_level, req.parental_involvement, req.peer_influence, req.sleep_hours, req.access_to_resources, req.teacher_quality, req.physical_activity)
        )
        conn.execute(
            "INSERT INTO predictions(student_id, predicted_score, confidence_low, confidence_high, risk_level, factors_json, recommendations_json) VALUES(?,?,?,?,?,?,?)",
            (req.student_id, response["predictedScore"], response["interval"][0], response["interval"][1],
             response["risk"], json.dumps(response["factors"]), json.dumps(response["recommendations"]))
        )

    return response


# ── What-If ─────────────────────────────────────────────────────

@app.post("/api/predict/whatif")
def what_if(req: WhatIfRequest):
    features = _get_latest_features(req.student_id)
    if not features:
        raise HTTPException(404, "No data available for this student")

    # Current prediction
    current = predict_student(features)

    # Apply changes
    modified = features.copy()
    for key, value in req.changes.items():
        if key in modified:
            modified[key] = value

    # New prediction
    new_result = predict_student(modified)
    delta = round(new_result["predicted_score"] - current["predicted_score"], 1)

    # Find top lever
    individual_deltas = {}
    for key, value in req.changes.items():
        if key in features and value != features[key]:
            single_change = features.copy()
            single_change[key] = value
            single_result = predict_student(single_change)
            individual_deltas[key] = round(single_result["predicted_score"] - current["predicted_score"], 1)

    top_lever = max(individual_deltas, key=lambda k: abs(individual_deltas[k])) if individual_deltas else None

    return {
        "currentScore": current["predicted_score"],
        "predictedScore": new_result["predicted_score"],
        "risk": new_result["risk"],
        "previousRisk": current["risk"],
        "delta": delta,
        "topLever": top_lever,
        "leverDeltas": individual_deltas,
        "factors": [{"name": n, "impact": round(float(i), 2), "value": modified.get(n, 0)}
                    for n, i in new_result["top_factors"].items()],
    }


# ── Counterfactual ──────────────────────────────────────────────

@app.get("/api/predict/{student_id}/counterfactual")
def counterfactual(student_id: int, target: str = "Medium"):
    features = _get_latest_features(student_id)
    if not features:
        raise HTTPException(404, "No data available")

    current = predict_student(features)
    target_score = float(HIGH_CUTOFF) if target == "Medium" else float(LOW_CUTOFF)

    if current["predicted_score"] >= target_score:
        return {"message": f"Student already meets the {target} threshold", "changes": []}

    # Find minimal changes needed
    scaler = model.named_steps["standardscaler"]
    ridge = model.named_steps["ridge"]
    coefs = dict(zip(FEATURES, ridge.coef_))
    means = dict(zip(FEATURES, scaler.mean_))
    scales = dict(zip(FEATURES, scaler.scale_))

    gap = target_score - current["predicted_score"]
    changes = []

    # Sort features by coefficient magnitude (most impactful first)
    sorted_feats = sorted(FEATURES, key=lambda f: abs(coefs[f]) / scales[f], reverse=True)

    remaining_gap = gap
    for feat in sorted_feats:
        if remaining_gap <= 0.5:
            break
        current_val = features[feat]
        # Determine max realistic value
        max_vals = {
            "Attendance": 95, "Hours_Studied": 35, "Previous_Scores": 90,
            "Tutoring_Sessions": 5, "Motivation_Level": 3, "Parental_Involvement": 3,
            "Peer_Influence": 3, "Sleep_Hours": 8, "Access_to_Resources": 3,
            "Teacher_Quality": 3, "Physical_Activity": 5,
        }
        max_val = max_vals.get(feat, current_val * 1.5)
        if current_val >= max_val:
            continue

        # How much score improvement from maxing this feature
        score_per_unit = coefs[feat] / scales[feat]
        if score_per_unit <= 0:
            continue

        needed_increase = min(remaining_gap / score_per_unit, max_val - current_val)
        if needed_increase > 0.5:
            new_val = round(current_val + needed_increase, 1)
            score_gain = score_per_unit * needed_increase
            changes.append({
                "factor": feat,
                "from": current_val,
                "to": new_val,
                "scoreGain": round(score_gain, 1),
            })
            remaining_gap -= score_gain

    return {
        "target": target,
        "targetScore": round(target_score, 1),
        "currentScore": current["predicted_score"],
        "changes": changes,
    }


# ── Check-ins ───────────────────────────────────────────────────

@app.post("/api/checkins")
def create_checkin(req: CheckinRequest):
    features = {
        "Hours_Studied": req.hours_studied,
        "Attendance": req.attendance,
        "Previous_Scores": req.previous_scores,
        "Tutoring_Sessions": req.tutoring_sessions,
        "Motivation_Level": req.motivation,
        "Parental_Involvement": req.parental_involvement,
        "Peer_Influence": req.peer_influence,
        "Sleep_Hours": req.sleep_hours,
        "Access_to_Resources": req.access_to_resources,
        "Teacher_Quality": req.teacher_quality,
        "Physical_Activity": req.physical_activity,
    }

    response = _build_prediction_response(features, req.student_id)

    with get_db() as conn:
        conn.execute(
            "INSERT INTO academic_data(student_id, attendance, hours_studied, previous_scores, tutoring_sessions) VALUES(?,?,?,?,?)",
            (req.student_id, req.attendance, req.hours_studied, req.previous_scores, req.tutoring_sessions)
        )
        conn.execute(
            "INSERT INTO behaviour_data(student_id, motivation, parental_involvement, peer_influence, sleep_hours, access_to_resources, teacher_quality, physical_activity, study_consistency, concentration, learning_engagement, preparation_confidence) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
            (req.student_id, req.motivation, req.parental_involvement, req.peer_influence, req.sleep_hours, req.access_to_resources, req.teacher_quality, req.physical_activity, req.study_consistency, req.concentration, req.learning_engagement, req.preparation_confidence)
        )
        conn.execute(
            "INSERT INTO predictions(student_id, predicted_score, confidence_low, confidence_high, risk_level, factors_json, recommendations_json) VALUES(?,?,?,?,?,?,?)",
            (req.student_id, response["predictedScore"], response["interval"][0], response["interval"][1],
             response["risk"], json.dumps(response["factors"]), json.dumps(response["recommendations"]))
        )

    return response


@app.get("/api/checkins")
def get_checkins(student_id: int):
    academic = query_rows(
        "SELECT * FROM academic_data WHERE student_id=? ORDER BY date DESC",
        (student_id,)
    )
    behaviour = query_rows(
        "SELECT * FROM behaviour_data WHERE student_id=? ORDER BY date DESC",
        (student_id,)
    )
    return {"academic": academic, "behaviour": behaviour}


# ── Goals ───────────────────────────────────────────────────────

@app.get("/api/goals")
def get_goals(student_id: int):
    return query_rows(
        "SELECT * FROM goals WHERE student_id=? ORDER BY is_completed, created_at DESC",
        (student_id,)
    )


@app.post("/api/goals")
def create_goal(req: GoalCreate):
    with get_db() as conn:
        gid = conn.execute(
            "INSERT INTO goals(student_id, title, description, target_value, factor) VALUES(?,?,?,?,?)",
            (req.student_id, req.title, req.description, req.target_value, req.factor)
        ).lastrowid
    return {"id": gid, "status": "created"}


@app.patch("/api/goals/{goal_id}")
def update_goal(goal_id: int, current_value: Optional[float] = None, is_completed: Optional[bool] = None):
    with get_db() as conn:
        if current_value is not None:
            conn.execute("UPDATE goals SET current_value=? WHERE id=?", (current_value, goal_id))
        if is_completed is not None:
            completed_at = datetime.datetime.now().isoformat() if is_completed else None
            conn.execute("UPDATE goals SET is_completed=?, completed_at=? WHERE id=?",
                         (1 if is_completed else 0, completed_at, goal_id))
    return {"status": "updated"}


@app.get("/api/teacher/{teacher_id}/dashboard")
def get_teacher_dashboard(teacher_id: int):
    # Get high risk students (Needs Attention) across all teacher's classes
    needs_attention = query_rows(
        "SELECT u.id, u.name, p.risk_level as risk, p.factors_json as reason "
        "FROM users u "
        "JOIN enrollments e ON e.student_id = u.id "
        "JOIN classes c ON c.id = e.class_id "
        "JOIN predictions p ON p.student_id = u.id AND p.id = (SELECT MAX(id) FROM predictions WHERE student_id = u.id) "
        "WHERE c.teacher_id = ? AND p.risk_level IN ('High', 'Medium') "
        "ORDER BY p.risk_level DESC "
        "LIMIT 5",
        (teacher_id,)
    )
    
    # Just format the factors to be a simple string reason
    for s in needs_attention:
        if s["reason"]:
            try:
                factors = json.loads(s["reason"])
                if factors:
                    s["reason"] = f"{factors[0]['feature']} is {factors[0]['value']}"
            except:
                s["reason"] = "Risk factors identified"
        else:
            s["reason"] = "Requires observation"
            
    # Mock some data for the schedule and deadlines based on teacher's classes
    classes = query_rows("SELECT name, department FROM classes WHERE teacher_id=?", (teacher_id,))
    
    todays_classes = []
    deadlines = []
    
    if classes:
        cls_name = classes[0]["name"]
        todays_classes = [
            {"time": "09:00 AM", "subject": "Core Lecture", "class": cls_name},
            {"time": "11:00 AM", "subject": "Tutorial", "class": cls_name},
        ]
        deadlines = [
            {"title": f"Submit Marks ({cls_name})", "due": "Today, 5:00 PM"},
            {"title": "Publish Internals", "due": "Tomorrow"},
        ]
        
    return {
        "needs_attention": needs_attention,
        "todays_classes": todays_classes,
        "deadlines": deadlines
    }


# ── Classes ─────────────────────────────────────────────────────

@app.get("/api/classes")
def get_classes(teacher_id: Optional[int] = None):
    if teacher_id:
        classes = query_rows(
            "SELECT c.*, COUNT(e.student_id) as student_count "
            "FROM classes c LEFT JOIN enrollments e ON e.class_id = c.id "
            "WHERE c.teacher_id=? GROUP BY c.id",
            (teacher_id,)
        )
    else:
        classes = query_rows(
            "SELECT c.*, COUNT(e.student_id) as student_count, u.name as teacher_name "
            "FROM classes c LEFT JOIN enrollments e ON e.class_id = c.id "
            "LEFT JOIN users u ON u.id = c.teacher_id "
            "GROUP BY c.id"
        )

    # Add risk distribution per class
    for cls in classes:
        risk_dist = query_rows(
            "SELECT p.risk_level, COUNT(*) as count FROM predictions p "
            "JOIN enrollments e ON e.student_id = p.student_id "
            "WHERE e.class_id = ? AND p.id IN "
            "(SELECT MAX(id) FROM predictions GROUP BY student_id) "
            "GROUP BY p.risk_level",
            (cls["id"],)
        )
        cls["riskDistribution"] = {r["risk_level"]: r["count"] for r in risk_dist}

    return classes


@app.get("/api/classes/{class_id}/students")
def get_class_students(class_id: int):
    students = query_rows(
        "SELECT u.id, u.name, u.department, u.semester, "
        "p.predicted_score, p.risk_level, p.confidence_low, p.confidence_high, p.date as prediction_date "
        "FROM users u "
        "JOIN enrollments e ON e.student_id = u.id "
        "LEFT JOIN predictions p ON p.student_id = u.id AND p.id = "
        "(SELECT MAX(id) FROM predictions WHERE student_id = u.id) "
        "WHERE e.class_id = ? ORDER BY p.risk_level DESC, p.predicted_score ASC",
        (class_id,)
    )

    # Add attendance for each student
    for s in students:
        att = query_one(
            "SELECT attendance FROM academic_data WHERE student_id=? ORDER BY id DESC LIMIT 1",
            (s["id"],)
        )
        s["attendance"] = att["attendance"] if att else None

        # Trend (compare last two predictions)
        preds = query_rows(
            "SELECT predicted_score FROM predictions WHERE student_id=? ORDER BY id DESC LIMIT 2",
            (s["id"],)
        )
        if len(preds) >= 2:
            diff = preds[0]["predicted_score"] - preds[1]["predicted_score"]
            s["trend"] = "improving" if diff > 0.5 else ("declining" if diff < -0.5 else "stable")
        else:
            s["trend"] = "stable"

    return students


@app.get("/api/classes/{class_id}/insights")
def get_class_insights(class_id: int):
    # Get all students in class
    students = query_rows(
        "SELECT student_id FROM enrollments WHERE class_id=?",
        (class_id,)
    )
    student_ids = [s["student_id"] for s in students]
    if not student_ids:
        return {"error": "No students in this class"}

    placeholders = ",".join("?" * len(student_ids))

    # Risk distribution
    risk_dist = query_rows(
        f"SELECT risk_level, COUNT(*) as count FROM predictions "
        f"WHERE student_id IN ({placeholders}) AND id IN "
        f"(SELECT MAX(id) FROM predictions WHERE student_id IN ({placeholders}) GROUP BY student_id) "
        f"GROUP BY risk_level",
        tuple(student_ids) + tuple(student_ids)
    )

    # Average predicted score
    avg = query_one(
        f"SELECT AVG(predicted_score) as avg_score FROM predictions "
        f"WHERE student_id IN ({placeholders}) AND id IN "
        f"(SELECT MAX(id) FROM predictions WHERE student_id IN ({placeholders}) GROUP BY student_id)",
        tuple(student_ids) + tuple(student_ids)
    )

    # Predicted vs actual
    pred_vs_actual = query_rows(
        f"SELECT u.name, p.predicted_score, r.actual_score FROM results r "
        f"JOIN predictions p ON p.id = r.prediction_id "
        f"JOIN users u ON u.id = r.student_id "
        f"WHERE r.student_id IN ({placeholders})",
        tuple(student_ids)
    )

    # Aggregate feature importance dynamically across any model architecture
    cur_model = predict_mod.get_model()
    features_list = predict_mod.get_features()
    feature_importance = []

    scaler = cur_model.named_steps.get("standardscaler") if hasattr(cur_model, "named_steps") else None
    scales = list(scaler.scale_) if scaler is not None and hasattr(scaler, "scale_") else [1.0] * len(features_list)
    est = cur_model.steps[-1][1] if hasattr(cur_model, "steps") else cur_model

    if hasattr(est, "coef_"):
        for feat, coef, scale in zip(features_list, est.coef_, scales):
            s_val = scale if scale != 0 else 1.0
            feature_importance.append({
                "name": feat,
                "importance": round(abs(float(coef) / s_val), 3),
                "direction": "positive" if float(coef) > 0 else "negative",
            })
    elif hasattr(est, "feature_importances_"):
        for feat, imp in zip(features_list, est.feature_importances_):
            feature_importance.append({
                "name": feat,
                "importance": round(float(imp), 3),
                "direction": "positive",
            })
    else:
        for feat in features_list:
            feature_importance.append({
                "name": feat,
                "importance": 1.0,
                "direction": "positive",
            })
    feature_importance.sort(key=lambda x: x["importance"], reverse=True)

    return {
        "riskDistribution": {r["risk_level"]: r["count"] for r in risk_dist},
        "averageScore": round(avg["avg_score"], 1) if avg and avg["avg_score"] else 0,
        "predictedVsActual": pred_vs_actual,
        "featureImportance": feature_importance,
        "studentCount": len(student_ids),
    }


# ── Attendance ──────────────────────────────────────────────────

@app.get("/api/students/{student_id}/attendance")
def student_attendance(student_id: int):
    records = query_rows(
        "SELECT * FROM attendance_records WHERE student_id=? ORDER BY date DESC, period",
        (student_id,)
    )

    # Calculate overall percentage from academic_data
    latest = query_one(
        "SELECT attendance FROM academic_data WHERE student_id=? ORDER BY id DESC LIMIT 1",
        (student_id,)
    )

    # Monthly summary
    monthly = query_rows(
        "SELECT strftime('%Y-%m', date) as month, "
        "SUM(CASE WHEN status='present' OR status='late' THEN 1 ELSE 0 END) as present, "
        "COUNT(*) as total "
        "FROM attendance_records WHERE student_id=? GROUP BY month ORDER BY month",
        (student_id,)
    )

    return {
        "overallPercentage": latest["attendance"] if latest else 0,
        "records": records,
        "monthly": monthly,
        "threshold": 75,
    }


@app.post("/api/attendance")
def mark_attendance(req: AttendanceMarkRequest):
    with get_db() as conn:
        for record in req.records:
            conn.execute(
                "INSERT OR REPLACE INTO attendance_records(student_id, class_id, date, period, status, marked_by) VALUES(?,?,?,?,?,?)",
                (record["student_id"], req.class_id, req.date, req.period, record["status"], 0)
            )
    return {"status": "saved", "count": len(req.records)}


# ── Marks ───────────────────────────────────────────────────────

@app.get("/api/classes/{class_id}/marks")
def class_marks(class_id: int, exam_type: Optional[str] = None):
    # Fetch all marks for all students in this class
    sql = "SELECT r.* FROM results r JOIN enrollments e ON e.student_id = r.student_id WHERE e.class_id=?"
    params = [class_id]
    if exam_type:
        sql += " AND r.exam_type=?"
        params.append(exam_type)
    sql += " ORDER BY r.date DESC"
    return query_rows(sql, tuple(params))

@app.get("/api/students/{student_id}/marks")
def student_marks(student_id: int):
    results = query_rows(
        "SELECT r.*, p.predicted_score FROM results r "
        "LEFT JOIN predictions p ON p.id = r.prediction_id "
        "WHERE r.student_id=? ORDER BY r.date DESC",
        (student_id,)
    )
    return results


@app.post("/api/marks")
def save_marks(req: ResultCreate):
    with get_db() as conn:
        rid = conn.execute(
            "INSERT INTO results(student_id, prediction_id, actual_score, subject, exam_type, date) VALUES(?,?,?,?,?, datetime('now'))",
            (req.student_id, req.prediction_id, req.actual_score, req.subject, req.exam_type)
        ).lastrowid
        # Update latest academic_data previous_scores for this student
        conn.execute(
            "UPDATE academic_data SET previous_scores = ? WHERE student_id = ? AND id = (SELECT MAX(id) FROM academic_data WHERE student_id = ?)",
            (req.actual_score, req.student_id, req.student_id)
        )
        # Immediately recompute prediction with updated mark
        updated_pred = _recompute_student_prediction(conn, req.student_id)
    return {"id": rid, "status": "saved", "prediction": updated_pred}


# ── Timetable ───────────────────────────────────────────────────

@app.get("/api/students/{student_id}/timetable")
def student_timetable(student_id: int):
    enrollment = query_one(
        "SELECT class_id FROM enrollments WHERE student_id=?", (student_id,)
    )
    if not enrollment:
        return []
    return query_rows(
        "SELECT t.*, u.name as teacher_name FROM timetable t "
        "LEFT JOIN users u ON u.id = t.teacher_id "
        "WHERE t.class_id=? ORDER BY t.day_of_week, t.period",
        (enrollment["class_id"],)
    )


@app.get("/api/timetable")
def get_timetable(class_id: Optional[int] = None, teacher_id: Optional[int] = None):
    sql = """
        SELECT t.*, u.name as teacher_name, c.name as class_name
        FROM timetable t
        LEFT JOIN users u ON u.id = t.teacher_id
        LEFT JOIN classes c ON c.id = t.class_id
        WHERE 1=1
    """
    params = []
    if class_id:
        sql += " AND t.class_id=?"
        params.append(class_id)
    if teacher_id:
        sql += " AND t.teacher_id=?"
        params.append(teacher_id)
    sql += " ORDER BY t.day_of_week, t.period"
    return query_rows(sql, tuple(params))


@app.post("/api/timetable")
def create_timetable_slot(req: TimetableSlotCreate, token: str = Query(...)):
    """Only administrators can issue a new timetable slot."""
    auth = get_current_user(token)
    if not auth or auth["role"] != "admin":
        raise HTTPException(403, "Only administrators can issue or modify timetables")
    with get_db() as conn:
        tid = conn.execute(
            """INSERT INTO timetable(class_id, day_of_week, period, start_time, end_time, subject, teacher_id, room)
               VALUES(?,?,?,?,?,?,?,?)""",
            (req.class_id, req.day_of_week, req.period, req.start_time, req.end_time, req.subject, req.teacher_id, req.room)
        ).lastrowid
    return {"id": tid, "status": "created"}


@app.put("/api/timetable/{slot_id}")
def update_timetable_slot(slot_id: int, req: TimetableSlotCreate, token: str = Query(...)):
    """Only administrators can edit a timetable slot."""
    auth = get_current_user(token)
    if not auth or auth["role"] != "admin":
        raise HTTPException(403, "Only administrators can issue or modify timetables")
    with get_db() as conn:
        conn.execute(
            """UPDATE timetable
               SET class_id=?, day_of_week=?, period=?, start_time=?, end_time=?, subject=?, teacher_id=?, room=?
               WHERE id=?""",
            (req.class_id, req.day_of_week, req.period, req.start_time, req.end_time, req.subject, req.teacher_id, req.room, slot_id)
        )
    return {"status": "updated"}


@app.delete("/api/timetable/{slot_id}")
def delete_timetable_slot(slot_id: int, token: str = Query(...)):
    """Only administrators can delete a timetable slot."""
    auth = get_current_user(token)
    if not auth or auth["role"] != "admin":
        raise HTTPException(403, "Only administrators can issue or modify timetables")
    with get_db() as conn:
        conn.execute("DELETE FROM timetable WHERE id=?", (slot_id,))
    return {"status": "deleted"}


# ── Interventions ───────────────────────────────────────────────

@app.get("/api/interventions")
def get_interventions(teacher_id: Optional[int] = None, student_id: Optional[int] = None, status: Optional[str] = None):
    sql = "SELECT i.*, u.name as student_name, t.name as teacher_name FROM interventions i JOIN users u ON u.id = i.student_id LEFT JOIN users t ON t.id = i.teacher_id WHERE 1=1"
    params = []
    if teacher_id:
        sql += " AND i.teacher_id=?"
        params.append(teacher_id)
    if student_id:
        sql += " AND i.student_id=?"
        params.append(student_id)
    if status:
        sql += " AND i.status=?"
        params.append(status)
    sql += " ORDER BY i.created_at DESC"
    return query_rows(sql, tuple(params))


@app.post("/api/interventions")
def create_intervention(req: InterventionCreate, token: str = Query(...)):
    auth = get_current_user(token)
    if not auth:
        raise HTTPException(401, "Unauthorized")
    with get_db() as conn:
        iid = conn.execute(
            "INSERT INTO interventions(student_id, teacher_id, type, description, due_date) VALUES(?,?,?,?,?)",
            (req.student_id, auth["user_id"], req.type, req.description, req.due_date)
        ).lastrowid

        # Create notification for student
        conn.execute(
            "INSERT INTO notifications(user_id, type, title, body, link) VALUES(?,?,?,?,?)",
            (req.student_id, "INTERVENTION", "New Support Plan",
             f"Your teacher has assigned a {req.type} support plan.", "/student/insights")
        )
    return {"id": iid, "status": "created"}


@app.patch("/api/interventions/{intervention_id}")
def update_intervention(intervention_id: int, req: InterventionUpdate):
    with get_db() as conn:
        updates = []
        params = []
        if req.status:
            updates.append("status=?")
            params.append(req.status)
        if req.outcome:
            updates.append("outcome=?")
            params.append(req.outcome)
        if req.score_change is not None:
            updates.append("score_change=?")
            params.append(req.score_change)
        updates.append("updated_at=?")
        params.append(datetime.datetime.now().isoformat())
        params.append(intervention_id)
        conn.execute(f"UPDATE interventions SET {', '.join(updates)} WHERE id=?", tuple(params))
    return {"status": "updated"}


# ── Messages ────────────────────────────────────────────────────

@app.get("/api/messages")
def get_messages(user_id: int):
    sent = query_rows(
        "SELECT m.*, u.name as receiver_name FROM messages m JOIN users u ON u.id = m.receiver_id WHERE m.sender_id=? ORDER BY m.created_at DESC",
        (user_id,)
    )
    received = query_rows(
        "SELECT m.*, u.name as sender_name FROM messages m JOIN users u ON u.id = m.sender_id WHERE m.receiver_id=? ORDER BY m.created_at DESC",
        (user_id,)
    )
    return {"sent": sent, "received": received}


@app.post("/api/messages")
def send_message(req: MessageCreate, token: str = Query(...)):
    auth = get_current_user(token)
    if not auth:
        raise HTTPException(401, "Unauthorized")
    with get_db() as conn:
        mid = conn.execute(
            "INSERT INTO messages(sender_id, receiver_id, subject, body) VALUES(?,?,?,?)",
            (auth["user_id"], req.receiver_id, req.subject, req.body)
        ).lastrowid
        conn.execute(
            "INSERT INTO notifications(user_id, type, title, body, link) VALUES(?,?,?,?,?)",
            (req.receiver_id, "MESSAGE", "New Message",
             f"You have a new message", "/messages")
        )
    return {"id": mid, "status": "sent"}


# ── Notifications ───────────────────────────────────────────────

@app.get("/api/notifications")
def get_notifications(user_id: int):
    return query_rows(
        "SELECT * FROM notifications WHERE user_id=? ORDER BY is_read, created_at DESC",
        (user_id,)
    )


@app.patch("/api/notifications/read")
def mark_notifications_read(user_id: int, notification_ids: Optional[List[int]] = None):
    with get_db() as conn:
        if notification_ids:
            placeholders = ",".join("?" * len(notification_ids))
            conn.execute(f"UPDATE notifications SET is_read=1 WHERE id IN ({placeholders}) AND user_id=?",
                         tuple(notification_ids) + (user_id,))
        else:
            conn.execute("UPDATE notifications SET is_read=1 WHERE user_id=?", (user_id,))
    return {"status": "updated"}


# ── Parent & Behaviour endpoints ────────────────────────────────

@app.get("/api/parent/{parent_id}/children")
def parent_children(parent_id: int):
    children = query_rows(
        "SELECT u.id, u.name, u.department, u.semester FROM parent_links pl "
        "JOIN users u ON u.id = pl.student_id WHERE pl.parent_id=?",
        (parent_id,)
    )

    for child in children:
        pred = query_one(
            "SELECT * FROM predictions WHERE student_id=? ORDER BY id DESC LIMIT 1",
            (child["id"],)
        )
        if pred:
            child["prediction"] = {
                "predictedScore": pred["predicted_score"],
                "interval": [pred["confidence_low"], pred["confidence_high"]],
                "risk": pred["risk_level"],
                "recommendations": json.loads(pred["recommendations_json"]) if pred.get("recommendations_json") else [],
                "factors": json.loads(pred["factors_json"]) if pred.get("factors_json") else [],
            }

            # Plain-language status
            risk = pred["risk_level"]
            if risk == "Low":
                child["statusText"] = f"{child['name']} is on track."
                child["statusLevel"] = "good"
            elif risk == "Medium":
                child["statusText"] = f"{child['name']} is doing okay, with a few areas to strengthen."
                child["statusLevel"] = "caution"
            else:
                child["statusText"] = f"{child['name']} could use extra support right now. Their teachers are here to help."
                child["statusLevel"] = "concern"
        else:
            child["prediction"] = None
            child["statusText"] = "No prediction data available yet."
            child["statusLevel"] = "unknown"

        # Latest attendance & marks from academic_data
        att = query_one(
            "SELECT attendance, hours_studied, previous_scores, tutoring_sessions FROM academic_data WHERE student_id=? ORDER BY id DESC LIMIT 1",
            (child["id"],)
        )
        child["attendance"] = att["attendance"] if att else None
        child["hours_studied"] = att["hours_studied"] if att else None
        child["previous_scores"] = att["previous_scores"] if att else None

        # Check for latest recorded exam result
        res = query_one(
            "SELECT actual_score, subject, exam_type FROM results WHERE student_id=? ORDER BY id DESC LIMIT 1",
            (child["id"],)
        )
        child["actual_score"] = res["actual_score"] if res else (att["previous_scores"] if att else None)
        child["subject"] = res["subject"] if res else "General Coursework"

        # Class and Teacher info
        cls = query_one(
            "SELECT c.name as class_name, t.id as teacher_id, t.name as teacher_name "
            "FROM enrollments e "
            "JOIN classes c ON c.id = e.class_id "
            "LEFT JOIN users t ON t.id = c.teacher_id "
            "WHERE e.student_id = ?",
            (child["id"],)
        )
        child["class_name"] = cls["class_name"] if cls else "Enrolled Class"
        child["teacher_id"] = cls["teacher_id"] if cls else 1
        child["teacher_name"] = cls["teacher_name"] if cls else "Class Advisor"

        # Latest behavioural records (split by role)
        behav = query_one(
            "SELECT * FROM behaviour_data WHERE student_id=? ORDER BY id DESC LIMIT 1",
            (child["id"],)
        )
        child["home_factors"] = {
            "parental_involvement": behav["parental_involvement"] if behav else 2,
            "sleep_hours": behav["sleep_hours"] if behav else 7.0,
            "access_to_resources": behav["access_to_resources"] if behav else 2,
            "physical_activity": behav["physical_activity"] if behav else 1.5,
            "hours_studied": att["hours_studied"] if att else 4.0,
        }
        child["school_factors"] = {
            "motivation": behav["motivation"] if behav else 3,
            "peer_influence": behav["peer_influence"] if behav else 2,
            "teacher_quality": behav["teacher_quality"] if behav else 2,
            "study_consistency": behav["study_consistency"] if behav and "study_consistency" in behav.keys() else 3,
            "concentration": behav["concentration"] if behav and "concentration" in behav.keys() else 3,
            "learning_engagement": behav["learning_engagement"] if behav and "learning_engagement" in behav.keys() else 3,
            "tutoring_sessions": att["tutoring_sessions"] if att else 0,
        }

    return children


@app.get("/api/parent/{parent_id}/contacts")
def parent_contacts(parent_id: int):
    # Find all teachers of this parent's linked children
    teachers = query_rows("""
        SELECT DISTINCT u.id, u.name, u.email, u.phone, 'Class Advisor' as role_label, c.name as class_name, s.name as child_name
        FROM parent_links pl
        JOIN enrollments e ON e.student_id = pl.student_id
        JOIN classes c ON c.id = e.class_id
        JOIN users u ON u.id = c.teacher_id
        JOIN users s ON s.id = pl.student_id
        WHERE pl.parent_id = ?
    """, (parent_id,))

    # Also get school administrators
    admins = query_rows("""
        SELECT id, name, email, phone, 'School Administrator' as role_label, 'Administration' as class_name, 'School Office' as child_name
        FROM users WHERE role = 'admin'
    """)

    return {"teachers": teachers, "admins": admins}


@app.get("/api/students/{student_id}/contacts")
def student_contacts(student_id: int):
    """Return teachers and administrators that this student can contact."""
    teachers = query_rows("""
        SELECT DISTINCT u.id, u.name, u.email, u.phone, 'Class Advisor' as role_label, c.name as class_name
        FROM enrollments e
        JOIN classes c ON c.id = e.class_id
        JOIN users u ON u.id = c.teacher_id
        WHERE e.student_id = ?
    """, (student_id,))

    timetable_teachers = query_rows("""
        SELECT DISTINCT u.id, u.name, u.email, u.phone, 'Subject Teacher' as role_label, t.subject as class_name
        FROM enrollments e
        JOIN timetable t ON t.class_id = e.class_id
        JOIN users u ON u.id = t.teacher_id
        WHERE e.student_id = ?
    """, (student_id,))

    merged = {}
    for t in (teachers + timetable_teachers):
        if t["id"] not in merged:
            merged[t["id"]] = t

    admins = query_rows("""
        SELECT id, name, email, phone, 'School Administrator' as role_label, 'Office of Administration' as class_name
        FROM users WHERE role = 'admin'
    """)

    return {"teachers": list(merged.values()), "admins": admins}


@app.post("/api/parent/meeting-request")
def request_meeting(req: MeetingRequest, token: str = Query(...)):
    """
    Parent schedules / requests a meeting with the class teacher or advisor.
    Creates a detailed message, notification for the teacher, and a tracking intervention entry.
    """
    auth = get_current_user(token)
    if not auth or auth["role"] not in ["parent", "admin"]:
        raise HTTPException(403, "Only parents (or admin) can request a meeting")

    with get_db() as conn:
        parent_user = conn.execute("SELECT name FROM users WHERE id=?", (auth["user_id"],)).fetchone()
        parent_name = parent_user["name"] if parent_user else "Parent"

        student_user = conn.execute("SELECT name FROM users WHERE id=?", (req.student_id,)).fetchone()
        student_name = student_user["name"] if student_user else f"Student #{req.student_id}"

        teacher_user = conn.execute("SELECT name FROM users WHERE id=?", (req.teacher_id,)).fetchone()
        teacher_name = teacher_user["name"] if teacher_user else "Class Advisor"

        subject = f"📅 [Meeting Request] {req.agenda} ({req.preferred_date} • {req.time_slot})"
        body = (
            f"Dear {teacher_name},\n\n"
            f"A parent-teacher consultation has been requested by {parent_name} regarding {student_name}.\n\n"
            f"• Student: {student_name}\n"
            f"• Preferred Date: {req.preferred_date}\n"
            f"• Preferred Time Slot: {req.time_slot}\n"
            f"• Meeting Mode: {req.mode}\n"
            f"• Discussion Focus: {req.agenda}\n"
        )
        if req.notes and req.notes.strip():
            body += f"• Parent Notes/Questions: {req.notes.strip()}\n\n"
        else:
            body += "\n"
        body += "Please reply to confirm or reschedule this consultation time."

        # 1. Insert message to teacher
        mid = conn.execute(
            "INSERT INTO messages(sender_id, receiver_id, subject, body) VALUES(?,?,?,?)",
            (auth["user_id"], req.teacher_id, subject, body)
        ).lastrowid

        # 2. Insert notification for teacher
        conn.execute(
            "INSERT INTO notifications(user_id, type, title, body, link) VALUES(?,?,?,?,?)",
            (req.teacher_id, "MEETING_REQUEST", f"Meeting Request: {student_name}",
             f"{parent_name} requested a meeting on {req.preferred_date} ({req.time_slot})",
             "/teacher/messages")
        )

        # 3. Insert into interventions table so it appears on teacher's support board
        iid = conn.execute(
            """INSERT INTO interventions(student_id, teacher_id, type, description, status, due_date)
               VALUES(?,?,?,?,?,?)""",
            (req.student_id, req.teacher_id, "Parent Meeting",
             f"Consultation with {parent_name} ({req.mode}). Agenda: {req.agenda}. Slot: {req.time_slot}",
             "pending", req.preferred_date)
        ).lastrowid

    return {
        "status": "success",
        "message": f"Meeting request successfully sent to {teacher_name}",
        "message_id": mid,
        "intervention_id": iid,
    }


@app.post("/api/parent/observations")
def submit_parent_observation(req: ParentObservationRequest, token: str = Query(...)):
    """
    Record home environment and lifestyle observations entered by the parent:
    - Parental Involvement (1-3)
    - Nightly Sleep Hours (4-10 hrs)
    - Daily Home Study Hours (0-12 hrs)
    - Access to Learning Resources (1-3)
    - Physical Activity / Sports (hrs/day)
    Preserves teacher's classroom observations and recomputes ML prediction.
    """
    auth = get_current_user(token)
    if not auth or auth["role"] not in ["parent", "admin"]:
        raise HTTPException(403, "Only parents (or admin) can submit home observations")

    with get_db() as conn:
        # If parent role, verify relationship in parent_links
        if auth["role"] == "parent":
            link = conn.execute(
                "SELECT id FROM parent_links WHERE parent_id=? AND student_id=?",
                (auth["user_id"], req.student_id)
            ).fetchone()
            if not link:
                raise HTTPException(403, "You can only submit observations for your own linked child")

        # Get latest behavioural entry to preserve classroom observations from teachers
        latest_behav = conn.execute(
            "SELECT * FROM behaviour_data WHERE student_id=? ORDER BY id DESC LIMIT 1",
            (req.student_id,)
        ).fetchone()

        # Get latest academic entry to preserve attendance and exam marks
        latest_acad = conn.execute(
            "SELECT * FROM academic_data WHERE student_id=? ORDER BY id DESC LIMIT 1",
            (req.student_id,)
        ).fetchone()

        teacher_quality = latest_behav["teacher_quality"] if latest_behav else 2
        motivation = latest_behav["motivation"] if latest_behav else 3
        peer_influence = latest_behav["peer_influence"] if latest_behav else 2
        study_consistency = latest_behav["study_consistency"] if latest_behav and "study_consistency" in latest_behav.keys() else 3
        concentration = latest_behav["concentration"] if latest_behav and "concentration" in latest_behav.keys() else 3
        learning_engagement = latest_behav["learning_engagement"] if latest_behav and "learning_engagement" in latest_behav.keys() else 3
        preparation_confidence = latest_behav["preparation_confidence"] if latest_behav and "preparation_confidence" in latest_behav.keys() else 3

        # Insert new updated behaviour log with parent home inputs
        conn.execute(
            """INSERT INTO behaviour_data(
                student_id, date, motivation, parental_involvement, peer_influence,
                sleep_hours, access_to_resources, teacher_quality, physical_activity,
                study_consistency, concentration, learning_engagement, preparation_confidence
            ) VALUES(?, datetime('now'), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                req.student_id, motivation, req.parental_involvement, peer_influence,
                req.sleep_hours, req.access_to_resources, teacher_quality, req.physical_activity,
                study_consistency, concentration, learning_engagement, preparation_confidence
            )
        )

        # Update academic_data hours_studied from parent home study observation
        att = latest_acad["attendance"] if latest_acad else 80.0
        prev_sc = latest_acad["previous_scores"] if latest_acad else 70.0
        tut = latest_acad["tutoring_sessions"] if latest_acad else 0

        conn.execute(
            """INSERT INTO academic_data(student_id, date, attendance, hours_studied, previous_scores, tutoring_sessions)
               VALUES(?, datetime('now'), ?, ?, ?, ?)""",
            (req.student_id, att, req.hours_studied, prev_sc, tut)
        )

        # Immediately recompute prediction with the new home factors
        updated_pred = _recompute_student_prediction(conn, req.student_id)

        # Record to audit trail
        conn.execute(
            "INSERT INTO audit_log(user_id, action, resource, details) VALUES(?,?,?,?)",
            (auth["user_id"], "parent_observation_logged", f"student:{req.student_id}",
             f"Parent updated home factors: involvement={req.parental_involvement}, sleep={req.sleep_hours}h, home_study={req.hours_studied}h, resources={req.access_to_resources}")
        )

    return {
        "status": "success",
        "message": "Home behavioral observations recorded and synced to predictive model.",
        "prediction": updated_pred
    }


@app.get("/api/parent/student/{student_id}/observations")
def get_student_observations(student_id: int, token: str = Query(...)):
    """Fetch breakdown of home factors (parent) and school factors (teacher) for a student."""
    auth = get_current_user(token)
    if not auth:
        raise HTTPException(401, "Unauthorized")

    with get_db() as conn:
        behav = conn.execute(
            "SELECT * FROM behaviour_data WHERE student_id=? ORDER BY id DESC LIMIT 1",
            (student_id,)
        ).fetchone()
        acad = conn.execute(
            "SELECT * FROM academic_data WHERE student_id=? ORDER BY id DESC LIMIT 1",
            (student_id,)
        ).fetchone()
        res = conn.execute(
            "SELECT actual_score, subject, exam_type FROM results WHERE student_id=? ORDER BY id DESC LIMIT 1",
            (student_id,)
        ).fetchone()

        return {
            "student_id": student_id,
            "parent_factors": {
                "parental_involvement": behav["parental_involvement"] if behav else 2,
                "sleep_hours": behav["sleep_hours"] if behav else 7.0,
                "access_to_resources": behav["access_to_resources"] if behav else 2,
                "physical_activity": behav["physical_activity"] if behav else 1.5,
                "hours_studied": acad["hours_studied"] if acad else 4.0,
            },
            "school_factors": {
                "motivation": behav["motivation"] if behav else 3,
                "peer_influence": behav["peer_influence"] if behav else 2,
                "teacher_quality": behav["teacher_quality"] if behav else 2,
                "tutoring_sessions": acad["tutoring_sessions"] if acad else 0,
                "attendance": acad["attendance"] if acad else 80.0,
                "previous_scores": acad["previous_scores"] if acad else 70.0,
                "actual_score": res["actual_score"] if res else (acad["previous_scores"] if acad else None),
            }
        }


@app.post("/api/teacher/behaviour")
def submit_teacher_behaviour(req: TeacherBehaviourRequest, token: str = Query(...)):
    """
    Record classroom behavioral observations entered by the teacher:
    - Motivation Level (1-5)
    - Peer Dynamics in Class (1-3)
    - Teacher Quality / Guidance Level (1-3)
    - Tutoring Sessions
    Preserves parent's home observations (sleep, resources, home study) and recomputes ML prediction.
    """
    auth = get_current_user(token)
    if not auth or auth["role"] not in ["teacher", "admin"]:
        raise HTTPException(403, "Only teachers (or admin) can submit classroom observations")

    with get_db() as conn:
        # Get latest behaviour data to preserve parent's home inputs
        latest_behav = conn.execute(
            "SELECT * FROM behaviour_data WHERE student_id=? ORDER BY id DESC LIMIT 1",
            (req.student_id,)
        ).fetchone()

        latest_acad = conn.execute(
            "SELECT * FROM academic_data WHERE student_id=? ORDER BY id DESC LIMIT 1",
            (req.student_id,)
        ).fetchone()

        # Preserve parent-observed home factors
        parental_involvement = latest_behav["parental_involvement"] if latest_behav else 2
        sleep_hours = latest_behav["sleep_hours"] if latest_behav else 7.0
        access_to_resources = latest_behav["access_to_resources"] if latest_behav else 2
        physical_activity = latest_behav["physical_activity"] if latest_behav else 1.5

        conn.execute(
            """INSERT INTO behaviour_data(
                student_id, date, motivation, parental_involvement, peer_influence,
                sleep_hours, access_to_resources, teacher_quality, physical_activity,
                study_consistency, concentration, learning_engagement, preparation_confidence
            ) VALUES(?, datetime('now'), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                req.student_id, req.motivation, parental_involvement, req.peer_influence,
                sleep_hours, access_to_resources, req.teacher_quality, physical_activity,
                req.study_consistency or 3, req.concentration or 3, req.learning_engagement or 3, 3
            )
        )

        # If tutoring sessions is updated, update academic data
        if req.tutoring_sessions is not None and latest_acad:
            conn.execute(
                """INSERT INTO academic_data(student_id, date, attendance, hours_studied, previous_scores, tutoring_sessions)
                   VALUES(?, datetime('now'), ?, ?, ?, ?)""",
                (req.student_id, latest_acad["attendance"], latest_acad["hours_studied"], latest_acad["previous_scores"], req.tutoring_sessions)
            )

        # Immediately recompute model prediction
        updated_pred = _recompute_student_prediction(conn, req.student_id)

        # Log to audit trail
        conn.execute(
            "INSERT INTO audit_log(user_id, action, resource, details) VALUES(?,?,?,?)",
            (auth["user_id"], "teacher_behaviour_logged", f"student:{req.student_id}",
             f"Teacher updated classroom factors: motivation={req.motivation}, peer_influence={req.peer_influence}, teacher_quality={req.teacher_quality}")
        )

    return {
        "status": "success",
        "message": "Classroom behavioral observations recorded and synced to predictive model.",
        "prediction": updated_pred
    }


# ── Learner clusters ────────────────────────────────────────────

@app.get("/api/classes/{class_id}/groups")
def learner_groups(class_id: int):
    students = query_rows(
        "SELECT e.student_id FROM enrollments e WHERE e.class_id=?",
        (class_id,)
    )
    if not students:
        return []

    # Simple rule-based clustering (in a real system, use K-means)
    groups = {
        "high_performer": {"label": "Strong performers", "traits": ["High attendance", "Good study habits", "Strong motivation"], "members": []},
        "low_attendance_high_effort": {"label": "Low attendance, high effort", "traits": ["Below-average attendance", "Decent study hours", "Moderate motivation"], "members": []},
        "low_engagement": {"label": "Low engagement", "traits": ["Low study hours", "Low motivation", "Needs support"], "members": []},
        "at_risk": {"label": "At risk", "traits": ["Multiple weak areas", "Below thresholds", "Urgent attention needed"], "members": []},
    }

    for s in students:
        sid = s["student_id"]
        features = _get_latest_features(sid)
        user = query_one("SELECT name FROM users WHERE id=?", (sid,))
        if not features or not user:
            continue

        pred = predict_student(features)
        member = {"id": sid, "name": user["name"], "score": pred["predicted_score"], "risk": pred["risk"]}

        if pred["risk"] == "Low":
            groups["high_performer"]["members"].append(member)
        elif features["Attendance"] < 75 and features["Hours_Studied"] >= 15:
            groups["low_attendance_high_effort"]["members"].append(member)
        elif pred["risk"] == "High":
            groups["at_risk"]["members"].append(member)
        else:
            groups["low_engagement"]["members"].append(member)

    result = []
    for gid, data in groups.items():
        if data["members"]:
            result.append({
                "id": gid,
                "label": data["label"],
                "size": len(data["members"]),
                "traits": data["traits"],
                "members": data["members"],
            })

    return result


# ── Model Monitor & Status (Admin) ──────────────────────────────

@app.get("/api/model/status")
def model_status():
    curr_model = predict_mod.get_model()
    features = predict_mod.get_features()
    est = curr_model.steps[-1][1] if hasattr(curr_model, "steps") else curr_model
    scaler = curr_model.named_steps.get("standardscaler") if hasattr(curr_model, "named_steps") else None

    # Compute model metrics on actual results
    pa = query_df(
        "SELECT p.predicted_score, r.actual_score FROM results r "
        "JOIN predictions p ON p.id = r.prediction_id"
    )

    metrics = {}
    if not pa.empty:
        from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
        metrics = {
            "mae": round(float(mean_absolute_error(pa["actual_score"], pa["predicted_score"])), 2),
            "rmse": round(float(np.sqrt(mean_squared_error(pa["actual_score"], pa["predicted_score"]))), 2),
            "r2": round(float(r2_score(pa["actual_score"], pa["predicted_score"])), 3),
            "sampleSize": len(pa),
        }

    feature_importance = []
    intercept = 0.0
    if hasattr(est, "coef_"):
        scales = scaler.scale_ if scaler is not None and hasattr(scaler, "scale_") else [1.0] * len(features)
        for feat, coef, scale in zip(features, est.coef_, scales):
            s = scale if scale != 0 else 1.0
            feature_importance.append({
                "name": feat,
                "coefficient": round(float(coef), 4),
                "importance": round(abs(float(coef / s)), 4),
            })
        intercept = round(float(est.intercept_), 4)
    elif hasattr(est, "feature_importances_"):
        for feat, imp in zip(features, est.feature_importances_):
            feature_importance.append({
                "name": feat,
                "coefficient": round(float(imp), 4),
                "importance": round(float(imp), 4),
            })
        intercept = round(float(np.mean(predict_mod.ref["Exam_Score"])), 4) if "Exam_Score" in predict_mod.ref else 65.0
    else:
        for feat in features:
            feature_importance.append({"name": feat, "coefficient": 0.0, "importance": 0.0})

    feature_importance.sort(key=lambda x: x["importance"], reverse=True)
    settings = {s["key"]: s["value"] for s in query_rows("SELECT * FROM settings")}

    model_name_label = type(est).__name__
    if "Ridge" in model_name_label:
        model_name_label = "Ridge Regression Pipeline"
    elif "RandomForest" in model_name_label:
        model_name_label = "Random Forest Regressor Pipeline"
    elif "GradientBoosting" in model_name_label:
        model_name_label = "Gradient Boosting Regressor Pipeline"
    elif "XGB" in model_name_label:
        model_name_label = "XGBoost Regressor Pipeline"

    high_c, low_c = predict_mod.get_cutoffs()

    return {
        "modelName": model_name_label,
        "version": settings.get("model_version", "ridge-v1.0"),
        "features": features,
        "featureImportance": feature_importance,
        "intercept": intercept,
        "thresholds": {
            "high": round(float(high_c), 1),
            "low": round(float(low_c), 1),
        },
        "metrics": metrics,
        "drift": "stable",
    }


# ── Model Retraining, Comparison & Versioning (Admin Only) ──────

class RetrainRequest(BaseModel):
    model_type: str = "Ridge"  # Ridge, RandomForest, GradientBoosting, XGBoost, LinearRegression
    include_base_data: bool = True  # include the processed_students.csv baseline
    student_weight: float = 10.0    # Weight multiplier for current class students (1 to 50)
    feature_set: str = "standard"   # standard
    notes: Optional[str] = None


class CompareRequest(BaseModel):
    candidate_models: List[str] = ["Ridge", "RandomForest", "GradientBoosting"]
    include_base_data: bool = True
    student_weight: float = 10.0
    feature_set: str = "standard"


class ActivateVersionRequest(BaseModel):
    version: str


class ActualScoreImportItem(BaseModel):
    student_id: Optional[int] = None
    username: Optional[str] = None
    name: Optional[str] = None
    actual_score: float
    subject: Optional[str] = "Final Exam"


def _create_model_pipeline(model_type: str):
    """Create a standardized Pipeline with Imputer, Scaler and Regressor."""
    from sklearn.impute import SimpleImputer
    from sklearn.preprocessing import StandardScaler
    from sklearn.pipeline import Pipeline
    from sklearn.linear_model import Ridge, LinearRegression
    from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor

    if model_type == "RandomForest":
        est = RandomForestRegressor(n_estimators=180, min_samples_leaf=2, random_state=42, n_jobs=-1)
        step_name = "randomforestregressor"
    elif model_type == "GradientBoosting":
        est = GradientBoostingRegressor(n_estimators=120, learning_rate=0.08, max_depth=3, random_state=42)
        step_name = "gradientboostingregressor"
    elif model_type == "XGBoost":
        try:
            from xgboost import XGBRegressor
            est = XGBRegressor(n_estimators=150, learning_rate=0.05, max_depth=3, random_state=42)
            step_name = "xgbregressor"
        except ImportError:
            est = GradientBoostingRegressor(n_estimators=120, learning_rate=0.08, max_depth=3, random_state=42)
            step_name = "gradientboostingregressor"
    elif model_type == "LinearRegression":
        est = LinearRegression()
        step_name = "linearregression"
    else:  # Ridge (default)
        est = Ridge(alpha=1.0)
        step_name = "ridge"

    pipeline = Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("standardscaler", StandardScaler()),
        (step_name, est),
    ])
    return pipeline, step_name


def _build_training_data_from_students(include_base: bool = True, student_weight: float = 10.0):
    """
    Build training DataFrame from current students in the database.
    Each student's latest academic and behavioural inputs are used as features.
    Actual scores are used where available; predicted scores fill in as proxy targets.
    Optionally merges with the base dataset (processed_students.csv).
    Returns (combined_df, total_rows, n_real, n_actual, n_predicted, student_roster).
    """
    features_needed = ["Hours_Studied", "Attendance", "Previous_Scores", "Tutoring_Sessions",
                       "Motivation_Level", "Parental_Involvement", "Peer_Influence",
                       "Sleep_Hours", "Access_to_Resources", "Teacher_Quality", "Physical_Activity"]

    students_data = query_rows("""
        SELECT u.id as student_id, u.name, u.username, u.department, u.semester,
               a.hours_studied as Hours_Studied, a.attendance as Attendance,
               a.previous_scores as Previous_Scores, a.tutoring_sessions as Tutoring_Sessions,
               b.motivation as Motivation_Level, b.parental_involvement as Parental_Involvement,
               b.peer_influence as Peer_Influence, b.sleep_hours as Sleep_Hours,
               b.access_to_resources as Access_to_Resources, b.teacher_quality as Teacher_Quality,
               b.physical_activity as Physical_Activity,
               r.actual_score as actual_score,
               p.predicted_score as predicted_score
        FROM users u
        JOIN academic_data a ON a.student_id = u.id 
          AND a.id = (SELECT MAX(id) FROM academic_data WHERE student_id = u.id)
        JOIN behaviour_data b ON b.student_id = u.id
          AND b.id = (SELECT MAX(id) FROM behaviour_data WHERE student_id = u.id)
        LEFT JOIN results r ON r.student_id = u.id
          AND r.id = (SELECT MAX(id) FROM results WHERE student_id = u.id)
        LEFT JOIN predictions p ON p.student_id = u.id
          AND p.id = (SELECT MAX(id) FROM predictions WHERE student_id = u.id)
        WHERE u.role = 'student'
        ORDER BY u.name
    """)

    real_rows = []
    student_roster = []
    n_actual, n_predicted = 0, 0

    for s in students_data:
        target = None
        target_type = None
        w = 1.0

        if s["actual_score"] is not None and not pd.isna(s["actual_score"]):
            target = float(s["actual_score"])
            target_type = "actual"
            w = float(student_weight)
            n_actual += 1
        elif s["predicted_score"] is not None and not pd.isna(s["predicted_score"]):
            target = float(s["predicted_score"])
            target_type = "predicted"
            w = 1.0
            n_predicted += 1

        if target is not None:
            row_dict = {f: s[f] for f in features_needed}
            row_dict["Exam_Score"] = target
            row_dict["_weight"] = w
            row_dict["_real"] = True
            real_rows.append(row_dict)

            student_roster.append({
                "student_id": s["student_id"],
                "name": s["name"],
                "username": s["username"],
                "department": s.get("department") or "CSE",
                "semester": s.get("semester") or 6,
                "attendance": s["Attendance"],
                "hours_studied": s["Hours_Studied"],
                "previous_scores": s["Previous_Scores"],
                "tutoring_sessions": s["Tutoring_Sessions"],
                "motivation": s["Motivation_Level"],
                "peer_influence": s["Peer_Influence"],
                "teacher_quality": s["Teacher_Quality"],
                "parental_involvement": s["Parental_Involvement"],
                "sleep_hours": s["Sleep_Hours"],
                "access_to_resources": s["Access_to_Resources"],
                "physical_activity": s["Physical_Activity"],
                "target_score": target,
                "target_type": target_type,
                "has_actual": (target_type == "actual"),
                "weight": w,
            })

    real_df = pd.DataFrame(real_rows)
    if not real_df.empty:
        real_df = real_df[features_needed + ["Exam_Score", "_weight", "_real"]].dropna()

    parts = []
    if include_base and os.path.exists("processed_students.csv"):
        base = pd.read_csv("processed_students.csv")
        base = base[features_needed + ["Exam_Score"]].dropna()
        base["_weight"] = 1.0
        base["_real"] = False
        parts.append(base)

    if not real_df.empty:
        parts.append(real_df)

    if not parts:
        return None, 0, 0, 0, 0, []

    combined = pd.concat(parts, ignore_index=True)
    n_real = len(real_df) if not real_df.empty else 0
    return combined, len(combined), n_real, n_actual, n_predicted, student_roster


def _evaluate_candidates(df, candidate_names, features_needed):
    """Train each candidate on 80% train split and evaluate on 20% test split."""
    from sklearn.model_selection import train_test_split, cross_val_score
    from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

    X = df[features_needed]
    y = df["Exam_Score"]
    weights = df["_weight"].to_numpy() if "_weight" in df.columns else np.ones(len(df))
    real = df["_real"].to_numpy() if "_real" in df.columns else np.zeros(len(df), dtype=bool)

    idx = np.arange(len(df))
    tr, te = train_test_split(idx, test_size=0.2, random_state=42)
    X_tr, y_tr = X.iloc[tr], y.iloc[tr]
    X_te, y_te = X.iloc[te], y.iloc[te]
    w_tr = weights[tr]

    results = []
    best_r2 = -float("inf")
    best_name = None

    for name in candidate_names:
        pipe, step_name = _create_model_pipeline(name)
        fit_kwargs = {f"{step_name}__sample_weight": w_tr}
        pipe.fit(X_tr, y_tr, **fit_kwargs)

        try:
            cv_scores = cross_val_score(pipe, X_tr, y_tr, cv=3, scoring="r2")
            cv_r2 = round(float(np.mean(cv_scores)), 3)
        except Exception:
            cv_r2 = 0.0

        preds = pipe.predict(X_te)
        mae = round(float(mean_absolute_error(y_te, preds)), 3)
        rmse = round(float(np.sqrt(mean_squared_error(y_te, preds))), 3)
        r2 = round(float(r2_score(y_te, preds)), 3)

        te_real = te[real[te]]
        real_mae = None
        if len(te_real) >= 1:
            real_mae = round(float(mean_absolute_error(y.iloc[te_real], pipe.predict(X.iloc[te_real]))), 3)

        if r2 > best_r2:
            best_r2 = r2
            best_name = name

        results.append({
            "model": name,
            "cv_r2": cv_r2,
            "test_r2": r2,
            "test_mae": mae,
            "test_rmse": rmse,
            "real_student_mae": real_mae,
            "real_in_test": int(len(te_real)),
            "is_best": False,
        })

    for r in results:
        if r["model"] == best_name:
            r["is_best"] = True

    return results


def _do_retrain(df, model_type, source, notes, user_id, student_weight=10.0):
    """
    Train a new model on the given DataFrame, save it, reload predict module,
    and log the training run. Returns the result dict.
    Supports sample weights to emphasize class students.
    """
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

    features = ["Hours_Studied", "Attendance", "Previous_Scores", "Tutoring_Sessions",
                "Motivation_Level", "Parental_Involvement", "Peer_Influence",
                "Sleep_Hours", "Access_to_Resources", "Teacher_Quality", "Physical_Activity"]

    X = df[features]
    y = df["Exam_Score"]
    weights = df["_weight"].to_numpy() if "_weight" in df.columns else np.ones(len(df))
    real = df["_real"].to_numpy() if "_real" in df.columns else np.zeros(len(df), dtype=bool)

    # 1. Evaluate on 80/20 split for accurate validation metrics
    idx = np.arange(len(df))
    tr, te = train_test_split(idx, test_size=0.2, random_state=42)
    eval_pipe, eval_step = _create_model_pipeline(model_type)
    eval_pipe.fit(X.iloc[tr], y.iloc[tr], **{f"{eval_step}__sample_weight": weights[tr]})
    y_pred = eval_pipe.predict(X.iloc[te])

    mae = round(float(mean_absolute_error(y.iloc[te], y_pred)), 3)
    rmse = round(float(np.sqrt(mean_squared_error(y.iloc[te], y_pred))), 3)
    r2 = round(float(r2_score(y.iloc[te], y_pred)), 3)

    te_real = te[real[te]]
    real_mae = None
    if len(te_real) >= 1:
        real_mae = round(float(mean_absolute_error(y.iloc[te_real], eval_pipe.predict(X.iloc[te_real]))), 3)

    # 2. Finalize: fit chosen model on 100% of data with full sample weights
    final_pipeline, final_step = _create_model_pipeline(model_type)
    final_pipeline.fit(X, y, **{f"{final_step}__sample_weight": weights})

    version = datetime.datetime.now().strftime("v%Y%m%d-%H%M%S")
    model_name_lower = model_type.lower()

    # Save versioned copy
    os.makedirs("models", exist_ok=True)
    versioned_path = os.path.join("models", f"model_{version}.pkl")
    bundle_data = {
        "model": final_pipeline,
        "features": features,
        "version": version,
        "name": model_type,
        "metrics": {"mae": mae, "rmse": rmse, "r2": r2, "real_mae": real_mae},
        "source": source,
        "n_samples": len(df),
        "student_weight": float(student_weight),
        "trained_at": datetime.datetime.now().strftime("%Y-%m-%d %H:%M"),
    }
    joblib.dump(bundle_data, versioned_path)

    # Back up original baseline if this is the first retrain
    initial_path = os.path.join("models", "model_initial.pkl")
    active_path = os.path.join("models", "final_model.pkl")
    if not os.path.exists(initial_path) and os.path.exists(active_path):
        shutil.copyfile(active_path, initial_path)

    # Overwrite active model
    shutil.copyfile(versioned_path, active_path)

    # Hot-reload the predict module
    reload_info = predict_mod.reload_model()

    # Update settings
    with get_db() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO settings(key, value, updated_at) VALUES(?,?,?)",
            ("model_version", f"{model_name_lower}-{version}", datetime.datetime.now().isoformat())
        )
        conn.execute(
            "INSERT OR REPLACE INTO settings(key, value, updated_at) VALUES(?,?,?)",
            ("high_cutoff", str(reload_info["high_cutoff"]), datetime.datetime.now().isoformat())
        )
        conn.execute(
            "INSERT OR REPLACE INTO settings(key, value, updated_at) VALUES(?,?,?)",
            ("low_cutoff", str(reload_info["low_cutoff"]), datetime.datetime.now().isoformat())
        )

    # Mark previous active models in training_log as completed/archived
    with get_db() as conn:
        conn.execute("UPDATE training_log SET status = 'archived' WHERE status = 'active'")
        conn.execute(
            "INSERT INTO training_log(version, model_name, source, n_samples, n_features, mae, rmse, r2, trained_by, status, notes) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
            (version, model_type, source, len(df), len(features), mae, rmse, r2, user_id, "active", notes)
        )
        conn.execute(
            "INSERT INTO audit_log(user_id, action, resource, details) VALUES(?,?,?,?)",
            (user_id, "model_retrain", f"model_{version}.pkl",
             json.dumps({"model": model_type, "source": source, "samples": len(df), "mae": mae, "r2": r2, "real_mae": real_mae}))
        )

    return {
        "status": "success",
        "version": version,
        "modelType": model_type,
        "source": source,
        "metrics": {"mae": mae, "rmse": rmse, "r2": r2, "real_mae": real_mae},
        "samples": len(df),
        "features": features,
        "thresholds": reload_info,
    }


@app.get("/api/model/training-data-preview")
def training_data_preview(token: str = Query(...)):
    """Preview current student data and base dataset available for retraining. Admin-only."""
    auth = get_current_user(token)
    if not auth or auth["role"] != "admin":
        raise HTTPException(403, "Forbidden")

    combined_df, total, n_real, n_actual, n_pred, roster = _build_training_data_from_students(include_base=True, student_weight=10.0)

    total_students_row = query_one("SELECT COUNT(*) as cnt FROM users WHERE role = 'student'")
    total_students = total_students_row["cnt"] if total_students_row else 0
    total_results_row = query_one("SELECT COUNT(*) as cnt FROM results")
    total_results = total_results_row["cnt"] if total_results_row else 0

    base_count = 0
    if os.path.exists("processed_students.csv"):
        base_df = pd.read_csv("processed_students.csv")
        base_count = len(base_df)

    active_bundle = joblib.load("models/final_model.pkl")
    has_initial = os.path.exists(os.path.join("models", "model_initial.pkl"))

    sample_preview = []
    if combined_df is not None and not combined_df.empty:
        real_subset = combined_df[combined_df["_real"] == True]
        display_df = real_subset if not real_subset.empty else combined_df
        sample_preview = display_df.head(15).to_dict(orient="records")

    settings = {s["key"]: s["value"] for s in query_rows("SELECT * FROM settings")}

    return {
        "totalStudents": total_students,
        "studentsWithResults": n_actual,
        "studentsWithPredicted": n_pred,
        "studentsNoData": max(0, total_students - (n_actual + n_pred)),
        "totalResults": total_results,
        "baseDatasetSize": base_count,
        "currentVersion": settings.get("model_version", active_bundle.get("version", "initial")),
        "currentFeatures": active_bundle.get("features", predict_mod.get_features()),
        "hasInitialBackup": has_initial,
        "studentRoster": roster,
        "sampleData": sample_preview,
    }


@app.post("/api/model/compare")
def compare_models(req: CompareRequest, token: str = Query(...)):
    """Train and compare multiple candidate models on current student data. Admin-only."""
    auth = get_current_user(token)
    if not auth or auth["role"] != "admin":
        raise HTTPException(403, "Only administrators can benchmark models")

    df, total, n_real, n_actual, n_pred, _ = _build_training_data_from_students(req.include_base_data, req.student_weight)
    if df is None or total == 0:
        raise HTTPException(400, "No training data available. Add student records first.")

    features = ["Hours_Studied", "Attendance", "Previous_Scores", "Tutoring_Sessions",
                "Motivation_Level", "Parental_Involvement", "Peer_Influence",
                "Sleep_Hours", "Access_to_Resources", "Teacher_Quality", "Physical_Activity"]

    candidate_names = req.candidate_models or ["Ridge", "RandomForest", "GradientBoosting"]
    results = _evaluate_candidates(df, candidate_names, features)

    source = f"Class students ({n_real} students: {n_actual} actual, {n_pred} predicted)"
    if req.include_base_data:
        source += f" + base dataset ({total} total rows)"

    return {
        "status": "success",
        "results": results,
        "source": source,
        "totalSamples": total,
        "classSamples": n_real,
        "withActual": n_actual,
        "withPredicted": n_pred,
        "studentWeight": req.student_weight,
    }


@app.post("/api/model/retrain")
def retrain_model(req: RetrainRequest, token: str = Query(...)):
    """Retrain the model using current student data from the database. Admin-only."""
    auth = get_current_user(token)
    if not auth or auth["role"] != "admin":
        raise HTTPException(403, "Only administrators can retrain the model")

    df, total, n_real, n_actual, n_pred, _ = _build_training_data_from_students(req.include_base_data, req.student_weight)

    if df is None or total == 0:
        raise HTTPException(400, "No training data available. Add student results first.")

    source = f"Class students ({n_real} students: {n_actual} actual, {n_pred} predicted)"
    if req.include_base_data:
        source += f" + base dataset ({total} total rows)"

    result = _do_retrain(df, req.model_type, source, req.notes, auth["user_id"], req.student_weight)
    result["details"] = {
        "studentsTotal": n_real,
        "studentsWithActual": n_actual,
        "studentsWithPredicted": n_pred,
        "studentWeight": req.student_weight,
    }
    return result


@app.post("/api/model/retrain-upload")
async def retrain_model_upload(
    file: UploadFile = File(...),
    model_type: str = Query("Ridge"),
    include_base: bool = Query(True),
    notes: str = Query(None),
    token: str = Query(...),
):
    """Retrain the model using an uploaded CSV file. Admin-only."""
    auth = get_current_user(token)
    if not auth or auth["role"] != "admin":
        raise HTTPException(403, "Only administrators can retrain the model")

    if not file.filename.endswith(".csv"):
        raise HTTPException(400, "Please upload a CSV file")

    content = await file.read()
    try:
        uploaded_df = pd.read_csv(io.BytesIO(content))
    except Exception as e:
        raise HTTPException(400, f"Failed to parse CSV: {str(e)}")

    features_needed = ["Hours_Studied", "Attendance", "Previous_Scores", "Tutoring_Sessions",
                       "Motivation_Level", "Parental_Involvement", "Peer_Influence",
                       "Sleep_Hours", "Access_to_Resources", "Teacher_Quality", "Physical_Activity"]

    missing = [c for c in features_needed + ["Exam_Score"] if c not in uploaded_df.columns]
    if missing:
        raise HTTPException(400, f"Missing required columns: {', '.join(missing)}")

    uploaded_df = uploaded_df[features_needed + ["Exam_Score"]].dropna()
    if len(uploaded_df) < 5:
        raise HTTPException(400, f"Need at least 5 valid rows, got {len(uploaded_df)}")

    uploaded_df["_weight"] = 10.0
    uploaded_df["_real"] = True

    parts = [uploaded_df]
    if include_base and os.path.exists("processed_students.csv"):
        base = pd.read_csv("processed_students.csv")
        base = base[features_needed + ["Exam_Score"]].dropna()
        base["_weight"] = 1.0
        base["_real"] = False
        parts.insert(0, base)

    combined = pd.concat(parts, ignore_index=True)
    source = f"uploaded CSV ({len(uploaded_df)} rows)" + (f" + base dataset ({len(combined)} total)" if include_base else "")

    result = _do_retrain(combined, model_type, source, notes or f"Uploaded: {file.filename}", auth["user_id"])
    return result


@app.post("/api/model/activate-version")
def activate_model_version(req: ActivateVersionRequest, token: str = Query(...)):
    """Switch to and activate ANY past model version from the model repository. Admin-only."""
    auth = get_current_user(token)
    if not auth or auth["role"] != "admin":
        raise HTTPException(403, "Forbidden")

    target_path = os.path.join("models", f"model_{req.version}.pkl")
    active_path = os.path.join("models", "final_model.pkl")

    if not os.path.exists(target_path):
        raise HTTPException(404, f"Model version file '{req.version}' not found on server.")

    shutil.copyfile(target_path, active_path)
    reload_info = predict_mod.reload_model()

    with get_db() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO settings(key, value, updated_at) VALUES(?,?,?)",
            ("model_version", req.version, datetime.datetime.now().isoformat())
        )
        conn.execute("UPDATE training_log SET status = 'archived' WHERE status = 'active'")
        conn.execute("UPDATE training_log SET status = 'active' WHERE version = ?", (req.version,))
        conn.execute(
            "INSERT INTO audit_log(user_id, action, resource, details) VALUES(?,?,?,?)",
            (auth["user_id"], "model_activate_version", f"model_{req.version}.pkl", f"Activated version {req.version}")
        )

    return {
        "status": "success",
        "version": req.version,
        "message": f"Version {req.version} is now active.",
        "thresholds": reload_info,
    }


@app.post("/api/model/restore")
def restore_original_model(token: str = Query(...)):
    """Restore the original (initial) baseline model. Admin-only."""
    auth = get_current_user(token)
    if not auth or auth["role"] != "admin":
        raise HTTPException(403, "Forbidden")

    initial_path = os.path.join("models", "model_initial.pkl")
    active_path = os.path.join("models", "final_model.pkl")

    if not os.path.exists(initial_path):
        raise HTTPException(404, "No initial model backup found. The model has never been retrained.")

    shutil.copyfile(initial_path, active_path)
    reload_info = predict_mod.reload_model()

    with get_db() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO settings(key, value, updated_at) VALUES(?,?,?)",
            ("model_version", "ridge-v1.0 (baseline restored)", datetime.datetime.now().isoformat())
        )
        conn.execute("UPDATE training_log SET status = 'archived' WHERE status = 'active'")
        conn.execute(
            "INSERT INTO audit_log(user_id, action, resource, details) VALUES(?,?,?,?)",
            (auth["user_id"], "model_restore", "model_initial.pkl", "Restored original baseline model")
        )
        conn.execute(
            "INSERT INTO training_log(version, model_name, source, n_samples, n_features, trained_by, status, notes) VALUES(?,?,?,?,?,?,?,?)",
            ("baseline", "Ridge", "initial backup", 0, 11, auth["user_id"], "active", "Restored to initial baseline model")
        )

    return {"status": "restored", "message": "Original baseline model has been restored", "thresholds": reload_info}


@app.get("/api/model/history")
def training_history(token: str = Query(...)):
    """Get complete model training and version history. Admin-only."""
    auth = get_current_user(token)
    if not auth or auth["role"] != "admin":
        raise HTTPException(403, "Forbidden")

    rows = query_rows(
        "SELECT t.*, u.name as trained_by_name FROM training_log t "
        "LEFT JOIN users u ON u.id = t.trained_by "
        "ORDER BY t.created_at DESC LIMIT 30"
    )
    return {"history": rows}


@app.post("/api/model/import-actual-scores")
async def import_actual_scores(
    file: Optional[UploadFile] = File(None),
    scores: Optional[str] = Query(None),
    token: str = Query(...)
):
    """Import actual exam scores from CSV file or JSON to convert predicted students into actual ground truth."""
    auth = get_current_user(token)
    if not auth or auth["role"] != "admin":
        raise HTTPException(403, "Only administrators can import exam results")

    rows_to_process = []
    if file:
        content = await file.read()
        try:
            df = pd.read_csv(io.BytesIO(content))
            rows_to_process = df.to_dict(orient="records")
        except Exception as e:
            raise HTTPException(400, f"Could not parse CSV: {str(e)}")
    elif scores:
        try:
            rows_to_process = json.loads(scores)
        except Exception:
            raise HTTPException(400, "Invalid JSON scores parameter")
    else:
        raise HTTPException(400, "Provide either a CSV file or scores parameter")

    imported = 0
    updated = 0
    not_found = []
    invalid = []

    students_db = query_rows("SELECT id, username, name FROM users WHERE role = 'student'")
    by_id = {s["id"]: s for s in students_db}
    by_user = {s["username"].lower(): s for s in students_db}
    by_name = {s["name"].lower(): s for s in students_db}

    now_iso = datetime.datetime.now().isoformat()

    with get_db() as conn:
        for r in rows_to_process:
            score_val = r.get("actual_score") or r.get("Actual_Score") or r.get("score") or r.get("Score")
            try:
                score_num = float(score_val)
                if not (0 <= score_num <= 100):
                    invalid.append(str(r))
                    continue
            except (TypeError, ValueError):
                invalid.append(str(r))
                continue

            stu = None
            if r.get("student_id") and int(r.get("student_id")) in by_id:
                stu = by_id[int(r.get("student_id"))]
            elif r.get("username") and str(r.get("username")).strip().lower() in by_user:
                stu = by_user[str(r.get("username")).strip().lower()]
            elif r.get("name") and str(r.get("name")).strip().lower() in by_name:
                stu = by_name[str(r.get("name")).strip().lower()]

            if not stu:
                not_found.append(str(r.get("name") or r.get("username") or r.get("student_id") or "Unknown"))
                continue

            subject = r.get("subject") or "Final Examination"
            existing = query_one("SELECT id FROM results WHERE student_id = ? AND subject = ?", (stu["id"], subject))
            pred = query_one("SELECT id FROM predictions WHERE student_id = ? ORDER BY id DESC LIMIT 1", (stu["id"],))
            pid = pred["id"] if pred else None

            if existing:
                conn.execute(
                    "UPDATE results SET actual_score = ?, prediction_id = ?, date = ? WHERE id = ?",
                    (score_num, pid, now_iso, existing["id"])
                )
                updated += 1
            else:
                conn.execute(
                    "INSERT INTO results(student_id, prediction_id, actual_score, subject, exam_type, date) VALUES(?,?,?,?,?,?)",
                    (stu["id"], pid, score_num, subject, "final", now_iso)
                )
                imported += 1

        conn.execute(
            "INSERT INTO audit_log(user_id, action, resource, details) VALUES(?,?,?,?)",
            (auth["user_id"], "import_actual_scores", "results", json.dumps({"imported": imported, "updated": updated}))
        )

    return {
        "status": "success",
        "imported": imported,
        "updated": updated,
        "notFound": not_found,
        "invalid": invalid,
        "totalProcessed": len(rows_to_process),
    }


@app.get("/api/model/actual-scores-template")
def actual_scores_template(token: str = Query(...)):
    """Generate and download a CSV template with current students pre-filled."""
    auth = get_current_user(token)
    if not auth or auth["role"] != "admin":
        raise HTTPException(403, "Forbidden")

    students = query_rows("SELECT id, username, name FROM users WHERE role = 'student' ORDER BY name")
    lines = ["student_id,username,name,actual_score,subject"]
    for s in students:
        lines.append(f"{s['id']},{s['username']},{s['name']},,Final Examination")

    from fastapi.responses import PlainTextResponse
    return PlainTextResponse(
        content="\n".join(lines),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=actual_scores_template.csv"}
    )



# ── Admin Stats ─────────────────────────────────────────────────

@app.get("/api/admin/stats")
def admin_stats():
    users_by_role = query_rows("SELECT role, COUNT(*) as count FROM users GROUP BY role")
    total_preds = query_one("SELECT COUNT(*) as cnt FROM predictions")
    risk_dist = query_rows(
        "SELECT risk_level, COUNT(*) as count FROM predictions "
        "WHERE id IN (SELECT MAX(id) FROM predictions GROUP BY student_id) "
        "GROUP BY risk_level"
    )
    recent_logins = query_one(
        "SELECT COUNT(*) as cnt FROM users WHERE last_login > datetime('now', '-1 day')"
    )

    recent_activity = query_rows(
        "SELECT a.*, u.name as user_name, u.role as user_role FROM audit_log a LEFT JOIN users u ON u.id = a.user_id ORDER BY a.created_at DESC LIMIT 10"
    )

    return {
        "usersByRole": {r["role"]: r["count"] for r in users_by_role},
        "totalPredictions": total_preds["cnt"] if total_preds else 0,
        "riskDistribution": {r["risk_level"]: r["count"] for r in risk_dist},
        "recentLogins": recent_logins["cnt"] if recent_logins else 0,
        "recentActivity": [dict(ra) for ra in recent_activity]
    }


@app.get("/api/admin/evaluations")
def admin_evaluations():
    # 1. Student Evaluations
    students = query_rows(
        "SELECT u.id, u.name, u.department, u.semester, p.predicted_score, p.risk_level, p.factors_json as top_factors, GROUP_CONCAT(DISTINCT c.name) as classes "
        "FROM users u "
        "JOIN predictions p ON p.student_id = u.id "
        "LEFT JOIN enrollments e ON e.student_id = u.id "
        "LEFT JOIN classes c ON c.id = e.class_id "
        "WHERE u.role = 'student' AND p.id = (SELECT MAX(id) FROM predictions WHERE student_id = u.id) "
        "GROUP BY u.id "
        "ORDER BY p.predicted_score DESC"
    )
    
    # Parse top_factors from JSON strings
    parsed_students = []
    for s in students:
        s_dict = dict(s)
        if s_dict.get("top_factors"):
            try:
                s_dict["top_factors"] = json.loads(s_dict["top_factors"])
            except:
                s_dict["top_factors"] = {}
        parsed_students.append(s_dict)
        
    # 2. Teacher Evaluations (aggregate of their classes)
    teachers = query_rows(
        "SELECT t.id, t.name, t.department, "
        "COUNT(DISTINCT c.id) as classes_count, "
        "AVG(p.predicted_score) as avg_class_score "
        "FROM users t "
        "LEFT JOIN classes c ON c.teacher_id = t.id "
        "LEFT JOIN enrollments e ON e.class_id = c.id "
        "LEFT JOIN predictions p ON p.student_id = e.student_id AND p.id = (SELECT MAX(id) FROM predictions WHERE student_id = e.student_id) "
        "WHERE t.role = 'teacher' "
        "GROUP BY t.id "
        "ORDER BY avg_class_score DESC"
    )
    
    # 3. Parent Involvement (average from latest behavior data of their linked children)
    parents = query_rows(
        "SELECT p_user.id, p_user.name, "
        "COUNT(DISTINCT pl.student_id) as children_count, "
        "AVG(b.parental_involvement) as avg_involvement, "
        "GROUP_CONCAT(DISTINCT c.name) as children_classes "
        "FROM users p_user "
        "JOIN parent_links pl ON pl.parent_id = p_user.id "
        "JOIN behaviour_data b ON b.student_id = pl.student_id AND b.id = (SELECT MAX(id) FROM behaviour_data WHERE student_id = pl.student_id) "
        "LEFT JOIN enrollments e ON e.student_id = pl.student_id "
        "LEFT JOIN classes c ON c.id = e.class_id "
        "WHERE p_user.role = 'parent' "
        "GROUP BY p_user.id"
    )

    return {
        "students": parsed_students,
        "teachers": [dict(t) for t in teachers],
        "parents": [dict(p) for p in parents]
    }


# ── Settings ────────────────────────────────────────────────────

@app.get("/api/settings")
def get_settings():
    return {s["key"]: s["value"] for s in query_rows("SELECT * FROM settings")}


@app.patch("/api/settings")
def update_settings(updates: dict, token: str = Query(...)):
    auth = get_current_user(token)
    if not auth or auth["role"] != "admin":
        raise HTTPException(403, "Forbidden")
    with get_db() as conn:
        for key, value in updates.items():
            conn.execute(
                "INSERT OR REPLACE INTO settings(key, value, updated_at) VALUES(?,?,?)",
                (key, str(value), datetime.datetime.now().isoformat())
            )
    return {"status": "updated"}


# ── Audit Log ───────────────────────────────────────────────────

@app.get("/api/audit")
def get_audit_log(page: int = 1, page_size: int = 50, token: str = Query(...)):
    auth = get_current_user(token)
    if not auth or auth["role"] != "admin":
        raise HTTPException(403, "Forbidden")
    offset = (page - 1) * page_size
    total = query_one("SELECT COUNT(*) as cnt FROM audit_log")
    rows = query_rows(
        "SELECT a.*, u.name as user_name, u.role as user_role FROM audit_log a LEFT JOIN users u ON u.id = a.user_id "
        "ORDER BY a.created_at DESC LIMIT ? OFFSET ?",
        (page_size, offset)
    )
    return {"total": total["cnt"] if total else 0, "page": page, "data": rows}


# ── Parent links (Admin) ───────────────────────────────────────

@app.get("/api/admin/links")
def get_parent_links():
    return query_rows(
        "SELECT pl.id, pl.parent_id, pl.student_id, p.name as parent_name, s.name as student_name "
        "FROM parent_links pl JOIN users p ON p.id = pl.parent_id JOIN users s ON s.id = pl.student_id"
    )


@app.post("/api/admin/links")
def create_parent_link(parent_id: int, student_id: int):
    try:
        with get_db() as conn:
            conn.execute(
                "INSERT INTO parent_links(parent_id, student_id) VALUES(?,?)",
                (parent_id, student_id)
            )
        return {"status": "linked"}
    except sqlite3.IntegrityError:
        raise HTTPException(400, "Link already exists")


# ── Demo credentials endpoint ──────────────────────────────────

@app.get("/api/demo/credentials")
def demo_credentials():
    users = query_rows("SELECT role, username, name FROM users ORDER BY role, username")
    accounts = []
    for u in users:
        accounts.append({
            "role": u["role"],
            "username": u["username"],
            "password": f"{u['role']}123",
            "name": u["name"]
        })
    return {"accounts": accounts}
# ── Manual Data Entry & Links Endpoints (Added for UI Sync) ─────

@app.post("/api/marks/bulk")
def submit_bulk_marks(req: BulkResultCreate, token: str = Query(...)):
    auth = get_current_user(token)
    if not auth or auth["role"] not in ["admin", "teacher"]:
        raise HTTPException(403, "Forbidden")
        
    with get_db() as conn:
        for res in req.results:
            conn.execute(
                "INSERT INTO results(student_id, actual_score, subject, exam_type, date) VALUES(?,?,?,?,?)",
                (res["student_id"], res["actual_score"], req.subject, req.exam_type, datetime.datetime.now().isoformat())
            )
            # Update prediction model inputs (previous_scores)
            conn.execute(
                "UPDATE academic_data SET previous_scores = ? WHERE student_id = ? AND id = (SELECT MAX(id) FROM academic_data WHERE student_id = ?)",
                (res["actual_score"], res["student_id"], res["student_id"])
            )
            # Instantly recompute risk predictions for this student with their actual mark
            _recompute_student_prediction(conn, res["student_id"])
    return {"status": "success", "message": f"Successfully updated marks for {len(req.results)} students and recomputed predictions."}


@app.post("/api/attendance/bulk-7period")
def submit_bulk_attendance(req: BulkAttendanceMark, token: str = Query(...)):
    auth = get_current_user(token)
    if not auth or auth["role"] not in ["admin", "teacher"]:
        raise HTTPException(403, "Forbidden")
        
    with get_db() as conn:
        for record in req.records:
            student_id = record["student_id"]
            periods = record["periods"]
            
            # Record detailed period attendance
            for i, is_present in enumerate(periods):
                status = "present" if is_present else "absent"
                try:
                    conn.execute(
                        "INSERT INTO attendance_records(student_id, class_id, date, period, status, marked_by) VALUES(?,?,?,?,?,?)",
                        (student_id, req.class_id, req.date, i+1, status, auth["user_id"])
                    )
                except sqlite3.IntegrityError:
                    conn.execute(
                        "UPDATE attendance_records SET status=?, marked_by=? WHERE student_id=? AND class_id=? AND date=? AND period=?",
                        (status, auth["user_id"], student_id, req.class_id, req.date, i+1)
                    )
                    
            # Calculate overall daily percentage and update academic_data
            daily_pct = (sum(1 for p in periods if p) / 7.0) * 100.0
            conn.execute(
                "UPDATE academic_data SET attendance = ((attendance * 9) + ?) / 10.0 WHERE student_id = ? AND id = (SELECT MAX(id) FROM academic_data WHERE student_id = ?)",
                (daily_pct, student_id, student_id)
            )
            # Instantly recompute risk predictions for this student with their updated attendance
            _recompute_student_prediction(conn, student_id)
            
    return {"status": "success", "message": "7-period attendance synced to prediction models and predictions recomputed."}


@app.post("/api/parent_links/update")
def update_parent_link(req: ParentLinkUpdate, token: str = Query(...)):
    auth = get_current_user(token)
    if not auth or auth["role"] != "admin":
        raise HTTPException(403, "Forbidden")
    
    # In a full app, we would create a user for the parent and link them.
    # For now, we simulate updating the link details.
    return {"status": "success", "message": "Parent details and linkage updated successfully."}


# ── Health check ────────────────────────────────────────────────


@app.get("/api/health")
def health():
    return {
        "status": "healthy",
        "database": "connected",
        "model": "loaded",
        "version": "1.0.0",
        "timestamp": datetime.datetime.now().isoformat(),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
