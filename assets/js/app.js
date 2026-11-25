/* =============================================================================
 * app.js : 렌더링 + 해시 라우터
 *   #<anchor>                 → 본문(목차/구성도/구성요소) 해당 위치로 이동
 *   #/guide/<id>/<method>     → 설치 가이드 상세 페이지 (method: terraform|ansible|helm)
 * ========================================================================== */
(function () {
  const A = window.ARCH;
  const META = A.meta;
  const COMPS = A.components;
  const SNIP = A.snippets;
  const REPO = META.site.repo;
  const byId = Object.fromEntries(COMPS.map((c) => [c.id, c]));

  const METHODS = {
    terraform: { tool: 'IaC[Terraform]', josa: '로의', short: 'Terraform', icon: 'terraform', color: '#a78bfa' },
    ansible: { tool: 'IaC[Ansible]', josa: '로의', short: 'Ansible', icon: 'ansible', color: '#f87171' },
    helm: { tool: 'Helm', josa: '으로의', short: 'Helm', icon: 'helm', color: '#38bdf8' },
  };
  const envName = (g) => (g.env === 'Any Kubernetes' ? 'Kubernetes' : g.env);
  const guideTitle = (m, g) => `설치방법 - ${envName(g)}환경에서 ${METHODS[m].tool}${METHODS[m].josa} 설치`;

  /* ------------------------------ utils ----------------------------------- */
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  function inline(s) {
    return esc(s)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+?)`/g, '<code>$1</code>');
  }
  function md(text) {
    return String(text || '').trim().split(/\n+/).map((l) => `<p>${inline(l.trim())}</p>`).join('');
  }
  function hexA(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }
  function tagClass(t) {
    t = t || '';
    if (/Retired/i.test(t)) return 'ret';
    if (/Graduated/i.test(t)) return 'grad';
    if (/Incubating/i.test(t)) return 'incu';
    if (/Sandbox/i.test(t)) return 'sand';
    if (/Managed|SaaS/i.test(t)) return 'mng';
    if (/Commercial/i.test(t)) return 'com';
    return 'oss';
  }

  /* --------------------------- syntax highlight --------------------------- */
  const KW = {
    hcl: /\b(resource|module|variable|output|locals|provider|terraform|data|for_each|count|depends_on|source|version|true|false|null|for|in|if|dynamic|lifecycle)\b/,
    bash: /\b(cd|cp|export|kubectl|helm|helmfile|terraform|tofu|ansible-playbook|aws|curl|envsubst|istioctl|argocd|trivy|git|apply|install|upgrade|get|wait|delete|create|init|plan|destroy|exec|run|repo|add|output|label)\b/,
    yaml: /\b(true|false|null)\b/,
    sql: /\b(CREATE|ROLE|LOGIN|PASSWORD|DATABASE|OWNER|REVOKE|ALL|ON|FROM|PUBLIC|GRANT|TO)\b/,
    toml: /\b(true|false)\b/,
  };
  function langOf(path, lang) {
    if (lang) return lang;
    if (/\.tf$|\.tfvars|\.hcl|backend\.tf/.test(path)) return 'hcl';
    if (/\.ya?ml$|\.gotmpl$|\.tpl$|\.example$/.test(path)) return path.includes('.tf') ? 'hcl' : 'yaml';
    if (/\.j2$|\.toml$/.test(path)) return 'toml';
    if (/\.sh$/.test(path)) return 'bash';
    return 'text';
  }
  function hlLine(line, lang) {
    // 주석 분리 (따옴표 밖의 # 또는 //)
    let code = line, comment = '';
    const ci = findComment(line, lang);
    if (ci >= 0) { code = line.slice(0, ci); comment = line.slice(ci); }
    let out = '';
    let key = '';
    if (lang === 'yaml') {
      const m = code.match(/^(\s*(?:-\s+)?)([A-Za-z0-9_.\-\/"'{}$ ]+?)(:)(\s|$)/);
      if (m && !/^\s*-\s*$/.test(m[1] + m[2])) {
        key = esc(m[1]) + `<span class="tk-y">${esc(m[2])}</span>${m[3]}`;
        code = code.slice(m[1].length + m[2].length + 1);
      }
    }
    const kw = KW[lang];
    const re = /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(\$\{[^}]*\}|\$[A-Za-z_][A-Za-z0-9_]*|\{\{[^}]*\}\})|(\b\d+(?:\.\d+)?\b)|([A-Za-z_][\w\-]*)/g;
    let last = 0, mm;
    while ((mm = re.exec(code))) {
      out += esc(code.slice(last, mm.index));
      if (mm[1]) out += `<span class="tk-s">${esc(mm[1])}</span>`;
      else if (mm[2]) out += `<span class="tk-v">${esc(mm[2])}</span>`;
      else if (mm[3]) out += `<span class="tk-n">${esc(mm[3])}</span>`;
      else if (mm[4]) out += kw && kw.test(mm[4]) && new RegExp('^' + kw.source + '$').test(mm[4]) ? `<span class="tk-k">${esc(mm[4])}</span>` : esc(mm[4]);
      last = re.lastIndex;
    }
    out += esc(code.slice(last));
    return key + out + (comment ? `<span class="tk-c">${esc(comment)}</span>` : '');
  }
  function findComment(line, lang) {
    let q = null;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (q) { if (ch === q && line[i - 1] !== '\\') q = null; continue; }
      if (ch === '"' || ch === "'") { q = ch; continue; }
      if (lang === 'sql' && ch === '-' && line[i + 1] === '-') return i;
      if (ch === '/' && line[i + 1] === '/' && (lang === 'hcl') && line[i - 1] !== ':') return i;
      if (ch === '#' && (i === 0 || /\s/.test(line[i - 1])) && lang !== 'sql') return i;
    }
    return -1;
  }
  function highlight(code, lang) {
    return code.replace(/\n$/, '').split('\n').map((l) => hlLine(l, lang)).join('\n');
  }

  let codeSeq = 0;
  function codeBlock(body, opt) {
    opt = opt || {};
    const id = 'cb' + (++codeSeq);
    const lang = langOf(opt.file || '', opt.lang);
    const lines = body.split('\n').length;
    const long = lines > 28;
    return `<div class="code ${long ? 'long collapsed' : ''}" id="${id}">
      <div class="code-bar">
        ${ICON(opt.file ? 'logs' : 'code', { size: 15 })}
        <span class="fn">${esc(opt.file || opt.title || lang)}</span>
        <span class="lang">${lang}</span><span class="sp"></span>
        ${opt.file ? `<a href="${REPO}/blob/main/${encodeURI(opt.file)}" target="_blank" rel="noopener">${ICON('github', { size: 13 })} GitHub</a>` : ''}
        <button data-copy="${id}">${ICON('copy', { size: 13 })} 복사</button>
      </div>
      <pre><code>${highlight(body, lang)}</code></pre>
      <div class="fade"></div>
      ${long ? `<button class="more" data-more="${id}" data-lines="${lines}">전체 보기 (${lines}줄) ▾</button>` : ''}
    </div>`;
  }

  /* ------------------------------ sidebar --------------------------------- */
  const SECTIONS = [
    { id: 'toc', no: '00', t: '목차' },
    { id: 'diagram', no: '01', t: '표준 아키텍처 구성도' },
    { id: 'overview', no: '02', t: '아키텍처 개요 · 요청 흐름' },
    { id: 'environments', no: '03', t: '인프라 환경별 매핑' },
    { id: 'components', no: '04', t: '구성요소 상세 & 설치 가이드' },
    { id: 'roadmap', no: '05', t: '구축 로드맵 (Step by Step)' },
    { id: 'appendix', no: '06', t: '부록 · 버전 · 출처' },
  ];

  function renderSidebar() {
    let h = `<div class="brand"><div class="brand-mark">${ICON('layers', { size: 22, stroke: 2.2 })}</div>
      <div><b>${esc(META.site.title)}</b><small>${esc(META.site.version)} · ${esc(META.site.updated)}</small></div></div>
      <label class="search">${ICON('search', { size: 15 })}<input id="q" type="search" placeholder="구성요소·솔루션 검색 (예: Kafka, Vault)"></label>
      <nav class="toc" id="toc-nav"><div class="toc-title">Contents</div>`;
    SECTIONS.forEach((s) => {
      h += `<a href="#${s.id}" data-sec="${s.id}"><span class="num">${s.no}</span>${esc(s.t)}</a>`;
      if (s.id === 'components') {
        COMPS.forEach((c) => {
          h += `<a class="sub" href="#c-${c.id}" data-sec="c-${c.id}" data-search="${esc((c.title + ' ' + c.en + ' ' + c.tools.map((t) => t.name).join(' ')).toLowerCase())}">
            <span class="dot" style="background:${c.color}"></span><span class="num">${c.num}</span>${esc(c.title)}</a>`;
        });
      }
    });
    h += `</nav><div class="side-foot">
      <a href="${REPO}" target="_blank" rel="noopener">${ICON('github', { size: 15 })} navy9564/infra_architecture</a>
      <div style="margin-top:6px">CNCF 성숙도 / 버전은 ${esc(META.site.updated)} 기준</div></div>`;
    $('#sidebar').innerHTML = h;

    $('#q').addEventListener('input', (e) => {
      const q = e.target.value.trim().toLowerCase();
      $$('#toc-nav a.sub').forEach((a) => { a.style.display = !q || a.dataset.search.includes(q) ? '' : 'none'; });
      if (!isGuide()) {
        $$('.comp').forEach((el) => { el.style.display = !q || el.dataset.search.includes(q) ? '' : 'none'; });
      }
    });
  }

  /* ------------------------------ home ------------------------------------ */
  function renderHome() {
    const nGuides = COMPS.length * 3;
    const nCncf = new Set(COMPS.flatMap((c) => c.tools.filter((t) => /CNCF/.test(t.tag)).map((t) => t.name))).size;
    let h = '';

    // Cover
    h += `<header class="cover">
      <div class="eyebrow">SI PROJECT · TA / SA STANDARD · ${esc(META.site.version)}</div>
      <h1>${esc(META.site.title)}</h1>
      <div class="sub">${esc(META.site.subtitle)}</div>
      <div class="chips">
        <span class="chip">${ICON('flag', { size: 14 })} 2026 트렌드 반영</span>
        <span class="chip">${ICON('layers', { size: 14 })} On-Prem · Private · Public Cloud 공통</span>
        <span class="chip">${ICON('terraform', { size: 14 })} Terraform / OpenTofu</span>
        <span class="chip">${ICON('ansible', { size: 14 })} Ansible</span>
        <span class="chip">${ICON('helm', { size: 14 })} Helm · GitOps</span>
      </div>
      <div class="stats">
        <div class="stat"><b>${COMPS.length}</b><span>표준 구성요소</span></div>
        <div class="stat"><b>${nGuides}</b><span>설치 가이드 (3 방식)</span></div>
        <div class="stat"><b>${nCncf}</b><span>CNCF 프로젝트 비교</span></div>
        <div class="stat"><b>${Object.keys(SNIP).length}</b><span>실행 가능한 IaC 파일</span></div>
      </div>
    </header>`;

    // 00 TOC
    h += sec('toc', '00', '목차', '클릭하면 해당 장으로 이동합니다');
    h += `<div class="toc-grid">`;
    SECTIONS.slice(1).forEach((s) => {
      let items = [];
      if (s.id === 'diagram') items = ['구성도 (클릭 시 상세 이동)', '흐름선 범례'];
      if (s.id === 'overview') items = ['설계 원칙 6가지', '주문 요청 End-to-End 10단계'];
      if (s.id === 'environments') items = ['On-Prem / Private / AWS / Azure / GCP 매핑표'];
      if (s.id === 'components') items = COMPS.map((c) => `${c.num}. ${c.title}`);
      if (s.id === 'roadmap') items = META.roadmap.map((r) => r.phase);
      if (s.id === 'appendix') items = ['버전 기준표 (2026-11)', '저장소 구조', '참고 출처'];
      h += `<a class="toc-card" href="#${s.id}" ${s.id === 'components' ? 'style="grid-row: span 2"' : ''}>
        <div class="t"><span class="n">${s.no}</span>${esc(s.t)}</div>
        <ul ${s.id !== 'components' ? 'style="columns:1"' : ''}>${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul></a>`;
    });
    h += `</div></section>`;

    // 01 Diagram
    h += sec('diagram', '01', '표준 아키텍처 구성도', 'Production Microservices · End-to-End');
    h += `<div class="diagram-tools">
        <button class="btn" id="btn-anim">${ICON('pause', { size: 14 })} 흐름 애니메이션 정지</button>
        <span class="muted" style="font-size:13px">구성도의 박스를 클릭하면 해당 구성요소의 설명·설치 가이드로 이동합니다.</span>
      </div>
      <div class="diagram-wrap">${renderDiagram()}</div>
      <div class="legend">
        <span><i style="border-color:#e2e8f0"></i>Gateway → 서비스 라우팅</span>
        <span><i style="border-color:#3b82f6"></i>동기 호출 (REST/gRPC)</span>
        <span><i style="border-color:#facc15"></i>이벤트 발행/구독 (Kafka)</span>
        <span><i style="border-color:#fb923c"></i>작업 큐 (RabbitMQ)</span>
        <span><i style="border-color:#22c55e"></i>캐시 조회</span>
        <span><i class="dash" style="border-color:#a78bfa"></i>외부 연동 (Egress 통제)</span>
      </div></section>`;

    // 02 Overview
    h += sec('overview', '02', '아키텍처 개요 · 요청 흐름', '환경이 달라도 골격은 같다');
    h += `<div class="md lead">${md(META.intro)}</div><h3>설계 원칙</h3><div class="grid3">`;
    META.principles.forEach((p, i) => {
      h += `<div class="card"><h4><span class="mono" style="color:var(--teal)">P${i + 1}</span>${esc(p.title)}</h4><p>${inline(p.desc)}</p></div>`;
    });
    h += `</div><h3>${esc(META.flow.title)}</h3><ol class="flow-list">`;
    META.flow.steps.forEach((s) => {
      h += `<li><span class="n" style="border-color:${s.color};color:${s.color}">${s.num}</span><span class="layer" style="color:${s.color}">${esc(s.layer)}</span><span class="txt">${inline(s.text)}</span></li>`;
    });
    h += `</ol></section>`;

    // 03 Environments
    h += sec('environments', '03', '인프라 환경별 매핑', '같은 역할, 다른 구현체');
    h += `<p class="muted">아키텍처의 "역할"은 고정하고, 환경별 "구현체"만 바꿉니다. 현재 설치 자동화(v0.1)는 <b>On-Premise(Ansible)</b> 와 <b>AWS(Terraform)</b> 를 직접 지원하며, Helm 가이드는 모든 Kubernetes 에 공통 적용됩니다.</p>
      <div class="table-wrap"><table><thead><tr>${META.environments.columns.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>`;
    META.environments.rows.forEach((r) => { h += `<tr>${r.map((v) => `<td>${inline(v)}</td>`).join('')}</tr>`; });
    h += `</tbody></table></div></section>`;

    // 04 Components
    h += sec('components', '04', '구성요소 상세 & 설치 가이드', `${COMPS.length}개 구성요소 · 각 3가지 설치 방식`);
    let group = '';
    COMPS.forEach((c) => {
      if (c.group !== group) { group = c.group; h += `<h3 style="margin-top:6px;color:var(--muted);font-size:14px;letter-spacing:.1em">▍${esc(group)}</h3>`; }
      h += renderComp(c);
    });
    h += `</section>`;

    // 05 Roadmap
    h += sec('roadmap', '05', '구축 로드맵 (Step by Step)', '처음부터 완벽하게가 아니라, 단계별로');
    const rc = ['#94a3b8', '#3b82f6', '#22c55e', '#f97316', '#facc15', '#a78bfa', '#2dd4bf'];
    h += `<div class="road">${META.roadmap.map((r, i) => `<div class="ph" style="--c:${rc[i % rc.length]}"><b>${esc(r.phase)}</b><ul>${r.items.map((x) => `<li>${inline(x)}</li>`).join('')}</ul></div>`).join('')}</div></section>`;

    // 06 Appendix
    h += sec('appendix', '06', '부록 · 버전 · 출처', '');
    h += `<h3>버전 기준표</h3><p class="muted">${esc(META.versions.note)}</p>
      <div class="table-wrap"><table><thead><tr><th>항목</th><th>기준 버전</th><th>비고</th></tr></thead><tbody>
      ${META.versions.rows.map((r) => `<tr>${r.map((v) => `<td>${inline(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
      <h3>CNCF 성숙도 표기</h3>
      <div class="chips"><span class="tag grad">CNCF Graduated</span><span class="tag incu">CNCF Incubating</span><span class="tag sand">CNCF Sandbox</span><span class="tag mng">Managed (클라우드 관리형)</span><span class="tag com">Commercial</span><span class="tag oss">OSS (기타)</span><span class="tag ret">Retired</span></div>
      <h3>저장소 구조</h3>
      <div class="tree">infra_architecture/
├── index.html                 <span class="c"># 이 문서 (정적 웹, 빌드 불필요)</span>
├── content/                   <span class="c"># ✏️ 문서 원본 (YAML) - 여기만 수정</span>
│   ├── meta.yaml              <span class="c">#   목차·개요·환경매핑·로드맵·버전·출처</span>
│   └── components/*.yaml      <span class="c">#   구성요소별 설명 + 설치 가이드</span>
├── scripts/build.py           <span class="c"># content + IaC 파일 → assets/js/data/bundle.js</span>
├── assets/                    <span class="c"># css / js (diagram, icons, app)</span>
├── iac/
│   ├── terraform/aws/         <span class="c"># VPC · EKS · Karpenter · LB · 애드온 · 데이터 · ECR</span>
│   └── ansible/               <span class="c"># On-Prem kubeadm HA · HAProxy/Keepalived · 애드온</span>
├── helm/
│   ├── helmfile.yaml.gotmpl   <span class="c"># 플랫폼 애드온 일괄 설치 (aws / onprem)</span>
│   ├── values/                <span class="c"># 애드온 values (Terraform·Ansible·Helm 공통 사용)</span>
│   ├── manifests/             <span class="c"># Gateway · Mesh · CNPG · Kafka · RabbitMQ · ESO · Kyverno</span>
│   ├── charts/microservice/   <span class="c"># 공통 마이크로서비스 차트</span>
│   └── argocd/root-app.yaml   <span class="c"># GitOps App of Apps</span>
├── ci/github-actions/         <span class="c"># 애플리케이션 CI 예시 (OIDC → ECR)</span>
└── .github/workflows/         <span class="c"># validate(정적검증) · pages(배포)</span></div>
      <h3>참고 출처</h3><ol class="sources">${META.sources.map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a></li>`).join('')}</ol>
      </section>`;

    h += `<div class="footer">© ${esc(META.site.owner)} · 구성도는 참고 영상의 배치를 바탕으로 자체 제작한 SVG 이며, 제품 로고 대신 범용 아이콘을 사용했습니다. · <a href="${REPO}" target="_blank" rel="noopener">GitHub</a></div>`;
    return h;
  }

  function sec(id, no, title, desc) {
    return `<section class="sec" id="${id}"><div class="sec-head"><span class="sec-no">${no}</span><h2>${esc(title)}</h2>${desc ? `<span class="desc">${esc(desc)}</span>` : ''}</div>`;
  }

  function renderComp(c) {
    const search = (c.title + ' ' + c.en + ' ' + c.tools.map((t) => t.name).join(' ')).toLowerCase();
    let h = `<article class="comp" id="c-${c.id}" data-search="${esc(search)}" style="--c:${c.color};--c-bg:${hexA(c.color, .12)};--c-glow:${hexA(c.color, .45)}">
      <div class="comp-head">
        <div class="comp-icon">${ICON(c.icon, { size: 30, color: '#0f172a', stroke: 2 })}</div>
        <div><div class="no">COMPONENT ${c.num}</div><h3>${esc(c.title)}</h3><div class="en">${esc(c.en)}</div></div>
        <span class="chip grp">${esc(c.group)}</span>
      </div>
      <div class="comp-body">
        <p class="lead">${inline(c.oneline)}</p>
        <div class="cols">
          <div><div class="md">${md(c.desc)}</div>
            <div class="box"><h5>${ICON('check', { size: 14 })} 주요 역할</h5><ul>${c.roles.map((r) => `<li>${inline(r)}</li>`).join('')}</ul></div>
          </div>
          <div class="box trend"><h5>${ICON('flag', { size: 14 })} 2026 트렌드 포인트</h5><ul>${c.trend.map((r) => `<li>${inline(r)}</li>`).join('')}</ul></div>
        </div>
        <h3 style="font-size:15px">${ICON('layers', { size: 16 })} 대표 솔루션 (CNCF · 영향력 · 사용 빈도 기준)</h3>
        <div class="table-wrap"><table><thead><tr><th>솔루션</th><th>구분</th><th>특징</th></tr></thead><tbody>
        ${c.tools.map((t) => `<tr><td><span class="tool-name">${t.pick ? `<span class="star" title="권장">${ICON('star', { size: 14, color: '#facc15' })}</span>` : ''}${esc(t.name)}</span></td><td><span class="tag ${tagClass(t.tag)}">${esc(t.tag)}</span></td><td>${inline(t.desc)}</td></tr>`).join('')}
        </tbody></table></div>
        <div class="pick"><b class="k">${ICON('star', { size: 14 })} 표준 권장안</b><div class="md">${md(c.pick)}</div></div>
        <div class="install"><h4>${ICON('book', { size: 16 })} 설치 방법 <span class="muted" style="font-weight:400;font-size:13px">— 클릭하면 상세 가이드가 열립니다</span></h4><div class="install-grid">`;
    Object.keys(METHODS).forEach((m) => {
      const g = c.guides[m];
      const M = METHODS[m];
      h += `<a class="install-card" href="#/guide/${c.id}/${m}" style="--m:${M.color}">
          <div class="t"><span class="mi">${ICON(M.icon, { size: 18, color: '#04121a', stroke: 2.2 })}</span>${esc(guideTitle(m, g))}</div>
          <p>${inline(g.summary)}</p>
          <div class="meta"><span class="chip">${ICON('clock', { size: 12 })} ${esc(g.time || '-')}</span><span class="chip">난이도 ${esc(g.level || '-')}</span><span class="chip">${g.steps.length} 단계</span></div>
          <span class="go">상세 가이드 보기 ${ICON('arrowRight', { size: 14 })}</span></a>`;
    });
    h += `</div></div></div></article>`;
    return h;
  }

  /* ------------------------------ guide ----------------------------------- */
  function renderGuide(id, m) {
    const c = byId[id];
    const g = c && c.guides[m];
    if (!g) return `<p>가이드를 찾을 수 없습니다. <a href="#components">구성요소 목록으로</a></p>`;
    const M = METHODS[m];
    let h = `<div style="--m:${M.color};--m-bg:${hexA(M.color, .14)}">
      <p style="margin:0 0 14px"><a class="btn" href="#c-${c.id}">${ICON('arrowLeft', { size: 14 })} ${esc(c.num)}. ${esc(c.title)} 로 돌아가기</a></p>
      <div class="guide-head">
        <div class="k">INSTALL GUIDE · COMPONENT ${c.num} · ${M.short.toUpperCase()}</div>
        <h1>${esc(guideTitle(m, g))}<br><span style="color:${c.color}">${esc(c.title)}</span></h1>
        <p>${inline(g.summary)}</p>
        <div class="chips"><span class="chip">${ICON('map', { size: 13 })} ${esc(g.env)}</span><span class="chip">${ICON('clock', { size: 13 })} 예상 ${esc(g.time || '-')}</span><span class="chip">난이도 ${esc(g.level || '-')}</span><span class="chip">${ICON(M.icon, { size: 13 })} ${esc(M.short)}</span></div>
      </div>
      <div class="method-tabs">${Object.keys(METHODS).map((k) => `<a href="#/guide/${c.id}/${k}" class="${k === m ? 'on' : ''}" style="--m:${METHODS[k].color}">${ICON(METHODS[k].icon, { size: 15 })} ${esc(guideTitle(k, c.guides[k]))}</a>`).join('')}</div>`;

    if (g.prereq && g.prereq.length) {
      h += `<div class="g-sec"><h3>${ICON('check', { size: 18, color: M.color })} 사전 요구사항</h3><ul class="prereq">${g.prereq.map((p) => `<li>${inline(p)}</li>`).join('')}</ul></div>`;
    }
    h += `<div class="g-sec"><h3>${ICON('layers', { size: 18, color: M.color })} 설치 절차</h3><ol class="steps">`;
    g.steps.forEach((s) => {
      h += `<li><div class="st">${inline(s.title)}</div>${s.desc ? `<p class="sd">${inline(s.desc)}</p>` : ''}`;
      if (s.file) h += codeBlock(SNIP[s.file] || '# (파일 없음)', { file: s.file });
      if (s.code) h += codeBlock(s.code, { lang: s.lang });
      h += `</li>`;
    });
    h += `</ol></div>`;
    if (g.verify) h += `<div class="g-sec"><h3>${ICON('check', { size: 18, color: '#22c55e' })} 설치 검증</h3>${codeBlock(g.verify, { lang: 'bash', title: 'verify' })}</div>`;
    if (g.rollback) h += `<div class="g-sec"><h3>${ICON('arrowLeft', { size: 18, color: '#f87171' })} 롤백 / 삭제</h3>${codeBlock(g.rollback, { lang: 'bash', title: 'rollback' })}</div>`;
    if (g.tips && g.tips.length) {
      h += `<div class="g-sec"><h3>${ICON('flag', { size: 18, color: '#facc15' })} 실무 팁 · 주의사항</h3>${g.tips.map((t) => `<div class="callout tip">${inline(t)}</div>`).join('')}</div>`;
    }
    // pager: 같은 방식의 이전/다음 구성요소
    const i = COMPS.indexOf(c);
    const prev = COMPS[i - 1], next = COMPS[i + 1];
    h += `<div class="pager">
      ${prev ? `<a href="#/guide/${prev.id}/${m}"><small>← 이전 구성요소 (${M.short})</small>${esc(prev.num)}. ${esc(prev.title)}</a>` : '<span></span>'}
      ${next ? `<a class="r" href="#/guide/${next.id}/${m}"><small>다음 구성요소 (${M.short}) →</small>${esc(next.num)}. ${esc(next.title)}</a>` : '<span></span>'}
    </div></div>`;
    return h;
  }

  /* ------------------------------ router ---------------------------------- */
  const isGuide = () => location.hash.startsWith('#/guide/');
  let homeRendered = false;

  function route() {
    const content = $('#content');
    const hash = location.hash || '#toc';
    if (hash.startsWith('#/guide/')) {
      const [, , id, m] = hash.slice(1).split('/');
      content.innerHTML = renderGuide(id, m);
      homeRendered = false;
      const c = byId[id];
      $('#crumb').innerHTML = `구성요소 상세 › ${esc(c ? c.num + '. ' + c.title : '')} › <b>${esc(METHODS[m] ? METHODS[m].short : '')} 설치 가이드</b>`;
      window.scrollTo({ top: 0, behavior: 'instant' });
      setActive(c ? 'c-' + c.id : '');
    } else {
      const fresh = !homeRendered;
      if (fresh) {
        content.innerHTML = renderHome();
        homeRendered = true;
        bindHome();
      }
      const el = document.getElementById(hash.slice(1));
      if (el) requestAnimationFrame(() => el.scrollIntoView({ block: 'start', behavior: fresh ? 'instant' : 'smooth' }));
      $('#crumb').innerHTML = `<b>${esc(META.site.title)}</b> · ${esc(META.site.subtitle)}`;
    }
    $('#sidebar').classList.remove('open');
  }

  function bindHome() {
    // 구성도 클릭 → 상세
    $$('.arch-svg [data-target]').forEach((el) => el.addEventListener('click', () => { location.hash = '#c-' + el.dataset.target; }));
    const btn = $('#btn-anim');
    btn && btn.addEventListener('click', () => {
      const svg = $('.arch-svg');
      svg.classList.toggle('anim');
      const on = svg.classList.contains('anim');
      btn.innerHTML = `${ICON(on ? 'pause' : 'play', { size: 14 })} 흐름 애니메이션 ${on ? '정지' : '재생'}`;
    });
    // scrollspy
    const obs = new IntersectionObserver((ents) => {
      ents.forEach((e) => { if (e.isIntersecting) setActive(e.target.id); });
    }, { rootMargin: '-80px 0px -70% 0px' });
    $$('section.sec, article.comp').forEach((s) => obs.observe(s));
  }

  function setActive(id) {
    $$('#toc-nav a').forEach((a) => a.classList.toggle('active', a.dataset.sec === id));
  }

  /* --------------------------- global handlers ---------------------------- */
  document.addEventListener('click', (e) => {
    const cp = e.target.closest('[data-copy]');
    if (cp) {
      const code = $('#' + cp.dataset.copy + ' pre').innerText;
      (navigator.clipboard ? navigator.clipboard.writeText(code) : Promise.reject())
        .then(() => toast('클립보드에 복사했습니다'))
        .catch(() => toast('복사 실패 - 직접 선택해 주세요'));
    }
    const more = e.target.closest('[data-more]');
    if (more) {
      const box = $('#' + more.dataset.more);
      box.classList.toggle('collapsed');
      more.textContent = box.classList.contains('collapsed') ? `전체 보기 (${more.dataset.lines}줄) ▾` : '접기 ▴';
    }
    if (e.target.closest('#menu-btn')) $('#sidebar').classList.toggle('open');
  });

  let tt;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(tt);
    tt = setTimeout(() => t.classList.remove('show'), 1600);
  }

  renderSidebar();
  window.addEventListener('hashchange', route);
  route();
})();
