import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * A utility function that combines clsx and tailwind-merge
 * This allows for conditional classNames and properly handles Tailwind CSS conflicts
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
