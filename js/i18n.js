/* Язык интерфейса: русский (по умолчанию) или английский. Подключается первым после three.js.
   Как переводим:
   • в JS — L('по-русски', 'in English'); для всего, что зависит от числа, — plural() из data.js;
   • в index.html — атрибуты data-en (текст), data-en-aria (aria-label), data-en-ph (placeholder), data-en-alt (alt);
   • язык живёт в localStorage под ключом sh.lang (это настройка устройства, в код сохранения не входит);
     ссылка вида …/SealHospital/?lang=en включает английский и запоминает его.
   Переключатель (кнопки RU | EN в приветствии и в настройках) перезагружает страницу: так все таблицы
   данных (пациенты, лавка, находки) собираются заново уже на нужном языке. */
const LANG = (() => {
  let l = '';
  try{
    const q = new URLSearchParams(location.search).get('lang');
    if(q === 'ru' || q === 'en') localStorage.setItem('sh.lang', q);
    l = localStorage.getItem('sh.lang') || '';
  }catch(e){}
  return l === 'en' ? 'en' : 'ru';
})();
const L = (ru, en) => LANG === 'en' ? en : ru;
function setLang(l){
  if(l === LANG) return;
  try{ localStorage.setItem('sh.lang', l); }catch(e){}
  try{ const u = new URL(location.href); u.searchParams.delete('lang'); location.replace(u.href); }
  catch(e){ location.reload(); }
}
// имена пациентов: в сохранении и альбоме лежат русские, показываем по-английски (свои имена малыша не трогаем)
const NAME_EN = {'Моти':'Mochi', 'Бублик':'Bagel', 'Зефирка':'Marshmallow', 'Тюпа':'Tyupa', 'Пельмешка':'Dumpling', 'Снежок':'Snowball', 'Ириска':'Toffee', 'Кнопка':'Button', 'Малыш':'Baby'};
const NAME_RU = Object.fromEntries(Object.entries(NAME_EN).map(([ru, en]) => [en, ru]));
const nameL = n => LANG === 'en' ? (NAME_EN[n] || n) : (NAME_RU[n] || n);   // работает в обе стороны: в альбоме могут лежать имена, записанные на другом языке

document.documentElement.lang = LANG;
if(LANG === 'en'){
  document.title = 'Seal Hospital';
  const md = document.querySelector('meta[name="description"]');
  if(md) md.content = 'A cozy little 3D game: heal seal pups on the ice, hug them and raise a pup of your own.';
  const at = document.querySelector('meta[name="apple-mobile-web-app-title"]');
  if(at) at.content = 'Seals';
  const map = {'data-en':'textContent', 'data-en-aria':'aria-label', 'data-en-ph':'placeholder', 'data-en-alt':'alt'};
  for(const [a, target] of Object.entries(map)){
    for(const el of document.querySelectorAll(`[${a}]`)){
      if(target === 'textContent') el.textContent = el.getAttribute(a); else el.setAttribute(target, el.getAttribute(a));
    }
  }
}
// кнопки RU | EN (в приветствии и в настройках)
for(const b of document.querySelectorAll('.lang button')){
  b.classList.toggle('on', b.dataset.lang === LANG);
  b.setAttribute('aria-pressed', b.dataset.lang === LANG ? 'true' : 'false');
  b.addEventListener('click', () => setLang(b.dataset.lang));
}
