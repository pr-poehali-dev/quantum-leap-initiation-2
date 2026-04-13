import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";

const plans = [
  {
    name: "Пробный период",
    price: "Бесплатно",
    period: "3 дня",
    color: "border-white/10",
    badge: null,
    features: [
      "До 4 треков в проекте",
      "Загрузка аудиофайлов",
      "Управление громкостью",
      "Стерео-панорама",
      "Воспроизведение в браузере",
    ],
    cta: "Начать бесплатно",
    ctaStyle: "bg-white/10 hover:bg-white/20 text-white border border-white/20",
  },
  {
    name: "Pro",
    price: "299 ₽",
    period: "в месяц",
    color: "border-purple-500/50",
    badge: "Популярный",
    features: [
      "Неограниченное кол-во треков",
      "Загрузка аудиофайлов",
      "Управление громкостью",
      "Стерео-панорама",
      "Воспроизведение в браузере",
      "Мастер-громкость",
      "Приоритетная поддержка",
    ],
    cta: "Выбрать Pro",
    ctaStyle: "bg-purple-600 hover:bg-purple-700 text-white",
  },
];

const PricingSection = () => {
  const navigate = useNavigate();

  return (
    <section id="pricing" className="py-24 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Простые тарифы</h2>
          <p className="text-zinc-400 text-lg">Начни бесплатно, переходи на Pro когда будешь готов</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative bg-zinc-900/60 border ${plan.color} rounded-2xl p-8 backdrop-blur`}
            >
              {plan.badge && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-xs font-medium px-4 py-1 rounded-full">
                  {plan.badge}
                </span>
              )}
              <div className="mb-6">
                <p className="text-zinc-400 text-sm mb-1">{plan.name}</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-white">{plan.price}</span>
                  <span className="text-zinc-500 text-sm">{plan.period}</span>
                </div>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-zinc-300">
                    <Icon name="Check" size={15} className="text-purple-400 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              <Button
                className={`w-full py-5 rounded-xl text-base ${plan.ctaStyle}`}
                onClick={() => navigate("/auth")}
              >
                {plan.cta}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
