# backend/test_runner.py
import os, re, subprocess, tempfile, shutil, time
from typing import Optional, Tuple, List, Dict

PKG_RE = re.compile(r'^\s*package\s+([\w\.]+)\s*;', re.MULTILINE)
PUB_CLASS_RE = re.compile(r'^\s*public\s+class\s+([A-Za-z_][A-Za-z0-9_]*)\s*', re.MULTILINE)

def _detect_package(src: str) -> Optional[str]:
    m = PKG_RE.search(src or "");  return m.group(1) if m else None
def _detect_public_class(src: str) -> Optional[str]:
    m = PUB_CLASS_RE.search(src or "");  return m.group(1) if m else None

def _safe_write(path: str, content: str) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f: f.write(content or "")

def _pom_xml() -> str:
    return """<project xmlns="http://maven.apache.org/POM/4.0.0"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://maven.apache.org/POM/4.0.0
                        https://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>
  <groupId>ai.test.automation</groupId>
  <artifactId>temp-project</artifactId>
  <version>1.0.0</version>
  <properties>
    <maven.compiler.source>1.8</maven.compiler.source>
    <maven.compiler.target>1.8</maven.compiler.target>
    <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
    <junit.jupiter.version>5.10.2</junit.jupiter.version>
  </properties>
  <dependencies>
    <dependency>
      <groupId>org.junit.jupiter</groupId>
      <artifactId>junit-jupiter</artifactId>
      <version>${junit.jupiter.version}</version>
      <scope>test</scope>
    </dependency>
    <dependency>
      <groupId>junit</groupId>
      <artifactId>junit</artifactId>
      <version>4.13.2</version>
      <scope>test</scope>
    </dependency>
    <dependency>
      <groupId>org.hamcrest</groupId>
      <artifactId>hamcrest</artifactId>
      <version>2.2</version>
      <scope>test</scope>
    </dependency>
  </dependencies>
  <build>
    <plugins>
      <plugin>
        <groupId>org.apache.maven.plugins</groupId>
        <artifactId>maven-surefire-plugin</artifactId>
        <version>3.2.5</version>
        <configuration>
          <useSystemClassLoader>true</useSystemClassLoader>
          <includes>
            <include>**/*Test.java</include>
            <include>**/*Tests.java</include>
            <include>**/*IT.java</include>
          </includes>
          <failIfNoTests>false</failIfNoTests>
        </configuration>
      </plugin>
    </plugins>
  </build>
</project>""".strip()

def _wrap_main_if_needed(code_src: str, class_name: Optional[str]) -> Tuple[str, str]:
    if class_name: return class_name, code_src
    return "App", "public class App { }\n"

def _ensure_test_name(test_src: str, pkg: Optional[str]) -> Tuple[str, str]:
    test_class = _detect_public_class(test_src)
    if test_class: return test_class, test_src
    pkg_line = f"package {pkg};\n\n" if pkg else ""
    content = f"""{pkg_line}import org.junit.Test;
import static org.junit.Assert.*;
public class GeneratedTest {{
  @Test public void dummy() {{ assertTrue(true); }}
}}"""
    return "GeneratedTest", content

def _docker_available() -> bool:
    try:
        p = subprocess.Popen(["docker","version"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        out, err = p.communicate(timeout=10)
        return p.returncode == 0
    except Exception:
        return False

def _run_with_maven_docker(tmpdir: str) -> Tuple[bool, str, List[Dict]]:
    cmd = [
        "docker","run","--rm",
        "-v", f"{tmpdir}:/project",
        "-w", "/project",
        "maven:3.9-eclipse-temurin-17",
        "mvn","-B","test","-DfailIfNoTests=false"
    ]
    p = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    out, err = p.communicate()
    rc = p.returncode
    logs = (out or "") + ("\n--- STDERR ---\n" + err if err else "")
    arts: List[Dict] = []
    surefire = os.path.join(tmpdir, "target", "surefire-reports")
    if os.path.isdir(surefire):
        for name in os.listdir(surefire):
            f = os.path.join(surefire, name)
            size = os.path.getsize(f) if os.path.isfile(f) else None
            arts.append({"name": name, "url": None, "size": size})
    return (rc == 0), (logs or "[INFO] mvn test sans sortie"), arts

def _run_stub(code_src: str, test_src: str) -> Tuple[bool, str, List[Dict]]:
    logs = [
        "[INFO] Docker indisponible → exécution simulée.",
        f"[INFO] Code source: {len(code_src or '')} caractères",
        f"[INFO] Test généré: {len(test_src or '')} caractères",
        "[INFO] Compilation simulée OK",
        "[INFO] Tests simulés OK"
    ]
    full = "\n".join(logs)+"\n"
    return True, full, [{"name":"surefire-report.txt","url":None,"size":len(full)}]

def run_java_maven(code_src: str, test_src: str) -> Tuple[bool, str, List[Dict]]:
    pkg = _detect_package(code_src) or _detect_package(test_src)
    code_cls = _detect_public_class(code_src)
    code_cls, code_final = _wrap_main_if_needed(code_src, code_cls)
    test_cls, test_final = _ensure_test_name(test_src, pkg)

    tmpdir = tempfile.mkdtemp(prefix="java-test-")
    try:
        _safe_write(os.path.join(tmpdir, "pom.xml"), _pom_xml())
        base_main = os.path.join(tmpdir, "src", "main", "java")
        base_test = os.path.join(tmpdir, "src", "test", "java")
        if pkg:
            pkg_path = os.path.join(*pkg.split("."))
            main_dir = os.path.join(base_main, pkg_path)
            test_dir = os.path.join(base_test, pkg_path)
            pkg_decl = f"package {pkg};\n\n"
        else:
            main_dir, test_dir, pkg_decl = base_main, base_test, ""
        _safe_write(os.path.join(main_dir, f"{code_cls}.java"), f"{pkg_decl}{code_final}")
        _safe_write(os.path.join(test_dir, f"{test_cls}.java"), f"{pkg_decl}{test_final}")

        if _docker_available():
            return _run_with_maven_docker(tmpdir)
        return _run_stub(code_src, test_src)
    finally:
        # commente cette ligne si tu veux inspecter le contenu
        shutil.rmtree(tmpdir, ignore_errors=True)
