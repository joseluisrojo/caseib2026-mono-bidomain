/* Shared orthographic camera. Scalar colours have no lighting correction. */
(function(root) {
  "use strict";
  var initial={yaw:-20,pitch:28,roll:0,zoom:1},camera=Object.assign({},initial),gpu;
  function wrap(v){return ((v+180)%360+360)%360-180;}
  function setCamera(next){
    ["yaw","pitch","roll"].forEach(function(k){if(Number.isFinite(next[k]))camera[k]=wrap(next[k]);});
    if(Number.isFinite(next.zoom)&&next.zoom>0)camera.zoom=Math.max(.5,Math.min(4,next.zoom));
  }
  function getCamera(){return Object.assign({},camera);}
  function resetCamera(){setCamera(initial);}
  function colour(v,lo,hi,pal){
    var t=Math.max(0,Math.min(1,(v-lo)/(hi-lo)))*(pal.length-1);
    var i=Math.min(pal.length-2,Math.floor(t)),f=t-i;
    return pal[i].map(function(a,j){return Math.round(a+(pal[i+1][j]-a)*f);});
  }
  function projector(w,h,lo,hi){
    var az=camera.yaw*Math.PI/180,el=camera.pitch*Math.PI/180,roll=camera.roll*Math.PI/180;
    var norm=Math.max(Math.abs(lo),Math.abs(hi))||1;
    function worldHeight(x,z,height){
      var xx=x-6,zz=z-1,u=xx*Math.cos(az)+zz*Math.sin(az);
      var v=(-xx*Math.sin(az)+zz*Math.cos(az))*Math.sin(el)+height*Math.cos(el);
      return {u:u*Math.cos(roll)-v*Math.sin(roll),v:u*Math.sin(roll)+v*Math.cos(roll),
        depth:(xx*Math.sin(az)-zz*Math.cos(az))*Math.cos(el)+height*Math.sin(el)};
    }
    // Identical fit for all panels, including the signed difference. Zero stays aligned.
    var points=[];
    [-.5,12.5].forEach(function(x){[-.3,2.3].forEach(function(z){[-2.6,2.6].forEach(function(v){points.push(worldHeight(x,z,v));});});});
    var us=points.map(function(p){return p.u;}),vs=points.map(function(p){return p.v;});
    var umin=Math.min.apply(null,us),umax=Math.max.apply(null,us),vmin=Math.min.apply(null,vs),vmax=Math.max.apply(null,vs);
    var left=40,right=w<500?72:86,top=30,bottom=43;
    var scale=camera.zoom*Math.min((w-left-right)/(umax-umin),(h-top-bottom)/(vmax-vmin));
    var ox=left+(w-left-right-(umax-umin)*scale)/2-umin*scale;
    var oy=top+(h-top-bottom-(vmax-vmin)*scale)/2+vmax*scale;
    return function(x,z,v){var p=worldHeight(x,z,2.6*v/norm);return {x:ox+p.u*scale,y:oy-p.v*scale,depth:p.depth};};
  }
  function grid(project){
    var result=[];
    [0,3,6,9,12].forEach(function(x){result.push(project(x,0,0),project(x,2,0));});
    [0,1,2].forEach(function(z){result.push(project(0,z,0),project(12,z,0));});
    return result;
  }
  function mesh(a,nx,nz,w,project){
    var sx=w<500?4:2,sz=2,vertices=[],indices=[],rows=[],xs=[];
    for(var ix=0;ix<nx-1;ix+=sx)xs.push(ix);xs.push(nx-1);
    for(var iz=0;iz<nz-1;iz+=sz)rows.push(iz);rows.push(nz-1);
    rows.forEach(function(z){xs.forEach(function(x){var v=a[z*nx+x],p=project(12*x/(nx-1),2*z/(nz-1),v);vertices.push({x:p.x,y:p.y,depth:p.depth,value:v});});});
    for(var j=0;j<rows.length-1;j++)for(var i=0;i<xs.length-1;i++){
      var k=j*xs.length+i;indices.push(k,k+1,k+xs.length,k+1,k+xs.length+1,k+xs.length);
    }
    return {vertices:vertices,indices:indices};
  }
  function makeGPU(){
    var c=root.document.createElement("canvas"),gl=c.getContext("webgl",{alpha:true,antialias:true,preserveDrawingBuffer:true});
    if(!gl)return null;
    function shader(type,source){var s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
    var program=gl.createProgram();
    gl.attachShader(program,shader(gl.VERTEX_SHADER,'attribute vec3 p;attribute float value;varying float scalar;void main(){gl_Position=vec4(p,1.0);scalar=value;}'));
    gl.attachShader(program,shader(gl.FRAGMENT_SHADER,'precision mediump float;varying float scalar;uniform vec3 c0,c1,c2,c3,c4;uniform bool grid;void main(){if(grid){gl_FragColor=vec4(.77,.82,.85,1.0);}else{float t=clamp(scalar,0.0,1.0)*4.0;vec3 c;if(t<1.0)c=mix(c0,c1,t);else if(t<2.0)c=mix(c1,c2,t-1.0);else if(t<3.0)c=mix(c2,c3,t-2.0);else c=mix(c3,c4,t-3.0);gl_FragColor=vec4(c,1.0);}}'));
    gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
    return {canvas:c,gl:gl,program:program,buffer:gl.createBuffer(),elements:gl.createBuffer(),p:gl.getAttribLocation(program,"p"),value:gl.getAttribLocation(program,"value"),grid:gl.getUniformLocation(program,"grid"),colours:[0,1,2,3,4].map(function(i){return gl.getUniformLocation(program,"c"+i);})};
  }
  function gpuDraw(ctx,w,h,dpr,m,lines,lo,hi,pal){
    if(gpu===undefined){try{gpu=makeGPU();}catch(e){gpu=null;}}
    if(!gpu||gpu.gl.isContextLost())return false;
    var g=gpu,gl=g.gl;g.canvas.width=Math.round(w*dpr);g.canvas.height=Math.round(h*dpr);
    gl.viewport(0,0,g.canvas.width,g.canvas.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    gl.useProgram(g.program);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.disable(gl.CULL_FACE);
    g.colours.forEach(function(location,i){gl.uniform3fv(location,pal[i].map(function(v){return v/255;}));});
    function upload(points){
      var v=new Float32Array(points.length*4);points.forEach(function(p,i){v.set([2*p.x/w-1,1-2*p.y/h,-p.depth/20,((p.value||0)-lo)/(hi-lo)],4*i);});
      gl.bindBuffer(gl.ARRAY_BUFFER,g.buffer);gl.bufferData(gl.ARRAY_BUFFER,v,gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(g.p);gl.vertexAttribPointer(g.p,3,gl.FLOAT,false,16,0);
      gl.enableVertexAttribArray(g.value);gl.vertexAttribPointer(g.value,1,gl.FLOAT,false,16,12);
    }
    upload(m.vertices);gl.uniform1i(g.grid,0);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,g.elements);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(m.indices),gl.DYNAMIC_DRAW);
    gl.drawElements(gl.TRIANGLES,m.indices.length,gl.UNSIGNED_SHORT,0);
    upload(lines);gl.uniform1i(g.grid,1);gl.drawArrays(gl.LINES,0,lines.length);
    ctx.drawImage(g.canvas,0,0,w,h);return true;
  }
  // Depth-buffer fallback for devices with WebGL disabled. It uses the same mesh.
  function cpuDraw(ctx,w,h,m,lines,lo,hi,pal){
    var width=Math.round(w),height=Math.round(h),im=ctx.createImageData(width,height),depth=new Float32Array(width*height);depth.fill(-Infinity);
    function put(x,y,d,c){if(x<0||y<0||x>=width||y>=height)return;var k=y*width+x;if(d<depth[k])return;depth[k]=d;im.data.set([c[0],c[1],c[2],255],k*4);}
    for(var i=0;i<m.indices.length;i+=3){
      var a=m.vertices[m.indices[i]],b=m.vertices[m.indices[i+1]],c=m.vertices[m.indices[i+2]];
      var den=(b.y-c.y)*(a.x-c.x)+(c.x-b.x)*(a.y-c.y);if(Math.abs(den)<1e-10)continue;
      var x0=Math.max(0,Math.floor(Math.min(a.x,b.x,c.x))),x1=Math.min(width-1,Math.ceil(Math.max(a.x,b.x,c.x)));
      var y0=Math.max(0,Math.floor(Math.min(a.y,b.y,c.y))),y1=Math.min(height-1,Math.ceil(Math.max(a.y,b.y,c.y)));
      for(var y=y0;y<=y1;y++)for(var x=x0;x<=x1;x++){
        var u=((b.y-c.y)*(x+.5-c.x)+(c.x-b.x)*(y+.5-c.y))/den;
        var v=((c.y-a.y)*(x+.5-c.x)+(a.x-c.x)*(y+.5-c.y))/den,t=1-u-v;
        if(u>=0&&v>=0&&t>=0)put(x,y,u*a.depth+v*b.depth+t*c.depth,colour(u*a.value+v*b.value+t*c.value,lo,hi,pal));
      }
    }
    for(i=0;i<lines.length;i+=2){var p=lines[i],q=lines[i+1],steps=Math.ceil(Math.max(Math.abs(q.x-p.x),Math.abs(q.y-p.y)));
      for(var s=0;s<=steps;s++){var f=steps?s/steps:0;put(Math.round(p.x+(q.x-p.x)*f),Math.round(p.y+(q.y-p.y)*f),p.depth+(q.depth-p.depth)*f+1e-5,[197,209,217]);}}
    var scratch=root.document.createElement("canvas");scratch.width=width;scratch.height=height;scratch.getContext("2d").putImageData(im,0,0);ctx.drawImage(scratch,0,0,w,h);
  }
  function render(canvas,a,nx,nz,lo,hi,pal,axis){
    var rect=canvas.getBoundingClientRect(),w=rect.width;if(w<1)return;
    var h=rect.height,dpr=Math.min(root.devicePixelRatio||1,2);
    canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
    var ctx=canvas.getContext("2d");ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
    var project=projector(w,h,lo,hi),m=mesh(a,nx,nz,w,project),lines=grid(project);
    var accelerated=gpuDraw(ctx,w,h,dpr,m,lines,lo,hi,pal);if(!accelerated)cpuDraw(ctx,w,h,m,lines,lo,hi,pal);
    canvas.dataset.renderer=accelerated?"webgl-depth-buffer":"cpu-depth-buffer";
    canvas.dataset.camera=JSON.stringify(getCamera());canvas.dataset.zeroPlane="0";
    function line(points){ctx.beginPath();points.forEach(function(p,i){if(i)ctx.lineTo(p.x,p.y);else ctx.moveTo(p.x,p.y);});ctx.strokeStyle="#546979";ctx.lineWidth=1;ctx.stroke();}
    var labels=[];
    function text(p,s,dx,dy,align){
      if(p.x<0||p.x>w||p.y<0||p.y>h)return;
      ctx.font=(w<500?"11px":"12px")+" -apple-system,Segoe UI,sans-serif";
      var tw=ctx.measureText(s).width,baseX=p.x+(dx||0)+(align==="left"?tw/2:align==="right"?-tw/2:0),baseY=p.y+(dy||0);
      var offsets=[0,14,-14,28,-28,42,-42],box,x,y;
      for(var i=0;i<offsets.length;i++){
        x=Math.max(tw/2+2,Math.min(w-tw/2-2,baseX));y=Math.max(13,Math.min(h-3,baseY+offsets[i]));
        box={l:x-tw/2-2,r:x+tw/2+2,t:y-11,b:y+3};
        if(!labels.some(function(b){return box.l<b.r&&box.r>b.l&&box.t<b.b&&box.b>b.t;}))break;
      }
      if(i===offsets.length)return;
      labels.push(box);ctx.fillStyle="#435968";ctx.textAlign="center";
      ctx.strokeStyle="rgba(255,255,255,.96)";ctx.lineWidth=4;ctx.lineJoin="round";ctx.strokeText(s,x,y);ctx.fillText(s,x,y);
    }
    var origin=project(0,0,0);line([origin,project(12,0,0)]);line([origin,project(0,2,0)]);
    // Place the potential axis at the rightmost spatial corner after any rotation.
    var corners=[[0,0],[0,2],[12,0],[12,2]],corner=corners.reduce(function(best,c){return project(c[0],c[1],0).x>project(best[0],best[1],0).x?c:best;});
    line([project(corner[0],corner[1],lo),project(corner[0],corner[1],hi)]);
    function number(v){return Math.abs(v)>0&&Math.abs(v)<.01?v.toExponential(1):Number(v.toPrecision(3)).toString();}
    var ticks=axis.ticks||[lo,0,hi],bottom=project(corner[0],corner[1],ticks[0]),top=project(corner[0],corner[1],ticks[ticks.length-1]);
    if(ticks.length>3&&Math.hypot(top.x-bottom.x,top.y-bottom.y)<100)ticks=[ticks[0],ticks[ticks.length-1]];
    ticks.forEach(function(v){text(project(corner[0],corner[1],v),number(v*(axis.factor||1)),8,4,"left");});
    text(project(corner[0],corner[1],hi),axis.unit,0,-13);
    function outsideTitle(p,s){var centre=project(6,1,0),dx=p.x-centre.x,dy=p.y-centre.y,len=Math.hypot(dx,dy)||1;text(p,s,26*dx/len,26*dy/len+4);}
    [0,6,12].forEach(function(x){text(project(x,0,0),String(x),0,17);});outsideTitle(project(6,0,0),"x (mm)");
    text(project(0,2,0),"2",-10,3,"right");outsideTitle(project(0,1,0),"z (mm)");
  }
  root.CASEIB_SURFACE={render:render,projector:projector,getCamera:getCamera,setCamera:setCamera,resetCamera:resetCamera};
})(typeof window!=="undefined"?window:globalThis);
