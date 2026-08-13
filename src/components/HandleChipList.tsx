interface HandleChipListProps {
  handles: string[];
  onRemove: (handle: string) => void;
  disabled?: boolean;
}

export function HandleChipList({ handles, onRemove, disabled }: HandleChipListProps) {
  if (handles.length === 0) return null;

  return (
    <div className="handle-chip-list">
      {handles.map((handle) => (
        <span className="handle-chip" key={handle} dir="ltr">
          @{handle}
          <button
            type="button"
            className="handle-chip-remove"
            onClick={() => onRemove(handle)}
            disabled={disabled}
            aria-label={`Remove @${handle}`}
          >
            ×
          </button>
        </span>
      ))}
    </div>
  );
}
