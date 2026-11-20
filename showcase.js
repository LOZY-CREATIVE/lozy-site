/* Showcases de vídeo (home e Work).

   Desktop (>768px) — carrossel infinito: o vídeo ativo fica no centro; os demais
   ficam ao lado/ao fundo com leve blur. Troca por clique no vizinho, arraste,
   setas, teclado ou swipe horizontal do trackpad.

   Mobile (≤768px) — o bloco fica "pinado" e o scroll alterna o painel expandido
   (descer revela o próximo, subir traz o anterior).

   Nos dois: clicar no vídeo ativo toca o vídeo ali mesmo, com controles nativos
   (play/pause, tempo, volume, tela cheia). Nenhum player extra é aberto. */
(function(){
  var mqMobile=window.matchMedia('(max-width:768px)');
  var sections=[];
  var ticking=false;

  // x em % da largura do cartão; s=escala; b=blur(px); o=opacidade
  var LOOK=[
    {x:0,  s:1,   b:0,   o:1},
    {x:66, s:.84, b:2,   o:.9},
    {x:106,s:.7,  b:3.5, o:.7},
    {x:142,s:.58, b:5,   o:.45}
  ];

  /* ---------- vídeo ---------- */
  function vid(p){return p.querySelector('.panel-video');}

  function stopPanel(p){
    clearTimeout(p._playTimer);
    var v=vid(p);
    if(v)v.pause();
  }

  function playPreview(p){
    clearTimeout(p._playTimer);
    p._playTimer=setTimeout(function(){
      var v=vid(p);
      if(!v)return;
      if(!v.getAttribute('src'))v.src=v.dataset.src;
      v.loop=true;v.muted=true;v.controls=false;
      var pr=v.play();
      if(pr&&pr.catch)pr.catch(function(){});
      p.classList.add('playing');
    },220);
  }

  function leavePanel(p){
    stopPanel(p);
    p.classList.remove('active','playing','in-player');
    var v=vid(p);
    if(v){
      v.controls=false;v.loop=true;v.muted=true;
      try{v.currentTime=0;}catch(e){}
    }
  }

  function enterPlayer(s){
    var p=s.panels[s.idx];
    var v=p&&vid(p);
    if(!v)return;
    clearTimeout(p._playTimer);
    if(!v.getAttribute('src'))v.src=v.dataset.src;
    s.player=true;
    p.classList.add('in-player','playing');
    v.loop=false;v.controls=true;v.muted=false;
    try{v.currentTime=0;}catch(e){}
    var pr=v.play();
    if(pr&&pr.catch)pr.catch(function(){
      // o navegador bloqueou o áudio: toca mudo, o usuário liga no controle
      v.muted=true;
      var p2=v.play();
      if(p2&&p2.catch)p2.catch(function(){});
    });
  }

  function applyView(s){
    var p=s.panels[s.idx];
    if(!p)return;
    if(s.inView){
      if(!s.player)playPreview(p);
    }else{
      stopPanel(p);
    }
  }

  /* ---------- seleção ---------- */
  function setActive(s,idx){
    if(idx===s.idx)return;
    var prev=s.panels[s.idx];
    if(prev)leavePanel(prev);
    s.player=false;
    s.idx=idx;
    var cur=s.panels[idx];
    cur.classList.add('active');
    if(s.carousel)layout(s);
    if(s.inView)playPreview(cur);
  }

  function offsetOf(i,idx,n){
    var d=i-idx,h=n/2;
    if(d>h)d-=n;else if(d<-h)d+=n;
    return d;
  }

  function layout(s,instant){
    var n=s.panels.length;
    var maxV=Math.max(1,Math.min(3,Math.floor(n/2)-1));
    if(instant)s.wrap.classList.add('no-anim');
    s.panels.forEach(function(p,i){
      var o=offsetOf(i,s.idx,n),a=Math.abs(o),sign=o<0?-1:1;
      var L=LOOK[Math.min(a,3)];
      var hidden=a>maxV;
      var x=sign*(a>3?LOOK[3].x+(a-3)*30:L.x);
      var jump=p._o!==undefined&&Math.abs(o-p._o)>1.5;
      p._o=o;
      if(jump&&!instant){
        // volta ao outro lado da fila: reposiciona sem deslizar pelo palco, só o fade anima
        p.style.transition='opacity .6s ease,filter .6s ease';
        setTimeout(function(){p.style.transition='';},80);
      }
      p.style.setProperty('--x',x+'%');
      p.style.setProperty('--s',hidden?LOOK[3].s:L.s);
      p.style.setProperty('--blur',(hidden?LOOK[3].b:L.b)+'px');
      p.style.setProperty('--op',hidden?0:L.o);
      p.style.setProperty('--z',10-Math.min(a,9));
      p.classList.toggle('is-hidden',hidden);
    });
    if(instant){
      void s.wrap.offsetWidth;
      s.wrap.classList.remove('no-anim');
    }
  }

  function go(s,dir){
    var n=s.panels.length;
    setActive(s,(s.idx+dir+n)%n);
  }

  /* ---------- scroll (mobile) ---------- */
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
    window.scrollTo({top:window.scrollY+g.r.top-(g.top-p*g.range),behavior:'smooth'});
  }

  function update(){
    ticking=false;
    sections.forEach(function(s){
      if(s.carousel)return;
      var g=geometry(s);
      var p=g.range>0?Math.min(1,Math.max(0,(g.top-g.r.top)/g.range)):0;
      setActive(s,Math.min(s.panels.length-1,Math.floor(p*s.panels.length)));
    });
  }

  function requestUpdate(){
    if(ticking)return;
    ticking=true;
    requestAnimationFrame(update);
  }

  /* ---------- modos ---------- */
  function resetPanels(s){
    s.panels.forEach(function(p){
      leavePanel(p);
      p.removeAttribute('style');
      p._o=undefined;
    });
    s.idx=-1;
    s.player=false;
  }

  function toCarousel(s){
    s.carousel=true;
    s.wrap.classList.remove('scroll-mode');
    s.wrap.classList.add('carousel-mode');
    s.wrap.setAttribute('tabindex','0');
    resetPanels(s);
    var c=Math.floor(s.panels.length/2);
    s.idx=c;
    s.panels[c].classList.add('active');
    layout(s,true);
    applyView(s);
  }

  function toScroll(s){
    s.carousel=false;
    s.wrap.classList.remove('carousel-mode','dragging');
    s.wrap.classList.add('scroll-mode');
    s.wrap.removeAttribute('tabindex');
    s.wrap.style.removeProperty('--drag');
    resetPanels(s);
  }

  function sync(){
    sections.forEach(mqMobile.matches?toScroll:toCarousel);
    if(mqMobile.matches)update();
  }

  /* ---------- montagem ---------- */
  var ARROW='<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="%P"/></svg>';

  function makeArrow(cls,label,path){
    var b=document.createElement('button');
    b.type='button';
    b.className='sc-arrow '+cls;
    b.setAttribute('aria-label',label);
    b.innerHTML=ARROW.replace('%P',path);
    return b;
  }

  function build(wrap){
    var track=wrap.parentElement;
    if(!track.classList.contains('showcase-track')){
      track=document.createElement('div');
      track.className='showcase-track';
      wrap.parentNode.insertBefore(track,wrap);
      track.appendChild(wrap);
    }
    var panels=Array.prototype.slice.call(wrap.querySelectorAll('.showcase-panel'));
    track.style.setProperty('--sc-n',panels.length);
    var s={wrap:wrap,track:track,panels:panels,idx:-1,inView:false,player:false,carousel:false};
    wrap._s=s;

    var prev=makeArrow('sc-prev','Vídeo anterior','M10 3L5 8l5 5');
    var next=makeArrow('sc-next','Próximo vídeo','M6 3l5 5-5 5');
    prev.addEventListener('click',function(e){e.stopPropagation();go(s,-1);});
    next.addEventListener('click',function(e){e.stopPropagation();go(s,1);});
    wrap.appendChild(prev);
    wrap.appendChild(next);

    /* clique */
    var suppress=false;
    wrap.addEventListener('click',function(e){
      if(suppress){suppress=false;e.preventDefault();e.stopPropagation();return;}
      var panel=e.target.closest('.showcase-panel');
      if(!panel||e.target.closest('.panel-project'))return;
      var i=panels.indexOf(panel);
      if(i!==s.idx){
        if(s.carousel)setActive(s,i);else scrollToIndex(s,i);
      }else if(!s.player){
        enterPlayer(s);
      }
      // com o player ativo, o clique é do próprio <video> (controles nativos)
    },true);

    /* arrastar (desktop) */
    var drag=null;
    wrap.addEventListener('pointerdown',function(e){
      if(!s.carousel||(e.pointerType==='mouse'&&e.button!==0))return;
      if(e.target.closest('.sc-arrow,.panel-project'))return;
      var onActive=e.target.closest('.showcase-panel')===panels[s.idx];
      if(s.player&&onActive)return; // não interfere nos controles do vídeo
      drag={x:e.clientX,id:e.pointerId,moved:false};
    });
    wrap.addEventListener('pointermove',function(e){
      if(!drag||e.pointerId!==drag.id)return;
      var dx=e.clientX-drag.x;
      if(!drag.moved&&Math.abs(dx)>6){
        drag.moved=true;
        wrap.classList.add('dragging');
        try{wrap.setPointerCapture(e.pointerId);}catch(err){}
      }
      if(drag.moved)wrap.style.setProperty('--drag',dx+'px');
    });
    function endDrag(e){
      if(!drag||e.pointerId!==drag.id)return;
      var d=drag;drag=null;
      if(!d.moved)return;
      var dx=e.clientX-d.x;
      var cardW=panels[s.idx].offsetWidth||300;
      wrap.classList.remove('dragging');
      wrap.style.setProperty('--drag','0px');
      if(Math.abs(dx)>cardW*0.15)go(s,dx<0?1:-1);
      suppress=true;
      setTimeout(function(){suppress=false;},120);
    }
    wrap.addEventListener('pointerup',endDrag);
    wrap.addEventListener('pointercancel',endDrag);
    wrap.addEventListener('dragstart',function(e){e.preventDefault();});

    /* swipe horizontal do trackpad */
    var wheelLock=0,wheelAcc=0;
    wrap.addEventListener('wheel',function(e){
      if(!s.carousel||Math.abs(e.deltaX)<=Math.abs(e.deltaY))return;
      e.preventDefault();
      var now=Date.now();
      if(now<wheelLock)return;
      wheelAcc+=e.deltaX;
      if(Math.abs(wheelAcc)>40){
        go(s,wheelAcc>0?1:-1);
        wheelAcc=0;
        wheelLock=now+650;
      }
    },{passive:false});

    /* teclado */
    wrap.addEventListener('keydown',function(e){
      if(!s.carousel||e.target.tagName==='VIDEO')return;
      if(e.key==='ArrowRight'){e.preventDefault();go(s,1);}
      else if(e.key==='ArrowLeft'){e.preventDefault();go(s,-1);}
    });

    sections.push(s);
  }

  document.querySelectorAll('.showcase-wrap').forEach(build);

  // só toca vídeo enquanto o bloco está na tela
  var io=new IntersectionObserver(function(entries){
    entries.forEach(function(en){
      var s=en.target._s;
      s.inView=en.isIntersecting;
      applyView(s);
    });
  },{threshold:0.25});
  sections.forEach(function(s){io.observe(s.wrap);});

  window.addEventListener('scroll',requestUpdate,{passive:true});
  window.addEventListener('resize',requestUpdate);
  if(mqMobile.addEventListener)mqMobile.addEventListener('change',sync);
  else if(mqMobile.addListener)mqMobile.addListener(sync);
  sync();
})();
