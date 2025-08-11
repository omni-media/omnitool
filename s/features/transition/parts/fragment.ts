export const fragment = (glsl: string) => `
	precision highp float;
	varying vec2 vTextureCoord;
	varying vec2 _uv;
	uniform sampler2D from, to;
	uniform float progress, ratio, _fromR, _toR;
	uniform float customUniform;

	vec4 getFromColor(vec2 uv){
		return texture2D(from, .5+(uv-.5)*vec2(max(ratio/_fromR,1.), max(_fromR/ratio,1.)));
	}
	vec4 getToColor(vec2 uv){
		return texture2D(to, .5+(uv-.5)*vec2(max(ratio/_toR,1.), max(_toR/ratio,1.)));
	}

	// gl-transition code here
	${glsl}
	// gl-transition code end

	void main(){
		vec2 uv = vTextureCoord.xy;
		gl_FragColor = transition(vTextureCoord);
	}
`
