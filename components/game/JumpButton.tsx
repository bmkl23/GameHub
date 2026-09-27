"use client";

interface JumpButtonProps {
  onJump: () => void;
  disabled?: boolean;
}

/**
 * Permanently-visible jump trigger. Uses onPointerDown so mouse, touch and
 * stylus input all work the same way (spec §4).
 */
export default function JumpButton({ onJump, disabled }: JumpButtonProps) {
  return (
    <button
      type="button"
      className="jump-button"
      disabled={disabled}
      onPointerDown={(e) => {
        e.preventDefault();
        onJump();
      }}
    >
      JUMP
    </button>
  );
}
