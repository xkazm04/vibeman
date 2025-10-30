const PROJECT_ID = 'dd11e61e-f267-4e52-95c5-421b1ed9567b';
const API_BASE = 'http://localhost:3000/api/contexts';

// Helper function to create/update context
async function upsertContext(contextId, data) {
  const url = contextId ? API_BASE : API_BASE;
  const method = contextId ? 'PUT' : 'POST';

  const body = contextId
    ? { contextId, updates: data }
    : { ...data, projectId: PROJECT_ID };

  const response = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  const result = await response.json();

  if (result.success) {
    console.log(`✓ ${contextId ? 'Updated' : 'Created'}: ${data.name || 'context'}`);
    return result.data;
  } else {
    console.error(`✗ Failed: ${data.name || 'context'}`, result.error);
    throw new Error(result.error);
  }
}

// Context definitions
const contexts = [
  // UPDATE: Faction Management System
  {
    id: 'ctx_1761330592434_6isjjcqxh',
    name: 'Faction Management System',
    groupId: 'group_1761406112905_uacq74cj6',
    description: `## Overview
Complete faction (organization/group) management system for tracking guilds, families, nations, corporations, and other collective entities within story projects. Provides full CRUD operations for factions, faction-to-character associations, faction-to-faction relationships, advanced branding customization, emblem design, media galleries, lore repositories, achievement systems, and timeline visualization. Enables writers to manage complex organizational dynamics, visual identity, and group affiliations with rich multimedia content.

## Key Capabilities
- Faction CRUD operations: Create, read, update, and delete faction entities
- Faction listing: Display all factions with member counts and metadata
- Faction detail view: Comprehensive faction profile showing members and relationships
- Character-to-faction associations: Link characters to factions as members
- Faction relationships: Track inter-faction dynamics (alliance, rivalry, trade, war)
- Faction filtering: Filter characters by faction membership
- Faction cards: Visual card representation of faction entities
- Faction creation forms: Modal-based faction creation wizard
- Faction types: Support categorization (guild, family, nation, corporation, etc.)
- **Faction branding panel**: Customize primary, secondary, and accent colors with theme tiers
- **Emblem designer**: Create custom emblems using templates (shield, crest, sigil, banner, badge, seal)
- **Media gallery**: Upload and manage faction media (logos, banners, emblems, screenshots, lore images)
- **Lore repository**: Organize faction lore by category (history, culture, conflicts, notable figures, traditions, values)
- **Achievement badges**: Track faction achievements with icons, earned dates, and member lists
- **Timeline view**: Visualize faction history with event timeline (founding, battles, alliances, treaties, expansions, declines)
- **Color customizer**: Fine-tune faction color schemes with hex color picker

## Architecture

### Component Breakdown
| Component/File | Purpose | Layer |
|----------------|---------|-------|
| \`src/app/features/characters/components/FactionsList.tsx\` | Faction listing component in character feature | UI |
| \`src/app/features/characters/components/CreateFactionForm.tsx\` | Faction creation modal form | UI |
| \`src/app/features/characters/sub_CharFactions/FactionsList.tsx\` | Faction list sub-feature | UI |
| \`src/app/features/characters/sub_CharFactions/FactionCard.tsx\` | Individual faction card display | UI |
| \`src/app/features/characters/sub_CharFactions/FactionDetails.tsx\` | Faction detail panel with members | UI |
| \`src/app/features/characters/sub_CharFactions/FactionBrandingPanel.tsx\` | Faction visual identity customization | UI |
| \`src/app/features/characters/sub_CharFactions/EmblemDesigner.tsx\` | Custom emblem creation with templates | UI |
| \`src/app/features/characters/sub_CharFactions/ColorCustomizer.tsx\` | Color scheme editor with hex picker | UI |
| \`src/app/features/characters/sub_CharFactions/FactionMediaGallery.tsx\` | Media upload and gallery management | UI |
| \`src/app/features/characters/sub_CharFactions/MediaUploadForm.tsx\` | Media file upload form | UI |
| \`src/app/features/characters/sub_CharFactions/LoreRepository.tsx\` | Lore content organization by category | UI |
| \`src/app/features/characters/sub_CharFactions/FactionLoreGallery.tsx\` | Lore image gallery display | UI |
| \`src/app/features/characters/sub_CharFactions/AchievementBadges.tsx\` | Achievement badge system | UI |
| \`src/app/features/characters/sub_CharFactions/TimelineView.tsx\` | Faction history timeline visualization | UI |
| \`src/app/types/Faction.ts\` | Faction interface and comprehensive types | Types |
| \`src/app/api/factions.ts\` | Faction API hooks and operations | API |
| \`src/app/api/factionRelationships.ts\` | Faction relationship API operations | API |

### Data Flow
User navigates to Factions tab → FactionsList loads → \`factionApi.useFactions(projectId)\` fetches factions → Faction cards render → User selects faction → FactionDetails panel opens → Display faction members via character filtering → User opens branding panel → ColorCustomizer and EmblemDesigner render → User uploads media → MediaUploadForm handles upload → FactionMediaGallery displays media → User adds lore → LoreRepository categorizes content → User creates achievement → AchievementBadges displays badges → User views timeline → TimelineView renders faction history → User creates faction relationship → \`factionRelationshipApi.createFactionRelationship()\` → Relationship stored → User creates new faction → CreateFactionForm modal → \`factionApi.createFaction()\` → New faction appears in list

### Key Dependencies
- External: React Query (data fetching), Framer Motion (animations), React (hooks), Lucide React (icons)
- Internal: Character API (for member associations), Project Store (selectedProject)

## Technical Details

### State Management
- **Server State**: React Query manages faction data with 5-minute cache
  - \`useFactions(projectId)\`: Fetch all factions for project
  - \`useFaction(id)\`: Fetch single faction details
  - \`useFactionRelationships(factionId)\`: Fetch relationships for faction
  - \`useFactionMedia(factionId)\`: Fetch faction media gallery
  - \`useFactionLore(factionId)\`: Fetch faction lore entries
  - \`useFactionAchievements(factionId)\`: Fetch faction achievements
  - \`useFactionEvents(factionId)\`: Fetch faction timeline events
- **No Client State**: No dedicated faction store, uses React component state for UI
- **Cascading Updates**: Faction changes trigger character list refetch (via faction_id field)

### API Endpoints
**Factions:**
- \`GET /factions/project/:projectId\` - List all factions in project
- \`GET /factions/:id\` - Get single faction details
- \`POST /factions\` - Create new faction (requires name, project_id; optional description, type, branding)
- \`PUT /factions/:id\` - Update faction (including branding colors and emblem)
- \`DELETE /factions/:id\` - Delete faction

**Faction Relationships:**
- \`GET /faction-relationships/faction/:factionId\` - List relationships for faction
- \`GET /faction-relationships/:id\` - Get single relationship details
- \`POST /faction-relationships\` - Create faction-to-faction relationship
- \`PUT /faction-relationships/:id\` - Update faction relationship
- \`DELETE /faction-relationships/:id\` - Delete faction relationship

**Faction Media (inferred):**
- \`GET /factions/:id/media\` - Get faction media gallery
- \`POST /factions/:id/media\` - Upload faction media
- \`DELETE /factions/:id/media/:mediaId\` - Delete media item

**Faction Lore (inferred):**
- \`GET /factions/:id/lore\` - Get faction lore entries
- \`POST /factions/:id/lore\` - Create lore entry
- \`PUT /factions/:id/lore/:loreId\` - Update lore entry
- \`DELETE /factions/:id/lore/:loreId\` - Delete lore entry

**Faction Achievements (inferred):**
- \`GET /factions/:id/achievements\` - Get faction achievements
- \`POST /factions/:id/achievements\` - Create achievement
- \`DELETE /factions/:id/achievements/:achievementId\` - Delete achievement

**Faction Events (inferred):**
- \`GET /factions/:id/events\` - Get faction timeline events
- \`POST /factions/:id/events\` - Create timeline event
- \`PUT /factions/:id/events/:eventId\` - Update event
- \`DELETE /factions/:id/events/:eventId\` - Delete event

### Database Tables
- **factions**: Faction data (id, name, description, type, project_id, logo_url, branding (JSON), created_at, updated_at)
- **faction_relationships**: Faction-to-faction relationships (id, faction_a_id, faction_b_id, relationship_type, description, created_at, updated_at)
- **faction_media**: Media files (id, faction_id, type (logo/banner/emblem/screenshot/lore), url, metadata, created_at)
- **faction_lore**: Lore entries (id, faction_id, title, content, category, created_at, updated_at)
- **faction_achievements**: Achievements (id, faction_id, title, description, icon_url, earned_date, members (JSON))
- **faction_events**: Timeline events (id, faction_id, title, description, date, event_type, created_at)
- **characters.faction_id**: Foreign key linking characters to factions

## Usage Examples

\`\`\`typescript
// Fetch all factions for a project
const { data: factions } = factionApi.useFactions(projectId);

// Fetch single faction
const { data: faction } = factionApi.useFaction(factionId);

// Create new faction with branding
await factionApi.createFaction({
  name: "The Silverhand Guild",
  project_id: projectId,
  description: "A guild of master craftsmen",
  type: "guild",
  branding: {
    primaryColor: "#3B82F6",
    secondaryColor: "#60A5FA",
    accentColor: "#DBEAFE",
    emblemStyle: "shield",
    bannerTemplate: "classic",
    themeTier: "epic"
  }
});

// Update faction branding
await factionApi.updateFaction(factionId, {
  branding: {
    primaryColor: "#10B981",
    secondaryColor: "#34D399",
    accentColor: "#D1FAE5"
  }
});

// Upload faction media
await factionApi.uploadMedia(factionId, {
  type: "emblem",
  file: emblemFile,
  metadata: { designer: "AI", style: "medieval" }
});

// Create lore entry
await factionApi.createLore(factionId, {
  title: "The Great Founding",
  content: "In the year 1247...",
  category: "history"
});

// Create achievement
await factionApi.createAchievement(factionId, {
  title: "First Victory",
  description: "Won the Battle of Silverkeep",
  icon_url: "/icons/trophy.png",
  earned_date: "2023-10-15",
  members: ["char_1", "char_2", "char_3"]
});

// Create timeline event
await factionApi.createEvent(factionId, {
  title: "The Founding of the Guild",
  description: "Master craftsmen united under one banner",
  date: "1247-03-15",
  event_type: "founding"
});

// Delete faction
await factionApi.deleteFaction(factionId);

// Fetch faction relationships
const { data: relationships } = factionRelationshipApi.useFactionRelationships(factionId);

// Create faction relationship
await factionRelationshipApi.createFactionRelationship({
  faction_a_id: factionId1,
  faction_b_id: factionId2,
  relationship_type: "alliance",
  description: "Trade alliance formed in Act 2"
});

// Get faction members (via character API)
const { data: members } = characterApi.useCharactersByFaction(factionId);
\`\`\`

## Future Improvements
- [ ] Add faction hierarchy (parent/child organizations)
- [ ] Implement faction resource tracking (wealth, power, influence)
- [ ] Add faction territory mapping with visual map editor
- [ ] Support faction member rank tracking and role assignment
- [ ] Implement faction reputation system with multiple factions
- [ ] Add faction goals and objectives tracking
- [ ] Support faction conflict tracking with battle logs
- [ ] Implement faction alliance networks visualization
- [ ] Implement faction export (PDF with branding, JSON)
- [ ] Add faction templates (guilds, nations, corporations) with preset branding
- [ ] Support faction mergers and splits
- [ ] Add faction propaganda/recruitment posters generator
- [ ] Implement faction power dynamics graph
- [ ] Add faction technology/magic system tracking`,
    filePaths: [
      "src/app/features/characters/components/FactionsList.tsx",
      "src/app/features/characters/components/CreateFactionForm.tsx",
      "src/app/features/characters/sub_CharFactions/FactionsList.tsx",
      "src/app/features/characters/sub_CharFactions/FactionCard.tsx",
      "src/app/features/characters/sub_CharFactions/FactionDetails.tsx",
      "src/app/features/characters/sub_CharFactions/FactionBrandingPanel.tsx",
      "src/app/features/characters/sub_CharFactions/EmblemDesigner.tsx",
      "src/app/features/characters/sub_CharFactions/ColorCustomizer.tsx",
      "src/app/features/characters/sub_CharFactions/FactionMediaGallery.tsx",
      "src/app/features/characters/sub_CharFactions/MediaUploadForm.tsx",
      "src/app/features/characters/sub_CharFactions/LoreRepository.tsx",
      "src/app/features/characters/sub_CharFactions/FactionLoreGallery.tsx",
      "src/app/features/characters/sub_CharFactions/AchievementBadges.tsx",
      "src/app/features/characters/sub_CharFactions/TimelineView.tsx",
      "src/app/types/Faction.ts",
      "src/app/api/factions.ts",
      "src/app/api/factionRelationships.ts"
    ]
  },

  // CREATE: Story Structure & Narrative System
  {
    name: 'Story Structure & Narrative System',
    groupId: null,
    description: `## Overview
Comprehensive three-tier story structuring system enabling writers to organize narratives using Acts → Scenes → Beats hierarchy. Provides act management, scene script editing, beat timeline visualization, act evaluation tools, and scene export functionality. Enables writers to plan, structure, and iterate on complex multi-act narratives with detailed scene breakdowns and beat-level story planning.

## Key Capabilities
- Three-tier story hierarchy: Acts contain Scenes contain Beats
- Act management: Create, organize, reorder, and delete acts
- Scene CRUD operations: Create, read, update, delete scenes with act assignment
- Scene script editor: Rich text editing for scene scripts with formatting
- Beat timeline: Visual timeline showing story beats within acts
- Beat management: Create, order, and track beats with completion status
- Act overview: Comprehensive act evaluation and analysis
- Scene exporter: Export scenes in multiple formats (PDF, Markdown, plain text)
- Act ordering: Drag-and-drop act reordering
- Scene ordering within acts: Organize scene sequence
- Beat type categorization: Setup, confrontation, resolution, plot point, character moment

## Architecture

### Component Breakdown
| Component/File | Purpose | Layer |
|----------------|---------|-------|
| \`src/app/features/story/StoryFeature.tsx\` | Main story feature orchestrator | UI |
| \`src/app/features/story/components/ActOverview.tsx\` | Act evaluation and analysis component | UI |
| \`src/app/features/story/components/Beats/BeatsOverview.tsx\` | Beats list and management | UI |
| \`src/app/features/story/components/Beats/BeatsTimeline.tsx\` | Visual beat timeline component | UI |
| \`src/app/features/story/components/SceneExporter.tsx\` | Scene export functionality | UI |
| \`src/app/features/story/sub_StoryRightPanel/StoryRightPanel.tsx\` | Story feature right panel wrapper | UI |
| \`src/app/features/scenes/ScenesFeature.tsx\` | Scene management feature | UI |
| \`src/app/features/scenes/sub_ScenesLeftPanel/ActManager.tsx\` | Act creation and management | UI |
| \`src/app/features/scenes/sub_ScenesLeftPanel/ScenesList.tsx\` | Scene list with filtering | UI |
| \`src/app/features/scenes/components/ActTabButton.tsx\` | Act tab navigation button | UI |
| \`src/app/features/scenes/components/Script/ScriptEditor.tsx\` | Scene script editing component | UI |
| \`src/app/types/Act.ts\` | Act TypeScript interfaces | Types |
| \`src/app/types/Scene.ts\` | Scene TypeScript interfaces | Types |
| \`src/app/types/Beat.ts\` | Beat TypeScript interfaces | Types |
| \`src/hooks/integration/useActs.ts\` | Act API hooks | API |
| \`src/hooks/integration/useScenes.ts\` | Scene API hooks | API |
| \`src/hooks/integration/useBeats.ts\` | Beat API hooks | API |

### Data Flow
User navigates to Story feature → StoryFeature loads → \`useActs(projectId)\` fetches acts → ActOverview renders → User selects act → \`useScenes(actId)\` fetches scenes → ScenesList displays scenes → User selects scene → ScriptEditor opens → User edits script → Auto-save triggers → \`updateScene()\` mutation → React Query updates cache → User views beats → BeatsTimeline renders → \`useBeats(actId)\` fetches beats → User creates beat → \`createBeat()\` mutation → Beat appears in timeline → User exports scene → SceneExporter generates file

### Key Dependencies
- External: React Query (data fetching), React (UI framework), Framer Motion (animations)
- Internal: Project Store (project context), Navigation Store (active act/scene), LLM integration (smart scene generation)

## Technical Details

### State Management
- **Server State**: React Query manages acts, scenes, and beats with 5-minute cache
  - \`useActs(projectId)\`: Fetch all acts for project
  - \`useScenes(projectId, actId)\`: Fetch scenes (optionally filtered by act)
  - \`useBeats(actId)\`: Fetch beats for act
  - \`useScene(sceneId)\`: Fetch single scene details
- **Client State**: Project store tracks selected act and scene
  - \`selectedAct\`: Currently active act
  - \`selectedSceneId\`: Currently selected scene ID
  - \`selectedScene\`: Full scene object
- **Auto-save**: Scene script changes debounced and auto-saved

### API Endpoints
**Acts:**
- \`GET /acts?projectId=x\` - List all acts in project
- \`POST /acts\` - Create new act
- \`GET /acts/:id\` - Get act details
- \`PUT /acts/:id\` - Update act (name, description, order)
- \`DELETE /acts/:id\` - Delete act

**Scenes:**
- \`GET /scenes?projectId=x&actId=y\` - List scenes (optionally filter by act)
- \`POST /scenes\` - Create new scene
- \`GET /scenes/:id\` - Get scene details
- \`PUT /scenes/:id\` - Update scene (script, location, description, order)
- \`DELETE /scenes/:id\` - Delete scene

**Beats:**
- \`GET /beats?actId=x\` - List beats for act
- \`POST /beats\` - Create new beat
- \`GET /beats/:id\` - Get beat details
- \`PUT /beats/:id\` - Update beat (name, description, type, order, completed)
- \`DELETE /beats/:id\` - Delete beat

### Database Tables
- **acts**: Act data (id, name, description, order, project_id, created_at, updated_at)
- **scenes**: Scene data (id, name, script, location, description, order, act_id, project_id, created_at, updated_at)
- **beats**: Beat data (id, name, description, type, order, completed, paragraph_id, paragraph_title, act_id, project_id, created_at, updated_at)

## Usage Examples

\`\`\`typescript
// Fetch project acts
const { data: acts } = useActs(projectId);

// Create act
await createAct({
  name: "Act I: The Beginning",
  description: "Our hero's ordinary world is disrupted",
  order: 1,
  project_id: projectId
});

// Update act
await updateAct(actId, {
  description: "Updated description",
  order: 2
});

// Delete act
await deleteAct(actId);

// Fetch scenes for act
const { data: scenes } = useScenes(projectId, actId);

// Create scene
await createScene({
  name: "Opening Scene",
  script: "INT. COFFEE SHOP - DAY\\n\\nOur hero sits alone...",
  location: "Coffee Shop",
  act_id: actId,
  project_id: projectId,
  order: 1
});

// Update scene script
await updateScene(sceneId, {
  script: updatedScriptContent
});

// Fetch beats for act
const { data: beats } = useBeats(actId);

// Create beat
await createBeat({
  name: "Inciting Incident",
  description: "The moment that changes everything",
  type: "plot_point",
  order: 3,
  act_id: actId,
  project_id: projectId,
  completed: false
});

// Mark beat as completed
await updateBeat(beatId, {
  completed: true
});

// Export scene
await exportScene(sceneId, {
  format: "pdf",
  includeMetadata: true
});
\`\`\`

## Future Improvements
- [ ] Implement drag-and-drop scene reordering
- [ ] Add scene dependencies (must complete before)
- [ ] Implement collaborative editing with real-time updates
- [ ] Add scene templates (dialogue, action, exposition)
- [ ] Support scene notes and comments
- [ ] Implement version history for scripts
- [ ] Add character tracking per scene (who appears)
- [ ] Support location management with scene filtering
- [ ] Implement AI scene generation from beat
- [ ] Add scene conflict analyzer
- [ ] Support scene duration estimation
- [ ] Implement scene relationship mapping
- [ ] Add act structure templates (3-act, 5-act, Hero's Journey)
- [ ] Support beat card visualization (index cards)
- [ ] Implement scene printing/formatting for production`,
    filePaths: [
      "src/app/features/story/StoryFeature.tsx",
      "src/app/features/story/components/ActOverview.tsx",
      "src/app/features/story/components/Beats/BeatsOverview.tsx",
      "src/app/features/story/components/Beats/BeatsTimeline.tsx",
      "src/app/features/story/components/SceneExporter.tsx",
      "src/app/features/story/sub_StoryRightPanel/StoryRightPanel.tsx",
      "src/app/features/scenes/ScenesFeature.tsx",
      "src/app/features/scenes/sub_ScenesLeftPanel/ActManager.tsx",
      "src/app/features/scenes/sub_ScenesLeftPanel/ScenesList.tsx",
      "src/app/features/scenes/components/ActTabButton.tsx",
      "src/app/features/scenes/components/Script/ScriptEditor.tsx",
      "src/app/types/Act.ts",
      "src/app/types/Scene.ts",
      "src/app/types/Beat.ts",
      "src/hooks/integration/useActs.ts",
      "src/hooks/integration/useScenes.ts",
      "src/hooks/integration/useBeats.ts"
    ]
  }
];

// Execute updates
(async () => {
  console.log('Starting context updates...\n');

  for (const context of contexts) {
    try {
      await upsertContext(context.id, context);
      await new Promise(resolve => setTimeout(resolve, 100)); // Rate limiting
    } catch (error) {
      console.error(`Failed to process context: ${context.name}`, error.message);
    }
  }

  console.log('\n✓ All context updates completed!');
})();
