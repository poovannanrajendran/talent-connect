/**
 * SkillsDndSection — Drag-and-drop skill management interface.
 *
 * This component manages two skill lists: Core (top 3) and Secondary.
 * Users can:
 * - Drag skills between Core and Secondary zones to reorder or promote/demote
 * - Add new skills via input field with comma separator support
 * - Remove skills via X button on each chip
 * - Core skills capped at 3; overflow auto-moves to Secondary
 *
 * Built with dnd-kit for accessible, modern drag-and-drop.
 */

'use client';

import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

/**
 * SkillChip — A single draggable skill tag.
 * Can be dragged between zones, removed via X button.
 * Visual distinction: blue for Core, gray for Secondary.
 */
function SkillChip({ id, isCore, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  // Apply drag transform and visual feedback (opacity when dragging)
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    zIndex:  isDragging ? 50 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full border cursor-grab active:cursor-grabbing select-none transition-colors ${
        isCore
          ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
          : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
      }`}
    >
      <span className="text-xs opacity-40">⠿</span>
      {id}
      <button
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); onRemove(id); }}
        className="ml-0.5 opacity-40 hover:opacity-100 transition-opacity text-base leading-none"
        title="Remove skill"
      >
        ×
      </button>
    </div>
  );
}

// ── Droppable zone ─────────────────────────────────────────────────────────────
function DropZone({ id, children, isEmpty, label }) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[56px] rounded-xl border-2 p-3 transition-all duration-150 ${
        isOver
          ? 'border-blue-400 bg-blue-50'
          : 'border-dashed border-gray-200 bg-gray-50/50'
      } ${isEmpty ? 'flex items-center justify-center' : 'flex flex-wrap gap-2'}`}
    >
      {isEmpty
        ? <p className="text-xs text-gray-400">{label}</p>
        : children}
    </div>
  );
}

// ── New skill input ────────────────────────────────────────────────────────────
function AddSkillInput({ onAdd, placeholder }) {
  const [value, setValue] = useState('');

  function submitAll(raw) {
    const items = raw.split(',').map((s) => s.trim()).filter(Boolean);
    items.forEach((item) => onAdd(item));
    setValue('');
  }

  function handleChange(e) {
    const val = e.target.value;
    // Auto-add when user types a comma
    if (val.endsWith(',')) {
      submitAll(val.slice(0, -1));
    } else {
      setValue(val);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') { e.preventDefault(); submitAll(value); }
    if (e.key === ',')     { e.preventDefault(); submitAll(value); }
  }

  return (
    <div className="flex gap-2 mt-2">
      <input
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="input-field text-sm py-2 flex-1"
      />
      <button
        type="button"
        onClick={() => submitAll(value)}
        className="btn-secondary text-sm py-2 px-3"
      >
        + Add
      </button>
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────────────────
export default function SkillsDndSection({ coreSkills, secondarySkills, onChange }) {
  const [activeId, setActiveId] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const MAX_CORE = 3;

  // Determine which zone a skill is in
  function findZone(id) {
    if (coreSkills.includes(id))      return 'core';
    if (secondarySkills.includes(id)) return 'secondary';
    return null;
  }

  function handleDragStart({ active }) {
    setActiveId(active.id);
  }

  function handleDragEnd({ active, over }) {
    setActiveId(null);
    if (!over) return;

    const fromZone = findZone(active.id);
    const toZone   = over.id === 'core' || over.id === 'secondary'
      ? over.id
      : findZone(over.id);

    if (!fromZone || !toZone) return;

    let newCore      = [...coreSkills];
    let newSecondary = [...secondarySkills];

    if (fromZone === toZone) {
      // Reorder within same zone
      const list = fromZone === 'core' ? newCore : newSecondary;
      const oldIdx = list.indexOf(active.id);
      const newIdx = list.indexOf(over.id);
      if (oldIdx === -1 || newIdx === -1 || oldIdx === newIdx) return;

      const reordered = arrayMove(list, oldIdx, newIdx);
      if (fromZone === 'core') newCore = reordered;
      else newSecondary = reordered;
    } else {
      // Move between zones
      if (toZone === 'core' && newCore.length >= MAX_CORE) return; // cap at 3

      // Remove from source
      if (fromZone === 'core')      newCore      = newCore.filter((s) => s !== active.id);
      else                          newSecondary = newSecondary.filter((s) => s !== active.id);

      // Add to target
      const insertIdx = over.id !== toZone ? (
        toZone === 'core' ? newCore.indexOf(over.id) : newSecondary.indexOf(over.id)
      ) : -1;

      if (toZone === 'core') {
        if (insertIdx >= 0) newCore.splice(insertIdx, 0, active.id);
        else newCore.push(active.id);
      } else {
        if (insertIdx >= 0) newSecondary.splice(insertIdx, 0, active.id);
        else newSecondary.push(active.id);
      }
    }

    onChange({ coreSkills: newCore, secondarySkills: newSecondary });
  }

  function removeSkill(id) {
    onChange({
      coreSkills:      coreSkills.filter((s) => s !== id),
      secondarySkills: secondarySkills.filter((s) => s !== id),
    });
  }

  function addSkill(zone, value) {
    const all = [...coreSkills, ...secondarySkills];
    if (all.includes(value)) return; // no duplicates
    if (zone === 'core' && coreSkills.length >= MAX_CORE) {
      // Auto-push to secondary if core is full
      onChange({ coreSkills, secondarySkills: [...secondarySkills, value] });
    } else if (zone === 'core') {
      onChange({ coreSkills: [...coreSkills, value], secondarySkills });
    } else {
      onChange({ coreSkills, secondarySkills: [...secondarySkills, value] });
    }
  }

  const allIds = [...coreSkills, ...secondarySkills];

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {/* Core Skills */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="section-title mb-0">
            ⭐ Core Skills
            <span className="ml-2 text-gray-400 font-normal normal-case tracking-normal text-xs">
              (max 3 — drag to reorder)
            </span>
          </label>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            coreSkills.length >= MAX_CORE
              ? 'bg-orange-100 text-orange-600'
              : 'bg-blue-100 text-blue-600'
          }`}>
            {coreSkills.length}/{MAX_CORE}
          </span>
        </div>

        <SortableContext items={coreSkills} strategy={horizontalListSortingStrategy}>
          <DropZone id="core" isEmpty={coreSkills.length === 0} label="Drag skills here — your top 3 most important skills">
            {coreSkills.map((skill) => (
              <SkillChip key={skill} id={skill} isCore onRemove={removeSkill} />
            ))}
          </DropZone>
        </SortableContext>

        {coreSkills.length < MAX_CORE && (
          <AddSkillInput onAdd={(v) => addSkill('core', v)} placeholder="Add a core skill…" />
        )}
      </div>

      {/* Secondary Skills */}
      <div>
        <label className="section-title">
          🔧 Secondary Skills
          <span className="ml-2 text-gray-400 font-normal normal-case tracking-normal text-xs">
            (drag to reorder · drag to Core to promote)
          </span>
        </label>

        <SortableContext items={secondarySkills} strategy={horizontalListSortingStrategy}>
          <DropZone id="secondary" isEmpty={secondarySkills.length === 0} label="Drag skills here — all other skills">
            {secondarySkills.map((skill) => (
              <SkillChip key={skill} id={skill} isCore={false} onRemove={removeSkill} />
            ))}
          </DropZone>
        </SortableContext>

        <AddSkillInput onAdd={(v) => addSkill('secondary', v)} placeholder="Add another skill…" />
      </div>

      {/* Drag overlay — floating chip while dragging */}
      <DragOverlay>
        {activeId && (
          <div className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full border bg-white shadow-xl border-blue-300 text-blue-700 cursor-grabbing">
            <span className="text-xs opacity-40">⠿</span>
            {activeId}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
