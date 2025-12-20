# Website Speed Optimization Plan

## 🎯 Current Issues Found:

### 1. **Database Queries (Slow)**
- ❌ Homepage: 2 separate queries (users + total amount)
- ❌ Multiple pages: Repeated `payment.select('amount')` query
- ❌ No database indexes on frequently queried columns
- ❌ Chanda page: Full table scan with grouping in JS
- ❌ Expenses page: Multiple queries for stats

### 2. **File System Operations (Very Slow)**
- ❌ Homepage: Checking image existence for EVERY user (fs.existsSync in loop)
- ❌ Blocking server-side rendering

### 3. **No Caching**
- ❌ Total amount calculated on every page load
- ❌ Stats recalculated every time

---

## ✅ OPTIMIZATION SOLUTIONS:

### **Phase 1: Database Indexes (CRITICAL - Biggest Impact)**

```sql
-- 1. Payment table indexes
CREATE INDEX idx_payment_user_id ON payment(user_id);
CREATE INDEX idx_payment_year_month ON payment(year, month);
CREATE INDEX idx_payment_amount ON payment(amount);

-- 2. User list indexes
CREATE INDEX idx_user_list_bakaya ON user_list(bakaya_month);
CREATE INDEX idx_user_list_frequency ON user_list(frequency);
CREATE INDEX idx_user_list_name ON user_list(name);

-- 3. Expenses indexes
CREATE INDEX idx_expenses_date ON expenses(date DESC);
CREATE INDEX idx_expenses_category ON expenses(category);

-- 4. Chanda indexes
CREATE INDEX idx_chanda_name ON db_chanda(name);
CREATE INDEX idx_chanda_hindi_name ON db_chanda(hindi_name);
CREATE INDEX idx_chanda_date ON db_chanda(date DESC);
```

**Expected Impact:** 50-70% faster queries

---

### **Phase 2: Database Views (Pre-calculated Data)**

```sql
-- View for total amount (no need to calculate every time)
CREATE MATERIALIZED VIEW mv_total_payment AS
SELECT SUM(amount) as total_amount
FROM payment;

-- Refresh strategy: Trigger on payment insert/update
CREATE OR REPLACE FUNCTION refresh_total_payment()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_total_payment;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_refresh_total
AFTER INSERT OR UPDATE OR DELETE ON payment
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_total_payment();
```

**Expected Impact:** 80-90% faster total amount queries

---

### **Phase 3: Optimize File System Checks**

**Current Problem:**
```typescript
// ❌ BAD: Checking file for every user
usersWithImages = sortedUsers.map(user => {
  const imagePath = path.join(process.cwd(), 'public', 'upload', 'small_image', `${user.id}.jpg`);
  return { ...user, hasImage: fs.existsSync(imagePath) };
});
```

**Solution 1: Cache image list**
```typescript
// ✅ GOOD: Check once, cache result
const imageFiles = fs.readdirSync(path.join(process.cwd(), 'public', 'upload', 'small_image'));
const imageSet = new Set(imageFiles);

usersWithImages = sortedUsers.map(user => ({
  ...user,
  hasImage: imageSet.has(`${user.id}.jpg`)
}));
```

**Solution 2: Store in database**
```sql
-- Add column to user_list
ALTER TABLE user_list ADD COLUMN has_image BOOLEAN DEFAULT FALSE;

-- Update when image uploaded
UPDATE user_list SET has_image = TRUE WHERE id = ?;
```

**Expected Impact:** 90% faster image checks

---

### **Phase 4: Query Optimization**

**Homepage - Combine queries:**
```typescript
// ❌ BAD: 2 separate queries
const users = await supabase.from('user_list').select('*');
const totalData = await supabase.from('payment').select('amount');

// ✅ GOOD: Use RPC or parallel queries
const [users, totalData] = await Promise.all([
  supabase.from('user_list').select('*'),
  supabase.rpc('get_total_amount') // Database function
]);
```

**Chanda Page - Use database aggregation:**
```sql
-- Create database function for grouping
CREATE OR REPLACE FUNCTION get_chanda_groups(search_term TEXT DEFAULT '')
RETURNS TABLE (
  name TEXT,
  total_amount NUMERIC,
  count BIGINT,
  latest_date TEXT,
  latest_remarks TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(hindi_name, name) as name,
    SUM(amount) as total_amount,
    COUNT(*) as count,
    MAX(date) as latest_date,
    (ARRAY_AGG(remarks ORDER BY id DESC))[1] as latest_remarks
  FROM db_chanda
  WHERE search_term = '' OR 
        name ILIKE '%' || search_term || '%' OR
        hindi_name ILIKE '%' || search_term || '%' OR
        remarks ILIKE '%' || search_term || '%'
  GROUP BY COALESCE(hindi_name, name)
  ORDER BY MAX(id) DESC;
END;
$$ LANGUAGE plpgsql;
```

**Expected Impact:** 60-80% faster chanda queries

---

### **Phase 5: Caching Strategy**

**1. Server-side caching:**
```typescript
// Use Next.js cache
import { unstable_cache } from 'next/cache';

const getTotalAmount = unstable_cache(
  async () => {
    const { data } = await supabase.from('payment').select('amount');
    return data?.reduce((sum, p) => sum + p.amount, 0) || 0;
  },
  ['total-amount'],
  { revalidate: 60 } // Cache for 60 seconds
);
```

**2. Client-side caching:**
```typescript
// Use React Query or SWR
import useSWR from 'swr';

const { data } = useSWR('/api/total', fetcher, {
  revalidateOnFocus: false,
  dedupingInterval: 60000 // 1 minute
});
```

**Expected Impact:** 95% faster on cached requests

---

### **Phase 6: Image Optimization**

**1. Use Next.js Image Optimization:**
```typescript
// Already using next/image - Good!
<Image src={...} width={50} height={50} priority={isPriority} />
```

**2. Lazy load images:**
```typescript
// Add loading="lazy" for non-priority images
<Image loading="lazy" ... />
```

**Expected Impact:** 30-40% faster page load

---

### **Phase 7: Code Splitting & Lazy Loading**

```typescript
// Lazy load heavy components
const PaymentTimeline = dynamic(() => import('@/components/PaymentTimeline'), {
  loading: () => <Skeleton />
});

const ImageModal = dynamic(() => import('@/components/ImageModal'));
```

**Expected Impact:** 20-30% faster initial load

---

## 📊 EXPECTED OVERALL IMPROVEMENTS:

| Optimization | Current | After | Improvement |
|--------------|---------|-------|-------------|
| Homepage Load | ~2-3s | ~0.5-0.8s | **70-75%** |
| Database Queries | ~500-800ms | ~50-150ms | **80-85%** |
| Image Checks | ~200-400ms | ~10-20ms | **95%** |
| Total Amount Query | ~300ms | ~10ms | **97%** |
| Chanda Page | ~1-2s | ~0.3-0.5s | **75-80%** |

---

## 🚀 IMPLEMENTATION PRIORITY:

### **HIGH PRIORITY (Do First):**
1. ✅ Add database indexes
2. ✅ Optimize file system checks
3. ✅ Create database functions for aggregations

### **MEDIUM PRIORITY:**
4. ✅ Add caching layer
5. ✅ Optimize queries with Promise.all

### **LOW PRIORITY:**
6. ✅ Code splitting
7. ✅ Image lazy loading

---

## 📝 NOTES:

- Database indexes have **ZERO** downside - always add them
- Materialized views need refresh strategy
- Caching needs invalidation strategy
- Test each optimization separately
- Monitor query performance with Supabase dashboard
