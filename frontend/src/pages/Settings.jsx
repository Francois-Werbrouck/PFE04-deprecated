import { useEffect, useState } from "react";
import toast from "react-hot-toast";

export default function Settings() {
  const [apiUrl, setApiUrl] = useState(localStorage.getItem("apiUrl") || (import.meta.env.VITE_API_URL || "http://localhost:8000"));
  const [provider, setProvider] = useState(localStorage.getItem("provider") || "gemini");

  useEffect(() => {
    // Ces valeurs sont purement front, pour ton confort (affichage)
  }, []);

  const save = () => {
    localStorage.setItem("apiUrl", apiUrl);
    localStorage.setItem("provider", provider);
    toast.success("Paramètres enregistrés (front).");
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-black/10 bg-white/70 p-5 backdrop-blur-md dark:border-white/10 dark:bg-gray-900/60">
        <h1 className="text-xl font-semibold">Paramètres</h1>
        <p className="text-sm opacity-80">Ces réglages sont stockés en local dans ton navigateur.</p>
      </div>

      <div className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-gray-900">
        <div className="grid gap-4 max-w-xl">
          <label className="text-sm">
            <span className="mb-1 block">URL de l’API backend</span>
            <input
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              className="w-full rounded-xl border border-black/10 bg-gray-50 p-2 dark:bg-gray-950"
            />
          </label>

          <label className="text-sm">
            <span className="mb-1 block">Provider LLM (indicatif)</span>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="w-full rounded-xl border border-black/10 bg-white p-2 dark:bg-gray-950"
            >
              <option value="gemini">Gemini</option>
              <option value="ollama">Ollama (DeepSeek)</option>
            </select>
          </label>

          <button
            onClick={save}
            className="w-fit rounded-xl bg-gradient-to-r from-indigo-600 to-fuchsia-600 px-4 py-2 text-sm font-medium text-white"
          >
            Enregistrer
          </button>

          <p className="text-xs opacity-70">
            Nota : pour changer le provider réellement côté serveur, utilise la variable d’environnement
            <code className="mx-1 rounded bg-black/10 px-1">LLM_PROVIDER</code> (voir backend).
          </p>
        </div>
      </div>
    </div>
  );
}
