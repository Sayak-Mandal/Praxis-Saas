import { useEffect, RefObject } from 'react'

/**
 * Enables auto-scroll on text selection drag inside a scrollable container.
 * When the user drags a text selection near the top or bottom edge of the
 * container, it scrolls automatically — mirroring native browser behaviour
 * that only works on the window, not on overflow-y:auto divs.
 */
export function useScrollOnSelect(ref: RefObject<HTMLDivElement | null>) {
    useEffect(() => {
        const el = ref.current
        if (!el) return

        let animationFrame: number | null = null

        const onMouseMove = (e: MouseEvent) => {
            // Only active while the user is holding a mouse button (drag-select)
            if (e.buttons === 0) {
                if (animationFrame !== null) {
                    cancelAnimationFrame(animationFrame)
                    animationFrame = null
                }
                return
            }

            const { top, bottom, height } = el.getBoundingClientRect()
            const ZONE = Math.min(80, height * 0.15) // scroll activation zone in px
            const MAX_SPEED = 15 // max px per frame

            const scroll = () => {
                const rect = el.getBoundingClientRect()
                const distFromBottom = rect.bottom - e.clientY
                const distFromTop = e.clientY - rect.top

                if (distFromBottom < ZONE && distFromBottom > 0) {
                    // Near bottom — scroll down
                    const speed = Math.round(MAX_SPEED * (1 - distFromBottom / ZONE))
                    el.scrollTop += speed
                } else if (distFromTop < ZONE && distFromTop > 0) {
                    // Near top — scroll up
                    const speed = Math.round(MAX_SPEED * (1 - distFromTop / ZONE))
                    el.scrollTop -= speed
                }
            }

            // Use the closure over current mouse coords
            void top; void bottom // used via e.clientY above
            if (animationFrame !== null) cancelAnimationFrame(animationFrame)
            animationFrame = requestAnimationFrame(scroll)
        }

        const onMouseUp = () => {
            if (animationFrame !== null) {
                cancelAnimationFrame(animationFrame)
                animationFrame = null
            }
        }

        el.addEventListener('mousemove', onMouseMove)
        el.addEventListener('mouseup', onMouseUp)

        return () => {
            el.removeEventListener('mousemove', onMouseMove)
            el.removeEventListener('mouseup', onMouseUp)
            if (animationFrame !== null) cancelAnimationFrame(animationFrame)
        }
    }, [ref])
}
