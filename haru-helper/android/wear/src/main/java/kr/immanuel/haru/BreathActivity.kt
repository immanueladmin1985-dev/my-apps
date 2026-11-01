package kr.immanuel.haru

import android.animation.ValueAnimator
import android.app.Activity
import android.content.Context
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.RadialGradient
import android.graphics.Shader
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.View
import android.view.WindowManager
import android.view.animation.AccelerateDecelerateInterpolator

/**
 * 숨 고르기: 원이 커지면 들이쉬고(4초), 작아지면 내쉰다(6초).
 * 들이쉴 때 한 번, 내쉴 때 두 번 진동해서 화면을 보지 않아도 따라 할 수 있다. 누르면 끝난다.
 */
class BreathActivity : Activity() {
    private val h = Handler(Looper.getMainLooper())
    private lateinit var orb: Orb
    private var end = 0L
    private var anim: ValueAnimator? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        orb = Orb(this)
        orb.setOnClickListener { finish() }
        setContentView(orb)
        end = System.currentTimeMillis() + 2 * 60_000L + 1500
        orb.label = "준비"
        orb.sub = "편하게 어깨 힘을 빼요"
        h.postDelayed({ phase(true) }, 1500)
    }

    private fun phase(inhale: Boolean) {
        if (isFinishing) return
        val left = end - System.currentTimeMillis()
        if (left <= 0) { done(); return }
        val ms = if (inhale) 4000L else 6000L
        orb.label = if (inhale) "들이쉬기" else "내쉬기"
        orb.sub = "남은 시간 ${Fmt.mmss(left)}"
        if (inhale) WStore.buzz(this, 70) else WStore.buzz(this, 40, 90, 40)
        anim?.cancel()
        anim = ValueAnimator.ofFloat(orb.scale, if (inhale) 1f else 0.45f).apply {
            duration = ms
            interpolator = AccelerateDecelerateInterpolator()
            addUpdateListener { orb.scale = it.animatedValue as Float; orb.invalidate() }
            start()
        }
        h.postDelayed({ phase(!inhale) }, ms)
    }

    private fun done() {
        anim?.cancel()
        orb.label = "잘했어요 🌿"
        orb.sub = "누르면 닫혀요"
        orb.invalidate()
        WStore.buzz(this, 60, 100, 60)
        h.postDelayed({ finish() }, 6000)
    }

    override fun onDestroy() {
        h.removeCallbacksAndMessages(null)
        anim?.cancel()
        super.onDestroy()
    }

    private class Orb(ctx: Context) : View(ctx) {
        var scale = 0.45f
        var label = ""
        var sub = ""
        private val fill = Paint(Paint.ANTI_ALIAS_FLAG)
        private val ring = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE; color = 0x5514B8A6; strokeWidth = 3f }
        private val big = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = 0xFFFFFFFF.toInt(); textAlign = Paint.Align.CENTER; isFakeBoldText = true }
        private val small = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = 0xFFB4B2C8.toInt(); textAlign = Paint.Align.CENTER }

        override fun onDraw(c: Canvas) {
            c.drawColor(0xFF000000.toInt())
            val cx = width / 2f
            val cy = height / 2f
            val maxR = minOf(width, height) * 0.36f
            c.drawCircle(cx, cy, maxR, ring)
            val r = maxR * scale
            fill.shader = RadialGradient(cx - r * 0.3f, cy - r * 0.35f, r * 1.4f, 0xFFB9F3F7.toInt(), 0xFF0E7490.toInt(), Shader.TileMode.CLAMP)
            c.drawCircle(cx, cy, r, fill)
            big.textSize = width * 0.085f
            small.textSize = width * 0.055f
            c.drawText(label, cx, cy + big.textSize * 0.35f, big)
            c.drawText(sub, cx, height * 0.82f, small)
        }
    }
}
