import re

with open('app.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Define the start and end markers
start_marker = "# Classes\n        c1 = conn.execute("
end_marker = "        # Some actual results for first class"

if start_marker in content and end_marker in content:
    start_idx = content.find(start_marker)
    end_idx = content.find(end_marker)
    
    new_code = """# Classes
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
            ("S5 CSE", "Computer Science", 5, "2026", t1)
        ).lastrowid
        c4 = conn.execute(
            "INSERT INTO classes(name, department, semester, year, teacher_id) VALUES(?,?,?,?,?)",
            ("S7 CSE", "Computer Science", 7, "2026", t2)
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

"""
    
    new_content = content[:start_idx] + new_code + content[end_idx:]
    with open('app.py', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("app.py updated successfully.")
else:
    print("Markers not found.")
