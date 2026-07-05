# -*- coding: utf-8 -*-
"""
HWPX 원본에서 서식 백본(templates/<id>/)을 추출한다.

사용법:
    python tools/extract_template.py <원본.hwpx> <templates/아이디>

추출 내용
  - mimetype, version.xml, settings.xml
  - Contents/header.xml (스타일 백본)
  - Contents/content.hpf  → 실제 포함 파트만 남도록 매니페스트/스파인 정리
  - META-INF/container.xml, manifest.xml, container.rdf → 없는 파트 선언 제거
  - secPr.xml (원본 section0 의 구역 설정)
  - header 가 참조하는 BinData 만 포함 (본문 이미지는 제외)
  - template.json 스켈레톤 (없을 때만 생성 — 역할맵은 수동 큐레이션)

추출 후 templates/<id>/template.json 의 role/borderFill/bodyWidth 를
원본 문단 분석에 맞춰 채운 뒤 `node test/smoke.js` 로 검증한다.
"""
import json
import re
import sys
import zipfile
from pathlib import Path

def main():
    src, dst = Path(sys.argv[1]), Path(sys.argv[2])
    z = zipfile.ZipFile(src)
    names = set(z.namelist())
    dst.mkdir(parents=True, exist_ok=True)

    hdr = z.read("Contents/header.xml").decode("utf-8")

    # header 가 참조하는 BinData 만 유지 (fillBrush 이미지 등)
    bin_refs = set(re.findall(r'bin[iI]tem[^=]*="([^"]+)"', hdr))
    keep = [
        "mimetype", "version.xml", "settings.xml",
        "Contents/header.xml",
        "META-INF/container.xml", "META-INF/manifest.xml", "META-INF/container.rdf",
    ]

    hpf = z.read("Contents/content.hpf").decode("utf-8")
    # 매니페스트 item 중 유지 대상: header/section0/settings + header 참조 BinData
    shipped_hrefs = {"Contents/header.xml", "Contents/section0.xml", "settings.xml"}
    for m in re.finditer(r'<opf:item id="([^"]+)" href="(BinData/[^"]+)"[^>]*/>', hpf):
        if m.group(1) in bin_refs:
            shipped_hrefs.add(m.group(2))
            keep.append(m.group(2))

    for name in keep:
        if name not in names:
            print(f"  [!] 원본에 없음: {name}")
            continue
        out = dst / name
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_bytes(z.read(name))

    # content.hpf 정리: 없는 파트 item 제거 + spine 은 header/section0 만
    def prune_item(m):
        return m.group(0) if m.group(1) in shipped_hrefs else ""
    hpf2 = re.sub(r'<opf:item [^>]*href="([^"]+)"[^>]*/>', prune_item, hpf)
    ids = set(re.findall(r'<opf:item id="([^"]+)"', hpf2))
    hpf2 = re.sub(
        r'<opf:itemref idref="([^"]+)"[^>]*/>',
        lambda m: m.group(0) if m.group(1) in ids else "",
        hpf2,
    )
    (dst / "Contents" / "content.hpf").write_text(hpf2, encoding="utf-8")

    # container.rdf 정리: 없는 파트 선언 제거
    rdf = (dst / "META-INF" / "container.rdf").read_text(encoding="utf-8")
    rdf_shipped = {"Contents/header.xml", "Contents/section0.xml"}
    rdf = re.sub(
        r'<rdf:Description rdf:about=""><ns0:hasPart[^>]*rdf:resource="([^"]+)"/></rdf:Description>'
        r'<rdf:Description rdf:about="\1"><rdf:type[^>]*/></rdf:Description>',
        lambda m: m.group(0) if m.group(1) in rdf_shipped else "",
        rdf,
    )
    (dst / "META-INF" / "container.rdf").write_text(rdf, encoding="utf-8")

    # secPr 추출
    sec = z.read("Contents/section0.xml").decode("utf-8")
    sp = re.search(r"<hp:secPr .*?</hp:secPr>", sec, re.S)
    if not sp:
        sys.exit("section0 에서 secPr 을 찾지 못함")
    (dst / "secPr.xml").write_text(sp.group(0), encoding="utf-8")

    # 페이지 본문폭 계산
    pg = re.search(r'<hp:pagePr[^>]*width="(\d+)"', sp.group(0))
    mg = re.search(r'<hp:margin [^>]*left="(\d+)" right="(\d+)"', sp.group(0))
    body_width = int(pg.group(1)) - int(mg.group(1)) - int(mg.group(2)) if pg and mg else 42520

    tj = dst / "template.json"
    if not tj.exists():
        tj.write_text(json.dumps({
            "name": dst.name,
            "description": f"{src.name} 에서 추출한 서식 (역할맵 큐레이션 필요)",
            "numbering": "gov",
            "bodyWidth": body_width,
            "inlineBoldChar": 0,
            "borderFill": {"header": 1, "body": 1},
            "role": {},
        }, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"추출 완료: {src.name} -> {dst}  (bodyWidth={body_width}, binData={len(shipped_hrefs)-3})")

if __name__ == "__main__":
    main()
