import Link from "next/link";
import { Sparkles } from "lucide-react";
import clsx from "clsx";

type FloatingIcon = {
  icon: React.ReactNode;
  key: string;
  className?: string; 
  delay?: string; 
};

type CardProps = {
  href: string;
  title: string;
  description: string;
  tags?: string[];
  badge?: string;
  colorScheme?: "violet" | "orange" | "green" | "blue" | "yellow" | "pink" | "red" | "cyan" | "teal" | "lime" | "emerald" | "sky" | "indigo" | "fuchsia" | "rose" | "slate" | "stone" | "amber" | "mint" | "aqua" | "sunset" | "fire" | "ocean" | "galaxy" | "forest"; // predefined safe colors
  headerIcon?: React.ReactNode;
  floatingIcons?: FloatingIcon[]; 
  buttonText?: string; 
};

const gradientMap: Record<string, string> = {
  violet: "from-violet-500 to-purple-600",
  orange: "from-orange-400 to-orange-600",
  green: "from-green-400 to-teal-500",
  blue: "from-blue-400 to-indigo-500",
  yellow: "from-yellow-400 to-amber-500",
  pink: "from-pink-400 to-rose-500",
red: "from-red-400 to-rose-600",
cyan: "from-cyan-400 to-sky-500",
teal: "from-teal-400 to-emerald-500",
lime: "from-lime-400 to-green-500",
emerald: "from-emerald-400 to-teal-600",
sky: "from-sky-400 to-blue-500",
indigo: "from-indigo-500 to-violet-600",
fuchsia: "from-fuchsia-500 to-pink-600",
rose: "from-rose-400 to-red-500",
slate: "from-slate-500 to-gray-700",
stone: "from-stone-400 to-neutral-600",
amber: "from-amber-400 to-orange-500",
mint: "from-green-300 to-emerald-400",
aqua: "from-teal-300 to-cyan-400",
sunset: "from-orange-400 to-pink-500",
fire: "from-red-500 to-orange-500",
ocean: "from-blue-500 to-cyan-500",
galaxy: "from-purple-600 to-indigo-800",
forest: "from-green-600 to-lime-500",



};

export default function Card2({
  href,
  title,
  description,
  tags = [],
  badge = "Interactive",
  colorScheme = "violet",
  headerIcon,
  floatingIcons = [],
  buttonText = "Start Learning",
}: CardProps) {
  return (
    <Link href={href} className="block">
      <div className="w-80 rounded-3xl bg-white border border-gray-100 shadow-[0_4px_24px_rgba(0,0,0,0.08)] hover:shadow-[0_12px_40px_rgba(124,58,237,0.15)] transition-all duration-500 overflow-hidden group cursor-pointer">
        
     
        <div
          className={clsx(
            "relative h-40 p-6 overflow-hidden bg-gradient-to-br",
            gradientMap[colorScheme]
          )}
        >
          {headerIcon && (
            <div className="absolute top-4 right-4 w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center animate-[float_6s_ease-in-out_infinite]">
              {headerIcon}
            </div>
          )}

          {floatingIcons.map((item) => (
            <div
              key={item.key}
              className={clsx(
                "absolute w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center animate-[float_6s_ease-in-out_infinite]",
                item.className
              )}
              style={{ animationDelay: item.delay || "0s" }}
            >
              {item.icon}
            </div>
          ))}

          <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-white/10" />
          <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/10" />

          <div className="relative z-10">
            {badge && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-sm text-xs font-semibold text-white">
                <Sparkles className="w-3.5 h-3.5" />
                {badge}
              </span>
            )}
          </div>
        </div>

        <div className="p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
          <p className="text-gray-500 text-sm leading-relaxed mb-5">{description}</p>

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-5">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1.5 rounded-full bg-gray-100 text-xs font-medium text-gray-700"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div
            className={clsx(
              "w-full py-3.5 rounded-2xl text-white font-semibold text-sm flex items-center justify-center gap-2 hover:shadow-[0_8px_24px_rgba(124,58,237,0.3)] transition-all duration-300 hover:gap-3 bg-gradient-to-r",
              gradientMap[colorScheme]
            )}
          >
            {buttonText}
          </div>
        </div>
      </div>
    </Link>
  );
}
