/* Closed-form teaching example. No solver or study-data mutation. */
(function (root) {
  "use strict";
  var families = {
    equal:{si:[0.2,0.05],se:[0.8,0.2]},
    unequal:{si:[0.2,0.02],se:[0.6,0.2]}
  };
  function symbols(family,p,q) {
    var f=families[family], kx=p*Math.PI/0.012, kz=q*Math.PI/0.002;
    var ai=f.si[0]*kx*kx+f.si[1]*kz*kz;
    var ae=f.se[0]*kx*kx+f.se[1]*kz*kz;
    var qb=ai+ae ? ai*ae/(ai+ae):0;
    var qm=f.si[0]*f.se[0]/(f.si[0]+f.se[0])*kx*kx
          +f.si[1]*f.se[1]/(f.si[1]+f.se[1])*kz*kz;
    return {qM:qm,qB:qb,gamma:ai+ae ? ai/(ai+ae):0,
            lambdaM:(100+qm/1400)/1000,lambdaB:(100+qb/1400)/1000};
  }
  function state(family,p,q,t) {
    var sy=symbols(family,p,q);
    var mean=5*Math.exp(-t/10), aM=10*Math.exp(-sy.lambdaM*t),aB=10*Math.exp(-sy.lambdaB*t);
    var weight=(p ? 0.5:1)*(q ? 0.5:1);
    // Nonconstant cosine modes have zero integral. Handle uniform mode separately.
    var vb2=(p||q) ? mean*mean+weight*aB*aB:Math.pow(mean+aB,2);
    var vmDiff=Math.abs(aM-aB)*Math.sqrt(weight);
    return {mean:mean,aM:aM,aB:aB,sy:sy,
      vmContrast:vb2 ? vmDiff/Math.sqrt(vb2):null,
      ueContrast:sy.gamma*aB ? Math.abs(aM-aB)/Math.abs(aB):null};
  }
  function fields(family,p,q,t,field,nx,nz) {
    var s=state(family,p,q,t), m=[],b=[],d=[];
    for(var iz=0;iz<nz;iz++) for(var ix=0;ix<nx;ix++) {
      var pattern=Math.cos(p*Math.PI*ix/(nx-1))*Math.cos(q*Math.PI*iz/(nz-1));
      var mv=field==="vm" ? s.mean+s.aM*pattern:-s.sy.gamma*s.aM*pattern;
      var bv=field==="vm" ? s.mean+s.aB*pattern:-s.sy.gamma*s.aB*pattern;
      m.push(mv);b.push(bv);d.push(mv-bv);
    }
    return {m:m,b:b,d:d,state:s};
  }
  root.CASEIB_MODEL={symbols:symbols,state:state,fields:fields};
})(typeof window!=="undefined" ? window:globalThis);
