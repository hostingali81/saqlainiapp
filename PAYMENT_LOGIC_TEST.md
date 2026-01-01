# Payment Allocation Logic - Complete Test Cases

## Test Scenarios

### Scenario 1: No Due Months
**Input:** ₹500, No due months
**Expected:** ₹500 → Current Month (Jan 2025)
**Months Cleared:** 1
**Bakaya Update:** bakaya_month - 1

### Scenario 2: One Time User
**Input:** ₹300, User frequency = "One Time"
**Expected:** ₹300 → Current Month (Jan 2025)
**Months Cleared:** 1
**Bakaya Update:** bakaya_month - 1

### Scenario 3: Single Due Month
**Input:** ₹150, Due: [Nov 2024]
**Expected:** ₹150 → Nov 2024
**Months Cleared:** 1
**Bakaya Update:** bakaya_month - 1

### Scenario 4: Amount 100-124 (Current Month in Due)
**Input:** ₹120, Due: [Nov 2024, Dec 2024, Jan 2025]
**Expected:** ₹120 → Jan 2025
**Months Cleared:** 1
**Bakaya Update:** bakaya_month - 1

### Scenario 5: Amount 100-124 (Current Month NOT in Due)
**Input:** ₹110, Due: [Nov 2024, Dec 2024]
**Expected:** ₹110 → Jan 2025 (new entry)
**Months Cleared:** 1
**Bakaya Update:** bakaya_month - 1

### Scenario 6: Exact 225 (1 old + current)
**Input:** ₹225, Due: [Dec 2024, Jan 2025]
**Expected:** 
- ₹125 → Dec 2024
- ₹100 → Jan 2025
**Total:** ₹225 ✅
**Months Cleared:** 2
**Bakaya Update:** bakaya_month - 2

### Scenario 7: Exact 351 (2 old + current)
**Input:** ₹351, Due: [Nov 2024, Dec 2024, Jan 2025]
**Expected:**
- ₹125 → Nov 2024
- ₹125 → Dec 2024
- ₹101 → Jan 2025
**Total:** ₹351 ✅
**Months Cleared:** 3
**Bakaya Update:** bakaya_month - 3

### Scenario 8: Amount 200 (Less than 225)
**Input:** ₹200, Due: [Nov 2024, Dec 2024, Jan 2025]
**Expected:** ₹200 → Nov 2024 (all to last old month)
**Total:** ₹200 ✅
**Months Cleared:** 1
**Bakaya Update:** bakaya_month - 1

### Scenario 9: Amount 400
**Input:** ₹400, Due: [Oct 2024, Nov 2024, Dec 2024, Jan 2025]
**Expected:**
- ₹125 → Oct 2024
- ₹125 → Nov 2024
- ₹150 → Jan 2025
**Total:** ₹400 ✅
**Months Cleared:** 3
**Bakaya Update:** bakaya_month - 3

### Scenario 10: Amount 476 (3 old + current)
**Input:** ₹476, Due: [Sep 2024, Oct 2024, Nov 2024, Dec 2024, Jan 2025]
**Expected:**
- ₹125 → Sep 2024
- ₹125 → Oct 2024
- ₹125 → Nov 2024
- ₹101 → Jan 2025
**Total:** ₹476 ✅
**Months Cleared:** 4
**Bakaya Update:** bakaya_month - 4

### Scenario 11: Amount 150 (Between 125-224)
**Input:** ₹150, Due: [Dec 2024, Jan 2025]
**Expected:** ₹150 → Dec 2024 (all to last old month, remaining < 100)
**Total:** ₹150 ✅
**Months Cleared:** 1
**Bakaya Update:** bakaya_month - 1

### Scenario 12: Current Month NOT in Due List
**Input:** ₹350, Due: [Oct 2024, Nov 2024, Dec 2024]
**Expected:**
- ₹125 → Oct 2024
- ₹125 → Nov 2024
- ₹100 → Jan 2025 (new entry)
**Total:** ₹350 ✅
**Months Cleared:** 3
**Bakaya Update:** bakaya_month - 3

### Scenario 13: Large Amount (All dues cleared)
**Input:** ₹1000, Due: [Oct 2024, Nov 2024, Dec 2024, Jan 2025]
**Expected:**
- ₹125 → Oct 2024
- ₹125 → Nov 2024
- ₹125 → Dec 2024
- ₹625 → Jan 2025
**Total:** ₹1000 ✅
**Months Cleared:** 4
**Bakaya Update:** bakaya_month - 4

## Critical Validations

### ✅ Total Amount Match
- Sum of all allocated amounts MUST equal input amount
- No rounding errors allowed

### ✅ Bakaya Month Update
- Decrement by NUMBER of months cleared (allocations.length)
- NOT by amount/125

### ✅ Database Insertion
- Each allocation creates ONE payment record
- Correct year, month, amount for each

### ✅ Google Sheet Entry
- One row per allocated month
- Correct timestamp, user name, amount, month, year, remarks

### ✅ Frontend Display
- Show correct allocation preview
- Green badges for allocated months
- Red badges for remaining due months

## Logic Rules

1. **Old months:** Get ₹125 each
2. **Current month:** Gets remaining (minimum ₹100)
3. **If remaining < ₹100:** Add to last old month
4. **If amount ₹100-124:** All to current month
5. **If single due month:** All to that month
6. **If no due months:** All to current month
7. **One Time users:** All to current month
