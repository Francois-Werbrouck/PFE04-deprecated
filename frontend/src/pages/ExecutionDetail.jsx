import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { apiJson, getApiBase } from "../lib/api";

export default function ExecutionDetail() {
  const { execId } = useParams();
  const [item, setItem] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const data = await apiJson(`/executions/${execId}`);
    setItem(data);
  };

  useEffect(() => { load(); }, [execId]);

  const rerun = async () => {
    setBusy(true);
    try {
      const data = await apiJson(`/executions/${execId}/rerun`, { method: "POST" });
      // Redirige vers le nouvel exec (facultatif), ou recharge l'actuel
      // Ici on recharge juste la page (le nouvel exec apparaît dans la liste)
      await load();
      alert(`Relancé: ${data.execId}`);
    } finally {
      setBusy(false);
    }
  };

  if (!item) return <div>Chargement…</div>;

  const base = getApiBase();

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-black/10 bg-white/70 p-5 backdrop-blur-md dark:border-white/10 dark:bg-gray-900/60">
        <h1 className="text-xl font-semibold">Exécution #{item._id}</h1>
        <p className="text-sm opacity-80">Type: {item.kind} — Statut: {item.status}</p>
        <button onClick={rerun} disabled={busy}
                className="mt-3 rounded-xl border border-black/10 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50">
          Re-run
        </button>
      </div>

      <div className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-gray-900">
        <h2 className="mb-2 font-semibold">Logs</h2>
        <pre className="whitespace-pre-wrap text-xs">{item.logs || "—"}</pre>
      </div>

      <div className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-gray-900">
        <h2 className="mb-2 font-semibold">Artefacts</h2>
        {(!item.artifacts || item.artifacts.length === 0) ? (
          <p className="text-sm opacity-70">Aucun artefact.</p>
        ) : (
          <ul className="list-disc pl-5 text-sm">
            {item.artifacts.map((id) => (
              <li key={id}>
                <a className="underline" href={`${base}/artifact/${id}`} target="_blank" rel="noreferrer">
                  {id}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
