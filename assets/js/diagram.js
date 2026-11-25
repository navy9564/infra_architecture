/* =============================================================================
 * diagram.js : 표준 아키텍처 구성도 (SVG)
 *   - 원본 참고 이미지의 배치(Users → LB → Gateway → K8s/Mesh → Data → Platform)를
 *     2026 표준 스택으로 재구성
 *   - data-target 이 있는 요소를 클릭하면 해당 구성요소 상세로 이동
 * ========================================================================== */
(function () {
  const W = 1440, H = 1050;
  const C = {
    white: '#f8fafc', line: '#e2e8f0', blue: '#3b82f6', teal: '#2dd4bf', green: '#22c55e',
    yellow: '#facc15', orange: '#fb923c', pink: '#ec4899', purple: '#a78bfa', sky: '#38bdf8',
    muted: '#94a3b8', db: '#60a5fa', ink: '#0f172a',
  };

  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

  function markers() {
    return ['white', 'blue', 'teal', 'green', 'yellow', 'orange', 'pink', 'purple']
      .map((k) => `<marker id="ah-${k}" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${C[k]}"/></marker>`)
      .join('');
  }

  function label(x, y, text, opt) {
    opt = opt || {};
    return `<text x="${x}" y="${y}" class="${opt.cls || 'd-label'}" text-anchor="${opt.anchor || 'start'}" ${opt.fill ? `fill="${opt.fill}"` : ''}>${esc(text)}</text>`;
  }

  // 프레임 위에 얹는 라벨(배경으로 선을 가림)
  function frameLabel(x, y, text, icon, color, target) {
    const w = text.length * 11.2 + (icon ? 40 : 18);
    return `<g ${target ? `data-target="${target}" class="d-click"` : ''}>
      <rect x="${x - 8}" y="${y - 18}" width="${w}" height="30" fill="#03060c"/>
      ${icon ? `<circle cx="${x + 11}" cy="${y - 3}" r="12" fill="${color}" opacity=".18"/>` + ICON_G(icon, x + 1, y - 13, 20, color, 2.2) : ''}
      <text x="${x + (icon ? 30 : 0)}" y="${y + 4}" class="d-frame-label">${esc(text)}</text>
    </g>`;
  }

  function iconTile(x, y, size, icon, color) {
    return `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${size * 0.24}" fill="${color}"/>` +
      ICON_G(icon, x + size * 0.2, y + size * 0.2, size * 0.6, '#ffffff', 2.2);
  }

  function pods(x, y) {
    let s = '';
    for (let i = 0; i < 3; i++) {
      s += `<rect x="${x}" y="${y + i * 17}" width="62" height="13" rx="3.5" fill="#1d4ed8"/>` +
        `<circle cx="${x + 9}" cy="${y + i * 17 + 6.5}" r="3" fill="#93c5fd"/>` +
        `<rect x="${x + 17}" y="${y + i * 17 + 4.5}" width="38" height="4" rx="2" fill="#60a5fa"/>`;
    }
    return s;
  }

  function service(x, y, name, icon, color, target) {
    return `<g class="d-click d-svc" data-target="${target}">
      <rect x="${x}" y="${y}" width="170" height="84" rx="12" fill="${C.white}" stroke="${color}" stroke-width="3"/>
      <rect x="${x}" y="${y}" width="170" height="10" rx="5" fill="${color}"/>
      ${ICON_G(icon, x + 16, y + 30, 32, C.ink, 2)}
      ${pods(x + 92, y + 22)}
      <rect x="${x - 10}" y="${y + 6}" width="14" height="14" rx="3" fill="none" stroke="${color}" stroke-width="2.5"/>
      ${label(x + 85, y + 112, name, { anchor: 'middle', cls: 'd-svc-name' })}
    </g>
    <g class="d-click" data-target="database">
      <path d="M${x + 172} ${y + 42}H${x + 196}" stroke="${C.white}" stroke-width="2.5" marker-end="url(#ah-white)"/>
      ${ICON_G('database', x + 200, y + 18, 46, C.db, 2.2)}
    </g>`;
  }

  function flow(d, color, opt) {
    opt = opt || {};
    return `<path d="${d}" fill="none" stroke="${C[color]}" stroke-width="${opt.w || 2.6}" class="d-flow ${opt.dash ? 'd-dash' : ''}" ${opt.end === false ? '' : `marker-end="url(#ah-${color})"`}/>`;
  }

  function platformTile(i, title, sub, icon, color, target, badge) {
    const x = 92 + i * 182, y = 868;
    return `<g class="d-click" data-target="${target}">
      <rect x="${x}" y="${y}" width="168" height="72" rx="10" fill="${C.white}" stroke="${color}" stroke-width="2"/>
      <circle cx="${x + 84}" cy="${y + 36}" r="25" fill="${color}"/>
      ${ICON_G(icon, x + 70, y + 22, 28, '#fff', 2.2)}
      ${badge ? `<rect x="${x + 118}" y="${y - 10}" width="54" height="20" rx="10" fill="#10b981"/><text x="${x + 145}" y="${y + 4}" text-anchor="middle" class="d-badge">${badge}</text>` : ''}
      ${label(x + 84, y + 100, title, { anchor: 'middle', cls: 'd-tile-name' })}
      ${label(x + 84, y + 120, sub, { anchor: 'middle', cls: 'd-tile-sub' })}
    </g>`;
  }

  window.renderDiagram = function () {
    const s = [];
    s.push(`<svg class="arch-svg anim" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="표준 마이크로서비스 아키텍처 구성도">`);
    s.push(`<defs>${markers()}
      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>`);
    s.push(`<rect x="0" y="0" width="${W}" height="${H}" rx="22" fill="#03060c"/>`);

    // ---- 제목 ----
    s.push(label(36, 46, '프로덕션 마이크로서비스 아키텍처 : End-to-End 흐름 (2026 표준)', { cls: 'd-title' }));
    s.push(label(1404, 58, 'STD·ARCH', { anchor: 'end', cls: 'd-brand' }));
    s.push(label(1404, 84, 'Reference Architecture v0.1', { anchor: 'end', cls: 'd-tile-sub' }));

    // ---- Users / Clients ----
    s.push(label(440, 120, 'USERS / CLIENTS', { anchor: 'end', cls: 'd-section' }));
    s.push(`<g class="d-click" data-target="edge">
      <rect x="460" y="76" width="560" height="76" rx="12" fill="${C.white}"/>
      ${ICON_G('phone', 482, 99, 30, C.ink)} ${label(522, 121, 'MOBILE APP', { cls: 'd-ink' })}
      ${ICON_G('browser', 660, 99, 30, C.ink)} ${label(700, 121, 'WEB BROWSER', { cls: 'd-ink' })}
      ${ICON_G('code', 850, 99, 30, C.ink)} ${label(890, 121, 'EXTERNAL API', { cls: 'd-ink' })}
    </g>`);

    // ---- Edge ----
    s.push(`<g class="d-click" data-target="edge">
      <rect x="196" y="172" width="250" height="36" rx="18" fill="#0b1220" stroke="${C.muted}" stroke-dasharray="4 4"/>
      ${ICON_G('globe', 210, 180, 20, C.muted)}
      ${label(238, 196, 'EDGE · DNS · CDN · WAF', { cls: 'd-chip' })}
    </g>`);
    s.push(flow('M560 152V218', 'teal'));
    s.push(ICON_G('lock', 574, 174, 20, C.green, 2.4));
    s.push(label(600, 191, 'HTTPS / TLS 1.3', { cls: 'd-mono' }));

    // ---- Load Balancer ----
    s.push(`<g class="d-click" data-target="lb">
      <rect x="420" y="222" width="276" height="80" rx="12" fill="${C.white}" stroke="${C.purple}" stroke-width="2"/>
      ${iconTile(436, 240, 44, 'share', '#8b5cf6')}
      ${label(494, 258, 'LOAD BALANCER', { cls: 'd-ink' })}
      ${label(494, 282, 'NLB · MetalLB (L4)', { cls: 'd-ink-sub' })}
    </g>`);
    s.push(flow('M698 262H736', 'teal'));

    // ---- API Gateway ----
    s.push(`<g class="d-click" data-target="gateway">
      <rect x="740" y="222" width="490" height="80" rx="12" fill="${C.white}" stroke="${C.green}" stroke-width="2"/>
      ${iconTile(756, 240, 44, 'route', '#16a34a')}
      ${label(814, 258, 'API GATEWAY', { cls: 'd-ink' })}
      ${label(814, 282, 'Gateway API · Envoy Gateway', { cls: 'd-ink-sub' })}
      <line x1="1070" y1="234" x2="1070" y2="290" stroke="#cbd5e1"/>
      ${label(1086, 248, 'ROUTING', { cls: 'd-mono-ink' })}
      ${label(1086, 268, 'AUTH (JWT/OIDC)', { cls: 'd-mono-ink' })}
      ${label(1086, 288, 'RATE LIMIT', { cls: 'd-mono-ink' })}
    </g>`);

    // ---- External PG ----
    s.push(`<g class="d-click" data-target="external">
      <circle cx="1330" cy="186" r="32" fill="#6d28d9" filter="url(#glow)"/>
      ${ICON_G('card', 1314, 170, 32, '#fff', 2.2)}
      ${label(1286, 180, 'PAYMENT PG', { anchor: 'end', cls: 'd-section' })}
      ${label(1286, 200, 'EXTERNAL · Stripe / 국내 PG', { anchor: 'end', cls: 'd-tile-sub' })}
    </g>`);

    // ---- Infrastructure frame ----
    s.push(`<rect x="40" y="320" width="1360" height="712" rx="20" fill="none" stroke="#cbd5e1" stroke-width="2"/>`);
    s.push(frameLabel(64, 322, 'CLOUD / ON-PREMISE INFRASTRUCTURE', 'cloud', C.white));

    // ---- Kubernetes frame ----
    s.push(`<g class="d-click-frame" data-target="k8s"><rect x="66" y="354" width="1310" height="450" rx="16" fill="none" stroke="${C.blue}" stroke-width="2.4"/></g>`);
    s.push(frameLabel(90, 356, 'KUBERNETES CLUSTER · MICROSERVICES DOMAIN', 'cluster', C.blue, 'k8s'));

    // ---- Mesh frame ----
    s.push(`<rect x="92" y="400" width="930" height="388" rx="14" fill="none" stroke="${C.teal}" stroke-width="2" stroke-dasharray="9 7"/>`);
    s.push(frameLabel(116, 402, 'ISTIO AMBIENT MESH · mTLS', 'mesh', C.sky, 'mesh'));

    // ---- Gateway → services ----
    s.push(flow('M985 302V428H235V442', 'white', { end: true }));
    s.push(flow('M535 428V442', 'white'));
    s.push(flow('M835 428V442', 'white'));

    // ---- Services ----
    s.push(service(150, 444, 'IDENTITY', 'user', '#a78bfa', 'services'));
    s.push(service(450, 444, 'PRODUCT CATALOG', 'tag', '#2dd4bf', 'services'));
    s.push(service(750, 444, 'ORDER', 'cart', '#f59e0b', 'services'));
    s.push(service(150, 630, 'INVENTORY', 'inventory', '#22d3ee', 'services'));
    s.push(service(450, 630, 'PAYMENT', 'card', '#ec4899', 'services'));
    s.push(service(750, 630, 'SHIPPING', 'truck', '#8b5cf6', 'services'));

    // ---- Right column : Cache / Kafka / Workers / RabbitMQ ----
    s.push(`<g class="d-click" data-target="cache">
      <rect x="1150" y="384" width="100" height="76" rx="12" fill="${C.white}" stroke="#ef4444" stroke-width="2"/>
      ${iconTile(1174, 396, 52, 'bolt', '#dc2626')}
      ${label(1200, 484, 'VALKEY CACHE', { anchor: 'middle', cls: 'd-section' })}
    </g>`);
    s.push(`<g class="d-click" data-target="kafka">
      <rect x="1082" y="506" width="270" height="92" rx="12" fill="${C.white}" stroke="${C.yellow}" stroke-width="2"/>
      ${[0, 1, 2].map((r) => `<rect x="1098" y="${518 + r * 26}" width="238" height="18" rx="5" fill="#fef3c7"/>` +
        [0, 1, 2].map((c) => `<rect x="${1106 + c * 34}" y="${521 + r * 26}" width="24" height="12" rx="2" fill="#f59e0b"/><path d="M${1106 + c * 34} ${521 + r * 26}l12 7 12-7" stroke="#fff" stroke-width="1.4" fill="none"/>`).join('')).join('')}
      ${label(1300, 622, 'KAFKA', { anchor: 'middle', cls: 'd-section' })}
    </g>`);
    s.push(`<g class="d-click" data-target="mq">
      ${iconTile(1084, 636, 34, 'bell', '#3b82f6')}
      ${label(1126, 650, 'NOTIFICATION', { cls: 'd-small' })}
      ${label(1126, 666, 'WORKER', { cls: 'd-small' })}
      <rect x="1112" y="690" width="186" height="72" rx="12" fill="${C.white}" stroke="${C.orange}" stroke-width="2.4"/>
      <rect x="1126" y="704" width="158" height="44" rx="8" fill="none" stroke="#cbd5e1"/>
      <rect x="1136" y="714" width="64" height="24" rx="5" fill="#f97316"/>${label(1168, 731, 'EMAIL', { anchor: 'middle', cls: 'd-chip-ink' })}
      <rect x="1210" y="714" width="64" height="24" rx="5" fill="#f97316"/>${label(1242, 731, 'EMAIL', { anchor: 'middle', cls: 'd-chip-ink' })}
      ${iconTile(1314, 706, 40, 'mail', '#0ea5e9')}
      ${label(1205, 788, 'RABBITMQ', { anchor: 'middle', cls: 'd-section' })}
      ${label(1334, 766, 'EMAIL', { anchor: 'middle', cls: 'd-small' })}
      ${label(1334, 782, 'WORKER', { anchor: 'middle', cls: 'd-small' })}
    </g>`);

    // ---- Data flows ----
    s.push(flow('M560 444V378H1146', 'green'));                       // catalog → cache
    s.push(flow('M920 518H1050V540H1080', 'yellow'));                 // order → kafka (publish)
    s.push(flow('M1082 584H835V628', 'yellow'));                      // kafka → shipping
    s.push(flow('M1082 594H1046V604H235V628', 'yellow', { w: 2.2 })); // kafka → inventory
    s.push(flow('M790 528V560H560V628', 'blue'));                     // order → payment (sync)
    s.push(flow('M1101 598V634', 'orange'));                          // kafka → notification worker
    s.push(flow('M1101 672V726H1110', 'orange'));                     // worker → rabbitmq
    s.push(flow('M1298 726H1312', 'orange'));                         // rabbitmq → email worker
    s.push(flow('M604 716V768H1036V338H1330V222', 'purple', { dash: true })); // payment → external PG

    // ---- Platform services ----
    s.push(`<rect x="66" y="830" width="1310" height="186" rx="16" fill="none" stroke="${C.teal}" stroke-width="2.2"/>`);
    s.push(frameLabel(90, 832, 'INFRASTRUCTURE AND PLATFORM SERVICES', 'layers', C.teal));
    s.push(platformTile(0, 'SERVICE MESH', 'Istio · Kiali', 'mesh', '#0ea5e9', 'mesh'));
    s.push(platformTile(1, 'MONITORING', 'Prometheus · OTel', 'chart', '#f97316', 'monitoring'));
    s.push(platformTile(2, 'LOGGING', 'Loki · Alloy', 'logs', '#14b8a6', 'logging'));
    s.push(platformTile(3, 'CI/CD', 'Actions · Argo CD', 'git', '#6366f1', 'cicd'));
    s.push(platformTile(4, 'REGISTRY', 'ECR · Harbor', 'package', '#f59e0b', 'registry'));
    s.push(platformTile(5, 'SECRETS & CONFIG', 'ESO · OpenBao', 'key', '#ec4899', 'secrets'));
    s.push(platformTile(6, 'POLICY & SECURITY', 'Kyverno · Falco', 'shield', '#10b981', 'security', '2026+'));

    s.push('</svg>');
    return s.join('\n');
  };
})();
