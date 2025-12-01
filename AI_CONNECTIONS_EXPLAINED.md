# AI Connections System - How It Works

## Database Storage

### Main Table: `testimony_edges`

AI connections are stored in the **`TestimonyEdge`** table (mapped to `testimony_edges` in the database).

```sql
CREATE TABLE testimony_edges (
  id SERIAL PRIMARY KEY,
  fromId INT NOT NULL,           -- Source testimony ID
  toId INT NOT NULL,             -- Connected testimony ID
  type VARCHAR NOT NULL,         -- Connection type 
  score FLOAT NOT NULL,          -- Connection strength (0.0 - 1.0)
  source VARCHAR,                -- How the connection was found
  createdAt TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (fromId) REFERENCES testimonies(id) ON DELETE CASCADE,
  FOREIGN KEY (toId) REFERENCES testimonies(id) ON DELETE CASCADE
);
```

### Connection Data Structure

```typescript
{
  id: 1,
  fromId: 42,           // Testimony #42
  toId: 15,             // Connected to Testimony #15
  type: "semantic_similarity",  // How they're connected
  score: 0.85,          // 85% similarity (85/100 accuracy)
  source: "embedding_comparison",
  createdAt: "2024-01-15T10:30:00Z"
}
```

## How Connections Are Created

### Step 1: Testimony Gets Approved

```
User submits testimony → Admin approves → AI Processing starts
```

### Step 2: AI Processing

When a testimony is approved, `TestimonyAiService.processTestimony()` runs:

1. **Transcribes** audio/video if needed
2. **Generates embeddings** (vectors) for:
   - `title`
   - `description`
   - `fullTestimony`
   - `transcript`
3. **Stores embeddings** in `testimony_embeddings` table

### Step 3: Connection Discovery

After embeddings are created, `TestimonyConnectionService.discoverConnections()` runs:

#### A. Semantic Similarity (AI-Based)
- Compares embedding vectors using **cosine similarity**
- Finds testimonies with similar content/themes
- Creates connections with type: `semantic_similarity`
- Score range: 0.7 - 1.0 (70-100% accuracy)

#### B. Rule-Based Connections
- **Same Event**: `same_event` (score: 0.9)
- **Same Location**: `same_location` (score: 0.8)
- **Same Person**: `same_person` (score: 0.85)
- **Same Person + Same Type**: `same_person_same_type` (score: 0.9)
- **Same Relation to Event**: `same_relation_to_event` (score: 0.75)
- **Same Date**: `same_date` (score: 0.95)
- **Same Month**: `same_month` (score: 0.8)
- **Same Year**: `same_year` (score: 0.7)
- **Overlapping Dates**: `overlapping_dates` (score: 0.6-0.75)
- **Nearby Dates**: `nearby_dates` (score: 0.5-0.7)

### Step 4: Store Connections

All discovered connections are saved to `testimony_edges` table:

```typescript
await prisma.testimonyEdge.createMany({
  data: [
    {
      fromId: 42,
      toId: 15,
      type: "semantic_similarity",
      score: 0.85,
      source: "embedding_comparison"
    },
    {
      fromId: 42,
      toId: 23,
      type: "same_event",
      score: 0.9,
      source: "shared_event_5"
    },
    // ... more connections
  ]
});
```

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Testimony Table                       │
│  ┌────────┐  ┌────────┐  ┌────────┐                    │
│  │   ID   │  │ Title  │  │ Status │  ...                │
│  └────────┘  └────────┘  └────────┘                    │
└─────────────────────────────────────────────────────────┘
           │                                    │
           │                                    │
           ▼                                    ▼
┌─────────────────────────┐      ┌─────────────────────────┐
│ testimony_embeddings    │      │ testimony_edges         │
│ ┌──────────┐           │      │ ┌─────────────────────┐ │
│ │ Vector   │           │      │ │ fromId: 42          │ │
│ │ [0.1,    │           │      │ │ toId: 15            │ │
│ │  0.3,    │           │      │ │ type: "semantic"    │ │
│ │  ...]    │           │      │ │ score: 0.85         │ │
│ └──────────┘           │      │ └─────────────────────┘ │
└─────────────────────────┘      └─────────────────────────┘
```

## Querying Connections

### Get Related Testimonies

```typescript
// Service method
async getRelated(testimonyId: number) {
  const edges = await prisma.testimonyEdge.findMany({
    where: {
      fromId: testimonyId,  
      to: {
        status: 'approved',
        isPublished: true
      }
    },
    include: {
      to: {
        include: {
          images: true,
          user: true
        }
      }
    },
    orderBy: { score: 'desc' }  // Best matches first
  });
  
  return edges.map(edge => ({
    ...edge.to,  // The connected testimony
    connectionDetails: {
      accuracyScore: Math.round(edge.score * 100),  // Convert to 0-100
      connectionType: edge.type,
      connectionReason: "..."
    }
  }));
}
```

### Example Query Result

```sql
SELECT 
  te.id,
  te.fromId,
  te.toId,
  te.type,
  te.score,
  t.eventTitle,
  t.summary
FROM testimony_edges te
JOIN testimonies t ON te.toId = t.id
WHERE te.fromId = 42
  AND t.status = 'approved'
  AND t.isPublished = true
ORDER BY te.score DESC
LIMIT 5;
```

Result:
```
id | fromId | toId | type              | score | eventTitle
1  | 42     | 15   | semantic_similarity | 0.85 | "Related Event"
2  | 42     | 23   | same_event          | 0.9  | "Same Event"
3  | 42     | 7    | same_location       | 0.8  | "Same Place"
```

## Connection Types Reference

| Type | Score | Description |
|------|-------|-------------|
| `semantic_similarity` | 0.7-1.0 | AI found similar content/themes |
| `same_event` | 0.9 | Share the same event |
| `same_location` | 0.8 | Mention the same location |
| `same_person` | 0.85 | Mention the same person |
| `same_person_same_type` | 0.9 | Same person + same relationship type |
| `same_relation_to_event` | 0.75 | Both have same relation (e.g., both "Survivor") |
| `same_date` | 0.95 | Occurred on exact same date |
| `same_month` | 0.8 | Same month and year |
| `same_year` | 0.7 | Same year |
| `overlapping_dates` | 0.6-0.75 | Date ranges overlap |
| `nearby_dates` | 0.5-0.7 | Within 30 days of each other |

## Key Points

1. **Connections ARE stored in a table**: `testimony_edges` (via `TestimonyEdge` model)

2. **Bidirectional**: Connections are stored as directed edges (`fromId` → `toId`), but you can query both directions

3. **Automatic**: Connections are created automatically when:
   - A testimony is approved
   - Admin manually triggers connection discovery

4. **Score-based**: Each connection has a score (0.0-1.0) indicating strength/accuracy

5. **Multiple types**: One testimony can have multiple connection types to another (deduplicated, keeping highest score)

## API Endpoints

- `GET /testimonies/:id/related` - Get connected testimonies with accuracy scores
- `POST /testimonies/:id/discover-connections` - Manually trigger connection discovery (admin)

## Example: Finding Connections

```typescript
// Testimony #42 connects to:
- Testimony #15 (85% similarity - semantic)
- Testimony #23 (90% similarity - same event)
- Testimony #7 (80% similarity - same location)

// Stored as:
testimony_edges:
  { fromId: 42, toId: 15, type: "semantic_similarity", score: 0.85 }
  { fromId: 42, toId: 23, type: "same_event", score: 0.9 }
  { fromId: 42, toId: 7, type: "same_location", score: 0.8 }
```

