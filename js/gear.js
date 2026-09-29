/* ---------------- 🎈 Вещи-умения из лавки (Спринт 7, задача 3) ----------------
   Как в Seally Seal Сабрина покупает себе штуки для исследований — у нас это вещи малыша, которые что-то УМЕЮТ.
   Работают на прогулке по острову (js/island.js через roamStart({gear:gearRoam()}) из js/roam.js), дальше — в пещере.
   🎈 Шарик-попрыгунчик — ⤴ в воздухе ещё раз: двойной прыжок (с суши и с гриба-батута, не из воды).
   🛷 Ледянка — на пузике с горы в полтора раза быстрее, ложится и на пологом склоне; с разгона — трамплин (ISL_RAMPS).
   🩵 Ласты-турбо — плывёт почти вдвое быстрее (сильное течение у дальней льдинки) и «дельфинчик» выше.
   Куплена — значит всегда с собой (ничего не надо надевать); на прогулке видно на малыше: шарик на ниточке,
   ледянка на спине (на горке — под пузиком), голубые ласты. Покупаются в лавке, вкладка «🎈 Умения» (видна, когда есть малыш).
   Сохранение — как у всех покупок: id в save.owned. Новая вещь — строчка в SHOP ниже + GEAR_MAKE + что она даёт в gearRoam().
   Подключается после roam.js и shop.js, до island.js. */
SHOP.push(
  {id:'gball', kind:'gear', ic:'🎈', name:L('Шарик-попрыгунчик', 'Bouncy balloon'), price:60,
    how:L('На прогулке по острову: ⤴ в воздухе — ещё прыжок! Выше крыш и столбов.', 'On island walks: tap ⤴ in the air to jump again! Higher than roofs and pillars.')},
  {id:'gsled', kind:'gear', ic:'🛷', name:L('Ледянка', 'Snow sled'), price:90,
    how:L('С горы на пузике — быстрее ветра! Разгонись — и с трамплина в полёт.', 'Slide down the hill faster than the wind! Speed up and fly off the ramp.')},
  {id:'gfins', kind:'gear', ic:'🩵', name:L('Ласты-турбо', 'Turbo flippers'), price:120,
    how:L('Плывёшь почти вдвое быстрее — даже против течения. И «дельфинчик» выше!', 'Swim almost twice as fast — even against the current. And leap higher!')}
);
const GEAR = ['gball', 'gsled', 'gfins'];
const gearN = () => GEAR.filter(owns).length;
// что даёт каждая вещь управлению (js/roam.js): dj — двойной прыжок, swim — скорость в воде, slide — скорость на пузике
function gearRoam(onDJ){
  return {dj:owns('gball'), swim:owns('gfins') ? 1.75 : 0, slide:owns('gsled') ? 1.45 : 0, onDJ};
}

/* ---------- модельки: они же — картинки в лавке ---------- */
const GEAR_MAKE = {
  gball(){   // розовый шарик с бликом-сердечком и узелком
    const g = new THREE.Group();
    const b = addOutline(new THREE.Mesh(SMALL, toon(0xFF7FA3)), 1.05); b.scale.set(0.42, 0.48, 0.42); g.add(b); g.userData.ball = b;
    const hl = new THREE.Mesh(HEART_FLAT, new THREE.MeshBasicMaterial({color:0xFFFFFF, transparent:true, opacity:0.7})); hl.scale.setScalar(0.16); hl.position.set(-0.15, 0.18, 0.39); hl.rotation.y = -0.35; g.add(hl);
    const knot = addOutline(new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.1, 8), toon(0xFF7FA3)), 1.1); knot.position.y = -0.5; knot.rotation.x = Math.PI; g.add(knot);
    return g;
  },
  gsled(){   // круглая красная ледянка с бортиком и верёвочкой
    const g = new THREE.Group(), m = toon(0xFF6F7F);
    const d = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.6, 0.12, 28), m), 1.05); g.add(d);
    const rim = addOutline(new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.07, 8, 28), m), 1.06); rim.rotation.x = Math.PI/2; rim.position.y = 0.07; g.add(rim);
    const st = new THREE.Mesh(HEART_FLAT, new THREE.MeshBasicMaterial({color:0xFFFDF8})); st.scale.setScalar(0.42); st.rotation.x = -Math.PI/2; st.position.y = 0.075; g.add(st);
    const rope = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.025, 6, 16, Math.PI), toon(0xFFD66B)); rope.position.set(0, 0.07, 0.72); rope.rotation.x = -Math.PI/2; g.add(rope);
    return g;
  },
  gfins(){   // пара голубых ласт с белой полоской (для картинки в лавке)
    const g = new THREE.Group();
    for(const s of [-1, 1]){ const f = gearFin(); f.position.x = 0.32*s; f.rotation.y = 0.35*s; g.add(f); }
    return g;
  }
};
function gearFin(){
  const g = new THREE.Group();
  const f = addOutline(new THREE.Mesh(SMALL, toon(0x5EC8F2)), 1.1); f.scale.set(0.24, 0.06, 0.42); g.add(f);
  const s = new THREE.Mesh(SMALL, toon(0xFFFDF8)); s.scale.set(0.2, 0.065, 0.06); s.position.z = 0.12; g.add(s);
  const tip = new THREE.Mesh(SMALL, toon(0x2F9FD8)); tip.scale.set(0.2, 0.062, 0.1); tip.position.z = -0.3; g.add(tip);
  return g;
}

/* ---------- вещи на малыше во время прогулки: gearDress(s) → {tick(R, dt), dj(), off()} ---------- */
function gearDress(s){
  const parts = [], H = {tick(){}, dj(){}, off(){ parts.forEach(([p, o]) => p.remove(o)); }};
  const put = (p, o) => { p.add(o); parts.push([p, o]); return o; };
  let ball = null, line = null, sled = null, pop = 0;
  if(owns('gball')){
    ball = put(s.root, GEAR_MAKE.gball());
    const lg = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0], 3));
    line = put(s.root, new THREE.Line(lg, new THREE.LineBasicMaterial({color:INK})));
  }
  if(owns('gsled')) sled = put(s.inner, GEAR_MAKE.gsled());
  if(owns('gfins')) for(const sd of [-1, 1]){ const f = put(s.inner, gearFin()); f.position.set(0.24*sd, 0.14, -1.72); f.rotation.y = 0.45*sd; f.scale.setScalar(0.9); }
  const back = new V3(0, 1.62, -0.6), belly = new V3(0, 0.02, -0.15);
  let bubT = 0;
  H.dj = () => { pop = 1; };
  H.tick = (R, dt) => {
    if(ball){   // шарик плывёт за спиной и покачивается; двойной прыжок — шарик сжимается-пыхает
      const t = now;
      pop = Math.max(0, pop - dt*3);
      ball.position.set(1.0 + Math.sin(t*1.3)*0.12, 3.25 +Math.sin(t*2)*0.08 - (R.air ? Math.min(0.4, Math.max(-0.3, R.vy*0.04)) : 0), -1.0 - Math.hypot(R.vel.x, R.vel.z)*0.05);
      ball.rotation.z = Math.sin(t*1.3)*0.15;
      const k = 1 + Math.sin(pop*Math.PI)*0.35; ball.scale.set(k, 1/k*1.1 - 0.1, k);
      const p = line.geometry.attributes.position; p.setXYZ(0, 0, 1.4, -0.95); p.setXYZ(1, ball.position.x, ball.position.y - 0.55, ball.position.z); p.needsUpdate = true;
    }
    if(sled){   // на спине, как рюкзачок; едем на пузике или летим с трамплина — под пузиком
      const k = Math.max(R.slide, R.fly ? 1 : 0), on = k > 0.3 ? 1 : 0;
      sled.userData.k = (sled.userData.k || 0) + (on - (sled.userData.k || 0))*Math.min(1, dt*10);
      const q = sled.userData.k;
      sled.position.lerpVectors(back, belly, q); sled.rotation.set(-0.35*(1 - q), 0, 0);
    }
    if(owns('gfins') && R.water && !R.air && Math.hypot(R.vel.x, R.vel.z) > ROAM_SWIMV*0.9){   // турбо: пузырьки за ластами
      bubT -= dt;
      if(bubT < 0){ bubT = 0.05; const w = s.root.localToWorld(new V3((Math.random() - 0.5)*0.5, 0.2, -2.0)); emit(TEX.dot, w, {v:new V3(0, 0.8, 0), life:0.6, size:0.12, grow:0.5}); }
    }
  };
  return H;
}
