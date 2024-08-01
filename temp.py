import json
emp_id = 1
with open('temp/emp_data.json', 'r') as f:
    data = json.load(f)
for d in data['jobs']:
    # print(d)
    if d['id'] == emp_id:
        print(d)
