import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Loader2, ClipboardCopy } from "lucide-react";

export default function TestGenerator() {
  const [code, setCode] = useState("");
  const [testType, setTestType] = useState("unit");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    setResult("");
    setError("");
    try {
      const response = await fetch("http://localhost:8000/generate-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, test_type: testType })
      });

      const data = await response.json();
      console.log("API response:", data);

      if (!response.ok) {
        throw new Error(data.detail || "Unknown error");
      }

      setResult(
        data.result?.replace(/```(?:java)?|```/g, "").trim() || ""
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-white to-blue-100 p-6 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-4xl"
      >
        <h1 className="text-4xl font-extrabold text-center mb-6 text-blue-800 flex items-center justify-center gap-2">
          <Sparkles className="text-yellow-500 animate-pulse" /> AI Test Case Generator
        </h1>

        <div className="bg-white shadow-lg rounded-lg p-6 space-y-4">
          <textarea
            rows={8}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Paste your Java method here..."
            className="w-full p-4 border border-gray-300 rounded-md text-sm font-mono resize-none"
          />

          <select
            value={testType}
            onChange={(e) => setTestType(e.target.value)}
            className="p-3 border rounded-md text-sm"
          >
            <option value="unit">JUnit</option>
            <option value="rest-assured">REST Assured</option>
            <option value="selenium">Selenium</option>
          </select>

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="bg-blue-600 text-white w-full py-3 rounded-md font-medium hover:bg-blue-700"
          >
            {loading ? (
              <span className="flex justify-center items-center">
                <Loader2 className="animate-spin h-5 w-5 mr-2" /> Generating...
              </span>
            ) : (
              "🚀 Generate Test"
            )}
          </button>
        </div>

        {error && (
          <p className="text-red-600 font-medium text-center mt-4">❌ {error}</p>
        )}

        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-6 bg-gray-100 p-6 rounded-md shadow-md relative"
          >
            <h2 className="text-xl font-semibold mb-2 text-blue-700">Generated Test:</h2>
            <pre className="whitespace-pre-wrap text-sm overflow-x-auto bg-white text-gray-800 p-4 border border-gray-300 rounded"

>
  {result}
</pre>

            <button
              onClick={copyToClipboard}
              className="absolute top-4 right-4 flex items-center gap-1 text-sm text-blue-600 hover:underline"
            >
              <ClipboardCopy className="w-4 h-4" /> {copied ? "Copied!" : "Copy"}
            </button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
