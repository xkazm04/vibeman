#!/usr/bin/env python3
import os
import re
import json
from pathlib import Path

os.chdir(r'c:\Users\kazim\dac\vibeman\.claude\commands')

# Get all idea files
idea_files = sorted([f for f in os.listdir('.') if f.startswith('idea-') and f.endswith('.md')])

print(f"Found {len(idea_files)} idea files\n")

results = []

for filename in idea_files:
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Extract metadata using regex
        category_match = re.search(r'\*\*Category\*\*\s*:\s*([^\n]+)', content)
        category = category_match.group(1).strip() if category_match else "unknown"
        
        effort_match = re.search(r'\*\*Effort\*\*\s*:\s*([^\n]+)', content)
        effort = effort_match.group(1).strip() if effort_match else "unknown"
        
        impact_match = re.search(r'\*\*Impact\*\*\s*:\s*([^\n]+)', content)
        impact = impact_match.group(1).strip() if impact_match else "unknown"
        
        # Extract summary (first non-empty line after ## Description)
        desc_match = re.search(r'## Description\n+([^\n]+)', content)
        summary = desc_match.group(1).strip() if desc_match else "No summary"
        
        # Normalize effort and impact to numeric values
        def get_numeric(val):
            if '1' in val or 'Low' in val.lower():
                return 1
            elif '2' in val or 'Medium' in val.lower():
                return 2
            elif '3' in val or 'High' in val.lower():
                return 3
            else:
                return 0
        
        effort_num = get_numeric(effort)
        impact_num = get_numeric(impact)
        
        results.append({
            'filename': filename,
            'category': category,
            'effort': effort,
            'effort_num': effort_num,
            'impact': impact,
            'impact_num': impact_num,
            'summary': summary
        })
        
        print(f"{filename}")
        print(f"  Category: {category}")
        print(f"  Effort: {effort}")
        print(f"  Impact: {impact}")
        print(f"  Summary: {summary[:80]}...")
        print()
    except Exception as e:
        print(f"Error reading {filename}: {e}\n")

# Save to JSON
with open('analyzed_ideas.json', 'w', encoding='utf-8') as f:
    json.dump(results, f, indent=2)

print(f"\nSuccessfully extracted {len(results)} files")
print(f"Saved to analyzed_ideas.json")
