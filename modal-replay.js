/* Separable evaluation of the original saved cosine expansion. No interpolation. */
(function(root) {
  "use strict";
  function create(data) {
    var nx=data.nx,nz=data.nz,np=data.orders[0]+1,nq=data.orders[1]+1;
    var bx=new Float64Array(nx*np),bz=new Float64Array(nz*nq),cache=new Map();
    for(var x=0;x<nx;x++)for(var p=0;p<np;p++)
      bx[x*np+p]=Math.cos(data.x_mm[x]*p*Math.PI/12);
    for(var z=0;z<nz;z++)for(var q=0;q<nq;q++)
      bz[z*nq+q]=Math.cos(data.z_mm[z]*q*Math.PI/2);
    function evaluate(family,t) {
      var key=family+":"+t.toFixed(8);
      if(cache.has(key))return cache.get(key);
      var c=data.cases[family],out={};
      ["M","B"].forEach(function(model) {
        var lambda=c["lambda"+model],ct=new Float64Array(np*nq);
        var xVm=new Float64Array(nx*nq),xUe=new Float64Array(nx*nq);
        for(var j=0;j<ct.length;j++)ct[j]=c.coeff[j]*Math.exp(-lambda[j]*t);
        for(var x=0;x<nx;x++)for(var p=0;p<np;p++) {
          var cos=bx[x*np+p];
          for(var q=0;q<nq;q++){
            var j=p*nq+q,value=cos*ct[j],k=x*nq+q;
            xVm[k]+=value;xUe[k]+=value*c.forward[j];
          }
        }
        var vm=new Float64Array(nx*nz),ue=new Float64Array(nx*nz);
        for(var z=0;z<nz;z++)for(var x=0;x<nx;x++) {
          var sumVm=0,sumUe=0;
          for(var q=0;q<nq;q++){
            var cos=bz[z*nq+q],j=x*nq+q;
            sumVm+=xVm[j]*cos;sumUe+=xUe[j]*cos;
          }
          vm[z*nx+x]=sumVm;ue[z*nx+x]=sumUe;
        }
        out["vm"+model]=vm;out["ue"+model]=ue;
      });
      out.metrics={};
      ["vm","ue"].forEach(function(field) {
        var m=out[field+"M"],b=out[field+"B"],n=0,d=0;
        for(var i=0;i<m.length;i++){n+=(m[i]-b[i])*(m[i]-b[i]);d+=b[i]*b[i];}
        out.metrics[field]=d?Math.sqrt(n/d):null;
      });
      if(cache.size>=12)cache.delete(cache.keys().next().value);
      cache.set(key,out);
      return out;
    }
    return {evaluate:evaluate};
  }
  root.CASEIB_REPLAY={create:create};
})(typeof window!=="undefined"?window:globalThis);
