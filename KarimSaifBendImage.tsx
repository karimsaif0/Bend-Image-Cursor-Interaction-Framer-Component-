/**
 * Made with 💛 by Karim Saif
 * Created and customized for Framer by Karim Saif
 *
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 800
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 */
"use client"
import * as React from "react"
import {
    addPropertyControls,
    ControlType,
    useIsStaticRenderer,
    useReducedMotion,
} from "framer"
type Props = {
    image: string
    imageWidth: number
    imageHeight: number
    followSpeed: number
    bendStrength: number
    maxBend: number
    returnSpeed: number
    pixelated: boolean
    enableInteraction: boolean
    maxDpr: number
    alt: string
    style?: React.CSSProperties
}
type GLState = {
    gl: WebGLRenderingContext
    program: WebGLProgram
    positionBuffer: WebGLBuffer
    uvBuffer: WebGLBuffer
    indexBuffer: WebGLBuffer
    texture: WebGLTexture
    positionLocation: number
    uvLocation: number
    resolutionLocation: WebGLUniformLocation | null
    imageSizeLocation: WebGLUniformLocation | null
    offsetLocation: WebGLUniformLocation | null
    bendLocation: WebGLUniformLocation | null
    textureLocation: WebGLUniformLocation | null
    indexCount: number
}
type Motion = {
    x: number
    y: number
    targetX: number
    targetY: number
    bendX: number
    bendY: number
    inside: boolean
}
const GRID = 48
const MAX_PIXELS = 2400000
const TEXTURE_LIMIT = 4096
const EPSILON = 0.025
const VERTEX = `
attribute vec2 aPosition;
attribute vec2 aUv;
uniform vec2 uResolution;
uniform vec2 uImageSize;
uniform vec2 uOffset;
uniform vec2 uBend;
varying vec2 vUv;
void main() {
    vec2 p = aPosition;
    vec2 warped = p + vec2(
        uBend.x * p.y * p.y,
        uBend.y * p.x * p.x
    );
    vec2 position = warped * uImageSize + uOffset;
    gl_Position = vec4(
        position / (uResolution * 0.5),
        0.0,
        1.0
    );
    vUv = aUv;
}
`
const FRAGMENT = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform sampler2D uTexture;
varying vec2 vUv;
void main() {
    gl_FragColor = texture2D(uTexture, vUv);
}
`
function clamp(value: number, min: number, max: number) {
    return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : min
}
function createShader(gl: WebGLRenderingContext, type: number, source: string) {
    const shader = gl.createShader(type)
    if (!shader) return null
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        gl.deleteShader(shader)
        return null
    }
    return shader
}
function createProgram(gl: WebGLRenderingContext) {
    const vertex = createShader(gl, gl.VERTEX_SHADER, VERTEX)
    const fragment = createShader(gl, gl.FRAGMENT_SHADER, FRAGMENT)
    if (!vertex || !fragment) {
        if (vertex) gl.deleteShader(vertex)
        if (fragment) gl.deleteShader(fragment)
        return null
    }
    const program = gl.createProgram()
    if (!program) {
        gl.deleteShader(vertex)
        gl.deleteShader(fragment)
        return null
    }
    gl.attachShader(program, vertex)
    gl.attachShader(program, fragment)
    gl.linkProgram(program)
    gl.deleteShader(vertex)
    gl.deleteShader(fragment)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        gl.deleteProgram(program)
        return null
    }
    return program
}
function createGrid(gl: WebGLRenderingContext) {
    const positions: number[] = []
    const uvs: number[] = []
    const indices: number[] = []
    for (let y = 0; y <= GRID; y++) {
        const v = y / GRID
        const py = v * 2 - 1
        for (let x = 0; x <= GRID; x++) {
            const u = x / GRID
            const px = u * 2 - 1
            positions.push(px, py)
            uvs.push(u, v)
        }
    }
    const row = GRID + 1
    for (let y = 0; y < GRID; y++) {
        for (let x = 0; x < GRID; x++) {
            const a = y * row + x
            const b = a + 1
            const c = a + row
            const d = c + 1
            indices.push(a, c, b, b, c, d)
        }
    }
    const positionBuffer = gl.createBuffer()
    const uvBuffer = gl.createBuffer()
    const indexBuffer = gl.createBuffer()
    if (!positionBuffer || !uvBuffer || !indexBuffer) {
        if (positionBuffer) gl.deleteBuffer(positionBuffer)
        if (uvBuffer) gl.deleteBuffer(uvBuffer)
        if (indexBuffer) gl.deleteBuffer(indexBuffer)
        return null
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW)
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uvs), gl.STATIC_DRAW)
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer)
    gl.bufferData(
        gl.ELEMENT_ARRAY_BUFFER,
        new Uint16Array(indices),
        gl.STATIC_DRAW
    )
    return {
        positionBuffer,
        uvBuffer,
        indexBuffer,
        indexCount: indices.length,
    }
}
function createTexture(
    gl: WebGLRenderingContext,
    image: HTMLImageElement,
    pixelated: boolean
) {
    const texture = gl.createTexture()
    if (!texture) return null
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, texture)
    const filter = pixelated ? gl.NEAREST : gl.LINEAR
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true)
    const maxTexture = Math.min(
        TEXTURE_LIMIT,
        gl.getParameter(gl.MAX_TEXTURE_SIZE) as number
    )
    const width = image.naturalWidth
    const height = image.naturalHeight
    const scale = Math.min(1, maxTexture / width, maxTexture / height)
    let source: TexImageSource = image
    if (scale < 1) {
        const temp = document.createElement("canvas")
        temp.width = Math.max(1, Math.floor(width * scale))
        temp.height = Math.max(1, Math.floor(height * scale))
        const ctx = temp.getContext("2d")
        if (!ctx) {
            gl.deleteTexture(texture)
            return null
        }
        ctx.imageSmoothingEnabled = !pixelated
        ctx.imageSmoothingQuality = "high"
        ctx.drawImage(image, 0, 0, temp.width, temp.height)
        source = temp
    }
    while (gl.getError() !== gl.NO_ERROR) {}
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source)
    if (gl.getError() !== gl.NO_ERROR) {
        gl.deleteTexture(texture)
        return null
    }
    return texture
}
function setupGL(
    canvas: HTMLCanvasElement,
    image: HTMLImageElement,
    pixelated: boolean
): GLState | null {
    const gl = canvas.getContext("webgl", {
        alpha: true,
        antialias: false,
        depth: false,
        stencil: false,
        premultipliedAlpha: true,
        preserveDrawingBuffer: false,
        powerPreference: "low-power",
    })
    if (!gl || gl.isContextLost()) return null
    const program = createProgram(gl)
    if (!program) return null
    const grid = createGrid(gl)
    if (!grid) {
        gl.deleteProgram(program)
        return null
    }
    const texture = createTexture(gl, image, pixelated)
    if (!texture) {
        gl.deleteBuffer(grid.positionBuffer)
        gl.deleteBuffer(grid.uvBuffer)
        gl.deleteBuffer(grid.indexBuffer)
        gl.deleteProgram(program)
        return null
    }
    gl.useProgram(program)
    gl.disable(gl.DEPTH_TEST)
    gl.disable(gl.CULL_FACE)
    gl.disable(gl.BLEND)
    return {
        gl,
        program,
        ...grid,
        texture,
        positionLocation: gl.getAttribLocation(program, "aPosition"),
        uvLocation: gl.getAttribLocation(program, "aUv"),
        resolutionLocation: gl.getUniformLocation(program, "uResolution"),
        imageSizeLocation: gl.getUniformLocation(program, "uImageSize"),
        offsetLocation: gl.getUniformLocation(program, "uOffset"),
        bendLocation: gl.getUniformLocation(program, "uBend"),
        textureLocation: gl.getUniformLocation(program, "uTexture"),
    }
}
function destroyGL(state: GLState | null) {
    if (!state) return
    const gl = state.gl
    if (gl.isContextLost()) return
    gl.deleteBuffer(state.positionBuffer)
    gl.deleteBuffer(state.uvBuffer)
    gl.deleteBuffer(state.indexBuffer)
    gl.deleteTexture(state.texture)
    gl.deleteProgram(state.program)
}
function getLayout(
    containerWidth: number,
    containerHeight: number,
    desiredWidth: number,
    desiredHeight: number,
    naturalWidth: number,
    naturalHeight: number
) {
    const boxWidth = clamp(desiredWidth, 1, 4000)
    const boxHeight = clamp(desiredHeight, 1, 4000)
    const fit = Math.min(
        1,
        (containerWidth * 0.95) / boxWidth,
        (containerHeight * 0.95) / boxHeight
    )
    const maxWidth = boxWidth * fit
    const maxHeight = boxHeight * fit
    const aspect = naturalWidth / Math.max(1, naturalHeight)
    const width = Math.min(maxWidth, maxHeight * aspect)
    const height = width / aspect
    return {
        width: Math.max(1, width),
        height: Math.max(1, height),
    }
}
export default function KarimSaifBendImage(props: Props) {
    const {
        image,
        imageWidth,
        imageHeight,
        followSpeed,
        bendStrength,
        maxBend,
        returnSpeed,
        pixelated,
        enableInteraction,
        maxDpr,
        alt,
        style,
    } = props
    const containerRef = React.useRef<HTMLDivElement>(null)
    const canvasRef = React.useRef<HTMLCanvasElement>(null)
    const glRef = React.useRef<GLState | null>(null)
    const wakeRef = React.useRef<(() => void) | null>(null)
    const resizeRef = React.useRef<(() => void) | null>(null)
    const redrawRef = React.useRef<(() => void) | null>(null)
    const [renderState, setRenderState] = React.useState<{
        image: string
        mode: "fallback" | "webgl"
    }>({
        image,
        mode: "fallback",
    })
    const [naturalSize, setNaturalSize] = React.useState<{
        image: string
        width: number
        height: number
    }>({
        image: "",
        width: 0,
        height: 0,
    })
    const reducedMotion = useReducedMotion()
    const isStatic = useIsStaticRenderer()
    const configRef = React.useRef(props)
    configRef.current = props
    const motionRef = React.useRef<Motion>({
        x: 0,
        y: 0,
        targetX: 0,
        targetY: 0,
        bendX: 0,
        bendY: 0,
        inside: false,
    })
    React.useEffect(() => {
        const container = containerRef.current
        const canvas = canvasRef.current
        if (!container || !canvas || isStatic) return
        let disposed = false
        let pendingImage: HTMLImageElement | null = null
        let loadedImage: HTMLImageElement | null = null
        let raf: number | null = null
        let resizeObserver: ResizeObserver | null = null
        let intersectionObserver: IntersectionObserver | null = null
        let inView = true
        let contextLost = false
        let lastFrame = 0
        let needsRedraw = true
        const motion = motionRef.current
        motion.x = 0
        motion.y = 0
        motion.targetX = 0
        motion.targetY = 0
        motion.bendX = 0
        motion.bendY = 0
        motion.inside = false
        const stop = () => {
            if (raf !== null) {
                cancelAnimationFrame(raf)
                raf = null
            }
            lastFrame = 0
        }
        const canDraw = () =>
            !disposed &&
            !contextLost &&
            !document.hidden &&
            inView &&
            glRef.current !== null
        const resize = () => {
            const state = glRef.current
            if (!state) return
            const rect = container.getBoundingClientRect()
            if (rect.width <= 0 || rect.height <= 0) return
            const maxRatio = clamp(configRef.current.maxDpr, 1, 2)
            const deviceRatio = Math.min(window.devicePixelRatio || 1, maxRatio)
            const pixelRatio = Math.min(
                deviceRatio,
                Math.sqrt(MAX_PIXELS / (rect.width * rect.height))
            )
            const width = Math.max(1, Math.round(rect.width * pixelRatio))
            const height = Math.max(1, Math.round(rect.height * pixelRatio))
            if (canvas.width !== width || canvas.height !== height) {
                canvas.width = width
                canvas.height = height
                needsRedraw = true
            }
            state.gl.viewport(0, 0, width, height)
        }
        const draw = () => {
            const state = glRef.current
            if (!state || !loadedImage || !canDraw()) return
            const gl = state.gl
            const rect = container.getBoundingClientRect()
            if (rect.width <= 0 || rect.height <= 0) return
            const width = canvas.width
            const height = canvas.height
            const scaleX = width / rect.width
            const scaleY = height / rect.height
            const config = configRef.current
            const layout = getLayout(
                rect.width,
                rect.height,
                config.imageWidth,
                config.imageHeight,
                loadedImage.naturalWidth,
                loadedImage.naturalHeight
            )
            const halfWidth = layout.width * scaleX * 0.5
            const halfHeight = layout.height * scaleY * 0.5
            gl.viewport(0, 0, width, height)
            gl.clearColor(0, 0, 0, 0)
            gl.clear(gl.COLOR_BUFFER_BIT)
            gl.useProgram(state.program)
            gl.bindBuffer(gl.ARRAY_BUFFER, state.positionBuffer)
            gl.enableVertexAttribArray(state.positionLocation)
            gl.vertexAttribPointer(
                state.positionLocation,
                2,
                gl.FLOAT,
                false,
                0,
                0
            )
            gl.bindBuffer(gl.ARRAY_BUFFER, state.uvBuffer)
            gl.enableVertexAttribArray(state.uvLocation)
            gl.vertexAttribPointer(state.uvLocation, 2, gl.FLOAT, false, 0, 0)
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, state.indexBuffer)
            gl.uniform2f(state.resolutionLocation, width, height)
            gl.uniform2f(state.imageSizeLocation, halfWidth, halfHeight)
            gl.uniform2f(
                state.offsetLocation,
                motion.x * scaleX,
                -motion.y * scaleY
            )
            gl.uniform2f(
                state.bendLocation,
                config.enableInteraction && !reducedMotion ? motion.bendX : 0,
                config.enableInteraction && !reducedMotion ? motion.bendY : 0
            )
            gl.activeTexture(gl.TEXTURE0)
            gl.bindTexture(gl.TEXTURE_2D, state.texture)
            gl.uniform1i(state.textureLocation, 0)
            gl.drawElements(
                gl.TRIANGLES,
                state.indexCount,
                gl.UNSIGNED_SHORT,
                0
            )
            needsRedraw = false
        }
        const tick = (timestamp: number) => {
            raf = null
            if (!canDraw()) return
            const config = configRef.current
            if (reducedMotion || !config.enableInteraction) {
                motion.x = 0
                motion.y = 0
                motion.targetX = 0
                motion.targetY = 0
                motion.bendX = 0
                motion.bendY = 0
                motion.inside = false
                draw()
                return
            }
            const dt = lastFrame
                ? clamp((timestamp - lastFrame) / 16.667, 0.25, 3)
                : 1
            lastFrame = timestamp
            const speed = motion.inside
                ? clamp(config.followSpeed, 0.001, 1)
                : clamp(config.returnSpeed, 0.001, 1)
            const alpha = 1 - Math.pow(1 - speed, dt)
            const previousX = motion.x
            const previousY = motion.y
            motion.x += (motion.targetX - motion.x) * alpha
            motion.y += (motion.targetY - motion.y) * alpha
            const velocityX = (motion.x - previousX) / dt
            const velocityY = (motion.y - previousY) / dt
            const rect = container.getBoundingClientRect()
            const layout = loadedImage
                ? getLayout(
                      rect.width,
                      rect.height,
                      config.imageWidth,
                      config.imageHeight,
                      loadedImage.naturalWidth,
                      loadedImage.naturalHeight
                  )
                : {
                      width: config.imageWidth,
                      height: config.imageHeight,
                  }
            const halfW = Math.max(1, layout.width / 2)
            const halfH = Math.max(1, layout.height / 2)
            const limitX = clamp(config.maxBend / halfW, 0, 2)
            const limitY = clamp(config.maxBend / halfH, 0, 2)
            const desiredX = clamp(
                (-velocityX * config.bendStrength) / halfW,
                -limitX,
                limitX
            )
            const desiredY = clamp(
                (-velocityY * config.bendStrength) / halfH,
                -limitY,
                limitY
            )
            const bendAlpha = 1 - Math.pow(0.82, dt)
            motion.bendX += (desiredX - motion.bendX) * bendAlpha
            motion.bendY += (desiredY - motion.bendY) * bendAlpha
            draw()
            const moving =
                Math.abs(motion.targetX - motion.x) > EPSILON ||
                Math.abs(motion.targetY - motion.y) > EPSILON ||
                Math.abs(motion.bendX) > 0.0001 ||
                Math.abs(motion.bendY) > 0.0001
            if (moving && canDraw()) {
                raf = requestAnimationFrame(tick)
            } else {
                motion.x = motion.targetX
                motion.y = motion.targetY
                motion.bendX = 0
                motion.bendY = 0
                draw()
                lastFrame = 0
            }
        }
        const wake = () => {
            if (!canDraw()) return
            if (raf === null) {
                raf = requestAnimationFrame(tick)
            }
        }
        const redraw = () => {
            needsRedraw = true
            wake()
        }
        wakeRef.current = wake
        resizeRef.current = resize
        redrawRef.current = redraw
        const initialize = () => {
            if (disposed || contextLost || !loadedImage) return
            stop()
            destroyGL(glRef.current)
            glRef.current = null
            try {
                glRef.current = setupGL(
                    canvas,
                    loadedImage,
                    configRef.current.pixelated
                )
            } catch {
                glRef.current = null
            }
            if (!glRef.current) {
                setRenderState({
                    image,
                    mode: "fallback",
                })
                return
            }
            needsRedraw = true
            resize()
            draw()
            setRenderState({
                image,
                mode: "webgl",
            })
            wake()
        }
        const onContextLost = (event: Event) => {
            event.preventDefault()
            contextLost = true
            stop()
            glRef.current = null
            setRenderState({
                image,
                mode: "fallback",
            })
        }
        const onContextRestored = () => {
            contextLost = false
            initialize()
        }
        const onPointerMove = (event: PointerEvent) => {
            const config = configRef.current
            if (
                !config.enableInteraction ||
                reducedMotion ||
                (event.pointerType !== "mouse" && event.pointerType !== "pen")
            ) {
                return
            }
            const rect = container.getBoundingClientRect()
            if (rect.width <= 0 || rect.height <= 0) return
            const x = event.clientX - rect.left
            const y = event.clientY - rect.top
            if (x < 0 || x > rect.width || y < 0 || y > rect.height) {
                motion.inside = false
                motion.targetX = 0
                motion.targetY = 0
            } else {
                motion.inside = true
                motion.targetX = x - rect.width / 2
                motion.targetY = y - rect.height / 2
            }
            wake()
        }
        const onPointerLeave = () => {
            motion.inside = false
            motion.targetX = 0
            motion.targetY = 0
            wake()
        }
        const onVisibilityChange = () => {
            if (document.hidden) {
                stop()
            } else if (inView) {
                redraw()
            }
        }
        canvas.addEventListener("webglcontextlost", onContextLost)
        canvas.addEventListener("webglcontextrestored", onContextRestored)
        container.addEventListener("pointermove", onPointerMove, {
            passive: true,
        })
        container.addEventListener("pointerleave", onPointerLeave)
        document.addEventListener("visibilitychange", onVisibilityChange)
        if (typeof ResizeObserver !== "undefined") {
            resizeObserver = new ResizeObserver(() => {
                resize()
                redraw()
            })
            resizeObserver.observe(container)
        }
        if (typeof IntersectionObserver !== "undefined") {
            intersectionObserver = new IntersectionObserver(
                (entries) => {
                    inView = !!entries[0]?.isIntersecting
                    if (inView && !document.hidden) {
                        redraw()
                    } else {
                        stop()
                    }
                },
                { threshold: 0 }
            )
            intersectionObserver.observe(container)
        }
        if (image) {
            const img = new Image()
            pendingImage = img
            img.crossOrigin = "anonymous"
            img.decoding = "async"
            img.onload = () => {
                if (disposed) return
                loadedImage = img
                pendingImage = null
                setNaturalSize({
                    image,
                    width: img.naturalWidth,
                    height: img.naturalHeight,
                })
                initialize()
            }
            img.onerror = () => {
                if (disposed) return
                pendingImage = null
                setRenderState({
                    image,
                    mode: "fallback",
                })
            }
            img.src = image
        } else {
            setRenderState({
                image,
                mode: "fallback",
            })
        }
        return () => {
            disposed = true
            stop()
            wakeRef.current = null
            resizeRef.current = null
            redrawRef.current = null
            resizeObserver?.disconnect()
            intersectionObserver?.disconnect()
            container.removeEventListener("pointermove", onPointerMove)
            container.removeEventListener("pointerleave", onPointerLeave)
            canvas.removeEventListener("webglcontextlost", onContextLost)
            canvas.removeEventListener(
                "webglcontextrestored",
                onContextRestored
            )
            document.removeEventListener("visibilitychange", onVisibilityChange)
            if (pendingImage) {
                pendingImage.onload = null
                pendingImage.onerror = null
            }
            if (loadedImage) {
                loadedImage.onload = null
                loadedImage.onerror = null
            }
            destroyGL(glRef.current)
            glRef.current = null
        }
    }, [image, isStatic, reducedMotion])
    React.useEffect(() => {
        const state = glRef.current
        if (!state || state.gl.isContextLost()) return
        const gl = state.gl
        const filter = pixelated ? gl.NEAREST : gl.LINEAR
        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, state.texture)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter)
        redrawRef.current?.()
    }, [pixelated])
    React.useEffect(() => {
        resizeRef.current?.()
        redrawRef.current?.()
    }, [imageWidth, imageHeight, maxDpr])
    React.useEffect(() => {
        if (!enableInteraction || reducedMotion) {
            const motion = motionRef.current
            motion.x = 0
            motion.y = 0
            motion.targetX = 0
            motion.targetY = 0
            motion.bendX = 0
            motion.bendY = 0
            motion.inside = false
        }
        redrawRef.current?.()
    }, [enableInteraction, reducedMotion])
    React.useEffect(() => {
        redrawRef.current?.()
    }, [followSpeed, bendStrength, maxBend, returnSpeed])
    const showWebGL =
        !isStatic && renderState.image === image && renderState.mode === "webgl"
    const knownSize =
        naturalSize.image === image &&
        naturalSize.width > 0 &&
        naturalSize.height > 0
    const aspect = knownSize
        ? naturalSize.width / naturalSize.height
        : imageWidth / Math.max(1, imageHeight)
    const fallbackStyle: React.CSSProperties = {
        position: "absolute",
        left: "50%",
        top: "50%",
        width: `min(${Math.max(1, imageWidth)}px, 95%)`,
        height: `min(${Math.max(1, imageHeight)}px, 95%)`,
        objectFit: "contain",
        transform: "translate(-50%, -50%)",
        imageRendering: pixelated ? "pixelated" : "auto",
        pointerEvents: "none",
        userSelect: "none",
    }
    return (
        <div
            ref={containerRef}
            role="img"
            aria-label={alt || "Interactive bending image"}
            style={{
                ...style,
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "hidden",
                background: "transparent",
                touchAction: "auto",
                userSelect: "none",
                isolation: "isolate",
            }}
        >
            {!isStatic && (
                <canvas
                    ref={canvasRef}
                    aria-hidden="true"
                    style={{
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                        display: "block",
                        pointerEvents: "none",
                        opacity: showWebGL ? 1 : 0,
                    }}
                />
            )}
            {!showWebGL &&
                (image ? (
                    <img
                        src={image}
                        alt=""
                        draggable={false}
                        style={fallbackStyle}
                    />
                ) : (
                    <div
                        style={{
                            position: "absolute",
                            inset: "20%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            border: "1px dashed #99999966",
                            borderRadius: 12,
                            color: "#999",
                            fontFamily: "Inter, sans-serif",
                            fontSize: 14,
                            textAlign: "center",
                            padding: 16,
                        }}
                    >
                        Select an image in the Framer properties panel
                    </div>
                ))}
        </div>
    )
}
KarimSaifBendImage.displayName = "Karim Saif Bend Image"
KarimSaifBendImage.defaultProps = {
    image: "",
    imageWidth: 540,
    imageHeight: 304,
    followSpeed: 0.1,
    bendStrength: 1.5,
    maxBend: 45,
    returnSpeed: 0.08,
    pixelated: false,
    enableInteraction: true,
    maxDpr: 2,
    alt: "Interactive bending image",
}
addPropertyControls(KarimSaifBendImage, {
    image: {
        type: ControlType.Image,
        title: "Image",
        description:
            "Choose the image that follows the pointer and bends with movement.",
    },
    imageWidth: {
        type: ControlType.Number,
        title: "Width",
        defaultValue: 540,
        min: 20,
        max: 4000,
        step: 1,
        unit: "px",
        description:
            "Sets the maximum display width of the image before responsive fitting.",
    },
    imageHeight: {
        type: ControlType.Number,
        title: "Height",
        defaultValue: 304,
        min: 20,
        max: 4000,
        step: 1,
        unit: "px",
        description:
            "Sets the maximum display height of the image before responsive fitting.",
    },
    followSpeed: {
        type: ControlType.Number,
        title: "Follow Speed",
        defaultValue: 0.1,
        min: 0.01,
        max: 0.5,
        step: 0.01,
        description:
            "Controls how quickly the image catches up with pointer movement.",
    },
    bendStrength: {
        type: ControlType.Number,
        title: "Bend Strength",
        defaultValue: 1.5,
        min: 0,
        max: 8,
        step: 0.1,
        description:
            "Controls the intensity of the elastic distortion generated by pointer velocity.",
    },
    maxBend: {
        type: ControlType.Number,
        title: "Max Bend",
        defaultValue: 45,
        min: 0,
        max: 200,
        step: 1,
        unit: "px",
        description:
            "Limits how far the image geometry can bend during rapid movement.",
    },
    returnSpeed: {
        type: ControlType.Number,
        title: "Return Speed",
        defaultValue: 0.08,
        min: 0.01,
        max: 0.5,
        step: 0.01,
        description:
            "Controls how quickly the image returns to its original position when the pointer leaves.",
    },
    pixelated: {
        type: ControlType.Boolean,
        title: "Pixelated",
        defaultValue: false,
        enabledTitle: "On",
        disabledTitle: "Off",
        description:
            "Switches between crisp nearest-neighbor texture sampling and smooth linear filtering.",
    },
    enableInteraction: {
        type: ControlType.Boolean,
        title: "Interaction",
        defaultValue: true,
        enabledTitle: "On",
        disabledTitle: "Off",
        description:
            "Enables or disables pointer tracking and elastic bending.",
    },
    maxDpr: {
        type: ControlType.Number,
        title: "Max DPR",
        defaultValue: 2,
        min: 1,
        max: 2,
        step: 0.5,
        description:
            "Limits rendering resolution to improve GPU performance on high-density displays.",
    },
    alt: {
        type: ControlType.String,
        title: "Alt Text",
        defaultValue: "Interactive bending image",
        description: "Made with 💛 by [@karimsaif](https://x.com/karimsaif0)",
    },
})
