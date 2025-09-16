import { useEffect, useState } from "react";
import { Clock, Search, X, Copy } from "lucide-react";
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

  // Modale Détails (Code + Extrait)
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [view, setView] = useState("both"); // "both" | "code" | "excerpt"

  // Modale de lancement (après "Exécuter")
  const [runOpen, setRunOpen] = useState(false);
  const [runBusy, setRunBusy] = useState(false);
  const [runMeta, setRunMeta] = useState(null); // {execId, at, row, error?}

  const statusBadge = (s) => {
    const st = (s || "confirmed").toLowerCase();
    const cls =
      st === "draft"
        ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200"
        : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200";
    return (
      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
        {st}
      </span>
    );
  };

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
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openDetails = (row) => {
    setSelected(row);
    setView("both");
    setOpen(true);
  };

  const runExecution = async (row) => {
    setRunBusy(true);
    try {
      const d = await apiJson(`/test-cases/${row._id}/run`, {
        method: "POST",
        body: { language: row.language || "java" },
      });
      setRunMeta({ execId: d.execId, at: new Date().toISOString(), row });
      setRunOpen(true);
    } catch (e) {
      setRunMeta({
        execId: null,
        error: e?.message || "Erreur inconnue",
        at: new Date().toISOString(),
        row,
      });
      setRunOpen(true);
    } finally {
      setRunBusy(false);
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(String(text || ""));
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-black/10 bg-white/70 p-5 backdrop-blur-md dark:border-white/10 dark:bg-gray-900/60">
        <h1 className="text-xl font-semibold">Historique des générations</h1>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Recherchez par texte, type, langage, provider, dates. API :{" "}
          <code className="rounded bg-black/5 px-1">{getApiBase()}</code>
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
              type="button"
              onClick={(e) => {
                e.preventDefault();
                fetchList();
              }}
              className="rounded-xl bg-indigo-700 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-800"
            >
              Appliquer les filtres
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setContains("");
                setTestType("");
                setLanguage("");
                setProvider("");
                setStatus("");
                setDateFrom("");
                setDateTo("");
                setLimit(50);
              }}
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
            <table className="w-full min-w-[1100px] table-fixed text-sm">
              <colgroup>
                <col className="w-[190px]" /> {/* Date */}
                <col className="w-[140px]" /> {/* Type */}
                <col className="w-[130px]" /> {/* Langage */}
                <col className="w-[140px]" /> {/* Provider */}
                <col className="w-[120px]" /> {/* Statut */}
                <col className="w-[320px]" /> {/* Code & test (bouton) */}
                <col className="w-[150px]" /> {/* Action */}
              </colgroup>
              <thead className="text-left">
                <tr className="border-b border-black/10 dark:border-white/10">
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Type</th>
                  <th className="py-2 pr-4">Langage</th>
                  <th className="py-2 pr-4">Provider</th>
                  <th className="py-2 pr-4">Statut</th>
                  <th className="py-2 pr-4">Code & test</th>
                  <th className="py-2 pr-4">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it._id} className="border-b border-black/5 dark:border-white/5 align-top">
                    <td className="py-2 pr-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1">
                        <Clock size={14} />
                        {new Date(it.created_at || Date.now()).toLocaleString()}
                      </span>
                    </td>
                    <td className="py-2 pr-4">{it.test_type}</td>
                    <td className="py-2 pr-4">{it.language || "java"}</td>
                    <td className="py-2 pr-4">{it.provider || "-"}</td>
                    <td className="py-2 pr-4">{statusBadge(it.status)}</td>

                    {/* Colonne fusionnée: ouvre la modale Code + Extrait */}
                    <td className="py-2 pr-4">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            openDetails(it);
                          }}
                          className="rounded-lg border border-black/10 px-3 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
                          title="Voir le code et l'extrait"
                        >
                          Voir détails
                        </button>
                        <span className="ml-2 hidden lg:inline text-xs text-gray-500 dark:text-gray-400">
                          aperçu&nbsp;:&nbsp;
                          <code className="rounded bg-black/5 px-2 py-0.5">
                            {(it.generated_test || "").slice(0, 32) || "—"}…
                          </code>
                        </span>
                      </div>
                    </td>

                    {/* Action */}
                    <td className="py-2 pr-4">
                      <button
                        type="button"
                        onClick={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          await runExecution(it);
                        }}
                        disabled={runBusy}
                        className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium text-white ${
                          runBusy ? "bg-indigo-400 cursor-not-allowed" : "bg-indigo-700 hover:bg-indigo-800"
                        }`}
                      >
                        {runBusy ? (
                          <span className="inline-flex items-center gap-2">
                            <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-r-transparent" />
                            Exécution…
                          </span>
                        ) : (
                          "Exécuter"
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modale: Code & Extrait avec onglets */}
      {open && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="relative z-10 w-[min(1100px,95vw)] max-h-[90vh] overflow-hidden rounded-2xl border border-black/10 bg-white p-4 shadow-xl dark:border-white/10 dark:bg-gray-900">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Détails du test</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {new Date(selected.created_at || Date.now()).toLocaleString()} • {selected.test_type} •{" "}
                  {selected.language || "java"} • {selected.provider || "-"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-black/10 p-1.5 hover:bg-gray-50 dark:hover:bg-gray-800"
                aria-label="Fermer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Onglets */}
            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setView("both")}
                className={`rounded-lg px-3 py-1.5 text-sm ${
                  view === "both" ? "bg-indigo-700 text-white" : "border border-black/10 hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}
              >
                Les deux
              </button>
              <button
                type="button"
                onClick={() => setView("code")}
                className={`rounded-lg px-3 py-1.5 text-sm ${
                  view === "code" ? "bg-indigo-700 text-white" : "border border-black/10 hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}
              >
                Code
              </button>
              <button
                type="button"
                onClick={() => setView("excerpt")}
                className={`rounded-lg px-3 py-1.5 text-sm ${
                  view === "excerpt" ? "bg-indigo-700 text-white" : "border border-black/10 hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}
              >
                Extrait
              </button>
            </div>

            <div className="mt-4 grid gap-4" style={{ gridTemplateColumns: view === "both" ? "1fr 1fr" : "1fr" }}>
              {(view === "both" || view === "code") && (
                <section className="rounded-xl border border-black/10 p-3 dark:border-white/10">
                  <h3 className="mb-2 text-sm font-medium">Code</h3>
                  <div className="max-h-[55vh] overflow-auto rounded-lg bg-black/5 p-3 dark:bg-white/5">
                    <pre className="text-xs leading-relaxed whitespace-pre-wrap">{selected.code || "(vide)"}</pre>
                  </div>
                </section>
              )}
              {(view === "both" || view === "excerpt") && (
                <section className="rounded-xl border border-black/10 p-3 dark:border-white/10">
                  <h3 className="mb-2 text-sm font-medium">Extrait (test généré)</h3>
                  <div className="max-h-[55vh] overflow-auto rounded-lg bg-black/5 p-3 dark:bg-white/5">
                    <pre className="text-xs leading-relaxed whitespace-pre-wrap">
                      {selected.generated_test || "(vide)"}
                    </pre>
                  </div>
                </section>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modale de lancement */}
      {runOpen && runMeta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/50" onClick={() => setRunOpen(false)} />
          <div className="relative z-10 w-[min(900px,95vw)] max-h-[90vh] overflow-hidden rounded-2xl border border-black/10 bg-white p-4 shadow-xl dark:border-white/10 dark:bg-gray-900">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Exécution lancée</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {new Date(runMeta.at).toLocaleString()} • {runMeta.row?.test_type} • {runMeta.row?.language || "java"} •{" "}
                  {runMeta.row?.provider || "-"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRunOpen(false)}
                className="rounded-lg border border-black/10 p-1.5 hover:bg-gray-50 dark:hover:bg-gray-800"
                aria-label="Fermer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {/* À gauche : résumé du test */}
              <section className="rounded-xl border border-black/10 p-3 dark:border-white/10">
                <h3 className="mb-2 text-sm font-medium">Informations du test</h3>
                <dl className="text-xs leading-relaxed">
                  <div className="mb-1 flex gap-2"><dt className="w-24 text-gray-500">Type</dt><dd>{runMeta.row?.test_type}</dd></div>
                  <div className="mb-1 flex gap-2"><dt className="w-24 text-gray-500">Langage</dt><dd>{runMeta.row?.language || "java"}</dd></div>
                  <div className="mb-1 flex gap-2"><dt className="w-24 text-gray-500">Provider</dt><dd>{runMeta.row?.provider || "-"}</dd></div>
                  <div className="mb-1 flex gap-2"><dt className="w-24 text-gray-500">Statut</dt><dd>{statusBadge(runMeta.row?.status)}</dd></div>
                </dl>

                <div className="mt-3">
                  <p className="mb-1 text-xs font-medium text-gray-700 dark:text-gray-300">Aperçu code</p>
                  <div className="max-h-[24vh] overflow-auto rounded-lg bg-black/5 p-3 dark:bg-white/5">
                    <pre className="text-xs leading-relaxed whitespace-pre-wrap">
                      {(runMeta.row?.code || "").slice(0, 1200) || "(vide)"}
                    </pre>
                  </div>
                </div>
              </section>

              {/* À droite : résultat du lancement */}
              <section className="rounded-xl border border-black/10 p-3 dark:border-white/10">
                <h3 className="mb-2 text-sm font-medium">Résultat de lancement</h3>

                {runMeta.execId ? (
                  <>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-medium">ID d’exécution :</span>
                      <code className="rounded bg-black/5 px-2 py-0.5">{runMeta.execId}</code>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(runMeta.execId)}
                        className="inline-flex items-center gap-1 rounded border border-black/10 px-2 py-1 hover:bg-gray-50 dark:hover:bg-gray-800"
                        title="Copier"
                      >
                        <Copy size={14} /> Copier
                      </button>
                    </div>

                    <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                      Suivez la progression dans l’onglet <em>Exécutions</em> de l’application.
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {/* Exemple de lien si tu as une route /executions */}
                      {/* <a href={`/executions?focus=${runMeta.execId}`} className="rounded-lg bg-indigo-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-800">Ouvrir les exécutions</a> */}
                      <button
                        type="button"
                        onClick={async () => {
                          await runExecution(runMeta.row);
                        }}
                        className="rounded-lg border border-black/10 px-3 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        Relancer
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
                    Échec du lancement : {runMeta.error || "erreur inconnue"}.
                  </div>
                )}

                <div className="mt-4">
                  <p className="mb-1 text-xs font-medium text-gray-700 dark:text-gray-300">Aperçu du test généré</p>
                  <div className="max-h-[24vh] overflow-auto rounded-lg bg-black/5 p-3 dark:bg-white/5">
                    <pre className="text-xs leading-relaxed whitespace-pre-wrap">
                      {(runMeta.row?.generated_test || "").slice(0, 1200) || "(vide)"}
                    </pre>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
