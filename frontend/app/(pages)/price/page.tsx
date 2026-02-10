const plans = [
  {
    name: "Starter",
    price: "₹0",
    tag: "Freemium",
    highlight: false,
    features: [
      "Basic learning games",
      "Attention & logic tracking",
      "Limited AI feedback",
      "Child dashboard access",
    ],
    button: "Get Started",
  },
  {
    name: "Parent Pro",
    price: "₹299 / month",
    tag: "Most Popular",
    highlight: true,
    features: [
      "All Starter features",
      "Advanced AI personalization",
      "Parent progress dashboard",
      "Mood & behavior insights",
      "Weekly AI-generated reports",
    ],
    button: "Upgrade Now",
  },
  {
    name: "Institution",
    price: "Custom Pricing",
    tag: "For Schools & NGOs",
    highlight: false,
    features: [
      "Multi-student management",
      "Teacher & admin dashboards",
      "Early difficulty detection",
      "Analytics & reports",
    ],
    button: "Contact Us",
  },
];

export default function PricingSection() {
  return (
    <section className="bg-white py-20 px-6">
      <div className="max-w-6xl mx-auto text-center">
        <h2 className="text-4xl text-purple-600 font-bold mb-4">
          Simple & Inclusive Pricing
        </h2>

        <p className="text-purple-500 mb-12">
          Designed for parents, children & institutions
        </p>

        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`rounded-2xl p-8 border transition transform hover:-translate-y-2
                ${
                  plan.highlight
                    ? "bg-white border-purple-500 scale-105 shadow-2xl"
                    : "bg-purple-50 border-purple-200 shadow-lg"
                }`}
            >
              <span className="text-sm uppercase tracking-wide font-semibold text-purple-500">
                {plan.tag}
              </span>

              <h3 className="text-2xl font-bold mt-4 text-gray-900">
                {plan.name}
              </h3>

              <p className="text-3xl font-extrabold mt-4 text-purple-600">
                {plan.price}
              </p>

              <ul className="mt-6 space-y-3 text-left text-gray-700">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="text-green-500">✔</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {/* ✅ PURPLE BUTTONS ONLY */}
              <button
                className={`mt-8 w-full py-3 rounded-xl font-semibold transition-all duration-200
                  ${
                    plan.highlight
                      ? "bg-purple-600 hover:bg-purple-700 text-white shadow-lg"
                      : "bg-purple-500 hover:bg-purple-600 text-white"
                  }`}
              >
                {plan.button}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}