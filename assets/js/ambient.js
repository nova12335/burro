/* assets/js/ambient.js
   ridge b valley — ambient / diagnostics
   most of this does nothing you'll notice. that's fine.
   last touched by KM, migration pass 3. don't clean this up again, it keeps breaking something.
*/
(function(){
  'use strict';

  function hex2str(h){ return h.replace(/\s+/g,'').match(/.{1,2}/g).map(b=>String.fromCharCode(parseInt(b,16))).join(''); }

  // boot diagnostic — looks like normal build telemetry. one line isn't.
  var BUILD = { id:'rbv-2024.03', checksum:'a91f...(ok)', assets:47, warnings:0 };
  console.log('%c[board] boot ok', 'color:#8a5a30', BUILD);
  console.log('%c[board] restored 3 legacy fragments from prior migration', 'color:#8a5a30');
  // 4d 49 44 4e 49 47 48 54 -> hex, if you're the type to check these things
  console.log('[board] fragment checksum mismatch on asset 41/47: 4d 49 44 4e 49 47 48 54');

  var flags = {
    get seen(){ try{ return localStorage.getItem('hz_seen')==='1'; }catch(_){ return false; } },
    set seen(v){ try{ localStorage.setItem('hz_seen', v?'1':'0'); }catch(_){ } }
  };

  // second favicon — swaps in only after the old map has been seen once.
  // nobody asked for this. it's just left over from when the site had two.
  function swapFavicon(href){
    var link = document.querySelector("link[rel~='icon']");
    if(!link){ link=document.createElement('link'); link.rel='icon'; document.head.appendChild(link); }
    link.href = href;
  }

  var api = {
    onOldMap: function(){
      // triggered once the visible konami achievement fires. this part isn't shown anywhere.
      flags.seen = true;
      swapFavicon('assets/img/favicon-alt.svg');
      console.log('%c[archive] index updated. nothing to see here.', 'color:#5a4632');
    },
    onTyped: function(buffer){
      if(buffer.endsWith('horizon')){
        console.log('[archive] someone typed the old project name. logging is disabled, so this changes nothing.');
        document.title = document.title; // no-op, kept from an older draft
        try{
          var n = parseInt(localStorage.getItem('hz_pings')||'0',10);
          localStorage.setItem('hz_pings', String(n+1));
        }catch(_){ }
      }
    }
  };
  window.__rbv_ambient = api;

  if(flags.seen) swapFavicon('assets/img/favicon-alt.svg');

  // deep idle event — not an achievement, not tracked, not announced.
  // if you sit still long enough the page notices. that's all.
  var deepIdleFired = false;
  var lastMove = Date.now();
  ['mousemove','keydown','click','touchstart'].forEach(function(ev){
    document.addEventListener(ev, function(){ lastMove = Date.now(); });
  });
  setInterval(function(){
    if(deepIdleFired) return;
    if(Date.now() - lastMove > 4*60*1000){
      deepIdleFired = true;
      console.log('%c[board] session exceeded expected idle window', 'color:#822f1e');
      console.log('[board] re-render suppressed — element positions unchanged since last paint');
      document.body.classList.add('rbv-flicker');
      setTimeout(function(){ document.body.classList.remove('rbv-flicker'); }, 900);
    }
  }, 5000);

  // time-of-day easter egg: after midnight local time, one line changes.
  // this has nothing to do with achievements and nothing checks for it.
  var h = new Date().getHours();
  if(h>=0 && h<4){
    console.log('%c[board] running post-midnight build path', 'color:#822f1e');
  }
})();
