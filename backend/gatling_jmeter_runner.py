# backend/gatling_jmeter_runner.py
import os, tempfile, subprocess
from typing import Dict, List, Tuple

def _run_cmd(cmd, timeout=3600):
    p = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    try:
        out, err = p.communicate(timeout=timeout)
    except subprocess.TimeoutExpired:
        p.kill(); out, err = p.communicate()
        return 124, out, (err or "") + "\n[timeout]"
    return p.returncode, out, err

def run_gatling(params: Dict) -> Tuple[bool, str, List[Dict]]:
    sim = params.get("simulation")  # ex: computerdatabase.BasicSimulation si tu montes tes user-files
    results_dir = tempfile.mkdtemp(prefix="gatling-")
    cmd = ["docker","run","--rm","-v", f"{results_dir}:/opt/gatling/results","ghcr.io/gatling/gatling"]
    if sim: cmd += ["-s", sim, "-rm", "local"]
    rc, out, err = _run_cmd(cmd)
    logs = (out or "") + ("\n--- STDERR ---\n" + err if err else "")
    return (rc == 0), (logs or "[GATLING] Aucune sortie"), []

def run_jmeter(params: Dict) -> Tuple[bool, str, List[Dict]]:
    jmx = params.get("jmx")
    if not jmx or not os.path.isfile(jmx):
        return False, "[JMETER] Paramètre 'jmx' manquant ou invalide", []
    out_dir = tempfile.mkdtemp(prefix="jmeter-")
    jtl_host = os.path.join(out_dir, "result.jtl")
    cmd = [
        "docker","run","--rm",
        "-v", f"{os.path.dirname(jmx)}:/test",
        "-v", f"{out_dir}:/out",
        "justb4/jmeter",
        "-n","-t", f"/test/{os.path.basename(jmx)}",
        "-l","/out/result.jtl"
    ]
    rc, out, err = _run_cmd(cmd)
    logs = (out or "") + ("\n--- STDERR ---\n" + err if err else "")
    arts: List[Dict] = []
    if os.path.isfile(jtl_host):
        size = os.path.getsize(jtl_host)
        arts.append({"name": "result.jtl", "url": None, "size": size})
    return (rc == 0), (logs or "[JMETER] Aucune sortie"), arts
