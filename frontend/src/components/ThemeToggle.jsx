// src/components/ThemeToggle.jsx
import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle() {
  const getInitial = () => {
    const saved = localStorage.getItem("theme");
    if (saved) return saved === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  };
  const [dark, setDark] = useState(getInitial);

  useEffect(() => {
    const root = document.documentElement;   // <html>
    root.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  return (
    <button
      onClick={() => setDark(v => !v)}
      className="w-full flex items-center justify-center gap-2 rounded-lg border border-white/10
                 bg-white/50 px-3 py-2 text-sm hover:bg-white/70
                 dark:bg-gray-900/60 dark:hover:bg-gray-900/80"
      title="Basculer thème"
    >
      {dark ? <Sun size={16}/> : <Moon size={16}/>}
      {dark ? "Clair" : "Sombre"}
    </button>
  );
}
