/* Orthographic scientific surface. No lighting changes the calibrated colours. */
(function(root) {
  "use strict";
  var az=-20*Math.PI/180,el=28*Math.PI/180;
  function colour(v,lo,hi,pal) {
    var t=Math.max(0,Math.min(1,(v-lo)/(hi-lo)))*(pal.length-1);
    var i=Math.min(pal.length-2,Math.floor(t)),f=t-i;
    return "rgb("+pal[i].map(function(a,j){return Math.round(a+(pal[i+1][j]-a)*f);}).join(",")+")";
  }
  function projector(w,h,lo,hi) {
    var norm=Math.max(Math.abs(lo),Math.abs(hi))||1;
    function world(x,z,v) {
      var xx=x-6,zz=z-1,height=2.6*v/norm;
      return {u:xx*Math.cos(az)+zz*Math.sin(az),
        v:(-xx*Math.sin(az)+zz*Math.cos(az))*Math.sin(el)+height*Math.cos(el),
        depth:(xx*Math.sin(az)-zz*Math.cos(az))*Math.cos(el)+height*Math.sin(el)};
    }
    var points=[];
    [-.5,12.5].forEach(function(x){[-.3,2.3].forEach(function(z){
      [lo,hi].forEach(function(v){points.push(world(x,z,v));});
    });});
    var umin=Math.min.apply(null,points.map(function(p){return p.u;}));
    var umax=Math.max.apply(null,points.map(function(p){return p.u;}));
    var vmin=Math.min.apply(null,points.map(function(p){return p.v;}));
    var vmax=Math.max.apply(null,points.map(function(p){return p.v;}));
    var left=w<500?27:40,right=w<500?52:68,top=25,bottom=40;
    var scale=Math.min((w-left-right)/(umax-umin),(h-top-bottom)/(vmax-vmin));
    var ox=left+(w-left-right-(umax-umin)*scale)/2-umin*scale;
    var oy=top+(h-top-bottom-(vmax-vmin)*scale)/2+vmax*scale;
    function project(x,z,v) {
      var p=world(x,z,v);
      return {x:ox+p.u*scale,y:oy-p.v*scale,depth:p.depth};
    }
    return project;
  }
  function render(canvas,a,nx,nz,lo,hi,pal,unit) {
    var w=canvas.getBoundingClientRect().width;
    if(w<1)return;
    var h=w/(w<500?1.65:2.25),dpr=Math.min(root.devicePixelRatio||1,2);
    canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
    var ctx=canvas.getContext("2d");ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
    var project=projector(w,h,lo,hi);
    function line(points,color,width) {
      ctx.beginPath();points.forEach(function(p,i){if(i)ctx.lineTo(p.x,p.y);else ctx.moveTo(p.x,p.y);});
      ctx.strokeStyle=color;ctx.lineWidth=width||1;ctx.stroke();
    }
    function text(p,s,dx,dy,align) {
      ctx.font=(w<500?"11px":"12px")+" -apple-system,Segoe UI,sans-serif";
      ctx.fillStyle="#435968";ctx.textAlign=align||"center";
      ctx.fillText(s,p.x+(dx||0),p.y+(dy||0));
    }
    // Base grid is spatial. Surface height is potential, never tissue thickness.
    [0,3,6,9,12].forEach(function(x){
      line([project(x,0,lo),project(x,2,lo)],"#e2e8ed",.8);
    });
    [0,1,2].forEach(function(z){
      line([project(0,z,lo),project(12,z,lo)],"#e2e8ed",.8);
    });
    var sx=w<500?4:2,sz=2,faces=[];
    for(var iz=0;iz<nz-1;iz+=sz)for(var ix=0;ix<nx-1;ix+=sx) {
      var x2=Math.min(nx-1,ix+sx),z2=Math.min(nz-1,iz+sz);
      var cells=[[ix,iz],[x2,iz],[x2,z2],[ix,z2]],sum=0,depth=0;
      var pts=cells.map(function(c){
        var value=a[c[1]*nx+c[0]];sum+=value;
        var p=project(12*c[0]/(nx-1),2*c[1]/(nz-1),value);depth+=p.depth;
        return p;
      });
      faces.push({pts:pts,value:sum/4,depth:depth/4});
    }
    faces.sort(function(a,b){return a.depth-b.depth;});
    faces.forEach(function(f){
      ctx.beginPath();f.pts.forEach(function(p,i){if(i)ctx.lineTo(p.x,p.y);else ctx.moveTo(p.x,p.y);});
      ctx.closePath();ctx.fillStyle=colour(f.value,lo,hi,pal);ctx.fill();
      // Close antialiasing seams with the face colour on small screens.
      ctx.strokeStyle=w<500?ctx.fillStyle:"rgba(40,57,72,.045)";
      ctx.lineWidth=w<500?.6:.25;ctx.stroke();
    });
    var origin=project(0,0,lo),endX=project(12,0,lo),endZ=project(0,2,lo);
    line([origin,endX],"#546979",1);line([origin,endZ],"#546979",1);
    [0,6,12].forEach(function(x){text(project(x,0,lo),String(x),0,16);});
    text(project(6,0,lo),"x (mm)",0,33);
    [0,2].forEach(function(z){text(project(0,z,lo),String(z),-11,3,"right");});
    var zLabel=project(0,1,lo);
    ctx.save();ctx.translate(zLabel.x-26,zLabel.y);ctx.rotate(-Math.PI/2);
    ctx.font=(w<500?"11px":"12px")+" -apple-system,Segoe UI,sans-serif";
    ctx.fillStyle="#435968";ctx.textAlign="center";ctx.fillText("z (mm)",0,0);ctx.restore();
    var axisX=12.4,axisZ=0;
    line([project(axisX,axisZ,lo),project(axisX,axisZ,hi)],"#546979",1);
    function number(v){return Math.abs(v)>0&&Math.abs(v)<.01?v.toExponential(1):Number(v.toPrecision(2)).toString();}
    [lo,hi].forEach(function(v){text(project(axisX,axisZ,v),number(v),8,4,"left");});
    if(lo<0&&hi>0&&Math.min(-lo,hi)/(hi-lo)>.12)
      text(project(axisX,axisZ,0),"0",8,4,"left");
    text(project(axisX,axisZ,hi),unit,0,-12);
  }
  root.CASEIB_SURFACE={render:render,projector:projector};
})(typeof window!=="undefined"?window:globalThis);
