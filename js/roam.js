/* ---------------- «Иди куда хочешь»: общее управление свободной прогулкой (Спринт 7, задача 1) ----------------
   Сабрина сама ведёт своего малыша (как в Seally Seal): держи палец — идёт в ту сторону, пока держишь (как джойстик),
   коснись точки — дойдёт до неё, коснись подписи места — идёт туда сам,
   кнопка ⤴ — прыжок (в воде — «дельфинчик» с кувырком). Со склона малыш сам ложится на пузико и едет быстрее,
   в воде плывёт быстрее, чем ходит. Камера сзади-сверху и сама не крутится (на телефоне от этого укачивает).
   Мир описывает одна функция высоты ground(x, z): земля, горы, крыши, льдинки. Куда нельзя забраться шагом —
   туда можно запрыгнуть (крутой край = стенка). Ниже ROAM_DEEP — вода: малыш плывёт на уровне ROAM_SWIM.
   Этим пользуются остров (js/island.js) и «Ходить самой» в комнатах иглу (js/homewalk.js: камеру ведёт сама комната, nocam).
   roamStart({s, at, pos, ground, bounce, onGoal, gear, push}) → R; каждый кадр roamStep(R, dt); выход — roamStop(R).
   gear — вещи-умения из лавки (js/gear.js, gearRoam()): {dj — двойной прыжок, swim — во сколько раз быстрее плыть и выше «дельфинчик»,
   slide — во сколько раз быстрее на пузике}; push(x, z) — течение в воде (V3 м/с или null); R.fly = true — летим с трамплина, в воздухе не рулим.
   Подключается после walk.js (squash, burst) и до island.js. */
const ROAM_WALK = 4.4, ROAM_SWIMV = 6.2, ROAM_SLIDEV = 11;   // м/с: пешком, вплавь, на пузике с горы
const ROAM_JV = 7.6, ROAM_G = 21, ROAM_LEAP = 9.5;            // прыжок, сила тяжести, «дельфинчик» из воды
const ROAM_DEEP = -0.3, ROAM_SWIM = -0.5;                     // где уже вода; на какой высоте плывёт
const ROAM_STEEP = 1.7;                                       // круче этого шагом не забраться — только прыжком
const ROAM_CAM = {w:10, min:10, up:0.62, look:0.8, fov:50};   // камера: сколько метров по ширине в кадре, ближе не подъезжает, насколько сверху

function roamStart({s, at, pos, ground, bounce = null, onGoal = null, vk = 1, nocam = false, noslide = false, gear = null, push = null}){   // vk — во сколько раз медленнее/быстрее (в иглу тесно), nocam — камеру ведёт не roamCam, noslide — не ложиться на пузико со склона
  const R = {s, at, pos:pos.clone(), vk, nocam, noslide, vy:0, vel:new V3(), yaw:0, air:false, water:false, slide:0, tumble:0,
    tgt:null, hold:false, pid:null, goal:null, key:new V3(), ground, bounce, onGoal, cam:new V3(), camLook:new V3(), camOn:false,
    puffT:0, stepT:0, jumpQ:false, still:0, gear:gear || {}, push, dj:false, fromWater:false, fly:false};
  R.pos.y = roamFloor(R, R.pos.x, R.pos.z);
  roamPose(R, 0);
  return R;
}
// где стоит лапка: земля или (в воде) уровень, на котором плывём
function roamFloor(R, x, z){ const g = R.ground(x, z); return g < ROAM_DEEP ? ROAM_SWIM : g; }
const roamSc = () => typeof petScale === 'function' && save.pet ? petScale()/0.84 : 1;   // подросток = 1; малыш меньше — и чуть медленнее

// касание → точка на высоте малыша (горизонтальная плоскость)
const roamRay = new THREE.Raycaster(), roamNdc = new THREE.Vector2(), roamPl = new THREE.Plane(new V3(0, 1, 0), 0);
function roamPoint(R, cx, cy){
  roamNdc.set(cx/innerWidth*2 - 1, -(cy/innerHeight)*2 + 1); roamRay.setFromCamera(roamNdc, camera);
  roamPl.constant = -(R.at.y + R.pos.y);
  const p = roamRay.ray.intersectPlane(roamPl, new V3());
  return p ? p.sub(R.at) : null;
}
// управление: el — слой касаний (mgRoot); hit(cx, cy) — вдруг коснулись метки (тогда туда пойдём сами)
function roamControls(R, el, hit){
  mgOn(el, 'pointerdown', e => {
    if(e.target.closest && e.target.closest('button, .mg-panel, .run-hud')) return;
    const g = hit && hit(e.clientX, e.clientY);
    if(g){ R.goal = g; R.hold = false; R.tgt = null; sfx.tap(); return; }
    R.goal = null; R.hold = true; R.pid = e.pointerId; R.fx = e.clientX; R.fy = e.clientY; R.tgt = roamPoint(R, R.fx, R.fy); R.t0 = now;
  });
  mgOn(el, 'pointermove', e => { if(R.hold && e.pointerId === R.pid){ R.fx = e.clientX; R.fy = e.clientY; } });
  // отпустила быстро — это «касание»: малыш дойдёт до точки; держала — остановится, где отпустила
  for(const ev of ['pointerup', 'pointercancel']) mgOn(el, ev, e => { if(e.pointerId === R.pid){ R.hold = false; if(now - R.t0 > 0.35) R.tgt = null; } });
  const K = {ArrowLeft:[-1, 0], ArrowRight:[1, 0], ArrowUp:[0, -1], ArrowDown:[0, 1], a:[-1, 0], d:[1, 0], w:[0, -1], s:[0, 1]};
  const held = new Set();
  const upd = () => { R.key.set(0, 0, 0); held.forEach(k => { R.key.x += K[k][0]; R.key.z += K[k][1]; }); if(R.key.lengthSq()) R.key.normalize(); };
  mgOn(window, 'keydown', e => {
    if(e.key === ' '){ R.jumpQ = true; e.preventDefault(); return; }
    const k = K[e.key] ? e.key : K[e.key.toLowerCase()] ? e.key.toLowerCase() : null;
    if(k){ held.add(k); R.goal = null; R.tgt = null; R.hold = false; upd(); e.preventDefault(); }   // стрелки — забываем старую точку касания, иначе отпустила клавишу — малыш идёт туда
  });
  mgOn(window, 'keyup', e => { const k = K[e.key] ? e.key : e.key.toLowerCase(); if(held.delete(k)) upd(); });
}
function roamJump(R){ R.jumpQ = true; }

function roamStep(R, dt){
  const s = R.s, P = R.pos, sc = roamSc();
  // куда хотим: клавиши, палец или метка
  const want = new V3();
  if(R.key.lengthSq()) want.copy(R.key);
  else if(R.goal){
    const gp = R.goal.p(), d = new V3(gp.x - P.x, 0, gp.z - P.z), l = d.length();
    if(l < (R.goal.r || 1.6)){ const g = R.goal; R.goal = null; if(R.onGoal) R.onGoal(g); }
    else want.copy(d).divideScalar(l);
  } else if(R.tgt || R.hold){
    if(R.hold){ const p = roamPoint(R, R.fx, R.fy); if(p) R.tgt = p; }   // держишь палец — идёт в ту сторону (камера едет следом, точка убегает вперёд)
    if(!R.tgt) R.tgt = P.clone();
    const d = new V3(R.tgt.x - P.x, 0, R.tgt.z - P.z), l = d.length();
    if(l > 0.35) want.copy(d).divideScalar(l).multiplyScalar(Math.min(1, l/1.2));
  }
  const floor0 = roamFloor(R, P.x, P.z);
  R.water = R.ground(P.x, P.z) < ROAM_DEEP;
  const onGround = !R.air;
  // на пузике: едем вниз по склону — разгоняемся; в гору и по ровному — снова лапками
  const G = R.gear;
  let vmax = (R.water ? ROAM_SWIMV*(G.swim || 1) : ROAM_WALK)*(0.8 + 0.2*sc)*R.vk;
  if(onGround && !R.water && want.lengthSq() > 0.01 && !R.noslide){
    const ahead = R.ground(P.x + want.x*0.6, P.z + want.z*0.6), drop = (floor0 - ahead)/0.6, d0 = G.slide ? 0.1 : 0.18;   // на ледянке ложится и на пологом склоне
    R.slide += ((drop > d0 ? Math.min(1, (drop - d0)*(G.slide ? 4 : 2.2)) : 0) - R.slide)*Math.min(1, dt*(drop > d0 ? 3 : G.slide ? 2.5 : 5));
  } else if(!R.air) R.slide += (0 - R.slide)*Math.min(1, dt*5);
  vmax += (ROAM_SLIDEV*(G.slide || 1)*R.vk - vmax)*R.slide;
  const tv = want.multiplyScalar(vmax);
  if(!R.fly) R.vel.lerp(tv, Math.min(1, dt*(R.air ? 3 : tv.lengthSq() ? 6 : 4)));
  // течение в воде (и над водой — чтобы «дельфинчиком» не проскочить)
  const cur = R.push && R.ground(P.x, P.z) < ROAM_DEEP ? R.push(P.x, P.z) : null;
  if(cur){ P.x += cur.x*dt; P.z += cur.z*dt; }
  // шаг по x и z отдельно: упёрлись в стенку по одной оси — скользим вдоль неё
  for(const ax of ['x', 'z']){
    const nx = ax === 'x' ? P.x + R.vel.x*dt : P.x, nz = ax === 'z' ? P.z + R.vel.z*dt : P.z;
    const f = roamFloor(R, nx, nz), step = Math.abs(R.vel[ax]*dt);
    if(f - P.y > Math.max(R.water && !R.air ? 0.55 : 0.12, step*ROAM_STEEP)){ R.vel[ax] *= -0.1; continue; }   // крутой край: только прыжком (из воды на пологий берег — выбирается сам)
    P[ax] = ax === 'x' ? nx : nz;
  }
  // прыжок, полёт и приземление
  const floor = roamFloor(R, P.x, P.z);
  if(R.jumpQ){
    R.jumpQ = false;
    if(!R.air){
      R.air = true; R.vy = R.water ? ROAM_LEAP*(G.swim ? 1.3 : 1) : ROAM_JV; s.flap = 1; R.dj = false; R.fromWater = R.water;
      if(R.water){ R.tumble = 1; sfx.splash(); burst(TEX.puff, R.at.clone().add(P), 8, 1.4, 0.4); } else { sfx.whoosh(); squash(s, 0.16, 0.18); }
    } else if(G.dj && !R.dj && !R.fromWater && !R.fly){   // 🎈 шарик-попрыгунчик: второй прыжок прямо в воздухе (с суши и с батута)
      R.dj = true; R.vy = ROAM_JV*0.95; s.flap = 1; R.tumble = 1; sfx.pop();
      burst(TEX.heart, R.at.clone().add(P).add(new V3(0, 0.4, 0)), 6, 1.4, 0.22);
      if(G.onDJ) G.onDJ();
    }
  }
  if(R.air){
    R.vy -= ROAM_G*dt; P.y += R.vy*dt;
    if(P.y <= floor && R.vy <= 0){
      P.y = floor; R.air = false; const hard = R.vy < -9; R.vy = 0; s.flap = 0; R.dj = false; R.fromWater = false; R.fly = false;
      const b = R.bounce && R.bounce(P.x, P.z);
      if(b){ R.air = true; R.vy = b; sfx.pop(); squash(s, 0.3, 0.25); burst(TEX.star, R.at.clone().add(P).add(new V3(0, 0.3, 0)), 8, 1.8, 0.24); }
      else if(R.water){ sfx.splash(); burst(TEX.puff, R.at.clone().add(P), 10, 1.6, 0.45); }
      else { sfx.thud(); squash(s, hard ? 0.28 : 0.18, 0.28); burst(TEX.puff, R.at.clone().add(P).add(new V3(0, 0.1, 0)), hard ? 8 : 4, 1, 0.4); }
    }
  } else if(floor < P.y - 0.25){ R.air = true; R.vy = 0; R.dj = false; R.fromWater = false; }   // съехали с края — летим
  else {
    P.y += (floor - P.y)*Math.min(1, dt*(R.water ? 6 : 18));
    const b = R.bounce && R.bounce(P.x, P.z);
    if(b){ R.air = true; R.vy = b; sfx.pop(); squash(s, 0.3, 0.25); burst(TEX.star, R.at.clone().add(P).add(new V3(0, 0.3, 0)), 8, 1.8, 0.24); }
  }
  roamPose(R, dt);
  if(!R.nocam) roamCam(R, dt);
}
// как выглядит малыш: куда смотрит, переваливается, лежит на пузике, плывёт, кувыркается
function roamPose(R, dt){
  const s = R.s, P = R.pos, sp = Math.hypot(R.vel.x, R.vel.z);
  s.root.position.copy(R.at).add(P);
  if(sp > 0.4){ const y = Math.atan2(R.vel.x, R.vel.z); R.yaw += Math.atan2(Math.sin(y - R.yaw), Math.cos(y - R.yaw))*Math.min(1, dt*8); }
  s.root.rotation.set(0, R.yaw, 0);
  s.swimming = R.water && !R.air;
  if(R.tumble > 0){ R.tumble -= dt*1.3; s.inner.rotation.x = (1 - Math.max(0, R.tumble))*Math.PI*2; if(R.tumble <= 0) s.inner.rotation.x = 0; }
  else s.inner.rotation.x += ((R.slide > 0.3 ? 0.35 : R.water ? 0.15 : 0) - s.inner.rotation.x)*Math.min(1, dt*6);   // на пузике — наклон вперёд
  if(!R.air && !R.water && R.slide < 0.3 && sp > 0.5){   // переваливается с боку на бок
    R.stepT += dt*sp*2.6;
    s.inner.position.y = Math.abs(Math.sin(R.stepT))*0.1; s.wobble = Math.sin(R.stepT*2)*0.05;
    s.inner.rotation.z = Math.sin(R.stepT)*0.08;
  } else if(!R.water){ s.inner.position.y *= 0.8; s.wobble *= 0.8; s.inner.rotation.z *= 0.85; }
  else s.inner.rotation.z *= 0.85;
  if(!R.air) s.flap = R.water ? 0.25 + Math.min(1, sp/ROAM_SWIMV)*0.6 : R.slide > 0.3 ? 0.9 : Math.min(0.4, sp*0.08);
  // снежная пыль из-под пузика и брызги
  R.puffT -= dt;
  if(R.puffT < 0 && sp > 1.5 && !R.air){
    R.puffT = R.water ? 0.18 : R.slide > 0.3 ? 0.06 : 0.35;
    if(R.water) emit(TEX.dot, s.root.position.clone().add(new V3((Math.random() - 0.5)*0.6, 0.1, 0)), {v:new V3(0, 1.2, 0), life:0.8, size:0.14, grow:0.4});
    else if(R.slide > 0.3) emit(TEX.puff, s.root.position.clone().add(new V3(0, 0.15, 0)), {v:new V3((Math.random() - 0.5), 0.9, (Math.random() - 0.5)), life:0.7, size:0.5, grow:0.8});
  }
}
// камера сзади-сверху (всегда смотрит на север, −z): по ширине в кадр влезает ROAM_CAM.w метров вокруг малыша
// (на узком телефоне камера отъезжает дальше); подросший малыш — чуть шире
function roamCam(R, dt){
  const sp = Math.hypot(R.vel.x, R.vel.z), tv = Math.tan(THREE.MathUtils.degToRad(camera.fov)/2);
  const w = ROAM_CAM.w*(0.85 + 0.15*roamSc())*(1 + Math.min(0.2, sp*0.015));
  const D = Math.max(ROAM_CAM.min, w/2/(tv*Math.min(1.4, camera.aspect)));
  const look = R.at.clone().add(R.pos).add(new V3(0, ROAM_CAM.look, -D*0.12));
  const pos = look.clone().add(new V3(0, D*ROAM_CAM.up, D));
  pos.y = Math.max(pos.y, R.at.y + 1.2);
  if(!R.camOn){ R.cam.copy(pos); R.camLook.copy(look); R.camOn = true; }
  R.cam.lerp(pos, Math.min(1, dt*3)); R.camLook.lerp(look, Math.min(1, dt*5));
  runCam.pos.copy(R.cam); runCam.look.copy(R.camLook);
}
// на прогулке обзор шире обычного и туман дальше (остров большой); roamView(false) — вернуть как было
let roamSaved = null;
function roamView(on){
  if(on && !roamSaved){ roamSaved = {fov:camera.fov, near:scene.fog.near, far:scene.fog.far}; camera.fov = ROAM_CAM.fov; scene.fog.near = 45; scene.fog.far = 130; camera.updateProjectionMatrix(); }
  else if(!on && roamSaved){ camera.fov = roamSaved.fov; scene.fog.near = roamSaved.near; scene.fog.far = roamSaved.far; roamSaved = null; resize(); }
}
// вернуть малышу обычную позу (после прогулки)
function roamStop(R){
  const s = R.s; s.swimming = false; s.flap = 0; s.wobble = 0;
  s.inner.rotation.set(0, 0, 0); s.inner.position.set(0, 0, 0); s.inner.scale.set(1, 1, 1);
}
