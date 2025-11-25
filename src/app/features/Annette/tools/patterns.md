## List of tools

### Status tools
- get_recent_events
- get_latest_event_by_title
- get_project_goals
- get_untested_implementation_logs

### Data retrieval tools
- get_implementation_log_details
- read_file_content
- search_files
- get_project_contexts
- get_context_details
- get_project_ideas
- get_all_projects
- get_folder_structure

#### Todos
- Better description of purpose, parameters and return values
- Events: src\app\db\repositories\event.repository.ts
- Contexts: src\app\db\repositories\context.repository.ts
- Ideas: src\app\db\repositories\idea.repository.ts
- Projects: src\app\db\repositories\project.repository.ts
- Implementation logs: src\app\db\repositories\implementation_log.repository.ts


### Data modification tools
- evaluate_goal_progress

#### Todos
- Do not extend manipulation tools until retrieval tools are evaluated correctly by AI

## AI actions
There are three types of user requests in src\app\features\Annette\sub_VoiceInterface\AnnetteTestButtons.tsx:
1. Status - Number of implemented tasks per get_untested_implementation_logs. Number larger than 0 requires user's review
- Expected to receive audio message with number of implemented tasks
2. Next Step - src\app\features\Annette\prompts\nextStepRecommendation.ts
- Expected to receive audio message with recommendation
3. Analyze - Get information about context and propose next step (Refactoring, Fix, Improve) - get_context_details
- Expected to receive audio message with recommendation and action buttons should be dynamically change in src\app\features\Annette\sub_VoiceInterface\AnnetteTestButtons.tsx (new store will be needed, interface with AI needs to be designed so metadata is correctly structured and separated from audio message). LLM should ask whether to generate requirement file for coding and display new action buttons:
- Yes
- No

Both buttons will be dummy for now and will reset buttons into default state