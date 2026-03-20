import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRelativeLabel(dateString: string) {
  const target = new Date(dateString).getTime();
  const diff = Date.now() - target;
  const minutes = Math.floor(diff / 1000 / 60);

  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;

  return new Intl.DateTimeFormat("ko-KR", {
    month: "numeric",
    day: "numeric",
  }).format(new Date(dateString));
}

export function average(numbers: number[]) {
  if (numbers.length === 0) return 0;
  return numbers.reduce((sum, current) => sum + current, 0) / numbers.length;
}
