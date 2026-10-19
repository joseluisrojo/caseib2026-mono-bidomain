/* UI for saved fields and an independent closed-form teaching view. */
(function () {
  "use strict";
  var D=window.CASEIB_STUDY, M=window.CASEIB_MODEL, B=window.CASEIB_MODAL_BASIS;
  var replay=window.CASEIB_REPLAY.create(B),studyTimes=[];
  var $=function(id){return document.getElementById(id);};
  var SEQ=[[68,1,84],[59,82,139],[33,145,140],[94,201,98],[253,231,37]];
  var DIV=[[40,87,147],[161,194,220],[255,255,255],[228,160,150],[159,40,57]];
  var playing=null,active="study",mapCache={},surface=window.CASEIB_SURFACE;
  function fmt(x,n){return Math.abs(x)<0.0001 && x!==0 ? x.toExponential(2):Number(x.toPrecision(n||3)).toString();}
  function percent(x){return x===null ? "Undefined":(x<1e-12 ? (100*x).toExponential(2): (100*x).toFixed(3))+"%";}
  function rgb(v,lo,hi,pal) {
    var t=Math.max(0,Math.min(1,(v-lo)/(hi-lo)))*(pal.length-1);
    var a=Math.min(pal.length-2,Math.floor(t)),f=t-a;
    return pal[a].map(function(x,j){return Math.round(x+(pal[a+1][j]-x)*f);});
  }
  function map(id,a,nx,nz,lo,hi,pal,label,axis) {
    var c=$(id);
    c.setAttribute("aria-label",label);
    if($("field-view").value==="oblique"){
      surface.render(c,a,nx,nz,lo,hi,pal,axis);
      return;
    }
    c.width=nx;c.height=nz;
    var ctx=c.getContext("2d"),im=ctx.createImageData(nx,nz);
    for(var z=0;z<nz;z++)for(var x=0;x<nx;x++){
      var color=rgb(a[z*nx+x],lo,hi,pal),j=((nz-1-z)*nx+x)*4;
      im.data[j]=color[0];im.data[j+1]=color[1];im.data[j+2]=color[2];im.data[j+3]=255;
    }
    ctx.putImageData(im,0,0);c.setAttribute("aria-label",label);
  }
  // Rounded fixed limits contain all saved fields and the entire modal replay.
  // The negative voltage undershoot is retained rather than clipped at zero.
  var bounds={vm:{lo:-.001,hi:.8,delta:.0045},ue:{lo:-.15,hi:.15,delta:.0007}};
  function drawMaps(prefix,a,b,d,nx,nz,bounds,field,label) {
    mapCache[prefix]=Array.prototype.slice.call(arguments);
    var pal=field==="ue"?DIV:SEQ;
    var teaching=prefix==="mode",axis=teaching?{unit:"mV"}:{unit:"% peak",factor:100,ticks:field==="vm"?[0,.2,.4,.6,.8]:[-.15,0,.15]};
    var diffAxis={unit:teaching?"mV":"norm.",ticks:[-bounds.delta,0,bounds.delta]};
    map(prefix+"-m",a,nx,nz,bounds.lo,bounds.hi,pal,"Monodomain "+label,axis);
    map(prefix+"-b",b,nx,nz,bounds.lo,bounds.hi,pal,"Bidomain "+label,axis);
    map(prefix+"-d",d,nx,nz,-bounds.delta,bounds.delta,DIV,"Signed monodomain minus bidomain "+label,diffAxis);
    $(prefix+"-abs-scale").textContent=teaching?fmt(bounds.lo)+" to "+fmt(bounds.hi)+" mV":
      (field==="vm"?"−0.1 to 80":"−15 to +15")+" % of initial membrane-voltage peak";
    $(prefix+"-diff-scale").textContent="−"+fmt(bounds.delta)+" to +"+fmt(bounds.delta)+(teaching?" mV":" normalized");
    $(prefix+"-abs-gradient").className="gradient "+(field==="ue"?"diverging":"sequential");
  }
  function chart(id,series,currentTime,ylabel,yCeiling) {
    var small=$(id).clientWidth<500;
    var w=small?360:820,h=small?265:290,l=small?58:76,r=small?12:20,top=15,bottom=55;
    var tickFont=small?13:16,titleFont=small?14:17;
    var plotW=w-l-r,plotH=h-top-bottom,max=0;
    series.forEach(function(s){s.values.forEach(function(v){max=Math.max(max,v);});});
    max=yCeiling || (max>0 ? Math.ceil(max*1.1/2)*2:1);
    function point(t,v){return (l+plotW*t/6).toFixed(2)+","+(top+plotH*(1-v/max)).toFixed(2);}
    var svg='<svg viewBox="0 0 '+w+" "+h+'" xmlns="http://www.w3.org/2000/svg">';
    for(var i=0;i<=4;i++){
      var val=max*i/4,y=top+plotH*(1-i/4);
      svg+='<line x1="'+l+'" y1="'+y+'" x2="'+(w-r)+'" y2="'+y+'" stroke="#e0e6ea"/>';
      svg+='<text x="'+(l-12)+'" y="'+(y+5)+'" font-size="'+tickFont+'" text-anchor="end" fill="#596b78">'+fmt(val)+'</text>';
    }
    [0,2,4,6].forEach(function(t){
      svg+='<text x="'+(l+plotW*t/6)+'" y="'+(h-29)+'" font-size="'+tickFont+'" text-anchor="middle" fill="#596b78">'+t+'</text>';
    });
    svg+='<text x="'+(l+plotW/2)+'" y="'+(h-4)+'" font-size="'+titleFont+'" text-anchor="middle" fill="#596b78">Time (ms)</text>';
    svg+='<text transform="translate(19 '+(top+plotH/2)+') rotate(-90)" font-size="'+titleFont+'" text-anchor="middle" fill="#596b78">'+ylabel+'</text>';
    var tx=l+plotW*currentTime/6;
    svg+='<line x1="'+tx+'" x2="'+tx+'" y1="'+top+'" y2="'+(top+plotH)+'" stroke="#b7bfc6" stroke-dasharray="3 5"/>';
    series.forEach(function(s){
      svg+='<polyline fill="none" stroke="'+s.color+'" stroke-width="3" '+(s.dash?'stroke-dasharray="9 6" ':"")+'points="'+s.values.map(function(v,k){return point(s.times[k],v);}).join(" ")+'"/>';
      if(s.points)s.values.forEach(function(v,k){
        var xy=point(s.times[k],v).split(",");
        svg+='<circle cx="'+xy[0]+'" cy="'+xy[1]+'" r="4" stroke="'+s.color+'" stroke-width="2" fill="white"/>';
      });
    });
    $(id).innerHTML=svg+"</svg>";
  }
  function setStudySampling(){
    var current=studyTimes.length?studyTimes[+$("study-time").value]:2;
    var dense=$("study-sampling").value==="replay";
    studyTimes=dense?Array.from({length:116},function(_,i){return Number((.25+i*.05).toFixed(2));}):D.times_ms.slice();
    var nearest=0;
    studyTimes.forEach(function(t,i){if(Math.abs(t-current)<Math.abs(studyTimes[nearest]-current))nearest=i;});
    $("study-time").max=studyTimes.length-1;$("study-time").value=nearest;
    var ticks=dense?[.25,2,4,6]:D.times_ms;
    $("study-ticks").innerHTML=ticks.map(function(t,i){
      var left=dense?(t-.25)/5.75*100:i/(ticks.length-1)*100;
      var shift=i===0?"0":i===ticks.length-1?"-100%":"-50%";
      return '<span style="left:'+left+'%;transform:translateX('+shift+')">'+t+'</span>';
    }).join("");
    $("study-status").textContent=dense?"Modal replay":"Stored results";
    $("study-time-note").textContent=dense?
      "The saved modal solution is evaluated every 0.05 ms, without interpolating snapshots. Playback is slowed for viewing.":
      "These are the six original stored snapshots. Playback is slowed for viewing.";
  }
  function updateStudy() {
    var family=$("study-family").value,field=$("study-field").value,k=+$("study-time").value;
    var dense=$("study-sampling").value==="replay",time=studyTimes[k],saved=D.cases[family];
    var evaluated=dense?replay.evaluate(family,time):null;
    var m=dense?evaluated[field+"M"]:saved[field+"M"][k];
    var b=dense?evaluated[field+"B"]:saved[field+"B"][k];
    var diff=m.map(function(v,j){return v-b[j];});
    $("study-time-label").textContent=time+" ms";
    drawMaps("study",m,b,diff,D.x_mm.length,D.z_mm.length,bounds[field],field,
      (field==="vm"?"membrane voltage":"recovered extracellular potential")+", "+family+" conductivity ratios, "+(dense?"modal time ":"saved time ")+time+" ms");
    var key=field==="vm"?"vm":"phie",met=D.metrics[family],md=met["modal_"+key+"_mono_vs_bi_relL2"];
    $("study-contrast").textContent=percent(dense?evaluated.metrics[field]:md[k]);
    $("study-metric-detail").textContent=(dense?"Modal replay":"Stored modal")+" · "+time+" ms · "+(family==="equal"?"numerical round-off":"relative to bidomain");
    $("study-curve-note").textContent="Solid purple · modal / dashed grey · finite volume. Points are original stored samples."+
      (dense?" The cursor marks the evaluated modal time.":"")+
      (family==="equal"?" Equal-ratio residuals are numerical round-off. The vertical scale is held fixed.":"");
    var cond=D.conductivities_Spm[family];
    $("study-conductivity").textContent="Intracellular "+cond.si.join(" / ")+". Extracellular "+cond.se.join(" / ")+".";
    chart("study-chart",[
      {times:D.times_ms,values:md.map(function(v){return 100*v;}),color:"#6d4a91",points:true},
      {times:D.times_ms,values:met["fd_"+key+"_mono_vs_bi_relL2"].map(function(v){return 100*v;}),color:"#657580",dash:true,points:true}
    ],time,"Paired difference (%)",1.6);
  }
  function updateMode() {
    var pq=$("mode-pattern").value.split(",").map(Number);
    var family=$("mode-family").value,field=$("mode-field").value,t=+$("mode-time").value;
    var a=M.fields(family,pq[0],pq[1],t,field,121,41),s=a.state;
    var limits=field==="vm"?{lo:-5,hi:15,delta:0.2}:{lo:-2.5,hi:2.5,delta:0.04};
    $("mode-time-label").textContent=Number(t.toFixed(2))+" ms";
    drawMaps("mode",a.m,a.b,a.d,121,41,limits,field,"teaching example, mode "+pq.join(",")+", "+family+" ratios, "+t+" ms");
    $("mode-contrast").textContent=percent(field==="vm"?s.vmContrast:s.ueContrast);
    var msg=family==="equal" ? "Equal anisotropy ratios give identical decay for every spatial pattern in this slab."
      :(!pq[0]||!pq[1]) ? "This pattern varies in one direction. The models coincide even with unequal anisotropy ratios."
      :"This pattern varies along fibre and thickness. With unequal ratios, its bidomain amplitude decays faster.";
    $("mode-explanation").textContent=msg;
    $("mode-values").innerHTML=
      "<dt>Voltage-pattern amplitude · M</dt><dd>"+s.aM.toFixed(6)+" mV</dd>"+
      "<dt>Voltage-pattern amplitude · B</dt><dd>"+s.aB.toFixed(6)+" mV</dd>"+
      "<dt>Mean membrane voltage · both</dt><dd>"+s.mean.toFixed(6)+" mV</dd>"+
      "<dt>Decay rates · M / B</dt><dd>"+(1000*s.sy.lambdaM).toFixed(3)+" / "+(1000*s.sy.lambdaB).toFixed(3)+" s⁻¹</dd>"+
      "<dt>Recovery multiplier · both</dt><dd>−"+s.sy.gamma.toFixed(6)+"</dd>";
    var times=[],vM=[],vB=[];
    for(var i=0;i<=120;i++){
      var time=i/20,z=M.state(family,pq[0],pq[1],time);
      times.push(time);vM.push(z.aM);vB.push(z.aB);
    }
    chart("mode-chart",[{times:times,values:vM,color:"#6d4a91"},
      {times:times,values:vB,color:"#657580",dash:true}],t,"Amplitude (mV)");
  }
  function stop() {
    if(playing){clearInterval(playing);playing=null;}
    $("study-play").textContent=$("study-sampling").value==="replay"?"Play modal solution":"Play saved frames";$("study-play").setAttribute("aria-pressed","false");
    $("mode-play").textContent="Play decay";$("mode-play").setAttribute("aria-pressed","false");
  }
  var cameraFrame=null,coarsePointer=window.matchMedia("(pointer: coarse)").matches;
  var dragEnabled=!coarsePointer,pointers=new Map(),gestureBase=null;
  function syncCamera(){
    var c=surface.getCamera();
    ["yaw","pitch","roll"].forEach(function(k){$("camera-"+k).value=Math.round(c[k]);$("camera-"+k+"-value").textContent=Math.round(c[k])+"°";});
  }
  function redrawCamera(){
    syncCamera();if(cameraFrame!==null)return;
    cameraFrame=requestAnimationFrame(function(){
      cameraFrame=null;var args=mapCache[active==="study"?"study":"mode"];
      if(args)drawMaps.apply(null,args);
    });
  }
  ["yaw","pitch","roll"].forEach(function(k){
    $("camera-"+k).addEventListener("input",function(){var next={};next[k]=+this.value;surface.setCamera(next);redrawCamera();});
  });
  function setDragEnabled(enabled){
    dragEnabled=enabled;document.body.dataset.cameraDrag=String(dragEnabled);
    document.querySelectorAll('[data-camera-action="toggle"]').forEach(function(button){
      button.setAttribute("aria-pressed",String(dragEnabled));button.textContent=dragEnabled?"Rotation on":"Enable rotation";
      button.title=dragEnabled?"Turn rotation off to scroll over the plots":"Enable drag rotation";
    });
    document.querySelectorAll('[data-camera-status]').forEach(function(label){
      label.textContent=dragEnabled?(coarsePointer?"Drag to turn. Twist two fingers to roll.":"Drag any surface. Shift-drag to roll."):"Scroll mode. Enable rotation to turn the surfaces.";
    });
    pointers.clear();gestureBase=null;
  }
  document.querySelectorAll('[data-camera-action="reset"]').forEach(function(button){
    button.addEventListener("click",function(){surface.resetCamera();redrawCamera();});
  });
  document.querySelectorAll('[data-camera-action="toggle"]').forEach(function(button){
    button.addEventListener("click",function(){setDragEnabled(!dragEnabled);});
  });
  function gesture(){
    var a=Array.from(pointers.values());if(!a.length)return null;
    return {x:a.reduce(function(s,p){return s+p.x;},0)/a.length,y:a.reduce(function(s,p){return s+p.y;},0)/a.length,
      angle:a.length>1?Math.atan2(a[1].y-a[0].y,a[1].x-a[0].x):0,camera:surface.getCamera(),count:a.length};
  }
  document.querySelectorAll(".map-axis canvas").forEach(function(canvas){
    canvas.addEventListener("pointerdown",function(e){
      if(!dragEnabled||$("field-view").value!=="oblique"||e.button>0)return;
      e.preventDefault();pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});gestureBase=gesture();canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener("pointermove",function(e){
      if(!pointers.has(e.pointerId)||!gestureBase)return;
      e.preventDefault();pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});var now=gesture(),base=gestureBase;
      var dx=now.x-base.x,dy=now.y-base.y,c=base.camera;
      if(now.count===1&&e.shiftKey)surface.setCamera({roll:c.roll+dx*.6});
      else surface.setCamera({yaw:c.yaw+dx*.5,pitch:c.pitch-dy*.5,
        roll:c.roll+(now.count>1?(now.angle-base.angle)*180/Math.PI:0)});
      redrawCamera();
    });
    function release(e){if(pointers.delete(e.pointerId))gestureBase=gesture();}
    canvas.addEventListener("pointerup",release);canvas.addEventListener("pointercancel",release);canvas.addEventListener("lostpointercapture",release);
  });
  ["study","explore"].forEach(function(view){
    $(view+"-tab").addEventListener("click",function(){
      stop();active=view;
      ["study","explore"].forEach(function(v){
        $(v).hidden=v!==view;
        $(v+"-tab").classList.toggle("active",v===view);
        $(v+"-tab").setAttribute("aria-pressed",String(v===view));
      });
      if(view==="explore") updateMode();else updateStudy();
    });
  });
  ["study-family","study-field","study-time"].forEach(function(id){
    $(id).addEventListener(id==="study-time"?"input":"change",function(){stop();updateStudy();});
  });
  ["mode-family","mode-field","mode-pattern","mode-time"].forEach(function(id){
    $(id).addEventListener(id==="mode-time"?"input":"change",function(){stop();updateMode();});
  });
  $("study-sampling").addEventListener("change",function(){stop();setStudySampling();updateStudy();stop();});
  $("field-view").addEventListener("change",function(){
    document.body.dataset.fieldView=this.value;
    $("camera-controls").hidden=this.value!=="oblique";pointers.clear();gestureBase=null;
    $("view-description").textContent=this.value==="oblique"?
      "Height and colour represent potential. All three surfaces share the camera. The reference grid is at potential zero.":
      "Colour represents potential on the spatial x-z plane. M/B share the scale.";
    if(active==="study")updateStudy();else updateMode();
  });
  $("study-play").addEventListener("click",function(){
    if(playing){stop();return;}
    this.textContent="Pause";this.setAttribute("aria-pressed","true");
    var began=performance.now(),initial=+$("study-time").value,last=initial;
    var dense=$("study-sampling").value==="replay";
    playing=setInterval(function(){
      var elapsed=performance.now()-began;
      var k=dense?(initial+Math.floor(elapsed/10000*116))%116:(initial+Math.floor(elapsed/1100))%6;
      if(k!==last){$("study-time").value=k;updateStudy();last=k;}
    },40);
  });
  $("mode-play").addEventListener("click",function(){
    if(playing){stop();return;}
    if(+$("mode-time").value>=6)$("mode-time").value=0;
    this.textContent="Pause";this.setAttribute("aria-pressed","true");
    var began=performance.now(),initial=+$("mode-time").value;
    playing=setInterval(function(){
      var t=Math.min(6,Math.round((initial+(performance.now()-began)/10000*6)*100)/100);
      $("mode-time").value=t;updateMode();
      if(t>=6)stop();
    },40);
  });
  document.addEventListener("visibilitychange",function(){if(document.hidden)stop();});
  var resizeTimer;
  window.addEventListener("resize",function(){
    clearTimeout(resizeTimer);
    resizeTimer=setTimeout(function(){if(active==="study")updateStudy();else updateMode();},120);
  });
  setDragEnabled(dragEnabled);syncCamera();setStudySampling();updateStudy();updateMode();stop();
})();
