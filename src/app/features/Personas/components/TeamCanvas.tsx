'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  MiniMap,
  Controls,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { usePersonaStore } from '@/stores/personaStore';
import * as api from '../lib/personaApi';
import TeamList from './team/TeamList';
import PersonaNode from './team/PersonaNode';
import ConnectionEdge from './team/ConnectionEdge';
import TeamToolbar from './team/TeamToolbar';
import TeamConfigPanel from './team/TeamConfigPanel';

const nodeTypes = { persona: PersonaNode };
const edgeTypes = { connection: ConnectionEdge };

export default function TeamCanvas() {
  const selectedTeamId = usePersonaStore((s) => s.selectedTeamId);
  const selectTeam = usePersonaStore((s) => s.selectTeam);
  const teams = usePersonaStore((s) => s.teams);
  const teamMembers = usePersonaStore((s) => s.teamMembers);
  const teamConnections = usePersonaStore((s) => s.teamConnections);
  const addTeamMember = usePersonaStore((s) => s.addTeamMember);
  const removeTeamMember = usePersonaStore((s) => s.removeTeamMember);
  const addTeamConnection = usePersonaStore((s) => s.addTeamConnection);
  const removeTeamConnection = usePersonaStore((s) => s.removeTeamConnection);
  const personas = usePersonaStore((s) => s.personas);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedMember, setSelectedMember] = useState<any>(null);

  const selectedTeam = useMemo(() => teams.find((t: any) => t.id === selectedTeamId), [teams, selectedTeamId]);

  // Convert teamMembers/teamConnections to React Flow nodes/edges
  useEffect(() => {
    if (!selectedTeamId) return;

    const newNodes: Node[] = teamMembers.map((m: any, i: number) => {
      // Find persona info
      const persona = personas.find((p) => p.id === m.persona_id);
      return {
        id: m.id,
        type: 'persona',
        position: {
          x: m.position_x ?? 100 + (i % 4) * 220,
          y: m.position_y ?? 80 + Math.floor(i / 4) * 140,
        },
        data: {
          name: persona?.name || m.persona_name || 'Agent',
          icon: persona?.icon || m.persona_icon || '',
          color: persona?.color || m.persona_color || '#6366f1',
          role: m.role || 'worker',
          memberId: m.id,
          personaId: m.persona_id,
        },
      };
    });

    const newEdges: Edge[] = teamConnections.map((c: any) => ({
      id: c.id,
      source: c.source_member_id,
      target: c.target_member_id,
      type: 'connection',
      data: {
        connection_type: c.connection_type || 'sequential',
        label: c.label || '',
      },
    }));

    setNodes(newNodes);
    setEdges(newEdges);
  }, [selectedTeamId, teamMembers, teamConnections, personas, setNodes, setEdges]);

  // Handle new edge connection
  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      // Add to backend
      addTeamConnection(connection.source, connection.target, 'sequential');
      // Optimistic local add
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            type: 'connection',
            data: { connection_type: 'sequential', label: '' },
          },
          eds
        )
      );
    },
    [addTeamConnection, setEdges]
  );

  // Handle node click for config panel
  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      const member = teamMembers.find((m: any) => m.id === node.id);
      if (member) {
        const persona = personas.find((p: any) => p.id === member.persona_id);
        setSelectedMember({
          ...member,
          persona_name: persona?.name || member.persona_name,
          persona_icon: persona?.icon || member.persona_icon,
          persona_color: persona?.color || member.persona_color,
        });
      }
    },
    [teamMembers, personas]
  );

  // Handle adding a member via toolbar
  const handleAddMember = useCallback(
    (personaId: string) => {
      // Calculate position for new node
      const count = teamMembers.length;
      const posX = 100 + (count % 4) * 220;
      const posY = 80 + Math.floor(count / 4) * 140;
      addTeamMember(personaId, 'worker', posX, posY);
    },
    [teamMembers, addTeamMember]
  );

  // Auto layout: left-to-right arrangement
  const handleAutoLayout = useCallback(() => {
    setNodes((nds) =>
      nds.map((node, i) => ({
        ...node,
        position: {
          x: 100 + (i % 4) * 220,
          y: 80 + Math.floor(i / 4) * 140,
        },
      }))
    );
  }, [setNodes]);

  // Save canvas data (positions)
  const handleSave = useCallback(async () => {
    if (!selectedTeamId) return;
    const canvasData = {
      nodes: nodes.map((n) => ({ id: n.id, x: n.position.x, y: n.position.y })),
    };
    try {
      await api.updateTeam(selectedTeamId, { canvas_data: JSON.stringify(canvasData) });
    } catch (err) {
      console.error('Failed to save canvas:', err);
    }
  }, [selectedTeamId, nodes]);

  // Handle role change from config panel
  const handleRoleChange = useCallback(
    async (memberId: string, newRole: string) => {
      if (!selectedTeamId) return;
      // Update node data locally
      setNodes((nds) =>
        nds.map((n) =>
          n.id === memberId ? { ...n, data: { ...n.data, role: newRole } } : n
        )
      );
      // Update selectedMember
      setSelectedMember((prev: any) => (prev?.id === memberId ? { ...prev, role: newRole } : prev));
      // Persist to backend
      try {
        await api.updateTeam(selectedTeamId, {
          member_update: JSON.stringify({ member_id: memberId, role: newRole }),
        });
      } catch (err) {
        console.error('Failed to update member role:', err);
      }
    },
    [selectedTeamId, setNodes]
  );

  // Handle member removal from config panel
  const handleRemoveMember = useCallback(
    (memberId: string) => {
      removeTeamMember(memberId);
      setSelectedMember(null);
    },
    [removeTeamMember]
  );

  // If no team selected, show list
  if (!selectedTeamId) {
    return <TeamList />;
  }

  return (
    <div className="h-full flex flex-col relative">
      <TeamToolbar
        teamName={selectedTeam?.name || 'Team'}
        onBack={() => selectTeam(null)}
        onAutoLayout={handleAutoLayout}
        onSave={handleSave}
        onAddMember={handleAddMember}
      />

      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          className="bg-background"
          defaultEdgeOptions={{ type: 'connection' }}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={24} size={1} className="opacity-30" />
          <Controls className="!bg-secondary/60 !border-primary/15 !rounded-xl !shadow-lg [&>button]:!bg-secondary/80 [&>button]:!border-primary/15 [&>button]:!text-foreground/60 [&>button:hover]:!bg-secondary [&>button:hover]:!text-foreground/90" />
          <MiniMap
            className="!bg-secondary/40 !border-primary/15 !rounded-xl"
            maskColor="rgba(0,0,0,0.3)"
            nodeColor={(n) => (n.data as any)?.color || '#6366f1'}
          />
        </ReactFlow>

        {/* Config Panel */}
        {selectedMember && (
          <TeamConfigPanel
            member={selectedMember}
            onClose={() => setSelectedMember(null)}
            onRoleChange={handleRoleChange}
            onRemove={handleRemoveMember}
          />
        )}
      </div>
    </div>
  );
}
