import requests
import random
import datetime

BASE_URL = "http://localhost:8000/api"

def login(username, password):
    res = requests.post(f"{BASE_URL}/auth/login", json={"username": username, "password": password})
    res.raise_for_status()
    return res.json()["token"]

def get_classes(token):
    res = requests.get(f"{BASE_URL}/classes", params={"token": token})
    res.raise_for_status()
    return res.json()

def get_students(class_id, token):
    res = requests.get(f"{BASE_URL}/classes/{class_id}/students", params={"token": token})
    res.raise_for_status()
    return res.json()

def submit_attendance(class_id, students, token):
    records = []
    for s in students:
        records.append({
            "student_id": s["id"],
            "periods": [random.choice([True, True, True, False]) for _ in range(7)]
        })
    data = {
        "class_id": str(class_id),
        "date": datetime.date.today().isoformat(),
        "records": records
    }
    res = requests.post(f"{BASE_URL}/attendance/bulk-7period", params={"token": token}, json=data)
    res.raise_for_status()
    print(f"Attendance submitted for class {class_id}")

def submit_marks(class_id, students, subject, token):
    results = []
    for s in students:
        results.append({
            "student_id": s["id"],
            "actual_score": random.randint(45, 95)
        })
    data = {
        "class_id": str(class_id),
        "subject": subject,
        "exam_type": "Mid-Term Examination",
        "results": results
    }
    res = requests.post(f"{BASE_URL}/marks/bulk", params={"token": token}, json=data)
    if not res.ok:
        print(f"Error {res.status_code}: {res.text}")
    res.raise_for_status()
    print(f"Marks submitted for {subject} in class {class_id}")

def main():
    for teacher in ["teacher1", "teacher2", "teacher3", "teacher4"]:
        token = login(teacher, "teacher123")
        print(f"Logged in as {teacher}")
        
        classes = get_classes(token)
        if not classes:
            continue
            
        for c in classes:
            students = get_students(c["id"], token)
            if not students:
                continue
                
            print(f"Processing class {c['name']} with {len(students)} students")
            
            # Simulate Attendance
            submit_attendance(c["id"], students, token)
            
            # Simulate Marks for 6 Subjects
            subjects = ['Maths III', 'Data Structures', 'Operating Systems', 'Database Systems', 'Computer Networks', 'Software Eng.']
            for subj in subjects:
                submit_marks(c["id"], students, subj, token)

    # Let's check student view
    # Student S1-S1 username is s1_s1
    student_token = login("s1_s1", "student123")
    print("Logged in as s1_s1 (Student S1-S1)")
    
    # Check marks
    student_id = students[0]["id"] # Since S1-S1 is in teacher1's class
    res = requests.get(f"{BASE_URL}/students/{student_id}/marks", params={"token": student_token})
    print("Student Marks fetched:", len(res.json()), "records")
    
    # Check attendance
    res = requests.get(f"{BASE_URL}/students/{student_id}/attendance", params={"token": student_token})
    print("Student Attendance fetched:", res.json().get('overallPercentage'), "% overall")
    
    # Check Parent
    parent_token = login("parent_s1_s1", "parent123")
    print("Logged in as parent_s1_s1")
    # parent/user_id/children -> gets children
    res = requests.get(f"{BASE_URL}/auth/me", params={"token": parent_token})
    parent_id = res.json()["user_id"]
    res = requests.get(f"{BASE_URL}/parent/{parent_id}/children", params={"token": parent_token})
    print("Parent Children fetched:", len(res.json()))

if __name__ == "__main__":
    main()
