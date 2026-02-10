"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";

export default function Hero() {
  return (
    <section className="w-full flex flex-col items-center text-sm overflow-hidden min-h-screen bg-linear-to-bl from-white to-purple-200/40">
      <div
        className={cn(
          "absolute top-0 right-0 h-full w-1/2",
          "bg-size-[80px_80px]",
          "bg-[linear-gradient(to_right,#e4e4e7_1px,transparent_1px),linear-gradient(to_bottom,#e4e4e7_1px,transparent_1px)]",
          "dark:bg-[linear-gradient(to_right,#262626_1px,transparent_1px),linear-gradient(to_bottom,#262626_1px,transparent_1px)]",
          "mask-[radial-gradient(ellipse_at_top_right,white,transparent)]",
          "pointer-events-none"
        )}
      />

      <main className="relative z-10 flex flex-col items-center max-md:px-4 text-center px-6 mt-23">
        <h1 className="text-4xl md:text-6xl md:leading-20 font-semibold max-w-4xl text-slate-900 mt-6">
          Personalized Learning for Autism, ADHD & Unique Minds
        </h1>

        <p className="text-base text-slate-700 max-w-lg mt-2">
          Because Every Child Learns Differently — And Deserves the Right Support
        </p>

        <div className="flex items-center gap-4 mt-8">
          <Link href="/child">
            <button className="flex items-center gap-2 bg-purple-600 text-white active:scale-95 rounded-lg px-7 h-11">
              Get started
            </button>
          </Link>

          <button className="border border-slate-600 active:scale-95 hover:bg-white/10 transition text-slate-600 rounded-lg px-8 h-11">
            Watch demo
          </button>
        </div>
      </main>
    </section>
  );
}
