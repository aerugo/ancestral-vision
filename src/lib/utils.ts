/**
 * Utility functions for Ancestral Vision
 */

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS classes with clsx
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Computes display name based on name order
 */
export function computeDisplayName(person: {
  givenName: string;
  surname?: string | null;
  patronymic?: string | null;
  matronymic?: string | null;
  nameOrder: "WESTERN" | "EASTERN" | "PATRONYMIC" | "PATRONYMIC_SUFFIX" | "MATRONYMIC";
}): string {
  switch (person.nameOrder) {
    case "WESTERN":
      return [person.givenName, person.surname].filter(Boolean).join(" ");
    case "EASTERN":
      return [person.surname, person.givenName].filter(Boolean).join("");
    case "PATRONYMIC":
      return [person.givenName, person.patronymic].filter(Boolean).join(" ");
    case "PATRONYMIC_SUFFIX":
      return [person.givenName, person.patronymic, person.surname].filter(Boolean).join(" ");
    case "MATRONYMIC":
      return [person.givenName, person.matronymic].filter(Boolean).join(" ");
    default:
      return person.givenName;
  }
}

/**
 * Generate a random token for share links
 */
export function generateToken(length: number = 32): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
