/* =============================================================================
 * icons.js : 자체 제작 라인 아이콘 세트 (24x24, stroke 기반)
 *   - 특정 제품 로고/상표를 복제하지 않고, 기능을 상징하는 범용 글리프만 사용
 *   - 사용: ICON('database', {size:24, color:'#60a5fa'})
 * ========================================================================== */
(function () {
  const P = {
    phone: '<rect x="7" y="2.5" width="10" height="19" rx="2.2"/><path d="M11 18.5h2"/>',
    browser: '<rect x="2.5" y="4" width="19" height="16" rx="2"/><path d="M2.5 8.5h19"/><circle cx="5.5" cy="6.3" r=".6"/><circle cx="7.8" cy="6.3" r=".6"/>',
    code: '<path d="m8 7-5 5 5 5"/><path d="m16 7 5 5-5 5"/><path d="m13.5 4-3 16"/>',
    lock: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>',
    globe: '<circle cx="12" cy="12" r="9.5"/><path d="M2.5 12h19"/><path d="M12 2.5c2.6 2.6 3.9 5.8 3.9 9.5S14.6 18.9 12 21.5C9.4 18.9 8.1 15.7 8.1 12S9.4 5.1 12 2.5z"/>',
    share: '<circle cx="6" cy="12" r="2.6"/><circle cx="18" cy="5.5" r="2.6"/><circle cx="18" cy="18.5" r="2.6"/><path d="m8.3 10.8 7.4-4"/><path d="m8.3 13.2 7.4 4"/>',
    route: '<circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="5.5" r="2.5"/><path d="M8 18.5h6.5a3.5 3.5 0 0 0 0-7h-5a3.5 3.5 0 0 1 0-7H16"/>',
    cluster: '<path d="M12 2.5 20.5 7v10L12 21.5 3.5 17V7z"/><circle cx="12" cy="12" r="2.6"/><path d="M12 2.5v6.9M12 14.6v6.9M3.5 7l6.2 3.6M14.3 13.4 20.5 17M20.5 7l-6.2 3.6M9.7 13.4 3.5 17"/>',
    mesh: '<circle cx="5" cy="6" r="2.2"/><circle cx="19" cy="6" r="2.2"/><circle cx="12" cy="12" r="2.2"/><circle cx="5" cy="18" r="2.2"/><circle cx="19" cy="18" r="2.2"/><path d="m6.8 7.3 3.4 3.4M17.2 7.3l-3.4 3.4M6.8 16.7l3.4-3.4M17.2 16.7l-3.4-3.4M7.2 6h9.6M7.2 18h9.6"/>',
    boxes: '<rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/>',
    user: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.2-6 6.5-6s5.9 2.4 6.5 6"/><path d="M17 11.5a3 3 0 1 0 0-6"/><path d="M18.5 14.5c1.7.7 2.8 2.6 3 5"/>',
    tag: '<path d="M3 12.2V4a1 1 0 0 1 1-1h8.2l8.8 8.8-9.2 9.2z"/><circle cx="8" cy="8" r="1.6"/>',
    cart: '<path d="M2.5 3.5h3l2.4 11.3a1.6 1.6 0 0 0 1.6 1.2h8.6a1.6 1.6 0 0 0 1.5-1.2L21.5 7H6.4"/><circle cx="10" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/>',
    inventory: '<path d="M3 21V9l9-5 9 5v12"/><path d="M7 21v-8h10v8"/><path d="M7 17h10"/>',
    card: '<rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="M2.5 9.5h19"/><path d="M6 15h4"/>',
    truck: '<path d="M2.5 6h11v10h-11z"/><path d="M13.5 9.5h4l3 3.5V16h-7"/><circle cx="6.5" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>',
    database: '<ellipse cx="12" cy="5.5" rx="7.5" ry="3"/><path d="M4.5 5.5v13c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-13"/><path d="M4.5 12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3"/>',
    bolt: '<path d="M13 2.5 4.5 13.5H12l-1 8 8.5-11H12z"/>',
    stream: '<rect x="2.5" y="4" width="19" height="4" rx="1"/><rect x="2.5" y="10" width="19" height="4" rx="1"/><rect x="2.5" y="16" width="19" height="4" rx="1"/><path d="M6 6h.01M10 6h.01M6 12h.01M14 12h.01M6 18h.01M10 18h.01M18 18h.01"/>',
    queue: '<rect x="2.5" y="7" width="5" height="10" rx="1"/><rect x="9.5" y="7" width="5" height="10" rx="1"/><rect x="16.5" y="7" width="5" height="10" rx="1"/><path d="M2.5 21h19"/>',
    bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
    mail: '<rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="m3 6.5 9 6.5 9-6.5"/>',
    external: '<path d="M14 3.5h6.5V10"/><path d="M20.5 3.5 11 13"/><path d="M18 14v4.5a2 2 0 0 1-2 2H5.5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2H10"/>',
    chart: '<path d="M3.5 3.5v17h17"/><path d="m7 15 4-5 3.5 3 5-6.5"/>',
    logs: '<path d="M6 2.5h9l4.5 4.5v14.5H6z"/><path d="M14.5 2.5V7h5"/><path d="M9 11h7M9 14.5h7M9 18h4"/>',
    git: '<circle cx="6" cy="5.5" r="2.3"/><circle cx="6" cy="18.5" r="2.3"/><circle cx="18" cy="9" r="2.3"/><path d="M6 7.8v8.4"/><path d="M18 11.3c0 3.5-4 4-9.8 6"/>',
    package: '<path d="M12 2.5 20.5 7v10L12 21.5 3.5 17V7z"/><path d="m3.5 7 8.5 4.6L20.5 7"/><path d="M12 11.6v9.9"/><path d="m7.8 4.8 8.5 4.6"/>',
    key: '<circle cx="8" cy="15.5" r="4.5"/><path d="m11.3 12.3 9.2-9.2"/><path d="m17 6.3 2.8 2.8"/><path d="m14.6 8.7 2 2"/>',
    shield: '<path d="M12 2.5 4.5 5.5v6c0 4.6 3.2 8.5 7.5 10 4.3-1.5 7.5-5.4 7.5-10v-6z"/><path d="m8.8 12 2.3 2.3 4.3-4.6"/>',
    server: '<rect x="3" y="3.5" width="18" height="7" rx="1.5"/><rect x="3" y="13.5" width="18" height="7" rx="1.5"/><path d="M7 7h.01M7 17h.01M11 7h6M11 17h6"/>',
    cloud: '<path d="M7 19.5a4.5 4.5 0 0 1-.6-9A6 6 0 0 1 18 9a4.3 4.3 0 0 1-.5 8.5z"/>',
    terraform: '<rect x="3.5" y="3.5" width="17" height="17" rx="2.5"/><path d="m9.5 9-3 3 3 3"/><path d="m14.5 9 3 3-3 3"/>',
    ansible: '<path d="M10 6h10.5M10 12h10.5M10 18h10.5"/><path d="m3.5 6 1.6 1.6L8 4.8M3.5 12l1.6 1.6L8 10.8M3.5 18l1.6 1.6L8 16.8"/>',
    helm: '<rect x="3.5" y="7" width="17" height="13" rx="2"/><path d="M8.5 7V4.5h7V7"/><path d="M12 10.5v6"/><path d="m9.3 14 2.7 2.7 2.7-2.7"/>',
    copy: '<rect x="8.5" y="8.5" width="12" height="12" rx="2"/><path d="M15.5 8.5V5.5a2 2 0 0 0-2-2h-8a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3"/>',
    check: '<path d="m4.5 12.5 5 5 10-11"/>',
    arrowRight: '<path d="M4.5 12h15"/><path d="m13.5 6 6 6-6 6"/>',
    arrowLeft: '<path d="M19.5 12h-15"/><path d="m10.5 6-6 6 6 6"/>',
    github: '<path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21"/>',
    menu: '<path d="M3.5 6h17M3.5 12h17M3.5 18h17"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m20 20-4.8-4.8"/>',
    star: '<path d="m12 3 2.7 5.6 6.1.8-4.4 4.3 1 6.1L12 17l-5.4 2.8 1-6.1-4.4-4.3 6.1-.8z"/>',
    clock: '<circle cx="12" cy="12" r="9.5"/><path d="M12 7v5l3.5 2"/>',
    layers: '<path d="m12 3 9.5 5L12 13 2.5 8z"/><path d="m2.5 12.5 9.5 5 9.5-5"/><path d="m2.5 16.5 9.5 5 9.5-5"/>',
    flag: '<path d="M5 21V4"/><path d="M5 4h12l-2.5 4L17 12H5"/>',
    book: '<path d="M4 4.5A2 2 0 0 1 6 2.5h13.5v16H6a2 2 0 0 0-2 2z"/><path d="M4 20.5a2 2 0 0 0 2 1.5h13.5"/>',
    map: '<path d="m3 6 6-2.5 6 2.5 6-2.5v14.5l-6 2.5-6-2.5-6 2.5z"/><path d="M9 3.5v14.5M15 6v14.5"/>',
    play: '<path d="M7 4.5v15l12.5-7.5z"/>',
    pause: '<path d="M8 5v14M16 5v14"/>',
  };

  window.ICON = function (name, opt) {
    opt = opt || {};
    const s = opt.size || 20;
    const c = opt.color || 'currentColor';
    const w = opt.stroke || 1.8;
    const body = P[name] || P.boxes;
    return `<svg class="ico ${opt.cls || ''}" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
  };

  /* SVG 내부에 직접 삽입할 때 사용 (x,y 위치, 크기) */
  window.ICON_G = function (name, x, y, size, color, stroke) {
    const k = size / 24;
    return `<g transform="translate(${x},${y}) scale(${k})" fill="none" stroke="${color}" stroke-width="${stroke || 2}" stroke-linecap="round" stroke-linejoin="round">${P[name] || P.boxes}</g>`;
  };
})();
