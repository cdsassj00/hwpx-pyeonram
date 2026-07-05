---
name: hwpx-pyeonram
description: >
  행정안전부 「행정업무운영 편람」 서식 그대로 HWPX(한글) 문서를 생성하는 스킬.
  원본 편람의 정품 header.xml(KoPub 폰트·장/절/항목 아웃라인·표 서식)을 스타일 백본으로
  사용하므로 실제 한글에서 열었을 때 편람과 동일하게 보인다. 사용자가 "운영편람 양식",
  "행정업무운영 편람 서식", "편람 스타일 hwpx", "편람으로 만들어", "운영편람으로 보고서",
  "행정편람 서식", "편람 양식 한글파일" 등을 언급하면 항상 이 스킬을 사용한다.
  마크다운/텍스트 등 어떤 콘텐츠든 편람 서식 HWPX로 변환한다.
---

# HWPX 「행정업무운영 편람」 서식 문서 생성 스킬

## 핵심 원칙

원본 편람의 정품 `template/Contents/header.xml`을 **그대로** 스타일 백본으로 쓰고
콘텐츠(`section0.xml`)만 새로 생성한다. 절대 빈 헤더를 새로 만들지 않는다.
헤더에 이미 있는 스타일 ID만 참조하므로 한글 호환성 100%.

## 워크플로우

### Step 1 — 콘텐츠를 마크다운으로 정리

사용자 요청/자료를 아래 매핑에 맞춰 마크다운으로 구성한다.

| 마크다운 | 편람 역할 |
| --- | --- |
| `# 제목` | 장 제목 (자동 `제N장`) |
| `## 제목` | 절 제목 (자동 `제N절`) |
| `### 제목` | `1.` 항목 |
| `#### 제목` | `가.` 항목 |
| `##### 제목` | `1)` 항목 |
| `###### 제목` | `가)` 항목 |
| 일반 문단 | 본문 |
| `**굵게**` | 본문 내 강조 |
| `※ …` / `> …` | 참고 |
| `표: 캡션` + `\| a \| b \|` | 표(캡션 포함) |

번호는 자동 생성·리셋된다. 직급/연차/직책 표현은 쓰지 말고 "여러분"으로 통일한다.
시적·상징적 문체를 피하고 실무 중심 서술식으로 쓴다.

### Step 2 — 생성기 실행

스킬 디렉토리에서 CLI로 실행한다.

```bash
node bin/cli.js 입력.md -o /mnt/user-data/outputs/문서명.hwpx
# 또는 배포본이 있으면
npx hwpx-pyeonram 입력.md -o /mnt/user-data/outputs/문서명.hwpx
```

라이브러리로 직접 호출도 가능하다.

```js
const { generateHwpx } = require('./src/generate');
const fs = require('fs');
fs.writeFileSync('/mnt/user-data/outputs/문서명.hwpx',
  generateHwpx(markdownString, { autonum: true }));
```

### Step 3 — 검증 후 제공

생성 후 참조 무결성을 확인(section0의 styleIDRef/charPrIDRef/paraPrIDRef/borderFillIDRef가
header에 모두 존재)하고 `present_files`로 사용자에게 제공한다.

```bash
node test/smoke.js   # 무결성 자체 점검
```

## ⚠️ 하지 말 것

1. header.xml을 새로 만들거나 임의로 잘라내기 → 참조 깨짐. 원본 유지.
2. 존재하지 않는 스타일 ID 참조 → 한글이 무시. `src/styles.js`의 검증된 ID만 사용.
3. 셀 병합 사용 → 가이드라인 위반. 단순 직사각형 표만.
4. mimetype을 STORED·첫 엔트리에서 누락 → 한글이 파일 인식 실패.

## 참고 파일

- `src/styles.js` — 역할별 검증된 스타일 ID 맵(장/절/항목/본문/표)
- `src/parser.js` — 마크다운 → 편람 블록(자동 번호매김)
- `src/generate.js` — section0.xml 생성 + HWPX 조립
- `template/` — 정품 편람 스타일 백본(header.xml 등)
