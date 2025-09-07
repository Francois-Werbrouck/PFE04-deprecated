import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Loader2, ClipboardCopy, Download } from "lucide-react";
import toast from "react-hot-toast";

export default function Generator() {
  const [code, setCode] = useState("");
  const [testType, setTestType] = useState("unit");        // unit | api | ui
  const [language, setLanguage] = useState("java");        // java, python, ...
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  // Map vers les valeurs attendues par le backend
  const backendTypeMap = {
    unit: "unit",
    api: "rest-assured",
    ui: "selenium",
  };

  const endpoint = useMemo(() => {
    const stored = (typeof window !== "undefined" && localStorage.getItem("apiUrl")) || "";
    const env = import.meta?.env?.VITE_API_URL || "";
    const base = (stored || env || "http://127.0.0.1:8000/").trim().replace(/\/+$/,"");
    return base + "/generate-test";
  }, []);

  const abortRef = useRef(null);
  const textRef = useRef(null);

  useEffect(() => {
    if (textRef.current) {
      textRef.current.style.height = "0px";
      textRef.current.style.height = Math.min(textRef.current.scrollHeight, 480) + "px";
    }
  }, [code]);

  const handleGenerate = async () => {
    if (!code.trim()) {
      setError("Veuillez coller un extrait de code avant de générer.");
      return;
    }
    setLoading(true);
    setResult("");
    setError("");

    abortRef.current?.abort?.();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s
    abortRef.current = controller;

    try {
      const mappedType = backendTypeMap[testType] ?? "unit";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, test_type: mappedType, language }),
        signal: controller.signal,
      });

      let data = {};
      try { data = await res.json(); } catch {}

      if (!res.ok) throw new Error(data?.detail || `Erreur HTTP ${res.status}`);

      const cleaned = (data.result || "").replace(/```(?:\w+)?|```/g, "").trim();
      setResult(cleaned);
    } catch (e) {
      if (e.name === "AbortError") {
        setError("Requête expirée (timeout). Vérifie que le backend écoute bien sur /generate-test.");
      } else {
        setError(e.message || "Erreur inconnue");
      }
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!result) return;
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  const downloadResult = () => {
    if (!result) return;
    const extByLang = { java:"java", python:"py", javascript:"js", typescript:"ts", csharp:"cs", ruby:"rb", go:"go" };
    const nameByType = { unit:"UnitTest", api:"ApiTest", ui:"UiTest" };
    const ext = extByLang[language] || "txt";
    const blob = new Blob([result], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${nameByType[testType]}.${ext}`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="space-y-6">
      {/* Hero */}
      <motion.div initial={{opacity:0,y:-10}} animate={{opacity:1,y:0}} transition={{duration:.5}}
        className="rounded-3xl border border-black/10 bg-white/70 p-6 backdrop-blur-md dark:border-white/10 dark:bg-gray-900/60">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="text-yellow-500"/> Génération automatique de cas de test
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
          Collez votre code, choisissez le type (unitaire, API, UI) et le langage cible, puis générez.
        </p>
      </motion.div>

      {/* Grille */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Entrée */}
        <section className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-gray-900">
          <h2 className="mb-3 text-base font-semibold">Entrée</h2>

          <label className="mb-2 block text-sm">Code à analyser</label>
          <textarea
            ref={textRef}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Méthode métier, contrôleur REST, ou HTML/JS pour UI…"
            className="w-full resize-none rounded-xl border border-black/10 bg-gray-50 p-3 font-mono text-[13px] leading-5
                       text-gray-900 outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-950 dark:text-gray-100"
          />

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block">Type de test</span>
              <select
                value={testType}
                onChange={(e) => setTestType(e.target.value)}
                className="w-full rounded-xl border border-black/10 bg-white p-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400
                           dark:bg-gray-950 dark:text-gray-100"
              >
                <option value="unit">Unit (unitaire)</option>
                <option value="api">API (HTTP)</option>
                <option value="ui">UI (end-to-end)</option>
              </select>
            </label>

            <label className="text-sm">
              <span className="mb-1 block">Langage cible</span>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full rounded-xl border border-black/10 bg-white p-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400
                           dark:bg-gray-950 dark:text-gray-100"
              >
                <option value="java">Java</option>
                <option value="python">Python</option>
                <option value="javascript">JavaScript</option>
                <option value="typescript">TypeScript</option>
                <option value="csharp">C#</option>
                <option value="ruby">Ruby</option>
                <option value="go">Go</option>
              </select>
            </label>
          </div>

          <div className="mt-4">
            <button
              onClick={handleGenerate}
              disabled={loading || !code.trim()}
              className="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 to-fuchsia-600 px-4 py-2
                         text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Génération en cours…</>) : "🚀 Générer"}
            </button>
          </div>

          {!!error && (
            <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">❌ {error}</p>
          )}
        </section>

        {/* Résultat */}
        <section className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-gray-900">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">Résultat</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={downloadResult} disabled={!result}
                className="rounded-lg border border-black/10 px-3 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40"
              >
                <Download className="inline -mt-1 mr-1" size={16}/> Télécharger
              </button>
              <button
                onClick={copyToClipboard} disabled={!result}
                className="rounded-lg border border-black/10 px-3 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40"
              >
                <ClipboardCopy className="inline -mt-1 mr-1" size={16}/> {copied ? "Copié !" : "Copier"}
              </button>
            </div>
          </div>
          <pre className="h-[420px] overflow-auto rounded-xl border border-black/10 bg-gray-50 p-4 text-[13px] leading-5
                          text-gray-900 dark:bg-gray-950 dark:text-gray-100">
{result || "Le code généré apparaîtra ici…"}
          </pre>
        </section>
      </div>
    </div>
  );
}