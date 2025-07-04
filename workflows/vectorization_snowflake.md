## How to
- Precondition: Create trial account
- Open workspace to perform SQL queries x Or click it manually in UI
### 1. Create DB and Schema
```sql
-- Create your working database
CREATE DATABASE IF NOT EXISTS GITHUB_VECTORIZATION;
USE DATABASE GITHUB_VECTORIZATION;

-- Create schema for your work
CREATE SCHEMA IF NOT EXISTS REPO_ANALYSIS;
USE SCHEMA REPO_ANALYSIS;

-- Check if you have Cortex access
SELECT SNOWFLAKE.CORTEX.EMBED_TEXT_768('snowflake-arctic-embed-m-v1.5', 'test') as test_embedding;
```

The CORTEX_USER database role in the SNOWFLAKE database includes the privileges that allow users to call Snowflake Cortex AI functions. By default, the CORTEX_USER role is granted to the PUBLIC role.

### 2. Github repo integration
- Precondition: Github access token needed
```sql
-- 1. Create the secret with PAT
CREATE OR REPLACE SECRET github_secret
    TYPE = password
    USERNAME = 'your-github-username'
    PASSWORD = 'ghp_xxxxxxxxxxxxxxxxxxxx';  -- Your GitHub PAT

-- 2. Create API Integration
CREATE OR REPLACE API INTEGRATION github_api_integration
    API_PROVIDER = git_https_api
    API_ALLOWED_PREFIXES = ('https://github.com/your-username/')
    ALLOWED_AUTHENTICATION_SECRETS = (github_secret)
    ENABLED = TRUE;

-- 3. Grant usage on the secret
GRANT USAGE ON SECRET github_secret TO ROLE ACCOUNTADMIN;

-- 4. Create Git Repository
CREATE OR REPLACE GIT REPOSITORY my_github_repo
    API_INTEGRATION = github_api_integration
    GIT_CREDENTIALS = github_secret
    ORIGIN = 'https://github.com/your-username/your-repo.git';

-- 5. Fetch the repository
ALTER GIT REPOSITORY my_github_repo FETCH;

-- 6. Verify it works
LIST @my_github_repo/branches/main/;
```

### 3. Vector storage
```sql
-- Create table to store repository files and their embeddings
CREATE OR REPLACE TABLE repo_files (
    file_path STRING,
    file_content TEXT,
    file_type STRING,
    file_size NUMBER,
    embedding_vector VECTOR(FLOAT, 768),  -- Using 768-dimensional embeddings
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
);

-- Create table for search queries and results
CREATE OR REPLACE TABLE search_queries (
    query_id STRING DEFAULT UUID_STRING(),
    query_text STRING,
    query_embedding VECTOR(FLOAT, 768),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
);
```

Snowflake Cortex functions to use
- **EMBED_TEXT_768** - Recommended goto embedding model
- **EMBED_TEXT_1024**
- Vector similarity functions: VECTOR_INNER_PRODUCT, VECTOR_L1_distance, VECTOR_L2_DISTANCE, and VECTOR_COSINE_SIMILARITY

## n8n nodes
- **Embedding node**
- **Search node**
### 1. Repository identification
- `repository_url` - Unique identifier for each repository
- `repository_stage` - Name of the Snowflake Git repository stage
- Composite Primary Key on (repository_url, file_path) to ensure uniqueness

Repository-specific vector search:
```sql 
WHERE rf.repository_url = $target_repo 
```

The updated nodes now require these input parameters:

- **Embedding Node:** `repo_stage_name`, `repo_url`
- **Search Node:** `search_query`, `repository_url`
### 2. Nodes definition
- Precondition: Snowflake credential ID needed

```json
{
  "embedding_node": {
    "name": "GitHub Repository Embedder",
    "type": "n8n-nodes-base.snowflake",
    "typeVersion": 1,
    "position": [640, 300],
    "parameters": {
      "operation": "executeQuery",
      "query": "-- GitHub Repository Vectorization Workflow\n-- Step 1: Sync repository stage with latest changes\nALTER GIT REPOSITORY my_repo_stage FETCH;\n\n-- Step 2: Process and embed repository files\nWITH file_list AS (\n  -- List all files from the repository stage\n  SELECT \n    \"name\" as file_path,\n    \"size\" as file_size,\n    CASE \n      WHEN RIGHT(\"name\", 3) = '.py' THEN 'python'\n      WHEN RIGHT(\"name\", 3) = '.js' THEN 'javascript'\n      WHEN RIGHT(\"name\", 3) = '.ts' THEN 'typescript'\n      WHEN RIGHT(\"name\", 4) = '.sql' THEN 'sql'\n      WHEN RIGHT(\"name\", 3) = '.md' THEN 'markdown'\n      WHEN RIGHT(\"name\", 5) = '.json' THEN 'json'\n      WHEN RIGHT(\"name\", 4) = '.txt' THEN 'text'\n      ELSE 'other'\n    END as file_type\n  FROM TABLE(result_scan(last_query_id()))\n  WHERE \"name\" NOT LIKE '.git%'\n    AND \"name\" NOT LIKE '%.png'\n    AND \"name\" NOT LIKE '%.jpg'\n    AND \"name\" NOT LIKE '%.jpeg'\n    AND \"name\" NOT LIKE '%.gif'\n    AND \"name\" NOT LIKE '%.svg'\n    AND \"name\" NOT LIKE '%.ico'\n    AND \"name\" NOT LIKE 'node_modules%'\n    AND \"name\" NOT LIKE '.env%'\n    AND \"size\" < 100000  -- Skip very large files\n),\nfile_contents AS (\n  -- Read file contents (this would need to be implemented with a UDF)\n  -- For now, we'll simulate with file metadata\n  SELECT \n    file_path,\n    CONCAT('File: ', file_path, ' Type: ', file_type, ' Size: ', file_size) as file_content,\n    file_type,\n    file_size\n  FROM file_list\n)\n-- Insert or update embeddings\nMERGE INTO repo_files AS target\nUSING (\n  SELECT \n    file_path,\n    file_content,\n    file_type,\n    file_size,\n    SNOWFLAKE.CORTEX.EMBED_TEXT_768(\n      'snowflake-arctic-embed-m-v1.5', \n      file_content\n    ) as embedding_vector\n  FROM file_contents\n) AS source\nON target.file_path = source.file_path\nWHEN MATCHED THEN \n  UPDATE SET \n    file_content = source.file_content,\n    file_type = source.file_type,\n    file_size = source.file_size,\n    embedding_vector = source.embedding_vector,\n    updated_at = CURRENT_TIMESTAMP()\nWHEN NOT MATCHED THEN \n  INSERT (file_path, file_content, file_type, file_size, embedding_vector)\n  VALUES (source.file_path, source.file_content, source.file_type, source.file_size, source.embedding_vector);\n\n-- Return summary of processed files\nSELECT \n  COUNT(*) as total_files_processed,\n  COUNT(DISTINCT file_type) as unique_file_types,\n  AVG(file_size) as avg_file_size,\n  MAX(updated_at) as last_processed\nFROM repo_files;",
      "additionalFields": {
        "mode": "execute"
      }
    },
    "credentials": {
      "snowflake": {
        "id": "your_snowflake_credential_id",
        "name": "Snowflake account"
      }
    }
  },
  "search_node": {
    "name": "Vector Search Query",
    "type": "n8n-nodes-base.snowflake",
    "typeVersion": 1,
    "position": [640, 500],
    "parameters": {
      "operation": "executeQuery",
      "query": "-- Vector Search Query for Repository Content\n-- Input parameter: search_query (passed from previous node)\nWITH search_embedding AS (\n  SELECT SNOWFLAKE.CORTEX.EMBED_TEXT_768(\n    'snowflake-arctic-embed-m-v1.5',\n    '{{ $json.search_query }}'\n  ) as query_vector\n),\nsimilarity_search AS (\n  SELECT \n    rf.file_path,\n    rf.file_content,\n    rf.file_type,\n    rf.file_size,\n    VECTOR_COSINE_SIMILARITY(\n      rf.embedding_vector, \n      se.query_vector\n    ) as similarity_score\n  FROM repo_files rf\n  CROSS JOIN search_embedding se\n  WHERE rf.embedding_vector IS NOT NULL\n),\nranked_results AS (\n  SELECT \n    *,\n    ROW_NUMBER() OVER (ORDER BY similarity_score DESC) as rank\n  FROM similarity_search\n  WHERE similarity_score > 0.3  -- Minimum similarity threshold\n)\n-- Return top 10 most similar files\nSELECT \n  rank,\n  file_path,\n  SUBSTRING(file_content, 1, 200) as content_preview,\n  file_type,\n  file_size,\n  ROUND(similarity_score, 4) as similarity_score\nFROM ranked_results\nWHERE rank <= 10\nORDER BY similarity_score DESC;\n\n-- Also log the query for future reference\nINSERT INTO search_queries (query_text, query_embedding)\nSELECT \n  '{{ $json.search_query }}',\n  query_vector\nFROM search_embedding;",
      "additionalFields": {
        "mode": "execute"
      }
    },
    "credentials": {
      "snowflake": {
        "id": "your_snowflake_credential_id",
        "name": "Snowflake account"
      }
    }
  },
  "setup_instructions": {
    "description": "Complete setup instructions for GitHub repository vectorization",
    "prerequisites": [
      "Snowflake account with Cortex access",
      "GitHub repository to vectorize",
      "GitHub Personal Access Token",
      "n8n instance with Snowflake nodes"
    ],
    "setup_steps": [
      {
        "step": 1,
        "title": "Database Setup",
        "sql": "CREATE DATABASE IF NOT EXISTS GITHUB_VECTORIZATION;\nUSE DATABASE GITHUB_VECTORIZATION;\nCREATE SCHEMA IF NOT EXISTS REPO_ANALYSIS;\nUSE SCHEMA REPO_ANALYSIS;"
      },
      {
        "step": 2,
        "title": "GitHub Integration",
        "sql": "-- Create secret\nCREATE OR REPLACE SECRET github_secret\n  TYPE = GENERIC_STRING\n  SECRET_STRING = '{\"username\": \"your_github_username\", \"password\": \"your_personal_access_token\"}';\n\n-- Create API integration\nCREATE OR REPLACE API INTEGRATION github_api_integration\n  API_PROVIDER = git_https_api\n  API_ALLOWED_PREFIXES = ('https://github.com/your-username')\n  ALLOWED_AUTHENTICATION_SECRETS = (github_secret)\n  ENABLED = TRUE;\n\n-- Create repository stage\nCREATE OR REPLACE GIT REPOSITORY my_repo_stage\n  API_INTEGRATION = github_api_integration\n  GIT_CREDENTIALS = github_secret\n  ORIGIN = 'https://github.com/your-username/your-repository.git';"
      },
      {
        "step": 3,
        "title": "Create Tables",
        "sql": "-- Repository files table\nCREATE OR REPLACE TABLE repo_files (\n    file_path STRING,\n    file_content TEXT,\n    file_type STRING,\n    file_size NUMBER,\n    embedding_vector VECTOR(FLOAT, 768),\n    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),\n    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()\n);\n\n-- Search queries table\nCREATE OR REPLACE TABLE search_queries (\n    query_id STRING DEFAULT UUID_STRING(),\n    query_text STRING,\n    query_embedding VECTOR(FLOAT, 768),\n    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP()\n);"
      }
    ],
    "usage_notes": [
      "The embedding node should be triggered when you want to sync and vectorize repository changes",
      "The search node requires a 'search_query' input parameter from a previous node",
      "Adjust similarity threshold (0.3) based on your requirements",
      "Consider file size limits and filtering for optimal performance",
      "Monitor Cortex function usage for cost management"
    ],
    "advanced_features": {
      "file_content_reading": {
        "note": "To read actual file contents from Git repository stage, you'll need a custom UDF",
        "example_udf": "CREATE OR REPLACE FUNCTION read_git_file(stage_name STRING, file_path STRING)\nRETURNS STRING\nLANGUAGE PYTHON\nRUNTIME_VERSION = 3.8\nHANDLER = 'read_file'\nAS $$\nimport _snowflake\ndef read_file(stage_name, file_path):\n    session = _snowflake.get_active_session()\n    # Implementation to read file from stage\n    return file_content\n$$;"
      },
      "chunking_strategy": {
        "note": "For large files, implement text chunking using SPLIT_TEXT_RECURSIVE_CHARACTER",
        "example": "SELECT SNOWFLAKE.CORTEX.SPLIT_TEXT_RECURSIVE_CHARACTER(file_content, 1000, 200) as chunks"
      },
      "batch_processing": {
        "note": "Process files in batches to optimize performance and manage token costs",
        "recommendation": "Process 50-100 files per batch depending on file sizes"
      }
    }
  },
  "example_workflows": {
    "daily_sync": {
      "description": "Daily repository synchronization workflow",
      "trigger": "Schedule Trigger (daily at 2 AM)",
      "nodes": [
        "Schedule Trigger",
        "GitHub Repository Embedder",
        "Slack notification (optional)"
      ]
    },
    "search_api": {
      "description": "API endpoint for vector search",
      "trigger": "Webhook (POST /search)",
      "nodes": [
        "Webhook",
        "Vector Search Query",
        "Response formatting",
        "HTTP Response"
      ]
    },
    "github_webhook": {
      "description": "Real-time sync on repository changes",
      "trigger": "GitHub webhook on push",
      "nodes": [
        "GitHub webhook",
        "GitHub Repository Embedder",
        "Notification"
      ]
    }
  }
}
```