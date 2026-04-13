import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "register">("register");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { register, login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const fn = mode === "register" ? register : login;
    const result = await fn(email, password);
    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      navigate("/mixer");
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <a href="/" className="block text-center text-3xl font-bold text-white mb-8 tracking-tighter">
          SoundForge
        </a>

        <div className="bg-zinc-900 border border-white/10 rounded-2xl p-8">
          <div className="flex rounded-lg bg-black/40 p-1 mb-6">
            <button
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${mode === "register" ? "bg-purple-600 text-white" : "text-zinc-400 hover:text-white"}`}
              onClick={() => setMode("register")}
            >
              Регистрация
            </button>
            <button
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${mode === "login" ? "bg-purple-600 text-white" : "text-zinc-400 hover:text-white"}`}
              onClick={() => setMode("login")}
            >
              Войти
            </button>
          </div>

          {mode === "register" && (
            <div className="bg-purple-600/20 border border-purple-500/30 rounded-lg p-3 mb-5 text-center">
              <span className="text-purple-300 text-sm">3 дня бесплатно — без карты</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm text-zinc-400 mb-1 block">Email</label>
              <Input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-black/40 border-white/10 text-white placeholder:text-zinc-600"
              />
            </div>
            <div>
              <label className="text-sm text-zinc-400 mb-1 block">Пароль</label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="bg-black/40 border-white/10 text-white placeholder:text-zinc-600"
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm text-center">{error}</p>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white py-5 rounded-xl text-base"
            >
              {loading ? "Загрузка..." : mode === "register" ? "Начать бесплатно" : "Войти"}
            </Button>
          </form>

          <p className="text-center text-zinc-500 text-xs mt-5">
            {mode === "register"
              ? "Уже есть аккаунт? "
              : "Нет аккаунта? "}
            <button
              className="text-purple-400 hover:text-purple-300"
              onClick={() => setMode(mode === "register" ? "login" : "register")}
            >
              {mode === "register" ? "Войти" : "Зарегистрироваться"}
            </button>
          </p>
        </div>

        <p className="text-center text-zinc-600 text-xs mt-4">
          После пробного периода — 299 руб/мес
        </p>
      </div>
    </div>
  );
}
