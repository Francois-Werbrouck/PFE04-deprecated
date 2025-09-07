import { useEffect, useMemo, useState } from "react";
import { Clock } from "lucide-react";

export default function History() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const listEndpoint = useMemo(() => {
    const base = import.meta?.env?.VITE_API_URL?.trim();
    return (base || "http://localhost:8000") + "/test-cases?limit=50";
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(listEndpoint);
        const data = await res.json();
        setItems(Array.isArray(data) ? data : []);
      } catch (e) {
        // noop
      } finally {
        setLoading(false);
      }
    })();
  }, [listEndpoint]);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-black/10 bg-white/70 p-5 backdrop-blur-md dark:border-white/10 dark:bg-gray-900/60">
        <h1 className="text-xl font-semibold">Historique des générations</h1>
        <p className="text-sm text-gray-600 dark:text-gray-300">Dernières entrées enregistrées en base.</p>
      </div>

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
                  <th className="py-2 pr-4">Extrait code</th>
                  <th className="py-2">Extrait test généré</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it._id} className="border-b border-black/5 dark:border-white/5">
                    <td className="py-2 pr-4 whitespace-nowrap flex items-center gap-1">
                      <Clock size={14}/> {new Date(it.created_at || it._id?.$date || Date.now()).toLocaleString()}
                    </td>
                    <td className="py-2 pr-4">{it.test_type}</td>
                    <td className="py-2 pr-4">{it.language || "java"}</td>
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
