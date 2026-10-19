/* UI for saved fields and an independent closed-form teaching view. */
(function () {
  "use strict";
  var D=window.CASEIB_STUDY, M=window.CASEIB_MODEL, B=window.CASEIB_MODAL_BASIS;
  var replay=window.CASEIB_REPLAY.create(B),studyTimes=[];
  var $=function(id){return document.getElementById(id);};
  var SEQ=[[68,1,84],[59,82,139],[33,145,140],[94,201,98],[253,231,37]];
  var DIV=[[40,87,147],[161,194,220],[255,255,255],[228,160,150],[159,40,57]];
  var playing=null,active="study";
  function fmt(x,n){return Math.abs(x)<0.0001 && x!==0 ? x.toExponential(2):Number(x.toPrecision(n||3)).toString();}
  function percent(x){return x===null ? "Undefined":(x<1e-12 ? (100*x).toExponential(2): (100*x).toFixed(3))+"%";}
  function rgb(v,lo,hi,pal) {
    var t=Math.max(0,Math.min(1,(v-lo)/(hi-lo)))*(pal.length-1);
    var a=Math.min(pal.length-2,Math.floor(t)),f=t-a;
    return pal[a].map(function(x,j){return Math.round(x+(pal[a+1][j]-x)*f);});
  }
  function map(id,a,nx,nz,lo,hi,pal,label) {
    var c=$(id);
    c.setAttribute("aria-label",label);
    if($("field-view").value==="oblique"){
      window.CASEIB_SURFACE.render(c,a,nx,nz,lo,hi,pal,id.indexOf("mode")===0?"mV":"norm.");
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
  var bounds={};
  ["vm","ue"].forEach(function(field){
    var lo=Infinity,hi=-Infinity,delta=0;
    ["equal","unequal"].forEach(function(family){
      var a=D.cases[family];
      for(var k=0;k<D.times_ms.length;k++)for(var j=0;j<a[field+"M"][k].length;j++){
        var m=a[field+"M"][k][j],b=a[field+"B"][k][j];
        lo=Math.min(lo,m,b);hi=Math.max(hi,m,b);delta=Math.max(delta,Math.abs(m-b));
      }
    });
    if(field==="ue"){hi=Math.max(Math.abs(lo),Math.abs(hi));lo=-hi;}
    bounds[field]={lo:Math.min(lo,B.bounds[field].lo),hi:Math.max(hi,B.bounds[field].hi),delta:Math.max(delta,B.bounds[field].delta)};
  });
  function drawMaps(prefix,a,b,d,nx,nz,bounds,field,label) {
    var pal=field==="ue"?DIV:SEQ;
    map(prefix+"-m",a,nx,nz,bounds.lo,bounds.hi,pal,"Monodomain "+label);
    map(prefix+"-b",b,nx,nz,bounds.lo,bounds.hi,pal,"Bidomain "+label);
    map(prefix+"-d",d,nx,nz,-bounds.delta,bounds.delta,DIV,"Signed monodomain minus bidomain "+label);
    $(prefix+"-abs-scale").textContent=fmt(bounds.lo)+" to "+fmt(bounds.hi)+(prefix==="mode"?" mV":"");
    $(prefix+"-diff-scale").textContent="−"+fmt(bounds.delta)+" to +"+fmt(bounds.delta)+(prefix==="mode"?" mV":"");
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
    $("view-description").textContent=this.value==="oblique"?
      "Height and colour represent potential. M/B share the camera and scales.":
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
  setStudySampling();updateStudy();updateMode();stop();
})();
