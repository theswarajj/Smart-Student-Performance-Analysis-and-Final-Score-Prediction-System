import os
import re

students_for_data_import = []
students_for_parent_links = []
classes_array = []
class_names = ['S1 CSE-A', 'S3 CSE-B', 'S5 CSE', 'S7 CSE']
class_prefixes = ['S1', 'S3', 'S5', 'S7']

roll_idx = 1
for cid, (prefix, cname) in enumerate(zip(class_prefixes, class_names)):
    for i in range(1, 6):
        sname = f"{prefix}-S{i}"
        sid = f"STU{roll_idx:03d}"
        
        # For DataImport
        students_for_data_import.append(f"  {{ id: '{sid}', name: '{sname}', roll: '{i}', class: '{cname}' }}")
        
        # For ParentLinks
        students_for_parent_links.append(f"  {{ id: '{sid}', name: '{sname}', class: '{cname}', parentName: 'Parent of {sname}', parentPhone: '+91 98765 00{roll_idx:02d}', parentEmail: 'parent_{sname.lower().replace('-','_')}@email.com', linked: true }}")
        
        roll_idx += 1

di_students_str = "const MOCK_STUDENTS = [\n" + ",\n".join(students_for_data_import) + "\n];"
pl_students_str = "const MOCK_STUDENTS = [\n" + ",\n".join(students_for_parent_links) + "\n];"
classes_str = "const CLASSES = ['S1 CSE-A', 'S3 CSE-B', 'S5 CSE', 'S7 CSE'];"

mock_classes_str = """const MOCK_CLASSES = [
  { id: 'S1', name: 'S1 CSE-A', department: 'Computer Science (CSE)', students: 5, teacher: 'Prof. Meera Nair', year: '1st Year (S1/S2)' },
  { id: 'S3', name: 'S3 CSE-B', department: 'Computer Science (CSE)', students: 5, teacher: 'Prof. Rajesh Kumar', year: '2nd Year (S3/S4)' },
  { id: 'S5', name: 'S5 CSE', department: 'Computer Science (CSE)', students: 5, teacher: 'Prof. Meera Nair', year: '3rd Year (S5/S6)' },
  { id: 'S7', name: 'S7 CSE', department: 'Computer Science (CSE)', students: 5, teacher: 'Prof. Rajesh Kumar', year: '4th Year (S7/S8)' },
];"""

def patch_file(filepath, var_name, new_str, is_regex=False):
    with open(filepath, 'r') as f:
        content = f.read()
    
    if var_name == 'MOCK_CLASSES':
        content = re.sub(r'const MOCK_CLASSES = \[\n.*?\];', mock_classes_str, content, flags=re.DOTALL)
    elif var_name == 'CLASSES':
        content = re.sub(r"const CLASSES = \[.*?\];", classes_str, content)
    elif var_name == 'MOCK_STUDENTS':
        content = re.sub(r'const MOCK_STUDENTS = \[\n.*?\];', new_str, content, flags=re.DOTALL)
        
    with open(filepath, 'w') as f:
        f.write(content)
        
# 1. ClassManagement
patch_file('src/features/admin/ClassManagement.tsx', 'MOCK_CLASSES', mock_classes_str)

# 2. DataImport
patch_file('src/features/admin/DataImport.tsx', 'CLASSES', classes_str)
patch_file('src/features/admin/DataImport.tsx', 'MOCK_STUDENTS', di_students_str)

# 3. ParentLinks
patch_file('src/features/admin/ParentLinks.tsx', 'CLASSES', classes_str)
patch_file('src/features/admin/ParentLinks.tsx', 'MOCK_STUDENTS', pl_students_str)

print("Frontend patched.")
