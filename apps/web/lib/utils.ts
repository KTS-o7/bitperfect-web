import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Scroll lock manager — reference-counted so multiple overlays can coexist safely
let scrollLockCount = 0;
export function lockScroll() {
  scrollLockCount++;
  document.body.style.overflow = "hidden";
}
export function unlockScroll() {
  scrollLockCount = Math.max(0, scrollLockCount - 1);
  if (scrollLockCount === 0) {
    document.body.style.overflow = "";
  }
}
