import { useEffect, useMemo, useState } from "react";
import { Clock, Search } from "lucide-react";
import { apiJson, getApiBase } from "../lib/api";

export default function History() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtres
  const [contains, setContains] = useState("");
  const [testType, setTestType] = useState("");
  const [language, setLanguage] = useState("");
  const [provider, setProvider] = useState("");
  const [status, setStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [limit, setLimit] = useState(50);

  const fetchList = async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (limit) qs.set("limit", String(limit));
      if (contains.trim()) qs.set("contains", contains.trim());
      if (testType) qs.set("test_type", testType);
      if (language) qs.set("language", language);
      if (provider) qs.set("provider", provider);
      if (status) qs.set("status", status);
      if (dateFrom) qs.set("date_from", new Date(dateFrom).toISOString());
      if (dateTo) qs.set("date_to", new Date(dateTo).toISOString());
      const data = await apiJson(`/test-cases?${qs.toString()}`);
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchList(); /* auto load */ }, []); // eslint-disable-line

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-black/10 bg-white/70 p-5 backdrop-blur-md dark:border-white/10 dark:bg-gray-900/60">
        <h1 className="text-xl font-semibold">Historique des générations</h1>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Recherchez par texte, type, langage, provider, dates. API : <code className="rounded bg-black/5 px-1">{getApiBase()}</code>
        </p>
      </div>

      {/* Barre de filtres */}
      <div className="rounded-2xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-gray-900">
        <div className="grid gap-3 md:grid-cols-6">
          <label className="text-sm md:col-span-2">
            <span className="mb-1 block">Recherche texte</span>
            <div className="relative">
              <input
                value={contains}
                onChange={(e) => setContains(e.target.value)}
                placeholder="mots dans code/titre/test"
                className="w-full rounded-xl border border-black/10 bg-gray-50 p-2 pl-8 dark:bg-gray-950"
              />
              <Search size={14} className="absolute left-2 top-2.5 opacity-70" />
            </div>
          </label>

          <label className="text-sm">
            <span className="mb-1 block">Type</span>
            <select
              value={testType}
              onChange={(e) => setTestType(e.target.value)}
              className="w-full rounded-xl border border-black/10 bg-white p-2 dark:bg-gray-950"
            >
              <option value="">Tous</option>
              <option value="unit">unit</option>
              <option value="rest-assured">rest-assured</option>
              <option value="selenium">selenium</option>
            </select>
          </label>

          <label className="text-sm">
            <span className="mb-1 block">Langage</span>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full rounded-xl border border-black/10 bg-white p-2 dark:bg-gray-950"
            >
              <option value="">Tous</option>
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
              className="w-full rounded-xl border border-black/10 bg-white p-2 dark:bg-gray-950"
            >
              <option value="">Tous</option>
              <option value="gemini">Gemini</option>
              <option value="ollama">Ollama</option>
            </select>
          </label>

          <label className="text-sm">
            <span className="mb-1 block">Statut</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-xl border border-black/10 bg-white p-2 dark:bg-gray-950"
            >
              <option value="">Tous</option>
              <option value="draft">draft</option>
              <option value="confirmed">confirmed</option>
            </select>
          </label>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-6">
          <label className="text-sm">
            <span className="mb-1 block">Date début</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full rounded-xl border border-black/10 bg-gray-50 p-2 dark:bg-gray-950"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block">Date fin</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full rounded-xl border border-black/10 bg-gray-50 p-2 dark:bg-gray-950"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block">Limite</span>
            <input
              type="number"
              min={1}
              max={200}
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value || 50))}
              className="w-full rounded-xl border border-black/10 bg-gray-50 p-2 dark:bg-gray-950"
            />
          </label>

          <div className="flex items-end gap-3 md:col-span-3">
            <button
              onClick={fetchList}
              className="rounded-xl bg-indigo-700 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-800"
            >
              Appliquer les filtres
            </button>
            <button
              onClick={() => { setContains(""); setTestType(""); setLanguage(""); setProvider(""); setStatus(""); setDateFrom(""); setDateTo(""); setLimit(50); }}
              className="rounded-xl border border-black/10 px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Réinitialiser
            </button>
          </div>
        </div>
      </div>

      {/* Liste */}
      <div className="rounded-2xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-gray-900">
        {loading ? (
          <p className="text-sm opacity-70">Chargement…</p>
        ) : items.length === 0 ? (
          <p className="text-sm opacity-70">Aucun résultat.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left">
                <tr className="border-b border-black/10 dark:border-white/10">
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Type</th>
                  <th className="py-2 pr-4">Langage</th>
                  <th className="py-2 pr-4">Provider</th>
                  <th className="py-2 pr-4">Statut</th>
                  <th className="py-2 pr-4">Extrait code</th>
                  <th className="py-2">Extrait test généré</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it._id} className="border-b border-black/5 dark:border-white/5">
                    <td className="py-2 pr-4 whitespace-nowrap flex items-center gap-1">
                      <Clock size={14}/> {new Date(it.created_at || Date.now()).toLocaleString()}
                    </td>
                    <td className="py-2 pr-4">{it.test_type}</td>
                    <td className="py-2 pr-4">{it.language || "java"}</td>
                    <td className="py-2 pr-4">{it.provider || "-"}</td>
                    <td className="py-2 pr-4">{it.status || "confirmed"}</td>
                    <td className="py-2 pr-4">
                      <pre className="max-w-[28ch] truncate">{it.code}</pre>
                    </td>
                    <td className="py-2">
                      <pre className="max-w-[50ch] truncate">{it.generated_test}</pre>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
