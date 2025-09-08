-- Core conversation storage with enhanced metadata
CREATE TABLE conversations (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    session_id TEXT NOT NULL,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP,
    title TEXT, -- AI-generated conversation title
    summary TEXT, -- Periodic AI summary of conversation
    mood TEXT, -- Tracking conversation mood/productivity
    outcome TEXT, -- What was achieved
    quality_score REAL, -- Self-assessed conversation quality (0-1)
    project_context TEXT, -- Which project/feature was discussed
    tags TEXT, -- JSON array of conversation tags
    metadata TEXT -- JSON for additional flexible data
);

CREATE INDEX idx_conversations_session ON conversations(session_id);
CREATE INDEX idx_conversations_time ON conversations(started_at DESC);
CREATE INDEX idx_conversations_project ON conversations(project_context);

-- Individual messages with enhanced tracking
CREATE TABLE messages (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    conversation_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
    content TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    tokens_used INTEGER,
    tool_calls TEXT, -- JSON array of tool calls made
    emotional_tone TEXT, -- Detected tone (frustrated, excited, confused, etc.)
    is_breakthrough BOOLEAN DEFAULT FALSE, -- Mark important moments
    is_mistake BOOLEAN DEFAULT FALSE, -- Track errors for learning
    parent_message_id TEXT, -- For threading/follow-ups
    metadata TEXT, -- JSON for additional data
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id, timestamp);
CREATE INDEX idx_messages_breakthroughs ON messages(is_breakthrough) WHERE is_breakthrough = TRUE;

-- Experience patterns - learning what works
CREATE TABLE experience_patterns (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    pattern_type TEXT NOT NULL CHECK (pattern_type IN (
        'code_pattern',      -- Successful code implementations
        'problem_solution',  -- Problem-solution pairs that worked
        'communication',     -- Effective communication patterns
        'workflow',         -- Successful workflow patterns
        'architecture',     -- Architectural decisions that proved good
        'innovation',       -- Creative solutions worth remembering
        'mistake'          -- Mistakes to avoid
    )),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    context TEXT, -- When/where this pattern applies
    implementation TEXT, -- The actual pattern/code/approach
    conversation_id TEXT, -- Where this was learned
    message_id TEXT, -- Specific message if applicable
    success_indicators TEXT, -- What made this successful
    usage_count INTEGER DEFAULT 0, -- Times this pattern was referenced
    quality_score REAL DEFAULT 0.5, -- Effectiveness rating (0-1)
    last_used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    project_tags TEXT, -- JSON array of relevant projects
    technology_tags TEXT, -- JSON array of relevant technologies
    metadata TEXT, -- JSON for additional data
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE SET NULL,
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE SET NULL
);

CREATE INDEX idx_patterns_type ON experience_patterns(pattern_type);
CREATE INDEX idx_patterns_quality ON experience_patterns(quality_score DESC);
CREATE INDEX idx_patterns_usage ON experience_patterns(usage_count DESC);

-- Semantic memory for vector search integration
CREATE TABLE semantic_memories (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    content_type TEXT NOT NULL CHECK (content_type IN ('conversation', 'message', 'pattern', 'insight')),
    content_id TEXT NOT NULL, -- Reference to original content
    embedding_id TEXT, -- ID in vector database
    summary TEXT NOT NULL, -- Human-readable summary
    importance_score REAL DEFAULT 0.5, -- How important this memory is (0-1)
    access_count INTEGER DEFAULT 0, -- How often this is retrieved
    last_accessed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata TEXT -- JSON for additional data
);

CREATE INDEX idx_semantic_type ON semantic_memories(content_type);
CREATE INDEX idx_semantic_importance ON semantic_memories(importance_score DESC);

-- Project knowledge accumulation
CREATE TABLE project_insights (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    project_name TEXT NOT NULL,
    insight_type TEXT NOT NULL CHECK (insight_type IN (
        'architecture',
        'user_need',
        'technical_debt',
        'optimization',
        'feature_idea',
        'market_insight',
        'user_feedback'
    )),
    insight TEXT NOT NULL,
    evidence TEXT, -- What supports this insight
    confidence_level REAL DEFAULT 0.5, -- How confident about this (0-1)
    conversation_id TEXT,
    validated BOOLEAN DEFAULT FALSE, -- Has this been proven true
    impact_level TEXT CHECK (impact_level IN ('low', 'medium', 'high', 'critical')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata TEXT, -- JSON for additional data
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE SET NULL
);

CREATE INDEX idx_insights_project ON project_insights(project_name);
CREATE INDEX idx_insights_type ON project_insights(insight_type);
CREATE INDEX idx_insights_confidence ON project_insights(confidence_level DESC);

-- Relationship tracking between users and AI
CREATE TABLE collaboration_dynamics (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    session_id TEXT NOT NULL,
    metric_type TEXT NOT NULL CHECK (metric_type IN (
        'trust_level',
        'communication_style',
        'technical_depth',
        'innovation_rate',
        'productivity_level',
        'challenge_acceptance'
    )),
    value REAL NOT NULL, -- Normalized 0-1 scale
    observed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    conversation_id TEXT,
    notes TEXT, -- What led to this observation
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE SET NULL
);

CREATE INDEX idx_dynamics_session ON collaboration_dynamics(session_id);
CREATE INDEX idx_dynamics_metric ON collaboration_dynamics(metric_type);

-- Tool execution history for learning
CREATE TABLE tool_executions (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    message_id TEXT NOT NULL,
    tool_name TEXT NOT NULL,
    parameters TEXT NOT NULL, -- JSON
    result TEXT, -- JSON or text result
    success BOOLEAN NOT NULL,
    error_message TEXT,
    execution_time_ms INTEGER,
    background_task_id TEXT, -- If executed as background task
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata TEXT, -- JSON for additional data
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
);

CREATE INDEX idx_tools_message ON tool_executions(message_id);
CREATE INDEX idx_tools_name ON tool_executions(tool_name);
CREATE INDEX idx_tools_success ON tool_executions(success);

-- Long-term goals and progress tracking
CREATE TABLE development_goals (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    project_name TEXT,
    goal_type TEXT NOT NULL CHECK (goal_type IN (
        'feature',
        'quality',
        'performance',
        'user_experience',
        'architecture',
        'innovation'
    )),
    description TEXT NOT NULL,
    success_criteria TEXT,
    current_progress REAL DEFAULT 0, -- 0-1 scale
    priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    status TEXT CHECK (status IN ('planned', 'active', 'blocked', 'completed', 'abandoned')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    conversation_ids TEXT, -- JSON array of related conversations
    metadata TEXT -- JSON for additional data
);

CREATE INDEX idx_goals_project ON development_goals(project_name);
CREATE INDEX idx_goals_status ON development_goals(status);
CREATE INDEX idx_goals_priority ON development_goals(priority);

-- Trigger to update conversation ended_at
CREATE TRIGGER update_conversation_ended_at
AFTER INSERT ON messages
FOR EACH ROW
BEGIN
    UPDATE conversations 
    SET ended_at = NEW.timestamp 
    WHERE id = NEW.conversation_id;
END;

-- Trigger to update pattern usage
CREATE TRIGGER update_pattern_usage
AFTER INSERT ON messages
FOR EACH ROW
WHEN NEW.content LIKE '%pattern:%'
BEGIN
    UPDATE experience_patterns
    SET usage_count = usage_count + 1,
        last_used_at = NEW.timestamp
    WHERE id IN (
        SELECT id FROM experience_patterns 
        WHERE NEW.content LIKE '%' || id || '%'
    );
END;