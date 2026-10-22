// Keep the renderer off the main thread: input sends only pointer coordinates.
// A native soft-dot cursor stays smooth independently of worker/browser load.
window.startAcceleratedDotField = function (staticCanvas, options) {
    if (!window.Worker || !HTMLCanvasElement.prototype.transferControlToOffscreen) return false;
    const canvas=document.createElement('canvas');canvas.id='dot-field-gpu';canvas.setAttribute('aria-hidden','true');
    let worker;
    try { worker=new Worker('dot-field-worker.js?v=20261022-2'); }
    catch { return false; }
    staticCanvas.after(canvas);canvas.dotWorker=worker;
    let failed=false, ready=false, initTimer;
    let pressed=false, pressedAt=0, touch=false, active=false, lastScroll=-Infinity, clickTimer, clickAnimation;
    const send=m=>{if(!failed)worker.postMessage(m)};
    const allowed=()=>!failed&&options.motion()&&!document.hidden&&!document.body.classList.contains('project-dialog-open');
    const size=()=>({width:innerWidth,height:innerHeight,dpr:devicePixelRatio||1});
    const spacing=24/Math.sqrt(5);
    function paintStatic(){
        const scale=Math.min(devicePixelRatio||1,1.5),c=staticCanvas.getContext('2d');
        staticCanvas.width=Math.round(innerWidth*scale);staticCanvas.height=Math.round(innerHeight*scale);c.setTransform(scale,0,0,scale,0,0);
        c.fillStyle=options.alternate()?'rgba(245,178,207,.48)':'rgba(235,235,230,.48)';c.beginPath();
        for(let y=12;y<innerHeight;y+=spacing)for(let x=12;x<innerWidth;x+=spacing){c.moveTo(x+.85,y);c.arc(x,y,.85,0,Math.PI*2);}c.fill();
        canvas.style.width=`${innerWidth}px`;canvas.style.height=`${innerHeight}px`;
    }
    paintStatic();canvas.hidden=true;
    let monitorFrame=null,monitorLast=0,monitorDeadline=0,monitorCount=0,monitorTime=0,quality=1;
    function monitor(time){
        monitorFrame=null;
        if(monitorLast){monitorTime+=time-monitorLast;monitorCount++;}
        monitorLast=time;
        if(monitorCount>=12 || monitorCount>=4 && monitorTime/monitorCount>50){
            if(monitorTime/monitorCount>24 && quality>.26){quality=Math.max(.25,quality*Math.min(.7,Math.sqrt(16/(monitorTime/monitorCount))));send({type:'quality',value:quality});document.documentElement.classList.add('performance-lite');canvas.dataset.quality=String(quality);}
            monitorTime=monitorCount=0;
        }
        if(time<monitorDeadline && allowed())monitorFrame=requestAnimationFrame(monitor);
        else monitorLast=0;
    }
    function fallback(){
        if(failed)return;failed=true;clearTimeout(initTimer);worker.terminate();canvas.remove();options.fallback();
    }
    worker.addEventListener('error',fallback);
    worker.addEventListener('message',event=>{
        if(event.data.type==='failed'){fallback();return;}
        if(event.data.type==='ready'){
            ready=true;clearTimeout(initTimer);canvas.dataset.renderer='webgl2-worker';canvas.dataset.dotCount=String(event.data.count);
            document.documentElement.classList.add('custom-cursor-ready');
            options.onReady?.(worker);
        } else if(event.data.type==='quality'){
            canvas.dataset.quality=String(event.data.quality);
            document.documentElement.classList.add('performance-lite');
        }
    });
    try {
        const offscreen=canvas.transferControlToOffscreen();
        worker.postMessage({type:'init',canvas:offscreen,...size(),enabled:allowed(),alternate:options.alternate()},[offscreen]);
        initTimer=setTimeout(()=>{if(!ready)fallback()},15000);
    } catch {fallback();return true;}
    function aim(event,type='aim'){
        touch=event.pointerType==='touch';active=true;
        if(canvas.hidden)canvas.hidden=false;
        send({type,x:event.clientX,y:event.clientY,pressed});
        monitorDeadline=pressed?Math.max(performance.now()+800,pressedAt+13800):performance.now()+800;
        if(monitorFrame===null)monitorFrame=requestAnimationFrame(monitor);
    }
    window.addEventListener('pointermove',event=>{
        if(!allowed()||performance.now()-lastScroll<100||event.pointerType==='touch'&&!pressed)return;
        aim(event);
    },{passive:true});
    window.addEventListener('pointerdown',event=>{
        if(!allowed()||event.button!==0)return;
        pressed=!event.target.closest('a,button,input,textarea,select');pressedAt=performance.now();
        document.body.classList.toggle('matrix-holding',pressed);aim(event,'down');
    },{passive:true});
    window.addEventListener('pointerup',event=>{
        if(failed||!active&&!pressed)return;
        monitorDeadline=performance.now()+800;
        const click=pressed&&performance.now()-pressedAt<250;
        send({type:'up',click,touch});pressed=false;if(touch)active=false;
        document.body.classList.remove('matrix-holding');
        if(click&&!touch){
            const cursor=options.cursor;cursor.style.transform=`translate3d(${event.clientX-9}px,${event.clientY-9}px,0)`;cursor.style.opacity='1';
            clearTimeout(clickTimer);clickTimer=setTimeout(()=>{cursor.style.opacity='0'},480);
            clickAnimation?.cancel();clickAnimation=cursor.animate([{transform:'scale(.6)',opacity:.75},{transform:'scale(3)',opacity:0}],{duration:480,easing:'ease-out',pseudoElement:'::after'});
        }
    },{passive:true});
    function reset(){if(failed)return;pressed=active=false;canvas.hidden=true;if(monitorFrame!==null)cancelAnimationFrame(monitorFrame);monitorFrame=null;monitorLast=0;document.body.classList.remove('matrix-holding');send({type:'reset'});}
    window.addEventListener('contextmenu',event=>{if(pressed)event.preventDefault()});
    window.addEventListener('scroll',()=>{lastScroll=performance.now();if(active)reset()},{passive:true});
    let resizeTimer;
    window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{reset();paintStatic();send({type:'resize',...size()})},80)},{passive:true});
    window.addEventListener('blur',reset);window.addEventListener('pointercancel',reset,{passive:true});
    document.documentElement.addEventListener('pointerleave',reset);
    document.addEventListener('visibilitychange',()=>{if(document.hidden)reset();send({type:'enabled',value:allowed()})});
    window.addEventListener('motionchange',()=>{reset();send({type:'enabled',value:allowed()})});
    window.addEventListener('dialogchange',()=>{reset();send({type:'enabled',value:allowed()})});
    window.addEventListener('themechange',()=>{reset();paintStatic();send({type:'theme',value:options.alternate()})});
    return true;
};
