import os
import re
import requests
from typing import Optional, List, Dict

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://127.0.0.1:11434/api/generate")
DEFAULT_OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "deepseek-coder:1.3b")

# ============================
# 1) Détection & parsing Spring
# ============================

_SPRING_ANNOT = re.compile(
    r"@RestController|@Controller|@RequestMapping|@GetMapping|@PostMapping|@PutMapping|@DeleteMapping",
    re.MULTILINE,
)

_MAPPING = re.compile(
    r"@(GetMapping|PostMapping|PutMapping|DeleteMapping)(?:\s*\(\s*value\s*=\s*)?\(\s*([\"'][^\"']+[\"'])?\s*\)|"
    r"@(RequestMapping)\s*\(\s*value\s*=\s*([\"'][^\"']+[\"'])\s*,\s*method\s*=\s*RequestMethod\.(GET|POST|PUT|DELETE)\s*\)",
    re.MULTILINE,
)

_REQ_PARAM = re.compile(
    r"@RequestParam(?:\s*\(\s*name\s*=\s*)?\s*(?:value\s*=\s*)?\s*([\"']?)([A-Za-z_][A-Za-z0-9_]*)\1",
    re.MULTILINE,
)

_CLASS_REQUEST_MAPPING = re.compile(
    r"@RequestMapping\s*\(\s*value\s*=\s*([\"'])([^\"']+)\1\s*\)",
    re.MULTILINE,
)

def is_spring_controller(src: str) -> bool:
    return bool(_SPRING_ANNOT.search(src or ""))

def _class_level_prefix(src: str) -> str:
    m = _CLASS_REQUEST_MAPPING.search(src or "")
    return m.group(2).strip() if m else ""

def parse_spring_endpoints(src: str) -> List[Dict]:
    """
    Retourne une liste d'endpoints [{'method':'GET','path':'/api/add','params':['a','b']}]
    """
    if not src:
        return []
    base = _class_level_prefix(src)
    endpoints = []
    for m in _MAPPING.finditer(src):
        if m.group(1):  # GetMapping|PostMapping|...
            http = m.group(1).replace("Mapping", "").upper()
            raw = m.group(2) or '"/"'
            path = raw.strip().strip('"\'')
        else:  # RequestMapping(value="...", method=RequestMethod.X)
            http = (m.group(5) or "").upper()
            path = (m.group(4) or "").strip().strip('"\'')
        full = f"{('/' + base.strip('/')) if base else ''}/{path.strip('/')}".replace("//", "/")
        # Params à partir de la signature
        # Très simple : on prend tous les @RequestParam du fichier (suffisant pour un contrôleur petit)
        params = list({p.group(2) for p in _REQ_PARAM.finditer(src)})
        endpoints.append({"method": http, "path": full if full.startswith("/") else f"/{full}", "params": params})
    # dédoublonne
    uniq = []
    seen = set()
    for e in endpoints:
        k = (e["method"], e["path"], tuple(sorted(e["params"])))
        if k not in seen:
            seen.add(k)
            uniq.append(e)
    return uniq

# ============================
# 2) Prompting ciblé & strict
# ============================

def _spring_http_hint(prefer: str, spec: List[Dict]) -> str:
    if not spec:
        target = "un ou plusieurs endpoints REST Spring"
    else:
        lines = [f"- {e['method']} {e['path']} (params: {', '.join(e['params']) or '—'})" for e in spec]
        target = "cible :\n" + "\n".join(lines)

    if prefer == "restassured":
        return (
            f"Contrôleur REST Spring — {target}\n"
            "Tu DOIS tester via **REST Assured** (Junit 5). "
            "N’APPELLE PAS directement la méthode Java ; passe par HTTP. "
            "Inclure imports et annotations. Cas attendus : nominal + erreurs (paramètre manquant, type invalide)."
        )
    # défaut MockMvc
    return (
        f"Contrôleur REST Spring — {target}\n"
        "Tu DOIS tester via **MockMvc** avec `@WebMvcTest(controllers=...)`. "
        "N’APPELLE PAS directement la méthode Java ; passe par HTTP (mockMvc.perform(...)). "
        "Inclure imports et annotations. Cas attendus : nominal + erreurs (paramètre manquant, type invalide)."
    )

PROMPT_TEMPLATE = """Tu es un expert en AUTOMATISATION DE TESTS.

OBJECTIF — produire un FICHIER DE TEST complet pour le code fourni.

CONTRAINTES TRÈS STRICTES :
- Réponds UNIQUEMENT par du CODE (zéro phrase, zéro explication).
- AUCUNE balise ``` ni markdown.
- Commence ta réponse PAR LA PREMIÈRE LIGNE DE CODE (import/package/...).
- Inclure TOUS les imports nécessaires.
- Contenir AU MINIMUM :
  • 1 cas nominal
  • 1 cas d’erreur/limite (ex. paramètre manquant, type invalide, valeur frontière).
- Si nécessaire, CRÉE des stubs réalistes minimaux pour exécuter les tests.
- Respecte le framework indiqué ci-dessous.

Langage cible : {language}
Type de test : {test_type}
Framework attendu : {framework_hint}
Directives spécifiques : {domain_hint}

Code sous test :
---
{code}
---

RENVOIE UNIQUEMENT LE CODE DU TEST, EN COMMENÇANT DIRECTEMENT PAR LA PREMIÈRE LIGNE DE CODE.
"""

def _framework_hint(language: str, test_type: str) -> str:
    key = (language or "").lower(), (test_type or "").lower()
    mapping = {
        ("java","unit"): "JUnit 5 + AssertJ",
        ("java","rest-assured"): "JUnit 5, tests d’API HTTP Spring (MockMvc ou REST Assured).",
        ("java","selenium"): "Selenium WebDriver + JUnit 5",

        ("python","unit"): "pytest",
        ("python","rest-assured"): "requests + pytest",
        ("python","selenium"): "selenium + pytest",

        ("javascript","unit"): "Jest",
        ("javascript","rest-assured"): "supertest + Jest",
        ("javascript","selenium"): "selenium-webdriver + Jest",

        ("typescript","unit"): "Jest (ts-jest)",
        ("typescript","rest-assured"): "supertest + Jest",
        ("typescript","selenium"): "selenium-webdriver + Jest",

        ("csharp","unit"): "xUnit",
        ("csharp","rest-assured"): "RestSharp + xUnit",
        ("csharp","selenium"): "Selenium WebDriver + xUnit",

        ("ruby","unit"): "RSpec",
        ("ruby","rest-assured"): "Faraday + RSpec",
        ("ruby","selenium"): "selenium-webdriver + RSpec",

        ("go","unit"): "testing",
        ("go","rest-assured"): "net/http + testing",
        ("go","selenium"): "chromedp (équivalent Selenium en Go)",
    }
    return mapping.get(key, "Tests automatisés conformes au langage et type.")

def _domain_hint(code: str, language: str, test_type: str) -> str:
    if (language or "").lower() == "java" and (test_type or "").lower() in {"rest-assured", "unit"} and is_spring_controller(code):
        spec = parse_spring_endpoints(code)
        # Par défaut on préfère MockMvc (plus fiable/rapide en unit/integration light)
        return _spring_http_hint("mockmvc", spec)
    return "Aucune directive spécifique."

def _build_prompt(code: str, test_type: str, language: str) -> str:
    return PROMPT_TEMPLATE.format(
        code=code,
        test_type=test_type,
        language=language,
        framework_hint=_framework_hint(language, test_type),
        domain_hint=_domain_hint(code, language, test_type),
    )

# ============================
# 3) Post-traitement & validation
# ============================

_CODE_START_PAT = re.compile(
    r"(?:^\s*(?:package|import|using)\b)|"
    r"(?:^\s*(?:class|@Test|def\s+test_|describe\(|it\(|test\(|func\s+Test))",
    re.MULTILINE
)

def _extract_code_from_fenced(text: str) -> str:
    blocks = re.findall(r"```(?:[a-zA-Z]+)?\s*([\s\S]*?)```", text or "")
    return (max(blocks, key=len).strip() if blocks else "").strip()

def _strip_to_first_code_like_line(text: str) -> str:
    if not text:
        return ""
    m = _CODE_START_PAT.search(text)
    return text[m.start():].strip() if m else text.strip()

def _postprocess_response(raw: str) -> str:
    s = (raw or "").strip()
    if not s:
        return ""
    fenced = _extract_code_from_fenced(s)
    if fenced:
        return fenced
    return s.replace("```", "").strip()

def _looks_like_http_test_java(text: str) -> bool:
    t = (text or "").strip()
    if not t:
        return False
    has_mockmvc = ("@WebMvcTest" in t and "MockMvc" in t and "mockMvc.perform(" in t)
    has_restassured = ("io.restassured.RestAssured" in t) or ("given()" in t and "when().get(" in t)
    return has_mockmvc or has_restassured

def _covers_endpoint(text: str, ep: Dict) -> bool:
    if not text or not ep:
        return False
    path_ok = ep["path"] in text
    method = ep["method"]
    if method == "GET":
        method_ok = ("get(" in text)
    elif method == "POST":
        method_ok = ("post(" in text)
    elif method == "PUT":
        method_ok = ("put(" in text)
    else:
        method_ok = ("delete(" in text)
    return path_ok and method_ok

def _fallback_spring_mockmvc_from_spec(spec: List[Dict], controller_class: str = "CalculatorController") -> str:
    # prend le premier endpoint comme base
    ep = spec[0] if spec else {"method": "GET", "path": "/api/add", "params": ["a", "b"]}
    params = ep.get("params") or []
    params_str = "".join([f'.param("{p}", "1")' for p in params])
    body_expect = 'content().string("2")' if "a" in params and "b" in params else "content().string(notNullValue())"
    return (
        "package com.example;\n\n"
        "import org.junit.jupiter.api.Test;\n"
        "import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;\n"
        "import org.springframework.beans.factory.annotation.Autowired;\n"
        "import org.springframework.test.web.servlet.MockMvc;\n"
        "import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;\n"
        "import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;\n"
        "import org.springframework.http.MediaType;\n\n"
        f"@WebMvcTest(controllers = {controller_class}.class)\n"
        "class ControllerHttpTest {\n"
        "  @Autowired MockMvc mockMvc;\n\n"
        "  @Test void nominal() throws Exception {\n"
        f"    mockMvc.perform({ep['method'].lower()}(\"{ep['path']}\"){params_str}.accept(MediaType.APPLICATION_JSON))\n"
        "      .andExpect(status().isOk())\n"
        f"      .andExpect({body_expect});\n"
        "  }\n\n"
        "  @Test void missing_param() throws Exception {\n"
        f"    mockMvc.perform({ep['method'].lower()}(\"{ep['path']}\").accept(MediaType.APPLICATION_JSON))\n"
        "      .andExpect(status().isBadRequest());\n"
        "  }\n"
        "}\n"
    )

# ============================
# 4) Appel Ollama
# ============================

def _ollama_call(payload: dict, timeout: int = 60) -> str:
    r = requests.post(OLLAMA_URL, json=payload, timeout=timeout)
    if r.status_code != 200:
        try:
            detail = r.json()
        except Exception:
            detail = r.text
        raise Exception(f"Erreur modèle LLM (Ollama): {detail}")
    return (r.json().get("response") or "").strip()

def generate_test_case_ollama(
    code: str,
    test_type: str,
    language: str,
    model: Optional[str] = None,
    timeout_seconds: int = 60,
) -> str:
    model_name = (model or DEFAULT_OLLAMA_MODEL).strip()
    prompt = _build_prompt(code, test_type, language)

    base_options = {
        "temperature": 0.2,
        "top_p": 0.9,
        "num_predict": 768,
        "repeat_penalty": 1.05,
        "stop": ["```", "<html", "<!DOCTYPE", "Explanation:", "Explication:"],
    }

    # ----- Passe 1
    raw1 = _ollama_call({"model": model_name, "prompt": prompt, "stream": False, "options": base_options}, timeout_seconds)
    code1 = _postprocess_response(raw1)
    if not code1:
        code1 = _strip_to_first_code_like_line(raw1)

    if (language or "").lower() == "java" and is_spring_controller(code):
        spec = parse_spring_endpoints(code)
        if _looks_like_http_test_java(code1) and (not spec or any(_covers_endpoint(code1, ep) for ep in spec)):
            return code1
        # ----- Passe 2 (renforcement Spring HTTP)
        reinforced = prompt + (
            "\n\nTON PRÉCÉDENT RÉSULTAT N’UTILISAIT PAS D’APPELS HTTP CORRECTS POUR SPRING. "
            "UTILISE OBLIGATOIREMENT MockMvc (@WebMvcTest + mockMvc.perform(...)) "
            "OU REST Assured. NE PAS APPELER DIRECTEMENT LES MÉTHODES JAVA. CODE UNIQUEMENT."
        )
        raw2 = _ollama_call({"model": model_name, "prompt": reinforced, "stream": False,
                             "options": {**base_options, "temperature": 0.15, "num_predict": 1024}}, timeout_seconds)
        code2 = _postprocess_response(raw2) or _strip_to_first_code_like_line(raw2)
        if code2 and _looks_like_http_test_java(code2) and (not spec or any(_covers_endpoint(code2, ep) for ep in spec)):
            return code2
        # ----- Fallback Spring HTTP à partir de la spéc
        return _fallback_spring_mockmvc_from_spec(spec)

    # Non Spring : on renvoie le meilleur effort
    return code1 or "// Test stub"
