// Separate GPU drawing and the tiny audio canvas from page layout work.
let haloCanvas, haloContext, haloScale=0;
const haloSensitivity=[.45,1.15,.7,1.65,.9,1.4,.55,1.9];
const haloGroups=haloSensitivity.map(sensitivity=>({sensitivity,dx:0,vx:0,points:[]}));
for(let i=0;i<32;i++)haloGroups[Math.min(i%16,15-i%16)].points.push([Math.cos(i*Math.PI*2/32),Math.sin(i*Math.PI*2/32)]);
function renderHalo(message){
    if(!haloContext)return;
    if(haloScale!==message.scale){haloScale=message.scale;haloCanvas.width=haloCanvas.height=Math.round(96*haloScale);haloContext.setTransform(haloScale,0,0,haloScale,0,0);}
    const c=haloContext;c.clearRect(0,0,96,96);c.lineWidth=1.6;c.lineCap='round';
    for(const group of haloGroups){
        const energy=message.animate?1-Math.exp(-message.energy*group.sensitivity*4):0;
        if(message.animate)for(let i=0;i<2;i++){group.vx=(group.vx+(energy*10-group.dx)*.075)*.76;group.dx+=group.vx;}
        else{group.dx=group.vx=0;}
        c.strokeStyle=`rgba(${message.alternate?'245,178,207':'235,235,230'},${.45+energy*.5})`;c.beginPath();
        for(const [x,y]of group.points){c.moveTo(48+x*31,48+y*31);c.lineTo(48+x*(33+group.dx),48+y*(33+group.dx));}c.stroke();
    }
}
let canvas, gl, enabled=true, alternate=false, dpr=1, viewWidth=0, viewHeight=0;
let handleMessage;
const stats={frames:0,gaps:[]};
onmessage=event=>{
    const m=event.data;
    if(m.type==='init') {
        canvas=m.canvas;viewWidth=m.width;viewHeight=m.height;dpr=m.dpr;enabled=m.enabled;alternate=m.alternate;
        initialize();
    } else handleMessage?.(m);
};
function initialize() {
    gl=canvas.getContext('webgl2',{alpha:false,antialias:false,depth:false,stencil:false,preserveDrawingBuffer:true,powerPreference:'low-power'});
    if(!gl){postMessage({type:'failed'});return;}
    const vertex = `#version 300 es
    precision highp float;
    in vec2 home; in vec4 state;
    out vec4 nextState; out float bloom; flat out vec2 center;
    uniform vec2 viewport, framebuffer, rippleOrigin;
    uniform vec4 frameValues[2];
    #define pointerData frameValues[0]
    #define frameData frameValues[1]
    #define pointer pointerData.xy
    #define enabled pointerData.z
    #define pressed pointerData.w
    #define steps frameData.x
    #define concentration frameData.y
    #define rippleAge frameData.z
    #define scale frameData.w
    void main() {
        vec2 p = pointer - home;
        float distance = length(p);
        float influence = enabled * max(0., 1. - distance / 190.);
        float gentle = influence * influence * mix(-.3, .55, pressed);
        float pull = influence > 0. && concentration > 0. ? mix(gentle, (1. - exp(-influence * 3.)) * .88, concentration) : gentle;
        vec2 target = p * pull;
        if (rippleAge >= 0. && rippleAge < .45) {
            vec2 delta = home - rippleOrigin;
            float rd = max(length(delta), .001);
            float wave = exp(-pow((rd - rippleAge * 620.) / 28., 2.)) * 24. * max(0., 1. - rippleAge / .45);
            target += delta / rd * wave;
        }
        vec2 offset = state.xy, velocity = state.zw;
        if (influence > 0. || dot(state,state) > .000001 || rippleAge >= 0.) for (int i = 0; i < 3; i++) {
            float dt = clamp(steps - float(i), 0., 1.);
            if(dt <= 0.) break;
            velocity = (velocity + (target - offset) * .075 * dt) * pow(.76, dt);
            offset += velocity * dt;
        }
        if (length(offset - target) + length(velocity) < .012) { offset = target; velocity = vec2(0.); }
        nextState = vec4(offset, velocity);
        vec2 point = (home + offset) / viewport;
        gl_Position = vec4(point * vec2(2., -2.) + vec2(-1., 1.), 0., 1.);
        bloom = influence;
        center = vec2(point.x, 1. - point.y) * framebuffer;
        // A padded sprite and true subpixel center prevent low-resolution
        // points from snapping between physical pixels under overload.
        gl_PointSize = max(3., 2. * (.85 + influence * .7) * scale + 2.5);
    }`;
    const fragment = `#version 300 es
    precision highp float;
    in float bloom; flat in vec2 center; out vec4 color;
    uniform vec3 ink;
    uniform vec4 frameValues[2];
    #define frameData frameValues[1]
    #define scale frameData.w
    void main() {
        float radius = (.85 + bloom * .7) * scale;
        float distance = length(gl_FragCoord.xy - center);
        float disk = 1. - smoothstep(radius - .5, radius + .5, distance);
        vec2 delta = abs(gl_FragCoord.xy - center);
        // Bilinear splats conserve the brightness and subpixel centroid of
        // unresolved dots instead of dropping or snapping their centers.
        float splat = max(0., 1. - delta.x) * max(0., 1. - delta.y) * 3.14159265 * radius * radius;
        float coverage = mix(splat, disk, smoothstep(.4, .65, radius));
        float opacity = (.48 + bloom * .38) * .55 * coverage;
        color = vec4(ink, opacity);
    }`;
    const shaders = [], buffers = [], arrays = [], feedback = [];
    let program;
    try {
        function compile(type, source) {
            const shader = gl.createShader(type); shaders.push(shader);
            gl.shaderSource(shader, source); gl.compileShader(shader);
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(shader));
            return shader;
        }
        program = gl.createProgram();
        gl.attachShader(program, compile(gl.VERTEX_SHADER, vertex));
        gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragment));
        gl.transformFeedbackVaryings(program, ['nextState'], gl.INTERLEAVED_ATTRIBS);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(program));
    } catch (error) {
        postMessage({type:'failed',message:error.message});
        shaders.forEach(shader => gl.deleteShader(shader));
        if (program) gl.deleteProgram(program);
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return;
    }
    shaders.forEach(shader => gl.deleteShader(shader));
    gl.useProgram(program);
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    const uniforms = Object.fromEntries(['viewport','framebuffer','rippleOrigin','frameValues[0]','ink'].map(name => [name, gl.getUniformLocation(program, name)]));
    const frameValues = new Float32Array(8);
    const homeLocation = gl.getAttribLocation(program, 'home'), stateLocation = gl.getAttribLocation(program, 'state');
    let homes;
    let width = 0, height = 0, scale = 1, count = 0, current = 0;
    let frame = null, lastTime = 0, lastScroll = -Infinity, settleUntil = 0, lost = false;
    let ripple = null;
    let quality = 1, sampleFrames = 0, sampleTime = 0, severeFrames = 0;
    const pointer = { x: 0, y: 0, active: false, pressed: false, at: 0, touch: false };
    const smooth = { x: 0, y: 0 };
    function permitted() { return !lost && enabled; }
    function palette() {
        const pink = alternate;
        const bg = pink ? [25/255,23/255,27/255] : [17/255,17/255,19/255];
        gl.clearColor(...bg, 1);
        gl.uniform3fv(uniforms.ink, pink ? [245/255,178/255,207/255] : [235/255,235/255,230/255]);
    }
    function render(steps = 0, concentration = 0, time = performance.now()) {
        frameValues[0]=smooth.x;frameValues[1]=smooth.y;frameValues[2]=pointer.active?1:0;frameValues[3]=pointer.pressed?1:0;
        frameValues[4]=steps;frameValues[5]=concentration;frameValues[6]=ripple?(time-ripple.at)/1000:-1;frameValues[7]=scale;
        gl.uniform4fv(uniforms['frameValues[0]'],frameValues);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.bindVertexArray(arrays[current]); gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, feedback[1-current]);
        gl.beginTransformFeedback(gl.POINTS); gl.drawArrays(gl.POINTS, 0, count); gl.endTransformFeedback();
        gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK,null);
        current = 1-current;
    }
    function clearState() {
        gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK,null);
        const zeros = new Float32Array(count * 4);
        for (let i = 1; i < buffers.length; i++) { gl.bindBuffer(gl.ARRAY_BUFFER, buffers[i]); gl.bufferSubData(gl.ARRAY_BUFFER, 0, zeros); }
        gl.bindBuffer(gl.ARRAY_BUFFER,null);
    }
    function reset() {
        if (frame !== null) cancelAnimationFrame(frame);
        frame = null; lastTime = 0; sampleFrames=0;sampleTime=0;severeFrames=0; pointer.active = pointer.pressed = false; ripple = null;

        if (!lost && count) clearState();
        if (!lost && count) render();
    }
    function resize() {
        if (lost) return;
        const nextScale = Math.min(dpr, 1.5) * quality;
        if (width === viewWidth && height === viewHeight && scale === nextScale) return;
        if (frame !== null) cancelAnimationFrame(frame); frame = null; lastTime = 0;
        width = viewWidth; height = viewHeight; scale = nextScale;
        canvas.width = Math.round(width * scale); canvas.height = Math.round(height * scale);

        gl.viewport(0,0,canvas.width,canvas.height);gl.uniform2f(uniforms.framebuffer,canvas.width,canvas.height);
        gl.uniform2f(uniforms.viewport,width,height);
        const spacing = 24 / Math.sqrt(5), columns = Math.ceil((width-12)/spacing), rows = Math.ceil((height-12)/spacing);
        count = columns * rows; postMessage({type:"ready",count});
        homes = new Float32Array(count*2);
        for (let row=0;row<rows;row++) for(let col=0;col<columns;col++) { const i=(row*columns+col)*2; homes[i]=12+col*spacing; homes[i+1]=12+row*spacing; }
        arrays.forEach(v=>gl.deleteVertexArray(v)); arrays.length=0;
        feedback.forEach(v=>gl.deleteTransformFeedback(v)); feedback.length=0;
        buffers.forEach(v=>gl.deleteBuffer(v)); buffers.length=0;
        const homeBuffer=gl.createBuffer(); buffers.push(homeBuffer); gl.bindBuffer(gl.ARRAY_BUFFER,homeBuffer); gl.bufferData(gl.ARRAY_BUFFER,homes,gl.STATIC_DRAW);
        for(let i=0;i<2;i++) {
            const buffer=gl.createBuffer(); buffers.push(buffer); gl.bindBuffer(gl.ARRAY_BUFFER,buffer); gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(count*4),gl.DYNAMIC_COPY);
            const vao=gl.createVertexArray(); arrays.push(vao); gl.bindVertexArray(vao);
            gl.bindBuffer(gl.ARRAY_BUFFER,homeBuffer); gl.enableVertexAttribArray(homeLocation); gl.vertexAttribPointer(homeLocation,2,gl.FLOAT,false,0,0);
            gl.bindBuffer(gl.ARRAY_BUFFER,buffer); gl.enableVertexAttribArray(stateLocation); gl.vertexAttribPointer(stateLocation,4,gl.FLOAT,false,0,0);
            const tf=gl.createTransformFeedback(); feedback.push(tf); gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK,tf); gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER,0,buffer);
        }
        gl.bindVertexArray(null); gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK,null);gl.bindBuffer(gl.ARRAY_BUFFER,null);gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER,null);
        current=0; pointer.active=pointer.pressed=false; ripple=null; palette(); render();
    }
    function requestDraw() { if(frame===null && permitted()) frame=requestAnimationFrame(draw); }
    function draw(time) {
        frame=null; if(!permitted()) return;
        const gap=lastTime?time-lastTime:1000/60;
        const elapsed=Math.min(50,gap); lastTime=time;
        sampleFrames++; sampleTime+=gap; severeFrames=gap>50?severeFrames+1:0;
        // Average a full second; isolated startup stalls must not keep lowering quality.
        if(sampleFrames>=60 || severeFrames>=4) {
            if(sampleTime/sampleFrames>17.5 && quality>.26) {
                quality=Math.max(.25,quality*Math.min(.7,Math.sqrt(16/(sampleTime/sampleFrames))));
                scale=Math.min(dpr,1.5)*quality;
                canvas.width=Math.round(width*scale);canvas.height=Math.round(height*scale);
                gl.viewport(0,0,canvas.width,canvas.height);gl.uniform2f(uniforms.framebuffer,canvas.width,canvas.height);
                postMessage({type:'quality',quality});
            }
            sampleFrames=0;sampleTime=0;severeFrames=0;
        }
        const follow=1-Math.pow(.82,elapsed/(1000/60));
        smooth.x+=(pointer.x-smooth.x)*follow; smooth.y+=(pointer.y-smooth.y)*follow;

        const held=pointer.pressed?Math.max(0,time-pointer.at-250):0;
        const concentration=1-Math.exp(-held/2500);
        render(elapsed/(1000/60),concentration,time);
        stats.frames++; stats.gaps.push(gap); if(stats.gaps.length>600)stats.gaps.shift();
        if(ripple && time-ripple.at>450) ripple=null;
        const following=Math.abs(pointer.x-smooth.x)+Math.abs(pointer.y-smooth.y)>.05;
        if(following) settleUntil=time+650;
        if(following || time<settleUntil || ripple || pointer.pressed && concentration<.995) requestDraw();
        else lastTime=0;
    }

    handleMessage=m=>{
        if(m.type==='aim' || m.type==='down') {
            if(!enabled)return;
            if(!pointer.active){smooth.x=m.x;smooth.y=m.y;}
            pointer.x=m.x;pointer.y=m.y;pointer.active=true;
            if(m.type==='down'){pointer.pressed=m.pressed;pointer.at=performance.now();}
            settleUntil=performance.now()+650;requestDraw();
        } else if(m.type==='up') {
            if(m.click){ripple={x:pointer.x,y:pointer.y,at:performance.now()};gl.uniform2f(uniforms.rippleOrigin,ripple.x,ripple.y);}
            pointer.pressed=false;if(m.touch)pointer.active=false;
            settleUntil=performance.now()+800;requestDraw();
        } else if(m.type==='reset'){reset();}
        else if(m.type==='enabled'){enabled=m.value;reset();}
        else if(m.type==='theme'){alternate=m.value;reset();palette();render();}
        else if(m.type==='halo-init'){haloCanvas=m.canvas;haloContext=haloCanvas.getContext('2d');}
        else if(m.type==='halo'){renderHalo(m);}
        else if(m.type==='resize'){viewWidth=m.width;viewHeight=m.height;dpr=m.dpr;resize();}
        else if(m.type==='quality'){quality=Math.min(quality,m.value);scale=Math.min(dpr,1.5)*quality;canvas.width=Math.round(width*scale);canvas.height=Math.round(height*scale);gl.viewport(0,0,canvas.width,canvas.height);gl.uniform2f(uniforms.framebuffer,canvas.width,canvas.height);}
        else if(m.type==='inspect'){
            let physics;
            if(m.physics){
                gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK,null);const data=new Float32Array(count*4);gl.bindBuffer(gl.ARRAY_BUFFER,buffers[current+1]);gl.getBufferSubData(gl.ARRAY_BUFFER,0,data);gl.bindBuffer(gl.ARRAY_BUFFER,null);
                let total=0,n=0,near=0;
                for(let i=0;i<count;i++){
                    const x=homes[i*2],y=homes[i*2+1],distance=Math.hypot(x-pointer.x,y-pointer.y);
                    if(distance<190){const actual=Math.hypot(x+data[i*4]-pointer.x,y+data[i*4+1]-pointer.y);total+=actual;n++;if(actual<50)near++;}
                }
                physics={mean:total/n,near,error:gl.getError()};
            }
            postMessage({type:'stats',id:m.id,...stats,now:performance.now(),quality,count,scale,active:frame!==null,physics,haloLevels:haloGroups.map(group=>group.dx)});
        }
    };
    canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();lost=true;if(frame!==null)cancelAnimationFrame(frame);postMessage({type:'failed'});},{once:true});
    resize();
}
