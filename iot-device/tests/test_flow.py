"""Quick test: ทดสอบ full flow ของ Pi (ไม่ต้องมีกล้อง/เน็ต)"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from session_manager import SessionManager
from scoring.calculator import ScoreCalculator
from size.estimator import SizeEstimator

s = SessionManager()
s.start("BIN-001", "u123", "Test User")

calc = ScoreCalculator()
est = SizeEstimator()

# จำลองหยอดขยะ 3 ชิ้น
test_items = ["CLEAR_BOTTLE", "ALUMINUM_CAN", "GLASSES_BOTTLE"]

for t in test_items:
    ml = est.get_size_ml(150)
    result = calc.calculate(t, ml)
    s.add_item(t, ml, result["weight"], result["score"])

summary = s.get_summary()
print(f"Total Items : {summary['totalItems']}")
print(f"Total ML    : {summary['totalMl']}")
print(f"Total Score : {summary['totalScore']}")
print()

payload = s.to_payload()
print(f"Payload keys: {list(payload.keys())}")
for item in payload["items"]:
    print(f"  - {item['type']} | {item['ml']}ml | score={item['score']}")

print("\n[OK] All modules working correctly!")
