-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Goals table
CREATE TABLE goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id VARCHAR(255) NOT NULL, -- References the local project ID
    order_index INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'done')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Backlog items table (combines BacklogProposal and CustomBacklogItem)
CREATE TABLE backlog_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id VARCHAR(255) NOT NULL, -- References the local project ID
    goal_id UUID REFERENCES goals(id) ON DELETE SET NULL, -- Optional relation to goals
    agent VARCHAR(50) NOT NULL CHECK (agent IN ('developer', 'mastermind', 'tester', 'artist', 'custom')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'in_progress')),
    type VARCHAR(20) NOT NULL DEFAULT 'proposal' CHECK (type IN ('proposal', 'custom')),
    impacted_files TEXT[], -- Array of file/folder paths
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    accepted_at TIMESTAMP WITH TIME ZONE,
    rejected_at TIMESTAMP WITH TIME ZONE
);

-- Event log table
CREATE TABLE event_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id VARCHAR(255) NOT NULL, -- References the local project ID
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('info', 'warning', 'error', 'success', 'proposal_accepted', 'proposal_rejected')),
    agent VARCHAR(50),
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX idx_goals_project_id ON goals(project_id);
CREATE INDEX idx_goals_status ON goals(status);
CREATE INDEX idx_goals_order ON goals(project_id, order_index);

CREATE INDEX idx_backlog_items_project_id ON backlog_items(project_id);
CREATE INDEX idx_backlog_items_goal_id ON backlog_items(goal_id);
CREATE INDEX idx_backlog_items_status ON backlog_items(status);
CREATE INDEX idx_backlog_items_agent ON backlog_items(agent);
CREATE INDEX idx_backlog_items_type ON backlog_items(type);

CREATE INDEX idx_event_log_project_id ON event_log(project_id);
CREATE INDEX idx_event_log_created_at ON event_log(created_at);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_goals_updated_at BEFORE UPDATE ON goals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_backlog_items_updated_at BEFORE UPDATE ON backlog_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security) policies
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE backlog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_log ENABLE ROW LEVEL SECURITY;

-- For now, allow all operations (you can restrict this based on your auth requirements)
CREATE POLICY "Allow all operations on goals" ON goals FOR ALL USING (true);
CREATE POLICY "Allow all operations on backlog_items" ON backlog_items FOR ALL USING (true);
CREATE POLICY "Allow all operations on event_log" ON event_log FOR ALL USING (true);

-- Insert sample data based on the mocked data
INSERT INTO goals (project_id, order_index, title, description, status) VALUES
('vibeman-app', 1, 'Setup Development Environment', 'Configure the development environment with proper tooling, linting, and testing frameworks. This includes setting up the repository structure, CI/CD pipeline, and development workflows.', 'done'),
('vibeman-app', 2, 'Core UI Components Library', 'Build a comprehensive library of reusable UI components including buttons, forms, modals, and navigation elements. Focus on accessibility and responsive design.', 'in_progress'),
('vibeman-app', 3, 'Advanced Features Integration', 'Implement advanced features like real-time collaboration, data visualization, and performance optimization. Include comprehensive testing and documentation.', 'open');

INSERT INTO backlog_items (project_id, agent, title, description, status, type, impacted_files) VALUES
('vibeman-app', 'developer', 'Optimize component re-renders', 'Implement React.memo and useCallback to reduce unnecessary re-renders in the tree structure. This will improve performance significantly, especially for large component trees.', 'pending', 'proposal', ARRAY['components', 'agent-manager', 'AgentManager.tsx', 'AgentButton.tsx']),
('vibeman-app', 'tester', 'Add unit tests for state management', 'Create comprehensive test suite covering all Zustand store actions and state mutations. Include edge cases and error scenarios.', 'pending', 'proposal', ARRAY['lib', 'store', 'app-store.ts', 'utils.ts']),
('vibeman-app', 'artist', 'Enhance accessibility features', 'Implement keyboard navigation and screen reader support for the code structure viewer. Add ARIA labels and focus management.', 'accepted', 'proposal', ARRAY['components', 'ui', 'GlowCard.tsx', 'Button.tsx', 'Input.tsx']),
('vibeman-app', 'mastermind', 'Integrate real-time collaboration', 'Add WebSocket support for multi-user agent coordination and shared state management. Include conflict resolution and synchronization.', 'pending', 'proposal', ARRAY['lib', 'api.ts', 'components', 'layout', 'MainLayout.tsx']),
('vibeman-app', 'developer', 'Implement code splitting', 'Add dynamic imports and lazy loading for better performance. Split routes and components to reduce initial bundle size.', 'accepted', 'proposal', ARRAY['components', 'layout', 'MainLayout.tsx', 'Sidebar.tsx']); 