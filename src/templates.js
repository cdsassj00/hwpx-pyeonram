'use strict';
/*
 * 서식 템플릿 로더.
 * templates/<id>/ 마다 정품 원본에서 추출한 스타일 백본(header.xml 등)과
 * 역할 매핑(template.json)이 들어 있다. tools/extract_template.py 로 새 서식을
 * 추가할 수 있다.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'templates');
const DEFAULT_TEMPLATE = 'pyeonram';

function listTemplates() {
  return fs.readdirSync(ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.existsSync(path.join(ROOT, d.name, 'template.json')))
    .map((d) => {
      const meta = JSON.parse(fs.readFileSync(path.join(ROOT, d.name, 'template.json'), 'utf8'));
      return { id: d.name, name: meta.name, description: meta.description };
    })
    .sort((a, b) => (a.id === DEFAULT_TEMPLATE ? -1 : b.id === DEFAULT_TEMPLATE ? 1 : a.id.localeCompare(b.id)));
}

function loadTemplate(id) {
  id = id || DEFAULT_TEMPLATE;
  const dir = path.join(ROOT, id);
  const jsonPath = path.join(dir, 'template.json');
  if (!fs.existsSync(jsonPath)) {
    const ids = listTemplates().map((t) => t.id).join(', ');
    throw new Error(`알 수 없는 템플릿: ${id} (사용 가능: ${ids})`);
  }
  const meta = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  return {
    id,
    dir,
    name: meta.name,
    description: meta.description,
    numbering: meta.numbering || 'gov',
    bullets: meta.bullets || {},
    bodyWidth: meta.bodyWidth,
    inlineBoldChar: meta.inlineBoldChar,
    borderFill: meta.borderFill,
    role: meta.role,
    secPr: fs.readFileSync(path.join(dir, 'secPr.xml'), 'utf8'),
  };
}

// 백본 파일 목록 (ZIP 에 담을 순서). template.json/secPr.xml 은 조립용 메타라 제외.
function backboneEntries(dir) {
  const preferred = [
    'mimetype', 'version.xml', 'settings.xml',
    'Contents/header.xml', 'Contents/content.hpf',
    'META-INF/container.xml', 'META-INF/manifest.xml', 'META-INF/container.rdf',
  ];
  const all = [];
  (function walk(d, rel) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const r = rel ? rel + '/' + e.name : e.name;
      if (e.isDirectory()) walk(path.join(d, e.name), r);
      else if (r !== 'template.json' && r !== 'secPr.xml') all.push(r);
    }
  })(dir, '');
  return preferred.filter((n) => all.includes(n))
    .concat(all.filter((n) => !preferred.includes(n)).sort());
}

module.exports = { listTemplates, loadTemplate, backboneEntries, DEFAULT_TEMPLATE };
