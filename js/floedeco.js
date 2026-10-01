/* ---------------- 🎨 Одетые льдины: уголок малыша и больница ----------------
   То же, что isledeco.js делает с островом, но для двух домашних льдин: проталина с маками, коврики, ведёрко,
   кубики, чайка на столбике, фонарик, флажки, кристаллы, камушки, скамейка, снеговик, посылки.
   Всё стоит на месте и ничего не меняет в игре. Верх льдины — y = 0.25; координаты — как у домика и миски в pet.js / world.js.
   Подключается после isledeco.js (берёт оттуда чайку и помощников islBox/islCyl/islBlob). Цвета берём темнее, чем хочется: свет ×1,45 выбеливает. */
const FD_Y = 0.25;
let fdRnd = 11;
const fdR = () => (fdRnd = (fdRnd*16807) % 2147483647)/2147483647;
const fdLay = m => { m.material.polygonOffset = true; m.material.polygonOffsetFactor = -2; m.material.polygonOffsetUnits = -2; return m; };

function fdRug(G, x, z, r, col, heart){   // круглый коврик с светлой каймой и сердечком
  const a = fdLay(new THREE.Mesh(new THREE.CircleGeometry(r, 32), toon(col))); a.rotation.x = -Math.PI/2; a.position.set(x, FD_Y + 0.012, z); G.add(a);
  const b = fdLay(new THREE.Mesh(new THREE.RingGeometry(r*0.72, r*0.82, 32), toon(0xFFF4F7))); b.rotation.x = -Math.PI/2; b.position.set(x, FD_Y + 0.02, z); b.material.polygonOffsetFactor = -3; G.add(b);
  if(heart){ const h = new THREE.Sprite(new THREE.SpriteMaterial({map:TEX.heart, transparent:true, depthWrite:false})); h.scale.setScalar(r*0.55); h.position.set(x, FD_Y + 0.14, z); G.add(h); }
}
function fdMoss(G, x, z, r){   // проталина с травкой и полярными маками
  const m = fdLay(new THREE.Mesh(new THREE.CircleGeometry(r, 24), toon(0x7FA86A))); m.rotation.x = -Math.PI/2; m.scale.set(1, 0.78, 1); m.position.set(x, FD_Y + 0.01, z); G.add(m);
  for(let i = 0; i < 9; i++){
    const a = fdR()*6.283, d = Math.sqrt(fdR())*r*0.8, px = x + Math.cos(a)*d, pz = z + Math.sin(a)*d*0.78;
    const gr = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.26, 5), toon(0x6E9C5A)); gr.position.set(px, FD_Y + 0.13, pz); gr.rotation.set((fdR() - 0.5)*0.5, 0, (fdR() - 0.5)*0.5); G.add(gr);
    if(i % 2 === 0){
      const st = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.2, 5), toon(0x6E9C5A)); st.position.set(px + 0.12, FD_Y + 0.1, pz + 0.05); G.add(st);
      islBlob(G, [0xE8B92E, 0xE8B92E, 0xF2F2F2, 0xE0709A][Math.floor(fdR()*4)], 0.075, 0.045, 0.075, px + 0.12, FD_Y + 0.22, pz + 0.05, 1.2);
    }
  }
}
function fdBlocks(G, x, z){   // кубики малыша: башенка и один упавший
  const g = new THREE.Group(); g.position.set(x, FD_Y, z); g.rotation.y = 0.4; G.add(g);
  islBox(g, 0xE8728F, 0.36, 0.36, 0.36, 0, 0.18, 0); islBox(g, 0xE8B92E, 0.32, 0.32, 0.32, 0.02, 0.52, 0.01).rotation.y = 0.5;
  islBox(g, 0x5FA8D8, 0.28, 0.28, 0.28, 0.02, 0.82, 0).rotation.y = 0.2;
  const f = islBox(g, 0x7FBF8E, 0.3, 0.3, 0.3, 0.5, 0.15, 0.2); f.rotation.set(0.1, 0.9, 0.2);
}
function fdBucket(G, x, z, col = 0x5FA8D8){   // ведёрко с рыбками
  const g = new THREE.Group(); g.position.set(x, FD_Y, z); G.add(g);
  islCyl(g, col, 0.28, 0.22, 0.38, 0, 0.19, 0, 16, 1.08);
  const hd = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.02, 6, 16, Math.PI), inkMat); hd.position.y = 0.38; g.add(hd);
  for(const [px, r, c] of [[-0.05, 0.5, 0xFFA552], [0.08, -0.4, 0xF29BB8]]){ const f = makeFish(c); f.scale.setScalar(0.42); f.position.set(px, 0.42, 0); f.rotation.set(0, r, 1.3); g.add(f); }
}
function fdPiling(G, x, z, h, yaw){   // столбик-пристань, на нём чайка
  const g = new THREE.Group(); g.position.set(x, FD_Y, z); G.add(g);
  islCyl(g, 0x8C6A52, 0.13, 0.16, h, 0, h/2, 0, 10, 1.1);
  const rope = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.025, 6, 14), toon(0xE6D3A8)); rope.rotation.x = Math.PI/2; rope.position.y = h*0.7; g.add(rope);
  const gl = ideGull(); gl.position.y = h + 0.17; gl.rotation.y = yaw; gl.scale.setScalar(0.6);
  for(const w of gl.userData.wings) w.visible = false;   // сидит, крылья сложены — не рисуем
  g.add(gl);
}
function fdCryst(G, x, z){   // кучка ледяных кристаллов
  const cols = [0x9FCDE8, 0xA8DCC8, 0xC4B9EA];
  for(let i = 0; i < 4; i++){
    const a = i/4*6.283 + fdR(), d = i ? 0.3 + fdR()*0.2 : 0, h = i ? 0.45 + fdR()*0.3 : 0.95;
    const c = addOutline(new THREE.Mesh(new THREE.ConeGeometry(0.17, h, 5), toon(cols[i % 3])), 1.1);
    c.position.set(x + Math.cos(a)*d, FD_Y + h*0.4, z + Math.sin(a)*d); c.rotation.set(i ? Math.sin(a)*0.3 : 0, fdR()*2, i ? -Math.cos(a)*0.3 : 0); G.add(c);
  }
}
function fdLantern(G, x, z){   // фонарик на столбике: тёплый огонёк светится всегда
  const g = new THREE.Group(); g.position.set(x, FD_Y, z); G.add(g);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 1.35, 8), inkMat); pole.position.y = 0.68; g.add(pole);
  const lamp = addOutline(new THREE.Mesh(SMALL, new THREE.MeshBasicMaterial({color:0xFFE9A8})), 1.12); lamp.scale.set(0.17, 0.2, 0.17); lamp.position.y = 1.42; g.add(lamp);
  const cap = addOutline(new THREE.Mesh(new THREE.ConeGeometry(0.21, 0.18, 10), toon(0xE8728F)), 1.1); cap.position.y = 1.68; g.add(cap);
  const gl = new THREE.Sprite(new THREE.SpriteMaterial({map:GLOW_TEX, transparent:true, depthWrite:false, color:0xFFE38A, opacity:0.55})); gl.scale.setScalar(1.5); gl.position.y = 1.42; g.add(gl);
}
function fdGarland(G, A, B){   // верёвочка с флажками между двумя точками [x, y, z]
  const pts = [], pt = k => new V3(A[0] + (B[0] - A[0])*k, A[1] + (B[1] - A[1])*k - Math.sin(k*Math.PI)*0.4, A[2] + (B[2] - A[2])*k);
  for(let i = 0; i <= 20; i++) pts.push(pt(i/20));
  G.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({color:INK})));
  const tri = new THREE.BufferGeometry(); tri.setAttribute('position', new THREE.Float32BufferAttribute([-0.12, 0.08, 0, 0.12, 0.08, 0, 0, -0.2, 0], 3)); tri.computeVertexNormals();
  const yaw = Math.atan2(B[0] - A[0], B[2] - A[2]) - Math.PI/2, cols = [0xE8728F, 0xE8B92E, 0x5FA8D8, 0x7FBF8E];
  for(let i = 1; i < 9; i++){ const m = new THREE.Mesh(tri, new THREE.MeshToonMaterial({color:cols[i % 4], side:THREE.DoubleSide})); m.position.copy(pt(i/9)); m.position.y -= 0.06; m.rotation.y = yaw; G.add(m); }
}
function fdBench(G, x, z, yaw){
  const g = new THREE.Group(); g.position.set(x, FD_Y, z); g.rotation.y = yaw; G.add(g);
  islBox(g, 0xE8728F, 1.3, 0.1, 0.42, 0, 0.42, 0); islBox(g, 0xE8728F, 1.3, 0.34, 0.08, 0, 0.68, -0.18);
  for(const sx of [-0.52, 0.52]) islBox(g, 0x8C6A52, 0.09, 0.42, 0.34, sx, 0.21, 0);
}
function fdSnowman(G, x, z, yaw){   // снеговик-каваи: румянец, морковка, розовый шарфик
  const g = new THREE.Group(); g.position.set(x, FD_Y, z); g.rotation.y = yaw; G.add(g);
  islBlob(g, 0xFFFFFF, 0.38, 0.34, 0.38, 0, 0.3, 0); islBlob(g, 0xFFFFFF, 0.28, 0.26, 0.28, 0, 0.78, 0);
  const sc = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.06, 8, 18), toon(0xE8728F)); sc.rotation.x = Math.PI/2; sc.position.y = 0.62; g.add(sc);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.2, 8), toon(0xF08A3C)); nose.rotation.x = Math.PI/2; nose.position.set(0, 0.8, 0.3); g.add(nose);
  for(const s of [-1, 1]){
    const e = new THREE.Mesh(SMALL, inkMat); e.scale.setScalar(0.03); e.position.set(s*0.09, 0.86, 0.25); g.add(e);
    const ch = new THREE.Mesh(SMALL, new THREE.MeshBasicMaterial({color:0xF2A0B8})); ch.scale.set(0.05, 0.03, 0.02); ch.position.set(s*0.15, 0.78, 0.23); g.add(ch);
  }
  for(const s of [-1, 1]){ const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.4, 5), toon(0x8C6A52)); arm.position.set(s*0.42, 0.52, 0); arm.rotation.z = s*1.0; g.add(arm); }
}
function fdParcels(G, x, z){
  const g = new THREE.Group(); g.position.set(x, FD_Y, z); g.rotation.y = 0.3; G.add(g);
  islBox(g, 0xE3CFA0, 0.5, 0.34, 0.42, 0, 0.17, 0); islBox(g, 0xE8B92E, 0.36, 0.26, 0.3, 0.04, 0.47, 0.02);
  for(const [w, d] of [[0.51, 0.07], [0.07, 0.43]]) islBox(g, 0xE8728F, w, 0.35, d, 0, 0.175, 0, 1.0);
}
function fdPebbles(G, list){
  for(const [x, z, s, c] of list){ const p = addOutline(new THREE.Mesh(new THREE.DodecahedronGeometry(1), toon(c || 0xA9B2C8)), 1.14); p.scale.set(s, s*0.6, s); p.position.set(x, FD_Y + s*0.25, z); p.rotation.y = fdR()*6; G.add(p); }
}

function fdBuild(){
  // уголок малыша (локальные координаты petCorner; домик, миска, лунка, табличка и мяч уже стоят)
  fdRnd = 11;
  const P = petCorner;
  fdRug(P, 0, 0.2, 0.95, 0xE890A8, true);
  fdBlocks(P, -2.25, 0.15);
  fdMoss(P, 0.75, 2.0, 0.62);
  fdBucket(P, -0.55, 2.3);
  fdPiling(P, 2.45, -1.0, 0.7, -0.6);
  fdCryst(P, 0.35, -2.55);
  fdLantern(P, -2.5, -0.75);
  fdGarland(P, [-1.5, 1.52, -2.0], [1.5, 1.15, -1.6]);
  fdPebbles(P, [[-0.4, -1.5, 0.12], [-2.1, 1.7, 0.1, 0xB8AEC8], [2.0, 1.9, 0.11, 0x9FAEC4], [1.3, 2.4, 0.09], [-1.6, 2.2, 0.1, 0xB8AEC8], [2.6, 0.9, 0.1]]);
  // больница (корень сцены; клиника, аптечка, ведро и лунка уже стоят)
  const H = new THREE.Group(); scene.add(H);
  fdBench(H, 0.4, -2.55, 0.1);
  fdSnowman(H, 1.9, -1.85, -0.5);
  fdRug(H, -1.15, -0.25, 0.55, 0xE890A8, true);
  fdMoss(H, 2.0, 1.95, 0.6);
  fdCryst(H, -2.7, 0.1);
  fdLantern(H, 2.55, 0.45);
  fdPiling(H, -2.1, 1.9, 0.7, 0.8);
  fdParcels(H, 0.2, 2.35);
  fdPebbles(H, [[-0.3, -1.4, 0.12], [0.9, 1.6, 0.1, 0xB8AEC8], [-0.9, 2.2, 0.1], [2.5, -1.3, 0.1, 0x9FAEC4], [-2.6, -0.9, 0.09]]);
}
fdBuild();
