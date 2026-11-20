import re

with open('app.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix Notifications
content = content.replace("for si in [0, 2, 4, 8, 28]:", "for si in [0, 2, 4, 8, 12]:")

# Let's also check if there are other out of bound indices
# For example, line 683: interventions
# (student_ids[0], ...
# (student_ids[8], ...
# (student_ids[4], ...
# These are fine (max index 8 < 20)

with open('app.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed out-of-bounds indices.")
