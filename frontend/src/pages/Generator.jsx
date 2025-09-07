import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";

export default function Generator() {
  const [code, setCode] = useState("");
  const [testType, setTestType] = useState("unit");        // unit | api | ui (UI)
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

  // Endpoint API (Paramètres > apiUrl, puis VITE_API_URL, puis fallback localhost)
  const endpoint = useMemo(() => {
    const stored = (typeof window !== "undefined" && localStorage.getItem("apiUrl")) || "";
    const env = import.meta?.env?.VITE_API_URL || "";
    const base = (stored || env || "http://127.0.0.1:8000/").trim().replace(/\/+$/,"");
    return base + "/generate-test";
  }, []);

  const abortRef = useRef(null);
  const textRef = useRef(null);

  // Auto-resize du textarea
  useEffect(() => {
    if (textRef.current) {
      textRef.current.style.height = "0px";
      textRef.current.style.height = Math.min(textRef.current.scrollHeight, 480) + "px";
    }
  }, [code]);

  const handleGenerate = async () => {
    if (!code.trim()) {
      setError("Veuillez saisir un extrait de code avant de lancer la génération.");
      return;
    }
    setLoading(true);
    setResult("");
    setError("");

    // Timeout et annulation
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
      try { data = await res.json(); } catch { /* ignore */ }

      if (!res.ok) {
        throw new Error(data?.detail || `Erreur HTTP ${res.status}`);
      }

      const cleaned = (data.result || "").replace(/```(?:\w+)?|```/g, "").trim();
      setResult(cleaned);
    } catch (e) {
      if (e.name === "AbortError") {
        setError("Le serveur n’a pas répondu dans le délai imparti. Veuillez vérifier la connexion et réessayer.");
      } else {
        setError(e.message || "Une erreur est survenue pendant la génération. Veuillez réessayer.");
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
      {/* En-tête sobre et professionnel */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: .5 }}
        className="rounded-3xl border border-black/10 bg-white/70 p-6 backdrop-blur-md dark:border-white/10 dark:bg-gray-900/60"
      >
        <h1 className="text-2xl font-bold">
          Génération automatisée de cas de test logiciels
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
          Saisissez un extrait de code, sélectionnez le type de test et le langage souhaité.
          La plateforme produira automatiquement un cas de test conforme aux standards de l’industrie.
        </p>
      </motion.div>

      {/* Grille principale */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Entrée */}
        <section className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-gray-900">
          <h2 className="mb-3 text-base font-semibold">Entrée</h2>

          <label className="mb-2 block text-sm">Code à analyser</label>
          <textarea
            ref={textRef}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Ex. : méthode métier, contrôleur REST ou composant UI."
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
              className="inline-flex w-full items-center justify-center rounded-xl bg-indigo-700 px-4 py-2
                         text-sm font-medium text-white transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Génération en cours…" : "Lancer la génération"}
            </button>
          </div>

          {!!error && (
            <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          )}
        </section>

        {/* Résultat */}
        <section className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-gray-900">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">Résultat</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={downloadResult}
                disabled={!result}
                className="rounded-lg border border-black/10 px-3 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40"
              >
                Exporter le résultat
              </button>
              <button
                onClick={copyToClipboard}
                disabled={!result}
                className="rounded-lg border border-black/10 px-3 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40"
              >
                {copied ? "Code copié" : "Copier le code"}
              </button>
            </div>
          </div>

          <pre className="h-[420px] overflow-auto rounded-xl border border-black/10 bg-gray-50 p-4 text-[13px] leading-5
                          text-gray-900 dark:bg-gray-950 dark:text-gray-100">
{result || "Le cas de test généré s’affichera ci-dessous."}
          </pre>
        </section>
      </div>
    </div>
  );
}
