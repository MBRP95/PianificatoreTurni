#!/usr/bin/env bash
# Exit 0 only if worktree / given ref has no known real PII markers.
# I cognomi/CF/telefoni noti NON compaiono in chiaro in questo file:
# si confrontano solo SHA-256 (UTF-8 uppercase) dei token/n-grammi.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
REF="${1:-HEAD}"

python3 - "$REF" <<'PY'
import hashlib, re, sys, subprocess, zipfile
from pathlib import Path

ref = sys.argv[1]

def digest(s: str) -> str:
  return hashlib.sha256(s.encode("utf-8")).hexdigest()

# SHA-256 of known real markers (uppercase). No cleartext literals in this file.
HASHES = {
  "2940e7f43c60507fc8e30b2c2fcb26ab9ce343586995728c4e6a1f3ce487ad4a",
  "f772d6b4ed9e435a24580d3686efa42a71d26fe25948c568cdbef54af5a472f0",
  "b5be07b4ea53cdd4ed6676d2cc6ca5e04a2d31af847313fa8f9a054343274959",
  "a6ac0101e728218a39b2a0ad345a8c774281229adec95f3f27f03a6321d1677a",
  "97cbd501bd4dd39c01bedba60119e407a85457848801e2303cf0feb326da7e8e",
  "fae6fad3a138d4cfc621c584963487987be594e897d0faccb13e5f8dc2a77bd6",
  "5e35b3c5dd1b06071bad5a8b32d071b222020e8fb2e0f1f163fe849c639735e3",
  "ca6f7231e79c320486b9efe813bf463dd5bc9d71b68f1fe65894e086f7db4514",
  "6dcdf4b1ea67ed97832c371ee4b1fde16ce7300cfb55c138bbef291115d71acd",
  "15d3b60584301167c401f0f2850dda65c310185db0e6f82b0deba6bdc7b0283a",
  "870c3a442dbc13924de4bb5f081d83c0ce24cf672ec3df65ff668f151ac6803d",
  "9d2ba2c2cacb5e055688dcd0937a53ab5daa643159a87975f8e220f4b86e4dbc",
  "dc2f0c86604b05dd40c980f30388e808a2c4c1d4690f45a9f66cb29375a3cdc3",
  "c6cbd4bac3afe6ca78e541b7058ce4571ce99dff89ed0595f26be4999966b329",
  "ebbd9a25a3775aec8fc71c068e77e3a04bec5d56fa7dbcf5064ea763d367622f",
  "150c80b5a1f5f96f16e3b5e21a34df2a0d3fe7fca9da0f32080f579812d941b4",
}
ALLOW_CF = {
  "9d4b60179a0b5c9be6bf8a870c8349308e675c4ac7c1a1db621bd9b78d51ad67",  # synthetic replacement
}
WORD = re.compile(r"[A-Z0-9]+")
CF = re.compile(r"\b[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]\b")

def hit_count(text: str) -> int:
  upper = text.upper()
  words = WORD.findall(upper)
  n = 0
  # unigrams .. 4-grams
  for size in (1, 2, 3, 4):
    for i in range(len(words) - size + 1):
      gram = " ".join(words[i : i + size])
      if digest(gram) in HASHES:
        n += 1
  return n

def scan_text(label: str, text: str) -> bool:
  n = hit_count(text)
  if n:
    print("BAD", label, "marker_hash_hits", n)
    return True
  return False

print(f"== Text scan ({ref}) ==")
files = subprocess.check_output(["git", "ls-tree", "-r", "--name-only", ref], text=True).splitlines()
text_ext = {".html", ".js", ".json", ".md", ".py", ".rules", ".txt", ".csv", ".sh"}
bad = False
for f in files:
  if any(p in f.split("/") for p in ("vendor", "node_modules")):
    continue
  suf = Path(f).suffix.lower()
  if suf not in text_ext:
    continue
  try:
    blob = subprocess.check_output(["git", "show", f"{ref}:{f}"], stderr=subprocess.DEVNULL)
    text = blob.decode("utf-8", "ignore")
  except Exception:
    continue
  if scan_text(f, text):
    bad = True
if bad:
  print("FAIL: PII markers in text files")
  sys.exit(1)
print("text OK")

print("== Structural CF scan (worktree HEAD only) ==")
if ref == "HEAD":
  bad = False
  for p in Path(".").rglob("*"):
    if any(s in p.parts for s in (".git", "node_modules", "vendor")):
      continue
    if p.suffix.lower() not in {".html", ".js", ".json", ".md", ".txt", ".csv", ".py"}:
      continue
    try:
      t = p.read_text(encoding="utf-8", errors="ignore")
    except Exception:
      continue
    for m in CF.findall(t.upper()):
      d = digest(m)
      if d in ALLOW_CF:
        continue
      if d in HASHES:
        print("BAD", p, "cf_hash", d[:12])
        bad = True
  if bad:
    sys.exit(1)
  print("structural OK")

print("== Excel/zip scan (worktree) ==")
bad = False
for p in Path(".").rglob("*"):
  if any(x in p.parts for x in (".git", "node_modules", "vendor")):
    continue
  if p.suffix.lower() not in {".xlsx", ".zip"}:
    continue
  try:
    with zipfile.ZipFile(p) as z:
      blob = "\n".join(z.read(n).decode("utf-8", "ignore") for n in z.namelist())
  except Exception:
    continue
  if scan_text(str(p), blob):
    bad = True
if bad:
  sys.exit(1)
print("binaries OK")
print("PASS: no known real PII markers")
PY
