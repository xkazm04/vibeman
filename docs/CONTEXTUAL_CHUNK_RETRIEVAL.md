# Contextual Chunk Retrieval: Parent-Child Architecture

## Problem Statement

Current chunking creates a fundamental tension:

- **Small chunks** (200-400 tokens): High precision in vector search, but retrieved text often lacks surrounding context needed for accurate answers
- **Large chunks** (1000+ tokens): Better context for LLM, but vector embeddings become diluted, reducing retrieval precision

This is visible in production: the LLM sometimes generates incomplete or misleading answers because the retrieved chunk captures the right topic but misses critical details from adjacent paragraphs.

## Parent-Child Architecture Design

### Core Concept

Store and search on **child chunks** (small, precise), but retrieve **parent chunks** (larger, contextual) for the LLM.

```
Document
  |
  +-- Parent Chunk 1 (800-1200 tokens)
  |     |
  |     +-- Child Chunk 1a (200-400 tokens) [embedded, searched]
  |     +-- Child Chunk 1b (200-400 tokens) [embedded, searched]
  |     +-- Child Chunk 1c (200-400 tokens) [embedded, searched]
  |
  +-- Parent Chunk 2 (800-1200 tokens)
        |
        +-- Child Chunk 2a (200-400 tokens) [embedded, searched]
        +-- Child Chunk 2b (200-400 tokens) [embedded, searched]
```

- **Child chunks** are embedded and stored in Milvus for vector search (current behavior)
- **Parent chunks** are stored in PostgreSQL with a mapping to their children
- At retrieval time, when a child chunk matches, the full parent chunk is returned to the LLM

### How It Integrates with LLM_CONTEXTUAL Parsing

The current `LLM_CONTEXTUAL` pipeline in `contextual_parsing.py` already:
1. Splits text into ~400 token chunks
2. Enriches each chunk with hypothetical questions and keywords
3. Embeds the enriched text in Milvus

The parent-child architecture adds a layer between steps 1 and 2:

1. **First pass**: Split text into **parent chunks** (~1000 tokens, respecting section boundaries)
2. **Second pass**: Split each parent into **child chunks** (~400 tokens, current behavior)
3. Enrich child chunks (existing pipeline)
4. Embed child chunks in Milvus (existing pipeline)
5. **New**: Store parent-child mapping in PostgreSQL

## Storage Schema Changes

### PostgreSQL

Add `parent_chunk_id` column to the chunks table:

```sql
ALTER TABLE chunks ADD COLUMN parent_chunk_id INTEGER REFERENCES chunks(id);
```

Parent chunks are stored as regular chunks but with a flag or different `chunk_type`:

```sql
ALTER TABLE chunks ADD COLUMN chunk_type VARCHAR(20) DEFAULT 'standard';
-- chunk_type: 'standard' (current), 'parent', 'child'
```

### Milvus

Add `parent_chunk_id` to Milvus metadata fields:

```python
# In collection schema
FieldSchema(name="parent_chunk_id", dtype=DataType.INT64, default_value=0)
```

Only **child chunks** get embedded in Milvus. Parent chunks are stored in PostgreSQL only.

## Retrieval Flow Modification

### Current Flow
```
Query -> Embed -> Milvus Search -> Get chunk texts -> LLM
```

### New Flow
```
Query -> Embed -> Milvus Search (child chunks)
                       |
                       v
              Get parent_chunk_ids from results
                       |
                       v
              Fetch parent chunk texts from PostgreSQL
                       |
                       v
              Deduplicate parents (multiple children may map to same parent)
                       |
                       v
              LLM (with full parent context)
```

### Key Behavior Changes

1. **Search stays precise**: Vector search still operates on small, focused child chunks
2. **Context expands automatically**: Retrieved text for LLM is 2-3x larger per result
3. **Deduplication**: If multiple child chunks from the same parent match, only one parent is sent to LLM
4. **Score propagation**: Parent inherits the best child score for ranking

## Implementation Roadmap

### Phase 1: Schema + Storage (Low risk)
- Add `parent_chunk_id` and `chunk_type` columns to PostgreSQL
- Update chunk creation to support parent-child relationships
- Backward compatible: existing chunks default to `chunk_type='standard'`

### Phase 2: Chunking Pipeline (Medium risk)
- Modify `contextual_parsing.py` to create parent chunks first
- Split parents into children, maintaining the mapping
- Enrich and embed only children (existing pipeline)
- Store parent texts in PostgreSQL

### Phase 3: Retrieval Modification (Medium risk)
- Update `search_agentic_vector_filtered()` and `search_hybrid_bm25()` in `search_enhanced.py`
- After Milvus returns child chunk IDs, resolve to parent chunks
- Deduplicate and rank parents by best child score
- Return parent texts instead of child texts

### Phase 4: A/B Testing
- Add `use_parent_chunks: bool = False` parameter to `QARequest`
- Compare answer quality: child-only vs parent retrieval
- Measure token usage impact (parents are larger)

## Expected Improvements

| Metric | Current | Expected with Parent-Child |
|--------|---------|---------------------------|
| Answer completeness | ~70% | ~85-90% |
| Context per result | ~400 tokens | ~1000 tokens |
| Search precision | High | Same (child-level search) |
| Token usage per query | ~4000 tokens | ~8000 tokens |
| Retrieval latency | ~200ms | ~220ms (+1 PostgreSQL lookup) |

## Risks and Mitigations

- **Increased token usage**: Mitigate by reducing `top_k` (fewer but more contextual chunks)
- **Parent boundary quality**: Use section headings and paragraph breaks as natural boundaries
- **Migration complexity**: Phase 1 is backward compatible; existing chunks continue to work
- **Spreadsheet chunks**: Sheet-aware chunking already produces large chunks; may not benefit from parent-child. Handle as special case.
