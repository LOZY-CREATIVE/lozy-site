/* Showcases de vídeo (home e Work) — carrossel infinito em todas as telas.

   O vídeo ativo fica no centro; os demais ficam ao lado/ao fundo com leve blur.
   Troca por clique no vizinho, arraste/swipe, setas (desktop), teclado ou swipe
   horizontal do trackpad. Clicar no vídeo ativo toca ali mesmo, com controles
   nativos (play/pause, tempo, volume, tela cheia). Nenhum player extra é aberto. */
(function(){
  var sections=[];

  // x em % da largura do cartão; s=escala; b=blur(px); o=opacidade
  // Desktop: vizinhos bem afastados para o carrossel ocupar a tela toda
  var LOOK_DESKTOP=[
    {x:0,  s:1,   b:0, o:1},
    {x:80, s:.88, b:2, o:1},
    {x:152,s:.78, b:3, o:1},
    {x:214,s:.68, b:4, o:1}
  ];
  // Mobile: vizinhos só "espiam" nas laterais
  var LOOK_MOBILE=[
    {x:0,  s:1,   b:0, o:1},
    {x:66, s:.84, b:2, o:1},
    {x:106,s:.7,  b:3, o:1},
    {x:142,s:.58, b:4, o:1}
  ];
  var mqDesktop=window.matchMedia('(min-width:769px)');

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
    if(s.carousel)layout(s); // vídeo horizontal abre em 16:9 ao ser clicado
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

  /* Cards são 9:16. Se o vídeo ativo for horizontal (poster mais largo que alto),
     o card ativo se abre em proporção 16:9 e os vizinhos abrem espaço para ele. */
  function layout(s,instant){
    var n=s.panels.length;
    var LOOK=mqDesktop.matches?LOOK_DESKTOP:LOOK_MOBILE;
    var maxV=Math.max(1,Math.min(3,Math.floor(n/2)-1));
    var H=s.wrap.clientHeight,W=s.wrap.clientWidth,bw=H*9/16;
    var act=s.panels[s.idx];
    var ar=act&&s.player&&act._ar>1.05?Math.min(act._ar,2.4):0;
    var aw=bw,ah=H;
    if(H&&ar){
      aw=Math.min(H*ar,W*(mqDesktop.matches?0.7:0.94));
      ah=aw/ar;
      if(aw<=bw+1){aw=bw;ah=H;ar=0;}
    }else ar=0;
    var shift=(aw-bw)/2;
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
      var wide=o===0&&!!ar;
      if(H){
        p.style.setProperty('--w',(wide?aw:bw)+'px');
        p.style.setProperty('--h',(wide?ah:H)+'px');
        p.style.setProperty('--t',(wide?(H-ah)/2:0)+'px');
      }
      p.style.setProperty('--shift',(o===0?0:sign*shift)+'px');
      p.style.setProperty('--x',x+'%');
      p.style.setProperty('--s',hidden?LOOK[3].s:L.s);
      p.style.setProperty('--blur',(hidden?LOOK[3].b:L.b)+'px');
      p.style.setProperty('--op',hidden?0:L.o);
      p.style.setProperty('--z',10-Math.min(a,9));
      p.classList.toggle('is-hidden',hidden);
      p.classList.toggle('is-wide',wide);
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

  /* ---------- inicialização ---------- */
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
    s.wrap.classList.add('carousel-mode');
    s.wrap.setAttribute('tabindex','0');
    resetPanels(s);
    // sempre começa no primeiro da ordem definida (painel de vídeos), a cada carregamento ou troca de nicho
    var c=0;
    s.idx=c;
    s.panels[c].classList.add('active');
    layout(s,true);
    applyView(s);
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
    var panels=Array.prototype.slice.call(wrap.querySelectorAll('.showcase-panel'));
    // all: todos os painéis; panels: só os que passam pelo filtro de nicho (aba Work)
    var s={wrap:wrap,all:panels.slice(),panels:panels,idx:-1,inView:false,player:false,carousel:false};
    wrap._s=s;

    // proporção de cada vídeo, pelo poster (extraído do próprio vídeo)
    panels.forEach(function(p){
      var im=p.querySelector('.panel-poster');
      if(!im)return;
      function set(){
        if(!im.naturalWidth||!im.naturalHeight)return;
        p._ar=im.naturalWidth/im.naturalHeight;
        if(s.carousel)layout(s);
      }
      if(im.complete)set();else im.addEventListener('load',set);
    });

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
      var i=s.panels.indexOf(panel);
      if(i<0)return;
      if(i!==s.idx){
        setActive(s,i);
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
      var onActive=e.target.closest('.showcase-panel')===s.panels[s.idx];
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
      var cardW=s.panels[s.idx].offsetWidth||300;
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

  sections.forEach(toCarousel);

  /* ---------- filtro por nicho (aba Work) ----------
     Mostra só os painéis de um nicho (data-cat) e remonta o carrossel com os que sobraram.
     cat='all' mostra todos. Com animate, o bloco some e volta com um deslize curto. */
  function setFilter(wrap,cat,animate){
    var s=wrap&&wrap._s;
    if(!s)return;
    clearTimeout(s._filterTimer);
    function apply(){
      s.all.forEach(function(p){
        var show=cat==='all'||p.getAttribute('data-cat')===cat;
        p.classList.toggle('is-filtered',!show);
        if(!show)leavePanel(p);
      });
      s.panels=s.all.filter(function(p){return !p.classList.contains('is-filtered');});
      if(s.panels.length)toCarousel(s);
      wrap.classList.remove('swapping');
    }
    if(animate){
      wrap.classList.add('swapping');
      s._filterTimer=setTimeout(apply,300);
    }else{
      apply();
    }
  }
  window.LozyShowcase={setFilter:setFilter};

  // trocou de desktop para mobile (ou o inverso): reposiciona sem animar
  function relayout(){sections.forEach(function(s){if(s.carousel)layout(s,true);});}
  var rzTimer;
  window.addEventListener('resize',function(){clearTimeout(rzTimer);rzTimer=setTimeout(relayout,120);});
  if(mqDesktop.addEventListener)mqDesktop.addEventListener('change',relayout);
  else if(mqDesktop.addListener)mqDesktop.addListener(relayout);
})();
