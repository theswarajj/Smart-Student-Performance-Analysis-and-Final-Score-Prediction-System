import re

with open('app.py', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update Teachers
old_teachers = """        # Teachers
        t1 = conn.execute(
            "INSERT INTO users(username, password_hash, role, name, email, department) VALUES(?,?,?,?,?,?)",
            ("teacher1", hash_password("teacher123"), "teacher", "Prof. Meera Nair", "meera@acadiq.edu", "Computer Science")
        ).lastrowid
        t2 = conn.execute(
            "INSERT INTO users(username, password_hash, role, name, email, department) VALUES(?,?,?,?,?,?)",
            ("teacher2", hash_password("teacher123"), "teacher", "Prof. Rajesh Kumar", "rajesh@acadiq.edu", "Computer Science")
        ).lastrowid"""

new_teachers = """        # Teachers
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
        ).lastrowid"""

content = content.replace(old_teachers, new_teachers)

# 2. Update Classes to use t1, t2, t3, t4
old_classes = """        # Classes
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
        ).lastrowid"""

new_classes = """        # Classes
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
        ).lastrowid"""

content = content.replace(old_classes, new_classes)

# 3. Update demo_credentials to return dynamic accounts
old_demo_cred = """@app.get("/api/demo/credentials")
def demo_credentials():
    return {
        "accounts": [
            {"role": "student", "username": "s1_s1", "password": "student123", "name": "S1-S1 (Student)"},
            {"role": "student", "username": "s3_s1", "password": "student123", "name": "S3-S1 (Student)"},
            {"role": "teacher", "username": "teacher1", "password": "teacher123", "name": "Prof. Meera Nair"},
            {"role": "parent", "username": "parent_s1_s1", "password": "parent123", "name": "Parent of S1-S1"},
            {"role": "admin", "username": "admin", "password": "admin123", "name": "Dr. Admin"},
        ]
    }"""

new_demo_cred = """@app.get("/api/demo/credentials")
def demo_credentials():
    users = query_all("SELECT role, username, name FROM users ORDER BY role, username")
    accounts = []
    for u in users:
        accounts.append({
            "role": u["role"],
            "username": u["username"],
            "password": f"{u['role']}123",
            "name": u["name"]
        })
    return {"accounts": accounts}"""

content = content.replace(old_demo_cred, new_demo_cred)

with open('app.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("app.py updated for teachers and dynamic demo credentials.")
