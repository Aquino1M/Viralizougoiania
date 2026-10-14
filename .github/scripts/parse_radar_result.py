import json
import sys

def main():
    if len(sys.argv) < 2:
        return
    try:
        with open(sys.argv[1], encoding="utf-8") as f:
            res = json.load(f)
        print("📊 Resumo do Ciclo: Encontradas={found} | Inéditas={newItems} | Na Fila={added} | Publicadas={published} | Pulado={skipped} ({reason})".format(
            found=res.get("found", "?"),
            newItems=res.get("newItems", "?"),
            added=res.get("added", "?"),
            published=res.get("published", "?"),
            skipped=res.get("skipped", False),
            reason=res.get("reason", "ok"),
        ))
        if res.get("errors"):
            print("⚠️ Avisos do ciclo:", " | ".join(map(str, res["errors"][:5])))
    except Exception as e:
        print("Detalhes:", e)

if __name__ == "__main__":
    main()
