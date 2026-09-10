"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

export default function BackButton() {
  const router = useRouter();
  return (
    <button
      onClick={() => router.back()}
      className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800 mb-4 -ml-1 px-2 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
    >
      <ChevronLeft size={16} /> Back
    </button>
  );
}