/* Showcase de vídeos no mobile (≤768px): o bloco fica "pinado" na tela e o
   scroll decide qual painel está expandido. Descer revela o próximo vídeo
   (o anterior minimiza); subir traz o anterior de volta.
   No desktop nada muda (hover continua controlado por expandPanel). */
(function(){
  var mq=window.matchMedia('(max-width:768px)');
  var sections=[];
  var enabled=false;
  var ticking=false;

  function wrapTracks(){
    document.querySelectorAll('.showcase-wrap').forEach(function(wrap){
      var track=wrap.parentElement;
      if(!track.classList.contains('showcase-track')){
        track=document.createElement('div');
        track.className='showcase-track';
        wrap.parentNode.insertBefore(track,wrap);
        track.appendChild(wrap);
      }
      var panels=Array.prototype.slice.call(wrap.querySelectorAll('.showcase-panel'));
      track.style.setProperty('--sc-n',panels.length);
      var s={wrap:wrap,track:track,panels:panels,idx:-1,inView:false};
      s.onDown=function(e){
        var panel=e.target.closest('.showcase-panel');
        if(panel)panel._wasActive=panel.classList.contains('active');
      };
      s.onClick=function(e){
        var panel=e.target.closest('.showcase-panel');
        if(!panel)return;
        var wasActive=panel._wasActive;
        panel._wasActive=undefined;
        if(enabled){
          if(panel.classList.contains('active'))return;
          // toque num painel minimizado: leva o scroll até ele em vez de abrir o projeto
          e.preventDefault();
          e.stopPropagation();
          scrollToIndex(s,panels.indexOf(panel));
        }else if(wasActive===false){
          // clique/toque num painel ao lado: só troca o painel aberto (não abre o projeto)
          e.preventDefault();
          e.stopPropagation();
          if(window.expandPanel)window.expandPanel(panel);
        }
      };
      wrap.addEventListener('pointerdown',s.onDown,true);
      wrap.addEventListener('click',s.onClick,true);
      sections.push(s);
    });
  }

  function geometry(s){
    var r=s.track.getBoundingClientRect();
    var range=s.track.offsetHeight-s.wrap.offsetHeight;
    var top=parseFloat(getComputedStyle(s.wrap).top)||0;
    return {r:r,range:range,top:top};
  }

  function scrollToIndex(s,i){
    var g=geometry(s);
    if(g.range<=0)return;
    var p=(i+0.5)/s.panels.length;
    var y=window.scrollY+g.r.top-(g.top-p*g.range);
    window.scrollTo({top:y,behavior:'smooth'});
  }

  function pauseVideo(panel){
    clearTimeout(panel._playTimer);
    var v=panel.querySelector('.panel-video');
    if(v)v.pause();
  }

  function playVideo(panel){
    clearTimeout(panel._playTimer);
    panel._playTimer=setTimeout(function(){
      var v=panel.querySelector('.panel-video');
      if(v){
        if(!v.src)v.src=v.dataset.src;
        var pr=v.play();
        if(pr&&pr.catch)pr.catch(function(){});
      }
      panel.classList.add('playing');
    },180);
  }

  function setActive(s,idx){
    if(idx===s.idx)return;
    s.idx=idx;
    s.panels.forEach(function(p,i){
      if(i===idx)return;
      p.classList.remove('active','playing');
      pauseVideo(p);
    });
    var cur=s.panels[idx];
    cur.classList.add('active');
    if(s.inView)playVideo(cur);
  }

  function setInView(s,v){
    if(v===s.inView)return;
    s.inView=v;
    var cur=s.panels[s.idx];
    if(!cur)return;
    if(v)playVideo(cur);else pauseVideo(cur);
  }

  function update(){
    ticking=false;
    if(!enabled)return;
    var vh=window.innerHeight;
    sections.forEach(function(s){
      var g=geometry(s);
      var visible=g.r.bottom>0&&g.r.top<vh;
      var p=g.range>0?Math.min(1,Math.max(0,(g.top-g.r.top)/g.range)):0;
      var idx=Math.min(s.panels.length-1,Math.floor(p*s.panels.length));
      setInView(s,visible);
      setActive(s,idx);
    });
  }

  function requestUpdate(){
    if(ticking)return;
    ticking=true;
    requestAnimationFrame(update);
  }

  function enable(){
    if(enabled)return;
    enabled=true;
    sections.forEach(function(s){
      s.wrap.classList.add('scroll-mode');
      s.idx=-1;
      s.inView=false;
      s.panels.forEach(function(p){
        // limpa tamanhos inline do modo desktop
        p.style.flex='';
        p.style.minHeight='';
        p.classList.remove('active','playing');
        pauseVideo(p);
      });
    });
    update();
  }

  // Desktop/tablet: o painel aberto por padrão é o central de cada carrossel
  function toDesktop(){
    enabled=false;
    sections.forEach(function(s){
      s.wrap.classList.remove('scroll-mode');
      var c=s.panels[Math.floor(s.panels.length/2)];
      s.panels.forEach(function(p){
        if(p===c)return;
        p.classList.remove('active','playing');
        p.style.flex='';
        p.style.minHeight='';
        pauseVideo(p);
      });
      c.classList.add('active');
      if(window.applyPanelSize)window.applyPanelSize(c);
      s.idx=-1;
      s.inView=false;
    });
  }

  function sync(){
    if(mq.matches)enable();else toDesktop();
  }

  wrapTracks();
  window.addEventListener('scroll',requestUpdate,{passive:true});
  window.addEventListener('resize',requestUpdate);
  if(mq.addEventListener)mq.addEventListener('change',sync);
  else if(mq.addListener)mq.addListener(sync);
  sync();
})();
