(function () {
  'use strict';

  const styles = Object.freeze([
    Object.freeze({id:'moss', label:'苔绿', name:'暖白苔绿', chrome:'#fbfaf3'}),
    Object.freeze({id:'slate', label:'青灰', name:'青灰清晰', chrome:'#fbfdff'}),
    Object.freeze({id:'sand', label:'暖砂', name:'暖砂墨绿', chrome:'#fffbf2'}),
  ]);
  const storageKey = 'teyvat-stat-lab-appearance';
  const root = document.documentElement;
  const themeColor = document.querySelector('meta[name="theme-color"]');

  function apply(style) {
    root.dataset.appearance = style.id;
    themeColor?.setAttribute('content', style.chrome);
  }

  let saved;
  try { saved = localStorage.getItem(storageKey); } catch {}
  apply(styles.find(style => style.id === saved) || styles[0]);

  window.GAppearance = {
    styles,
    get current() { return root.dataset.appearance; },
    select(id) {
      const style = styles.find(option => option.id === id);
      if (!style) return false;
      apply(style);
      try { localStorage.setItem(storageKey, id); } catch {}
      return true;
    },
  };
})();
