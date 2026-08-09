'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Exercise, SplitDay, SplitExercise } from '@/types';
import { RunePanel } from '@/components/ui/RunePanel';
import { RuneStave } from '@/components/ui/RuneStave';
import { EmptyState } from '@/components/ui/EmptyState';
import { Plus, Trash2, ChevronUp, ChevronDown, Edit2, Check, X, Layers } from 'lucide-react';
import {
  addSplitExercise,
  createSplitDay,
  deleteSplitDay,
  removeSplitExercise,
  renameSplitDay,
  reorderSplitDays,
  reorderSplitExercises,
  updateSplitExercise,
} from '@/actions/split';
import { createCustomExercise } from '@/actions/exercises';
import type { ActionResult } from '@/server/action-result';

interface SplitViewProps {
  availableExercises: Exercise[];
  splitDays: SplitDay[];
  onPendingChange?: (pending: boolean) => void;
  onUpdateSplitDays: (days: SplitDay[]) => void;
  onExerciseCreated?: (exercise: Exercise) => void;
}

interface ExerciseDraft {
  targetSets: string;
  targetRepMin: string;
  targetRepMax: string;
  notes: string;
}

interface ExerciseDraftState {
  source: SplitDay[];
  drafts: Record<string, ExerciseDraft>;
  dirtyIds: Set<string>;
}

type MutationErrorLocation = 'global' | 'addExercise';
type MutationRecovery = 'retry' | 'refresh';
interface MutationStatus {
  message: string;
  refreshSource?: SplitDay[];
}
type PendingFocus =
  | { kind: 'dayTab'; id: string }
  | { kind: 'removeExercise'; id: string }
  | { kind: 'createDay' | 'renameDay' | 'deleteDay' | 'addExercise' };

function exerciseDraft(exercise: SplitExercise): ExerciseDraft {
  return {
    targetSets: String(exercise.targetSets),
    targetRepMin: String(exercise.targetRepMin),
    targetRepMax: String(exercise.targetRepMax),
    notes: exercise.notes ?? '',
  };
}

function initialExerciseDrafts(splitDays: SplitDay[]) {
  return Object.fromEntries(
    splitDays.flatMap((day) =>
      day.exercises.map((exercise) => [exercise.id, exerciseDraft(exercise)]),
    ),
  );
}

function reconciledExerciseDrafts(
  splitDays: SplitDay[],
  drafts: Record<string, ExerciseDraft>,
  dirtyExerciseIds: Set<string>,
) {
  return Object.fromEntries(
    splitDays.flatMap((day) =>
      day.exercises.map((exercise) => [
        exercise.id,
        dirtyExerciseIds.has(exercise.id) && drafts[exercise.id]
          ? drafts[exercise.id]
          : exerciseDraft(exercise),
      ]),
    ),
  );
}

export const SplitView: React.FC<SplitViewProps> = ({
  availableExercises,
  splitDays,
  onPendingChange,
  onUpdateSplitDays,
  onExerciseCreated,
}) => {
  const router = useRouter();
  const localExerciseIdPrefix = useId();
  const [selectedDayId, setSelectedDayId] = useState<string>(splitDays[0]?.id || '');
  const [editingDayId, setEditingDayId] = useState<string | null>(null);
  const [dayNameInput, setDayNameInput] = useState<string>('');
  const [renameError, setRenameError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [selectedAddExerciseId, setSelectedAddExerciseId] = useState<string>(availableExercises[0]?.id || '');
  
  // Custom exercise state
  const [isCreatingCustom, setIsCreatingCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customMuscleGroup, setCustomMuscleGroup] = useState('');
  const [customEquipment, setCustomEquipment] = useState('');
  const [customCategory, setCustomCategory] = useState<'compound' | 'isolation'>('compound');
  const [customExerciseError, setCustomExerciseError] = useState<string | null>(null);
  const [isSubmittingCustom, setIsSubmittingCustom] = useState(false);

  const handleCreateCustomExercise = async () => {
    setCustomExerciseError(null);
    if (!customName.trim()) {
      setCustomExerciseError('Exercise name is required.');
      return;
    }
    if (!customMuscleGroup.trim()) {
      setCustomExerciseError('Target muscle group is required.');
      return;
    }
    if (!customEquipment.trim()) {
      setCustomExerciseError('Equipment type is required.');
      return;
    }

    setIsSubmittingCustom(true);
    try {
      const result = await createCustomExercise({
        name: customName,
        muscleGroup: customMuscleGroup,
        equipment: customEquipment,
        category: customCategory,
      });

      if (!result.ok) {
        setCustomExerciseError(result.message);
        return;
      }

      onExerciseCreated?.(result.data);
      setSelectedAddExerciseId(result.data.id);
      setIsCreatingCustom(false);
      setCustomName('');
      setCustomMuscleGroup('');
      setCustomEquipment('');
    } catch {
      setCustomExerciseError('Failed to create custom exercise.');
    } finally {
      setIsSubmittingCustom(false);
    }
  };
  const [targetSetsInput, setTargetSetsInput] = useState<number>(3);
  const [targetRepMinInput, setTargetRepMinInput] = useState<number>(8);
  const [targetRepMaxInput, setTargetRepMaxInput] = useState<number>(10);
  const [addExerciseError, setAddExerciseError] = useState<string | null>(null);
  const [creatingDay, setCreatingDay] = useState(false);
  const [newDayName, setNewDayName] = useState('');
  const [createDayError, setCreateDayError] = useState<string | null>(null);
  const [confirmingDayId, setConfirmingDayId] = useState<string | null>(null);
  const [confirmingExerciseId, setConfirmingExerciseId] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [mutationErrorLocation, setMutationErrorLocation] =
    useState<MutationErrorLocation>('global');
  const [mutationRecovery, setMutationRecovery] = useState<MutationRecovery>('retry');
  const [mutationStatus, setMutationStatus] = useState<MutationStatus | null>(null);
  const [exerciseDraftState, setExerciseDraftState] = useState<ExerciseDraftState>(() => ({
    source: splitDays,
    drafts: initialExerciseDrafts(splitDays),
    dirtyIds: new Set(),
  }));
  const exerciseDrafts =
    exerciseDraftState.source === splitDays
      ? exerciseDraftState.drafts
      : reconciledExerciseDrafts(
          splitDays,
          exerciseDraftState.drafts,
          exerciseDraftState.dirtyIds,
        );
  const [exerciseErrors, setExerciseErrors] = useState<Record<string, string>>({});
  const retryOperation = useRef<(() => Promise<void>) | null>(null);
  const mutationPending = useRef(false);
  const dayTabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const createDayButtonRef = useRef<HTMLButtonElement | null>(null);
  const renameDayButtonRef = useRef<HTMLButtonElement | null>(null);
  const deleteDayButtonRef = useRef<HTMLButtonElement | null>(null);
  const addExerciseButtonRef = useRef<HTMLButtonElement | null>(null);
  const removeExerciseButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const addExerciseSelectRef = useRef<HTMLSelectElement | null>(null);
  const addExerciseDialogRef = useRef<HTMLDivElement | null>(null);
  const addExerciseTriggerRef = useRef<HTMLElement | null>(null);
  const restoreAddExerciseFocus = useRef(false);
  const pendingFocus = useRef<PendingFocus | null>(null);
  const [isPending, setIsPending] = useState(false);

  const currentDay = splitDays.find((d) => d.id === selectedDayId) || splitDays[0];
  const currentDayIndex = currentDay ? splitDays.findIndex((day) => day.id === currentDay.id) : -1;
  const mutationStatusMessage =
    mutationStatus?.refreshSource && mutationStatus.refreshSource !== splitDays
      ? 'Split refreshed.'
      : mutationStatus?.message;

  useEffect(() => {
    if (showAddModal) {
      if (isPending) {
        addExerciseDialogRef.current?.focus();
      } else {
        addExerciseSelectRef.current?.focus();
      }
      return;
    }

    if (restoreAddExerciseFocus.current) {
      restoreAddExerciseFocus.current = false;
      if (addExerciseTriggerRef.current?.isConnected) {
        addExerciseTriggerRef.current.focus();
      } else {
        addExerciseButtonRef.current?.focus();
      }
    }
  }, [isPending, showAddModal]);

  useEffect(() => {
    const target = pendingFocus.current;
    if (!target) return;
    pendingFocus.current = null;

    if (target.kind === 'dayTab') {
      dayTabRefs.current[target.id]?.focus();
    } else if (target.kind === 'createDay') {
      createDayButtonRef.current?.focus();
    } else if (target.kind === 'renameDay') {
      renameDayButtonRef.current?.focus();
    } else if (target.kind === 'deleteDay') {
      deleteDayButtonRef.current?.focus();
    } else if (target.kind === 'removeExercise') {
      removeExerciseButtonRefs.current[target.id]?.focus();
    } else {
      addExerciseButtonRef.current?.focus();
    }
  }, [confirmingDayId, confirmingExerciseId, editingDayId, splitDays]);

  const openAddExercise = () => {
    addExerciseTriggerRef.current = document.activeElement as HTMLElement | null;
    setAddExerciseError(null);
    setMutationError(null);
    setMutationErrorLocation('global');
    setMutationRecovery('retry');
    retryOperation.current = null;
    setShowAddModal(true);
  };

  const closeAddExercise = () => {
    restoreAddExerciseFocus.current = true;
    if (mutationError && mutationErrorLocation === 'addExercise') {
      setMutationErrorLocation('global');
    }
    setShowAddModal(false);
  };

  const handleMutationRecovery = () => {
    if (mutationRecovery === 'refresh') {
      retryOperation.current = null;
      setMutationError(null);
      setMutationStatus({ message: 'Refreshing split…', refreshSource: splitDays });
      if (mutationErrorLocation === 'addExercise') {
        restoreAddExerciseFocus.current = true;
        setShowAddModal(false);
      }
      router.refresh();
      return;
    }

    retryOperation.current?.();
  };

  const handleAddDialogKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' && !isPending) {
      event.preventDefault();
      closeAddExercise();
      return;
    }

    if (event.key !== 'Tab') return;
    const focusableElements = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      ),
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements.at(-1);

    if (!firstElement || !lastElement) {
      event.preventDefault();
      event.currentTarget.focus();
      return;
    }

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement?.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement?.focus();
    }
  };

  const handleDayTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (isPending) return;
    let targetIndex: number | null = null;

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      targetIndex = (index + 1) % splitDays.length;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      targetIndex = (index - 1 + splitDays.length) % splitDays.length;
    } else if (event.key === 'Home') {
      targetIndex = 0;
    } else if (event.key === 'End') {
      targetIndex = splitDays.length - 1;
    }

    if (targetIndex === null) return;
    event.preventDefault();
    const targetDay = splitDays[targetIndex];
    setSelectedDayId(targetDay.id);
    setEditingDayId(null);
    setConfirmingDayId(null);
    dayTabRefs.current[targetDay.id]?.focus();
  };

  const reconcileExerciseDrafts = (days: SplitDay[]) => {
    const activeExerciseIds = new Set(
      days.flatMap((day) => day.exercises.map((exercise) => exercise.id)),
    );
    setExerciseDraftState((state) => {
      const currentDrafts =
        state.source === splitDays
          ? state.drafts
          : reconciledExerciseDrafts(splitDays, state.drafts, state.dirtyIds);
      const dirtyIds = new Set(
        [...state.dirtyIds].filter((exerciseId) => activeExerciseIds.has(exerciseId)),
      );
      return {
        source: days,
        drafts: reconciledExerciseDrafts(days, currentDrafts, dirtyIds),
        dirtyIds,
      };
    });
  };

  const commitMutation = async (
    operation: () => Promise<ActionResult<SplitDay[]>>,
    onSuccess?: (days: SplitDay[]) => void,
    errorLocation: MutationErrorLocation = 'global',
  ) => {
    if (mutationPending.current) return;
    mutationPending.current = true;
    onPendingChange?.(true);
    setIsPending(true);
    const retry = () => commitMutation(operation, onSuccess, errorLocation);
    retryOperation.current = retry;
    setMutationError(null);
    setMutationErrorLocation(errorLocation);
    setMutationRecovery('retry');
    setMutationStatus(null);

    try {
      const result = await operation();
      if (!result.ok) {
        if (result.code === 'STALE_ORDER' || result.code === 'NOT_FOUND') {
          retryOperation.current = null;
          setMutationRecovery('refresh');
        }
        setMutationError(result.message);
        return;
      }

      retryOperation.current = null;
      setMutationRecovery('retry');
      onUpdateSplitDays(result.data);
      reconcileExerciseDrafts(result.data);
      onSuccess?.(result.data);
      setMutationStatus({ message: 'Split updated.' });
    } catch {
      setMutationError('Unable to update the split. Please try again.');
    } finally {
      mutationPending.current = false;
      onPendingChange?.(false);
      setIsPending(false);
    }
  };

  const handleCreateDay = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = newDayName.trim();
    if (!name) {
      setCreateDayError('Split day name is required.');
      return;
    }
    setCreateDayError(null);

    await commitMutation(
      () => createSplitDay({ name }),
      (days) => {
        const existingDayIds = new Set(splitDays.map((day) => day.id));
        const createdDay = days.find((day) => !existingDayIds.has(day.id));
        if (createdDay) {
          setSelectedDayId(createdDay.id);
          pendingFocus.current = { kind: 'dayTab', id: createdDay.id };
        } else {
          pendingFocus.current = { kind: 'createDay' };
        }
        setNewDayName('');
        setCreatingDay(false);
      },
    );
  };

  const handleStartRename = () => {
    if (!currentDay) return;
    setDayNameInput(currentDay.name);
    setRenameError(null);
    setEditingDayId(currentDay.id);
  };

  const handleSaveRename = async () => {
    if (!currentDay || editingDayId !== currentDay.id) return;
    const name = dayNameInput.trim();
    if (!name) {
      setRenameError('Split day name is required.');
      return;
    }
    setRenameError(null);
    await commitMutation(
      () => renameSplitDay({ splitDayId: currentDay.id, name }),
      () => {
        pendingFocus.current = { kind: 'renameDay' };
        setEditingDayId(null);
      },
    );
  };

  const handleDeleteDay = async () => {
    if (!currentDay || confirmingDayId !== currentDay.id) return;
    await commitMutation(
      () => deleteSplitDay({ splitDayId: currentDay.id }),
      (days) => {
        setConfirmingDayId(null);
        setSelectedDayId(days[0]?.id ?? '');
        pendingFocus.current = days[0]
          ? { kind: 'dayTab', id: days[0].id }
          : { kind: 'createDay' };
      },
    );
  };

  const handleMoveDay = async (direction: 'up' | 'down') => {
    if (!currentDay || currentDayIndex < 0) return;
    const targetIndex = direction === 'up' ? currentDayIndex - 1 : currentDayIndex + 1;
    if (targetIndex < 0 || targetIndex >= splitDays.length) return;

    const orderedIds = splitDays.map((day) => day.id);
    [orderedIds[currentDayIndex], orderedIds[targetIndex]] = [
      orderedIds[targetIndex],
      orderedIds[currentDayIndex],
    ];
    await commitMutation(() => reorderSplitDays({ splitDayIds: orderedIds }));
  };

  const handleMoveExercise = async (exerciseId: string, direction: 'up' | 'down') => {
    if (!currentDay) return;
    const orderedIds = currentDay.exercises.map((exercise) => exercise.id);
    const idx = orderedIds.indexOf(exerciseId);
    if (idx === -1) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= orderedIds.length) return;

    [orderedIds[idx], orderedIds[targetIdx]] = [orderedIds[targetIdx], orderedIds[idx]];
    await commitMutation(() =>
      reorderSplitExercises({
        splitDayId: currentDay.id,
        splitExerciseIds: orderedIds,
      }),
    );
  };

  const handleRemoveExercise = async (exerciseId: string) => {
    await commitMutation(
      () => removeSplitExercise({ splitExerciseId: exerciseId }),
      () => {
        pendingFocus.current = { kind: 'addExercise' };
        setConfirmingExerciseId(null);
      },
    );
  };

  const handleAddExercise = async () => {
    if (!currentDay) return;
    const exObj = availableExercises.find((e) => e.id === selectedAddExerciseId);
    if (!exObj) return;
    if (targetRepMinInput > targetRepMaxInput) {
      setAddExerciseError('Minimum reps cannot exceed maximum reps.');
      return;
    }
    if (
      !Number.isInteger(targetSetsInput) ||
      targetSetsInput < 1 ||
      targetSetsInput > 20 ||
      !Number.isInteger(targetRepMinInput) ||
      targetRepMinInput < 1 ||
      targetRepMinInput > 100 ||
      !Number.isInteger(targetRepMaxInput) ||
      targetRepMaxInput < 1 ||
      targetRepMaxInput > 100
    ) {
      setAddExerciseError('Use 1–20 sets and 1–100 reps.');
      return;
    }
    setAddExerciseError(null);

    await commitMutation(
      () => addSplitExercise({
        splitDayId: currentDay.id,
        exerciseId: exObj.id,
        targetSets: targetSetsInput,
        targetRepMin: targetRepMinInput,
        targetRepMax: targetRepMaxInput,
      }),
      closeAddExercise,
      'addExercise',
    );
  };

  const updateExerciseDraft = (exercise: SplitExercise, update: Partial<ExerciseDraft>) => {
    setExerciseDraftState((state) => {
      const drafts =
        state.source === splitDays
          ? state.drafts
          : reconciledExerciseDrafts(splitDays, state.drafts, state.dirtyIds);
      const dirtyIds = new Set(state.dirtyIds);
      dirtyIds.add(exercise.id);
      return {
        source: splitDays,
        dirtyIds,
        drafts: {
          ...drafts,
          [exercise.id]: { ...(drafts[exercise.id] ?? exerciseDraft(exercise)), ...update },
        },
      };
    });
    setExerciseErrors((errors) => {
      if (!errors[exercise.id]) return errors;
      const nextErrors = { ...errors };
      delete nextErrors[exercise.id];
      return nextErrors;
    });
  };

  const handleSaveExercise = async (exercise: SplitExercise) => {
    const draft = exerciseDrafts[exercise.id] ?? exerciseDraft(exercise);
    const targetSets = Number(draft.targetSets);
    const targetRepMin = Number(draft.targetRepMin);
    const targetRepMax = Number(draft.targetRepMax);
    let validationMessage: string | null = null;

    if (
      !Number.isInteger(targetSets) ||
      targetSets < 1 ||
      targetSets > 20 ||
      !Number.isInteger(targetRepMin) ||
      targetRepMin < 1 ||
      targetRepMin > 100 ||
      !Number.isInteger(targetRepMax) ||
      targetRepMax < 1 ||
      targetRepMax > 100
    ) {
      validationMessage = 'Use 1–20 sets and 1–100 reps.';
    } else if (targetRepMin > targetRepMax) {
      validationMessage = 'Minimum reps cannot exceed maximum reps.';
    } else if (draft.notes.length > 1_000) {
      validationMessage = 'Notes must be 1,000 characters or fewer.';
    }

    if (validationMessage) {
      setExerciseErrors((errors) => ({ ...errors, [exercise.id]: validationMessage }));
      return;
    }

    await commitMutation(
      () =>
        updateSplitExercise({
          splitExerciseId: exercise.id,
          targetSets,
          targetRepMin,
          targetRepMax,
          notes: draft.notes,
        }),
      (days) => {
        const updatedExercise = days
          .flatMap((day) => day.exercises)
          .find((candidate) => candidate.id === exercise.id);
        if (!updatedExercise) return;
        setExerciseDraftState((state) => {
          const dirtyIds = new Set(state.dirtyIds);
          dirtyIds.delete(exercise.id);
          return {
            source: days,
            dirtyIds,
            drafts: {
              ...state.drafts,
              [exercise.id]: exerciseDraft(updatedExercise),
            },
          };
        });
        setExerciseErrors((errors) => {
          if (!errors[exercise.id]) return errors;
          const nextErrors = { ...errors };
          delete nextErrors[exercise.id];
          return nextErrors;
        });
      },
    );
  };

  return (
    <div aria-busy={isPending} className="space-y-6">
      {mutationError && mutationErrorLocation === 'global' ? (
        <div
          className="flex flex-wrap items-center justify-between gap-3 border border-[#5A383B] bg-[#2D1F20] p-3 font-mono text-xs text-[#D6A0A0]"
          role="alert"
        >
          <span>{mutationError}</span>
          <button
            className="min-h-11 px-4 border border-[#B88989] text-[#DFD0B8] uppercase"
            disabled={isPending}
            onClick={handleMutationRecovery}
            type="button"
          >
            {mutationRecovery === 'refresh' ? 'Refresh split' : 'Retry'}
          </button>
        </div>
      ) : null}
      {mutationStatusMessage ? (
        <p className="font-mono text-xs text-[#8DAA91]" role="status">
          {mutationStatusMessage}
        </p>
      ) : null}
      <div className="flex justify-end">
        {creatingDay ? (
          <form className="flex flex-wrap items-end justify-end gap-2" onSubmit={handleCreateDay}>
            <div>
              <label className="font-mono text-xs text-[#948979]">
                <span className="block mb-1">Day name</span>
                <input
                  aria-describedby={createDayError ? `${localExerciseIdPrefix}-create-day-error` : undefined}
                  aria-invalid={createDayError ? true : undefined}
                  autoFocus
                  className="min-h-11 bg-[#161A20] border border-[#677D6A] px-3 font-mono text-base text-[#DFD0B8] rounded-xs"
                  disabled={isPending}
                  maxLength={100}
                  name="dayName"
                  onChange={(event) => {
                    setNewDayName(event.target.value);
                    setCreateDayError(null);
                  }}
                  value={newDayName}
                />
              </label>
              {createDayError ? (
                <span
                  className="block mt-1 text-[#D6A0A0]"
                  id={`${localExerciseIdPrefix}-create-day-error`}
                  role="alert"
                >
                  {createDayError}
                </span>
              ) : null}
            </div>
            <button
              className="min-h-11 px-4 bg-[#40534C] border border-[#677D6A] text-[#DFD0B8] font-mono text-xs font-bold uppercase rounded-xs"
              disabled={isPending}
              type="submit"
            >
              {isPending ? 'Saving…' : 'Save day'}
            </button>
            <button
              className="min-h-11 px-4 bg-[#222831] border border-[#393E46] text-[#948979] font-mono text-xs uppercase rounded-xs"
              disabled={isPending}
              onClick={() => setCreatingDay(false)}
              type="button"
            >
              Cancel
            </button>
          </form>
        ) : (
          <button
            className="min-h-11 flex items-center justify-center gap-2 px-4 bg-[#40534C] hover:bg-[#677D6A] text-[#DFD0B8] font-mono text-xs uppercase tracking-wider rounded-xs border border-[#677D6A] transition-all"
            disabled={isPending}
            onClick={() => setCreatingDay(true)}
            ref={createDayButtonRef}
            type="button"
          >
            <Plus aria-hidden="true" className="w-4 h-4" />
            Create day
          </button>
        )}
      </div>
      {/* Top Split Days Selector Tabs */}
      <div
        aria-label="Workout days"
        className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none"
        role="tablist"
      >
        {splitDays.map((day, index) => {
          const isActive = day.id === currentDay?.id;
          return (
            <button
              aria-selected={isActive}
              aria-controls={`${localExerciseIdPrefix}-day-panel`}
              disabled={isPending}
              id={`${localExerciseIdPrefix}-day-tab-${day.id}`}
              key={day.id}
              onClick={() => {
                setSelectedDayId(day.id);
                setEditingDayId(null);
                setConfirmingDayId(null);
              }}
              onKeyDown={(event) => handleDayTabKeyDown(event, index)}
              ref={(node) => {
                dayTabRefs.current[day.id] = node;
              }}
              className={`min-h-11 px-4 py-2.5 rounded-xs font-mono text-xs tracking-wider whitespace-nowrap transition-all border ${
                isActive
                  ? 'bg-[#222831] border-[#677D6A] text-[#DFD0B8] shadow-[0_2px_12px_rgba(103,125,106,0.2)] font-bold'
                  : 'bg-[#1C2128] border-[#393E46] text-[#948979] hover:border-[#4D5460] hover:text-[#DFD0B8]'
              }`}
              role="tab"
              tabIndex={isActive ? 0 : -1}
              type="button"
            >
              <div className="flex items-center gap-2">
                <span className="text-[#677D6A]">ᚦ</span>
                <span>{day.name}</span>
                <span className="text-[10px] bg-[#161A20] px-1.5 py-0.5 rounded-xs border border-[#393E46] text-[#948979]">
                  {day.exercises.length} Ex
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {splitDays.length === 0 ? (
        <EmptyState
          title="No Workout Split Configured"
          description="Create your first workout split day to begin organizing exercises."
          icon={<Layers className="w-6 h-6 text-[#677D6A]" />}
        />
      ) : null}

      {/* Main Selected Day Panel */}
      {currentDay && (
        <div
          aria-labelledby={`${localExerciseIdPrefix}-day-tab-${currentDay.id}`}
          id={`${localExerciseIdPrefix}-day-panel`}
          role="tabpanel"
        >
        <RunePanel variant="carved" className="p-4 sm:p-6 space-y-6">
          {/* Day Name Header & Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#393E46]">
            <div>
              <div className="text-[11px] font-mono text-[#948979] uppercase tracking-widest flex items-center gap-1.5 mb-1">
                <span className="w-1.5 h-1.5 rotate-45 bg-[#677D6A]" />
                <span>WORKOUT DAY STRUCTURE</span>
              </div>
              {editingDayId === currentDay.id ? (
                <div className="grid grid-cols-[minmax(0,1fr)_2.75rem_2.75rem] gap-2 mt-1">
                  <input
                    aria-describedby={renameError ? `${localExerciseIdPrefix}-rename-error` : undefined}
                    aria-invalid={renameError ? true : undefined}
                    aria-label="Rename day name"
                    type="text"
                    value={dayNameInput}
                    onChange={(e) => {
                      setDayNameInput(e.target.value);
                      setRenameError(null);
                    }}
                    className="min-h-11 min-w-0 w-full bg-[#161A20] border border-[#677D6A] px-3 font-mono text-base text-[#DFD0B8] rounded-xs focus:outline-none"
                    disabled={isPending}
                    maxLength={100}
                    autoFocus
                  />
                  <button
                    aria-label="Save rename"
                    onClick={handleSaveRename}
                    className="min-h-11 min-w-11 inline-flex items-center justify-center bg-[#677D6A] text-[#1A3636] rounded-xs hover:bg-[#8DAA91]"
                    disabled={isPending}
                    type="button"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                  </button>
                  <button
                    aria-label="Cancel rename"
                    onClick={() => {
                      pendingFocus.current = { kind: 'renameDay' };
                      setEditingDayId(null);
                    }}
                    className="min-h-11 min-w-11 inline-flex items-center justify-center bg-[#393E46] text-[#DFD0B8] rounded-xs hover:bg-[#4D5460]"
                    disabled={isPending}
                    type="button"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  {renameError ? (
                    <span
                      className="col-span-full text-xs text-[#D6A0A0]"
                      id={`${localExerciseIdPrefix}-rename-error`}
                      role="alert"
                    >
                      {renameError}
                    </span>
                  ) : null}
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="font-mono text-lg font-bold text-[#DFD0B8]">{currentDay.name}</h2>
                  <button
                    aria-label={`Move ${currentDay.name} up`}
                    className="min-h-11 min-w-11 inline-flex items-center justify-center text-[#948979] hover:text-[#DFD0B8] disabled:opacity-30"
                    disabled={isPending || currentDayIndex === 0}
                    onClick={() => handleMoveDay('up')}
                    type="button"
                  >
                    <ChevronUp aria-hidden="true" className="w-4 h-4" />
                  </button>
                  <button
                    aria-label={`Move ${currentDay.name} down`}
                    className="min-h-11 min-w-11 inline-flex items-center justify-center text-[#948979] hover:text-[#DFD0B8] disabled:opacity-30"
                    disabled={isPending || currentDayIndex === splitDays.length - 1}
                    onClick={() => handleMoveDay('down')}
                    type="button"
                  >
                    <ChevronDown aria-hidden="true" className="w-4 h-4" />
                  </button>
                  <button
                    aria-label="Rename Day"
                    onClick={handleStartRename}
                    className="min-h-11 min-w-11 inline-flex items-center justify-center text-[#948979] hover:text-[#DFD0B8] transition-colors"
                    disabled={isPending}
                    ref={renameDayButtonRef}
                    title="Rename Day"
                    type="button"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    aria-label={`Delete ${currentDay.name}`}
                    className="min-h-11 min-w-11 inline-flex items-center justify-center text-[#948979] hover:text-[#B88989] transition-colors"
                    disabled={isPending}
                    onClick={() => setConfirmingDayId(currentDay.id)}
                    ref={deleteDayButtonRef}
                    type="button"
                  >
                    <Trash2 aria-hidden="true" className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            <button
              className="min-h-11 flex items-center justify-center gap-2 px-4 py-2 bg-[#40534C] hover:bg-[#677D6A] text-[#DFD0B8] font-mono text-xs uppercase tracking-wider rounded-xs border border-[#677D6A] transition-all"
              disabled={isPending}
              onClick={openAddExercise}
              ref={addExerciseButtonRef}
              type="button"
            >
              <Plus aria-hidden="true" className="w-4 h-4" />
              <span>Add Exercise</span>
            </button>
          </div>

          {confirmingDayId === currentDay.id ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border border-[#5A383B] bg-[#2D1F20] p-3 font-mono text-xs">
              <div>
                <p className="font-bold text-[#D6A0A0]">Delete {currentDay.name}?</p>
                <p className="mt-1 text-[#948979]">Its configured exercises will also be removed.</p>
              </div>
              <div className="grid w-full grid-cols-1 gap-2 sm:w-auto sm:grid-cols-2">
                <button
                  className="min-h-11 px-4 border border-[#4D5460] text-[#DFD0B8] uppercase"
                  disabled={isPending}
                  onClick={() => {
                    pendingFocus.current = { kind: 'deleteDay' };
                    setConfirmingDayId(null);
                  }}
                  type="button"
                >
                  Cancel deletion
                </button>
                <button
                  className="min-h-11 px-4 border border-[#B88989] bg-[#5A383B] text-[#DFD0B8] uppercase"
                  disabled={isPending}
                  onClick={handleDeleteDay}
                  type="button"
                >
                  Confirm delete day
                </button>
              </div>
            </div>
          ) : null}

          {/* Exercise Stave List */}
          <div className="space-y-4">
            {currentDay.exercises.length === 0 ? (
              <EmptyState
                title="No Exercises Configured"
                description="This workout day has no exercises assigned yet. Click 'Add Exercise' above to include movements."
                actionLabel="Add First Exercise"
                disabled={isPending}
                onAction={openAddExercise}
              />
            ) : (
              currentDay.exercises.map((ex, idx) => {
                const draft = exerciseDrafts[ex.id] ?? exerciseDraft(ex);
                const exerciseError = exerciseErrors[ex.id];
                const exerciseErrorId = `${localExerciseIdPrefix}-${ex.id}-error`;

                return (
                <RuneStave key={ex.id} active={true}>
                  <div className="bg-[#1C2128] border border-[#393E46] p-3.5 rounded-xs space-y-3 hover:border-[#4D5460] transition-colors">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs text-[#948979] font-bold">
                            {(idx + 1).toString().padStart(2, '0')}
                          </span>
                          <h3 className="font-mono text-sm font-bold text-[#DFD0B8]">{ex.exerciseName}</h3>
                          <span className="text-[10px] font-mono px-2 py-0.5 bg-[#222831] border border-[#393E46] text-[#948979]">
                            {ex.muscleGroup}
                          </span>
                        </div>
                      </div>

                      {/* Reorder and Delete Actions */}
                      <div className="flex items-center gap-1 self-end sm:self-auto">
                        <button
                          aria-label={`Move ${ex.exerciseName} up`}
                          onClick={() => handleMoveExercise(ex.id, 'up')}
                          disabled={isPending || idx === 0}
                          className="min-h-11 min-w-11 inline-flex items-center justify-center text-[#948979] hover:text-[#DFD0B8] disabled:opacity-30 disabled:pointer-events-none"
                          title={`Move ${ex.exerciseName} up`}
                          type="button"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          aria-label={`Move ${ex.exerciseName} down`}
                          onClick={() => handleMoveExercise(ex.id, 'down')}
                          disabled={isPending || idx === currentDay.exercises.length - 1}
                          className="min-h-11 min-w-11 inline-flex items-center justify-center text-[#948979] hover:text-[#DFD0B8] disabled:opacity-30 disabled:pointer-events-none"
                          title={`Move ${ex.exerciseName} down`}
                          type="button"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                        <button
                          aria-label={`Remove ${ex.exerciseName}`}
                          onClick={() => setConfirmingExerciseId(ex.id)}
                          className="min-h-11 min-w-11 inline-flex items-center justify-center text-[#948979] hover:text-[#B88989] transition-colors ml-1"
                          disabled={isPending}
                          title={`Remove ${ex.exerciseName}`}
                          ref={(button) => {
                            removeExerciseButtonRefs.current[ex.id] = button;
                          }}
                          type="button"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {confirmingExerciseId === ex.id ? (
                      <div className="flex flex-wrap items-center justify-between gap-3 border border-[#5A383B] bg-[#2D1F20] p-3 font-mono text-xs">
                        <span className="font-bold text-[#D6A0A0]">Remove {ex.exerciseName}?</span>
                        <div className="grid w-full grid-cols-1 gap-2 sm:w-auto sm:grid-cols-2">
                          <button
                            className="min-h-11 px-4 border border-[#4D5460] text-[#DFD0B8]"
                            disabled={isPending}
                            onClick={() => {
                              pendingFocus.current = { kind: 'removeExercise', id: ex.id };
                              setConfirmingExerciseId(null);
                            }}
                            type="button"
                          >
                            Cancel removal
                          </button>
                          <button
                            className="min-h-11 px-4 border border-[#B88989] bg-[#5A383B] text-[#DFD0B8]"
                            disabled={isPending}
                            onClick={() => handleRemoveExercise(ex.id)}
                            type="button"
                          >
                            Confirm remove {ex.exerciseName}
                          </button>
                        </div>
                      </div>
                    ) : null}

                    <div className="grid gap-3 pt-3 border-t border-[#2A303A] font-mono text-xs text-[#DFD0B8] sm:grid-cols-3">
                      <label className="space-y-1 text-[#948979]">
                        <span className="block">Target sets</span>
                        <input
                          aria-describedby={exerciseError ? exerciseErrorId : undefined}
                          aria-invalid={exerciseError ? true : undefined}
                          aria-label={`${ex.exerciseName} target sets`}
                          className="min-h-11 w-full bg-[#222831] border border-[#393E46] px-3 text-base text-[#DFD0B8] rounded-xs focus:outline-none focus:border-[#677D6A]"
                          disabled={isPending}
                          max={20}
                          min={1}
                          onChange={(event) => updateExerciseDraft(ex, { targetSets: event.target.value })}
                          type="number"
                          value={draft.targetSets}
                        />
                      </label>
                      <label className="space-y-1 text-[#948979]">
                        <span className="block">Minimum reps</span>
                        <input
                          aria-describedby={exerciseError ? exerciseErrorId : undefined}
                          aria-invalid={exerciseError ? true : undefined}
                          aria-label={`${ex.exerciseName} minimum reps`}
                          className="min-h-11 w-full bg-[#222831] border border-[#393E46] px-3 text-base text-[#DFD0B8] rounded-xs focus:outline-none focus:border-[#677D6A]"
                          disabled={isPending}
                          max={100}
                          min={1}
                          onChange={(event) => updateExerciseDraft(ex, { targetRepMin: event.target.value })}
                          type="number"
                          value={draft.targetRepMin}
                        />
                      </label>
                      <label className="space-y-1 text-[#948979]">
                        <span className="block">Maximum reps</span>
                        <input
                          aria-describedby={exerciseError ? exerciseErrorId : undefined}
                          aria-invalid={exerciseError ? true : undefined}
                          aria-label={`${ex.exerciseName} maximum reps`}
                          className="min-h-11 w-full bg-[#222831] border border-[#393E46] px-3 text-base text-[#DFD0B8] rounded-xs focus:outline-none focus:border-[#677D6A]"
                          disabled={isPending}
                          max={100}
                          min={1}
                          onChange={(event) => updateExerciseDraft(ex, { targetRepMax: event.target.value })}
                          type="number"
                          value={draft.targetRepMax}
                        />
                      </label>
                      <label className="space-y-1 text-[#948979] sm:col-span-3">
                        <span className="block">Notes</span>
                        <textarea
                          aria-describedby={exerciseError ? exerciseErrorId : undefined}
                          aria-invalid={exerciseError ? true : undefined}
                          aria-label={`${ex.exerciseName} notes`}
                          className="min-h-20 w-full resize-y bg-[#222831] border border-[#393E46] px-3 py-2 text-base text-[#DFD0B8] rounded-xs focus:outline-none focus:border-[#677D6A]"
                          disabled={isPending}
                          maxLength={1_000}
                          onChange={(event) => updateExerciseDraft(ex, { notes: event.target.value })}
                          value={draft.notes}
                        />
                      </label>
                      {exerciseError ? (
                        <p
                          className="text-[#D6A0A0] sm:col-span-2"
                          id={exerciseErrorId}
                          role="alert"
                        >
                          {exerciseError}
                        </p>
                      ) : (
                        <span className="sm:col-span-2" />
                      )}
                      <button
                        aria-label={`Save ${ex.exerciseName} targets`}
                        className="min-h-11 justify-self-stretch bg-[#40534C] border border-[#677D6A] px-4 text-[#DFD0B8] font-bold uppercase rounded-xs hover:bg-[#677D6A] disabled:opacity-60 sm:justify-self-end"
                        disabled={isPending}
                        onClick={() => handleSaveExercise(ex)}
                        type="button"
                      >
                        {isPending ? 'Saving…' : 'Save targets'}
                      </button>
                    </div>
                  </div>
                </RuneStave>
                );
              })
            )}
          </div>
        </RunePanel>
        </div>
      )}

      {/* Add Exercise Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            aria-labelledby={`${localExerciseIdPrefix}-add-exercise-title`}
            aria-modal="true"
            className="bg-[#1C2128] border border-[#677D6A] p-5 rounded-xs max-w-md w-full space-y-4 rune-panel"
            onKeyDown={handleAddDialogKeyDown}
            ref={addExerciseDialogRef}
            role="dialog"
            tabIndex={-1}
          >
            <div className="flex items-center justify-between border-b border-[#393E46] pb-3">
              <h3
                className="font-mono text-base font-bold text-[#DFD0B8]"
                id={`${localExerciseIdPrefix}-add-exercise-title`}
              >
                ADD EXERCISE TO SPLIT
              </h3>
              <button
                aria-label="Close add exercise"
                className="min-h-11 min-w-11 inline-flex items-center justify-center text-[#948979] hover:text-[#DFD0B8]"
                disabled={isPending}
                onClick={closeAddExercise}
                type="button"
              >
                <X aria-hidden="true" className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              {mutationError && mutationErrorLocation === 'addExercise' ? (
                <div
                  className="flex flex-wrap items-center justify-between gap-3 border border-[#5A383B] bg-[#2D1F20] p-3 text-[#D6A0A0]"
                  role="alert"
                >
                  <span>{mutationError}</span>
                  <button
                    className="min-h-11 px-4 border border-[#B88989] text-[#DFD0B8] uppercase"
                    disabled={isPending}
                    onClick={handleMutationRecovery}
                    type="button"
                  >
                    {mutationRecovery === 'refresh' ? 'Refresh split' : 'Retry'}
                  </button>
                </div>
              ) : null}
              {addExerciseError ? (
                <p className="text-[#D6A0A0]" role="alert">
                  {addExerciseError}
                </p>
              ) : null}
              {!isCreatingCustom ? (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label
                      className="block text-[#948979]"
                      htmlFor={`${localExerciseIdPrefix}-exercise-select`}
                    >
                      Select Exercise
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCreatingCustom(true)}
                      className="text-[11px] text-[#8DAA91] hover:underline hover:text-[#DFD0B8] transition-colors"
                      disabled={isPending}
                    >
                      + Create Custom Exercise
                    </button>
                  </div>
                  <select
                    id={`${localExerciseIdPrefix}-exercise-select`}
                    ref={addExerciseSelectRef}
                    value={selectedAddExerciseId}
                    onChange={(e) => setSelectedAddExerciseId(e.target.value)}
                    className="min-h-11 w-full bg-[#222831] border border-[#393E46] p-2 text-base text-[#DFD0B8] rounded-xs focus:outline-none focus:border-[#677D6A]"
                    disabled={isPending}
                  >
                    {availableExercises.map((ex) => (
                      <option key={ex.id} value={ex.id}>
                        {ex.name} ({ex.muscleGroup}){ex.isCustom ? ' [Custom]' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="p-3 bg-[#222831] border border-[#677D6A] rounded-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#DFD0B8]">CREATE NEW CUSTOM EXERCISE</span>
                    <button
                      type="button"
                      onClick={() => setIsCreatingCustom(false)}
                      className="text-xs text-[#948979] hover:text-[#DFD0B8]"
                    >
                      Cancel
                    </button>
                  </div>
                  {customExerciseError && (
                    <p className="text-xs text-[#D6A0A0]" role="alert">{customExerciseError}</p>
                  )}
                  <div>
                    <label className="block text-[#948979] text-[11px] mb-1">Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Incline Cable Flyes"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      className="w-full bg-[#161A20] border border-[#393E46] p-2 text-sm text-[#DFD0B8] rounded-xs"
                      disabled={isSubmittingCustom}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[#948979] text-[11px] mb-1">Muscle Group</label>
                      <input
                        type="text"
                        placeholder="e.g. Upper Chest"
                        value={customMuscleGroup}
                        onChange={(e) => setCustomMuscleGroup(e.target.value)}
                        className="w-full bg-[#161A20] border border-[#393E46] p-2 text-sm text-[#DFD0B8] rounded-xs"
                        disabled={isSubmittingCustom}
                      />
                    </div>
                    <div>
                      <label className="block text-[#948979] text-[11px] mb-1">Equipment</label>
                      <input
                        type="text"
                        placeholder="e.g. Cable"
                        value={customEquipment}
                        onChange={(e) => setCustomEquipment(e.target.value)}
                        className="w-full bg-[#161A20] border border-[#393E46] p-2 text-sm text-[#DFD0B8] rounded-xs"
                        disabled={isSubmittingCustom}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[#948979] text-[11px] mb-1">Category</label>
                    <select
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value as 'compound' | 'isolation')}
                      className="w-full bg-[#161A20] border border-[#393E46] p-2 text-sm text-[#DFD0B8] rounded-xs"
                      disabled={isSubmittingCustom}
                    >
                      <option value="compound">Compound</option>
                      <option value="isolation">Isolation</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={handleCreateCustomExercise}
                    disabled={isSubmittingCustom}
                    className="w-full py-2 bg-[#677D6A] text-[#161A20] font-bold text-xs uppercase tracking-wider rounded-xs hover:bg-[#8DAA91] transition-colors"
                  >
                    {isSubmittingCustom ? 'Creating...' : 'Save & Select Custom Exercise'}
                  </button>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[#948979] mb-1" htmlFor={`${localExerciseIdPrefix}-add-sets`}>Target Sets</label>
                  <input
                    id={`${localExerciseIdPrefix}-add-sets`}
                    type="number"
                    value={targetSetsInput}
                    onChange={(e) => {
                      setTargetSetsInput(parseInt(e.target.value) || 1);
                      setAddExerciseError(null);
                    }}
                    className="min-h-11 w-full bg-[#222831] border border-[#393E46] p-2 text-center text-base text-[#DFD0B8] rounded-xs"
                    disabled={isPending}
                    min={1}
                    max={20}
                  />
                </div>
                <div>
                  <label className="block text-[#948979] mb-1" htmlFor={`${localExerciseIdPrefix}-add-min-reps`}>Min Reps</label>
                  <input
                    id={`${localExerciseIdPrefix}-add-min-reps`}
                    type="number"
                    value={targetRepMinInput}
                    aria-invalid={addExerciseError?.startsWith('Minimum reps') ? true : undefined}
                    onChange={(e) => {
                      setTargetRepMinInput(parseInt(e.target.value) || 1);
                      setAddExerciseError(null);
                    }}
                    className="min-h-11 w-full bg-[#222831] border border-[#393E46] p-2 text-center text-base text-[#DFD0B8] rounded-xs"
                    disabled={isPending}
                    min={1}
                    max={100}
                  />
                </div>
                <div>
                  <label className="block text-[#948979] mb-1" htmlFor={`${localExerciseIdPrefix}-add-max-reps`}>Max Reps</label>
                  <input
                    id={`${localExerciseIdPrefix}-add-max-reps`}
                    type="number"
                    value={targetRepMaxInput}
                    onChange={(e) => {
                      setTargetRepMaxInput(parseInt(e.target.value) || 1);
                      setAddExerciseError(null);
                    }}
                    className="min-h-11 w-full bg-[#222831] border border-[#393E46] p-2 text-center text-base text-[#DFD0B8] rounded-xs"
                    disabled={isPending}
                    min={1}
                    max={100}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#393E46]">
              <button
                onClick={closeAddExercise}
                className="min-h-11 px-4 bg-[#222831] border border-[#393E46] text-[#948979] font-mono text-xs rounded-xs hover:text-[#DFD0B8]"
                disabled={isPending}
                type="button"
              >
                Cancel
              </button>
              <button
                onClick={handleAddExercise}
                className="min-h-11 px-4 bg-[#40534C] border border-[#677D6A] text-[#DFD0B8] font-mono text-xs font-bold rounded-xs hover:bg-[#677D6A]"
                disabled={isPending}
                type="button"
              >
                Add to Day
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
