"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function Page() {
	const searchParams = useSearchParams();
	const topic = searchParams.get("topic") || "";
	const topicQuery = topic ? `?topic=${encodeURIComponent(topic)}` : "";

	return (
		<div className="min-h-screen bg-linear-to-br from-blue-50 via-purple-50 to-pink-50 p-6 sm:p-10">
			<div className="max-w-4xl mx-auto">
				<div className="text-center mb-10">
					<h1 className="text-3xl sm:text-5xl font-bold text-slate-900 mb-3">
						Choose Your Quiz
					</h1>
					<p className="text-slate-600 text-base sm:text-lg">
						Pick a style that fits your learning flow.
					</p>
				</div>

				<div className="grid gap-6 sm:grid-cols-2">
					<Link
						href={`/quiz2${topicQuery}`}
						className="group rounded-3xl bg-white shadow-xl border border-purple-100 p-6 sm:p-8 hover:shadow-2xl transition"
					>
						<div className="text-sm font-semibold text-purple-600 mb-2">
							Cartoon Quiz
						</div>
						<h2 className="text-2xl font-bold text-slate-900 mb-3">
							Visual + Fun
						</h2>
						<p className="text-slate-600">
							Kid-friendly questions with cartoon visuals.
						</p>
						<div className="mt-6 text-purple-700 font-semibold">
							Start Cartoon Quiz →
						</div>
					</Link>

					<Link
						href={`/adaptive-quiz${topicQuery}`}
						className="group rounded-3xl bg-white shadow-xl border border-blue-100 p-6 sm:p-8 hover:shadow-2xl transition"
					>
						<div className="text-sm font-semibold text-blue-600 mb-2">
							Adaptive Quiz
						</div>
						<h2 className="text-2xl font-bold text-slate-900 mb-3">
							Emotion-Aware
						</h2>
						<p className="text-slate-600">
							Difficulty adapts to engagement and stress.
						</p>
						<div className="mt-6 text-blue-700 font-semibold">
							Start Adaptive Quiz →
						</div>
					</Link>
				</div>
			</div>
		</div>
	);
}
