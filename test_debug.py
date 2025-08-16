#!/usr/bin/env python3
import sys
import json

print("STARTING", file=sys.stderr)
sys.stderr.flush()

try:
    input_data = sys.stdin.read().strip()
    print(f"INPUT: {input_data}", file=sys.stderr)
    sys.stderr.flush()
    
    lines = input_data.split('\n')
    prediction_type = lines[0].strip()
    data = json.loads(lines[1].strip())
    
    print(f"TYPE: {prediction_type}, DATA: {data}", file=sys.stderr)
    sys.stderr.flush()
    
    print(json.dumps({"test": "result"}))
    
except Exception as e:
    print(f"ERROR: {e}", file=sys.stderr)
    sys.stderr.flush()
