"use client";
import "@xyflow/react/dist/style.css";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  BaseEdge,
  getStraightPath,
  useInternalNode,
  type EdgeProps,
  type InternalNode,
  Background,
  BackgroundVariant,
  ConnectionMode,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  type Edge,
  type EdgeChangeset,
  type Node,
  type NodeChangeset,
  type NodeProps,
} from "@xyflow/react";
import type { Character, CharacterRelationship, ID } from "@/types";
import { addRelationship, updateCharacter } from "@/lib/repositories/characters";

type CharNode = Node<{ name: string; role: string; color: string }, "character">;

const CharacterNode = memo(function CharacterNode({ data, selected }: NodeProps<CharNode>) {
  return (
    <div
      className="min-w-[120px] rounded-md border bg-bg px-3 py-2 text-center shadow-sm transition-colors"
      style={{ borderColor: selected ? "var(--accent)" : "var(--line)", boxShadow: selected ? "0 0 0 2px color-mix(in srgb, var(--accent) 35%, transparent)" : undefined }}
    >
      <Handle type="target" position={Position.Top} className="!h-2 !w-2" />
      <div className="mx-auto mb-1 h-1 w-8 rounded-full" style={{ background: data.color }} />
      <div className="serif whitespace-nowrap text-[14px] text-ink">{data.name}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted">{data.role}</div>
      <Handle type="source" position={Position.Bottom} className="!h-2 !w-2" />
    </div>
  );
});

const nodeTypes = { character: CharacterNode };

/** Point where the line from the node centre towards `toward` leaves the node's rectangle. */
function borderPoint(node: InternalNode, toward: { x: number; y: number }) {
  const w = node.measured.width ?? 120;
  const h = node.measured.height ?? 50;
  const cx = node.internals.positionAbsolute.x + w / 2;
  const cy = node.internals.positionAbsolute.y + h / 2;
  const dx = toward.x - cx;
  const dy = toward.y - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };
  const scale = 1 / Math.max(Math.abs(dx) / (w / 2 + 4), Math.abs(dy) / (h / 2 + 4));
  return { x: cx + dx * scale, y: cy + dy * scale };
}

function centre(node: InternalNode) {
  return {
    x: node.internals.positionAbsolute.x + (node.measured.width ?? 120) / 2,
    y: node.internals.positionAbsolute.y + (node.measured.height ?? 50) / 2,
  };
}

/** Straight edge between node borders (no handle loops). */
function FloatingEdge({ id, source, target, markerEnd, markerStart, style, label, labelStyle, labelBgStyle, labelBgPadding }: EdgeProps) {
  const s = useInternalNode(source);
  const t = useInternalNode(target);
  if (!s || !t) return null;
  const sp = borderPoint(s, centre(t));
  const tp = borderPoint(t, centre(s));
  const [path, labelX, labelY] = getStraightPath({ sourceX: sp.x, sourceY: sp.y, targetX: tp.x, targetY: tp.y });
  return (
    <BaseEdge
      id={id}
      path={path}
      markerEnd={markerEnd}
      markerStart={markerStart}
      style={style}
      label={label}
      labelX={labelX}
      labelY={labelY}
      labelStyle={labelStyle}
      labelBgStyle={labelBgStyle}
      labelBgPadding={labelBgPadding}
      labelBgBorderRadius={3}
      interactionWidth={18}
    />
  );
}

const edgeTypes = { floating: FloatingEdge };

export function RelationshipGraph({
  projectId,
  characters,
  relationships,
  selectedCharacter,
  selectedEdge,
  onSelectCharacter,
  onSelectEdge,
}: {
  projectId: ID;
  characters: Character[];
  relationships: CharacterRelationship[];
  selectedCharacter: ID | null;
  selectedEdge: ID | null;
  onSelectCharacter: (id: ID | null) => void;
  onSelectEdge: (id: ID | null) => void;
}) {
  const [nodes, setNodes] = useState<CharNode[]>([]);

  // Merge persisted characters into local node state (keeps in-progress drags smooth).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- derive local, draggable node state from persisted characters
    setNodes((prev) => {
      const prevById = new Map(prev.map((n) => [n.id, n]));
      return characters.map((c) => {
        const p = prevById.get(c.id);
        return {
          id: c.id,
          type: "character" as const,
          position: p?.dragging ? p.position : c.position,
          selected: c.id === selectedCharacter,
          data: { name: c.name, role: c.role, color: c.color },
        };
      });
    });
  }, [characters, selectedCharacter]);

  const edges = useMemo<Edge[]>(
    () =>
      relationships.map((r) => {
        const sel = r.id === selectedEdge;
        const color = sel ? "var(--accent)" : "var(--muted)";
        const marker = { type: MarkerType.ArrowClosed, color, width: 16, height: 16 };
        return {
          id: r.id,
          type: "floating",
          source: r.sourceId,
          target: r.targetId,
          label: r.type,
          selected: sel,
          markerEnd: marker,
          markerStart: r.direction === "mutual" ? marker : undefined,
          style: { stroke: color, strokeWidth: 1 + (r.strength ?? 3) * 0.3, opacity: r.strength === null ? 0.7 : 1 },
          labelStyle: { fontSize: 11, fill: "var(--ink)" },
          labelBgStyle: { fill: "var(--bg)" },
          labelBgPadding: [4, 2] as [number, number],
        };
      }),
    [relationships, selectedEdge],
  );

  const onNodesChange = useCallback((changes: NodeChangeset<CharNode>) => setNodes((nds) => changes.applyTo(nds)), []);
  const onEdgesChange = useCallback((changes: EdgeChangeset<Edge>) => {
    // Edges are derived from persisted data; selection is handled via onEdgeClick.
    void changes;
  }, []);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeDragStop={(_, node) => void updateCharacter(node.id, { position: { x: Math.round(node.position.x), y: Math.round(node.position.y) } })}
      onNodeClick={(_, n) => {
        onSelectCharacter(n.id);
        onSelectEdge(null);
      }}
      onEdgeClick={(_, e) => {
        onSelectEdge(e.id);
      }}
      onPaneClick={() => {
        onSelectEdge(null);
      }}
      onConnect={async (c) => {
        if (!c.source || !c.target || c.source === c.target) return;
        const rel = await addRelationship(projectId, c.source, c.target);
        onSelectEdge(rel.id);
      }}
      connectionMode={ConnectionMode.Loose}
      deleteKeyCode={null}
      fitView
      fitViewOptions={{ padding: 0.25, maxZoom: 1.1 }}
      proOptions={{ hideAttribution: true }}
      minZoom={0.3}
    >
      <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="var(--line)" />
      <Controls showInteractive={false} />
      <MiniMap pannable zoomable nodeColor={(n) => (n.data as CharNode["data"]).color} maskColor="color-mix(in srgb, var(--bg) 70%, transparent)" />
    </ReactFlow>
  );
}
