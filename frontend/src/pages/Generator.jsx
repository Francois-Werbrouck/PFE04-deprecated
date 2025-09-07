// src/pages/Generator.jsx
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { apiJson, getApiBase } from "../lib/api";

// Suggestions de modèles pour Ollama
const OLLAMA_SUGGESTIONS = ["deepseek-coder:6.7b", "deepseek-coder:7b", "deepseek-coder:33b"];

// Normalisation de fautes fréquentes (ex: ":3b" -> ":6.7b")
const normalizeOllamaModel = (m) => {
  const t = (m || "").trim();
  if (!t) return "deepseek-coder:6.7b";
  if (t === "deepseek-coder:3b") return "deepseek-coder:6.7b";
  return t;
};

export default function Generator() {
  const [code, setCode] = useState("");
  const [testType, setTestType] = useState("unit");   // unit | api | ui
  const [language, setLanguage] = useState("java");
  const [provider, setProvider] = useState(localStorage.getItem("provider") || "gemini"); // gemini | ollama
  const [model, setModel] = useState(() =>
    provider === "ollama"
      ? (localStorage.getItem("ollamaModel") || "deepseek-coder:6.7b")
      : (localStorage.getItem("geminiModel") || "gemini-1.5-flash")
  );

  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("idle"); // idle | draft | confirmed

  // Map UI -> backend
  const backendTypeMap = {
    unit: "unit",
    api: "rest-assured",
    ui: "selenium",
  };

  // Refs pour auto-resize
  const codeRef = useRef(null);
  const resultRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => {
    if (codeRef.current) {
      codeRef.current.style.height = "0px";
      codeRef.current.style.height = Math.min(codeRef.current.scrollHeight, 480) + "px";
    }
  }, [code]);

  useEffect(() => {
    if (resultRef.current) {
      resultRef.current.style.height = "0px";
      resultRef.current.style.height = Math.min(resultRef.current.scrollHeight, 480) + "px";
    }
  }, [result]);

  // Met à jour le modèle par défaut selon provider
  useEffect(() => {
    const next = provider === "ollama"
      ? (localStorage.getItem("ollamaModel") || "deepseek-coder:6.7b")
      : (localStorage.getItem("geminiModel") || "gemini-1.5-flash");
    setModel(next);
  }, [provider]);

  const onModelChange = (val) => {
    const v = provider === "ollama" ? normalizeOllamaModel(val) : (val || "").trim();
    setModel(v);
    if (provider === "ollama") localStorage.setItem("ollamaModel", v);
    else localStorage.setItem("geminiModel", v);
  };

  const handlePreview = async () => {
    if (!code.trim()) {
      setError("Veuillez saisir un extrait de code avant de lancer la génération.");
      return;
    }
    setLoading(true);
    setError("");
    setResult("");
    setStatus("idle");

    // Timeout & abort
    abortRef.current?.abort?.();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    abortRef.current = controller;

    try {
      const mappedType = backendTypeMap[testType] ?? "unit";

      // Sécurise le modèle pour Ollama
      let effectiveModel = model;
      if (provider === "ollama") {
        effectiveModel = normalizeOllamaModel(model);
        if (effectiveModel !== model) {
          setModel(effectiveModel);
          localStorage.setItem("ollamaModel", effectiveModel);
        }
        // simple validation
        const looksValid = effectiveModel.startsWith("deepseek-coder:");
        if (!looksValid) {
          setError("Modèle Ollama invalide. Exemples valides : deepseek-coder:6.7b | deepseek-coder:7b | deepseek-coder:33b");
          setLoading(false);
          clearTimeout(timeoutId);
          return;
        }
      }

      const payload = {
        code,
        test_type: mappedType,
        language,
        provider,
        model: effectiveModel
      };

      const data = await apiJson("/generate-test-preview", { method: "POST", body: payload, signal: controller.signal });
      const cleaned = (data.result || "").replace(/```(?:\w+)?|```/g, "").trim();
      setResult(cleaned);
      setStatus("draft");
    } catch (e) {
      setError(e.message || "Erreur lors de la génération.");
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  const handleConfirmSave = async () => {
    if (!result.trim()) {
      toast.error("Aucun résultat à enregistrer.");
      return;
    }
    setSaving(true);
    setError("");

    try {
      const mappedType = backendTypeMap[testType] ?? "unit";
      const payload = {
        code,
        generated_test: result,
        test_type: mappedType,
        language,
        status: "confirmed",
        provider,
        model
      };
      await apiJson("/test-cases", { method: "POST", body: payload });
      setStatus("confirmed");
      toast.success("Cas de test enregistré.");
    } catch (e) {
      setError(e.message || "Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  const handleRetry = () => {
    setResult("");
    setStatus("idle");
    setError("");
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
          Génération automatisée de cas de test
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
          Saisissez un extrait de code, sélectionnez le type de test, le langage, et le provider.
          Prévisualisez, éditez si nécessaire, puis confirmez pour enregistrer en base.
        </p>
        <div className="mt-3 text-xs text-gray-500">
          API: <code className="rounded bg-black/5 px-1">{getApiBase()}</code>
        </div>
      </motion.div>

      {/* Grille principale */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Entrée */}
        <section className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-gray-900">
          <h2 className="mb-3 text-base font-semibold">Entrée</h2>

          <label className="mb-2 block text-sm">Code à analyser</label>
          <textarea
            ref={codeRef}
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

            <label className="text-sm">
              <span className="mb-1 block">Provider</span>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="w-full rounded-xl border border-black/10 bg-white p-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400
                           dark:bg-gray-950 dark:text-gray-100"
              >
                <option value="gemini">Gemini</option>
                <option value="ollama">Ollama (DeepSeek)</option>
              </select>
            </label>

            <label className="text-sm">
              <span className="mb-1 block">Modèle</span>
              <input
                list={provider === "ollama" ? "ollama-models" : undefined}
                value={model}
                onChange={(e) => onModelChange(e.target.value)}
                placeholder={provider === "ollama" ? "deepseek-coder:6.7b" : "gemini-1.5-flash"}
                className="w-full rounded-xl border border-black/10 bg-white p-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400
                           dark:bg-gray-950 dark:text-gray-100"
              />
              {provider === "ollama" && (
                <datalist id="ollama-models">
                  {OLLAMA_SUGGESTIONS.map((opt) => <option key={opt} value={opt} />)}
                </datalist>
              )}
              <p className="mt-1 text-xs opacity-70">
                {provider === "ollama"
                  ? "Exemples: deepseek-coder:6.7b | 7b | 33b"
                  : "Exemples: gemini-1.5-flash | gemini-1.5-pro"}
              </p>
            </label>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <button
              onClick={handlePreview}
              disabled={loading || !code.trim()}
              className="inline-flex w-full items-center justify-center rounded-xl bg-indigo-700 px-4 py-2
                         text-sm font-medium text-white transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Génération en cours…" : "Prévisualiser (sans enregistrer)"}
            </button>

            <button
              onClick={handleRetry}
              disabled={loading || (!result && status !== "draft")}
              className="inline-flex w-full items-center justify-center rounded-xl border border-black/10 px-4 py-2
                         text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Réinitialiser le résultat
            </button>
          </div>

          {!!error && (
            <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          )}
        </section>

        {/* Résultat (éditable avant confirmation) */}
        <section className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-gray-900">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">Résultat (éditable)</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={downloadResult}
                disabled={!result}
                className="rounded-lg border border-black/10 px-3 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40"
              >
                Exporter
              </button>
              <button
                onClick={copyToClipboard}
                disabled={!result}
                className="rounded-lg border border-black/10 px-3 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40"
              >
                {copied ? "Code copié" : "Copier"}
              </button>
            </div>
          </div>

          <textarea
            ref={resultRef}
            value={result}
            onChange={(e) => setResult(e.target.value)}
            placeholder="Le cas de test généré s’affichera ci-dessous. Vous pouvez l’éditer avant de confirmer."
            className="h-[420px] w-full resize-none rounded-xl border border-black/10 bg-gray-50 p-4 font-mono text-[13px] leading-5
                       text-gray-900 outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-950 dark:text-gray-100"
          />

          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={handleConfirmSave}
              disabled={!result || saving}
              className="inline-flex items-center justify-center rounded-xl bg-emerald-700 px-4 py-2
                         text-sm font-medium text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Enregistrement…" : "Confirmer et enregistrer"}
            </button>
            {status !== "idle" && (
              <span className={`text-xs ${status === "confirmed" ? "text-emerald-600" : "text-amber-600"}`}>
                Statut : {status}
              </span>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
