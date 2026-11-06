package kr.immanuel.haru

import android.app.Activity
import android.content.Intent
import android.media.AudioAttributes
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.VibrationEffect
import android.os.Vibrator
import android.view.WindowManager
import android.widget.LinearLayout
import java.lang.ref.WeakReference

/** 일과 알림 화면: 확인을 누를 때까지 손목에서 진동이 되풀이된다. */
class RoutineAlertActivity : Activity() {
    private val h = Handler(Looper.getMainLooper())
    private lateinit var box: LinearLayout
    private var key = ""

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setShowWhenLocked(true)
        setTurnScreenOn(true)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        box = Ui.page(this)
        live = WeakReference(this)
        load(intent)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        load(intent)
    }

    private fun load(i: Intent) {
        key = i.getStringExtra("key") ?: ""
        if (key.isEmpty() || WRoutine.isAcked(this, key)) { finish(); return }
        box.removeAllViews()
        box.addView(Ui.text(this, i.getStringExtra("e") ?: "⏰", 40f))
        box.addView(Ui.text(this, i.getStringExtra("t") ?: "", 18f, bold = true))
        box.addView(Ui.gap(this, 4f))
        box.addView(Ui.text(this, i.getStringExtra("b") ?: "", 13f, Ui.GRAY))
        box.addView(Ui.button(this, "✓  확인", Ui.GREEN) {
            WRoutine.ack(this, key, true)
            finish()
        }.apply { minHeight = Ui.dp(this@RoutineAlertActivity, 60f) })
        vibrate()
    }

    /** 1분 동안 진동을 되풀이한다. 그 뒤로는 30초마다 다시 오는 알림이 진동한다. */
    private fun vibrate() {
        val v = getSystemService(Vibrator::class.java) ?: return
        val attrs = AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).build()
        @Suppress("DEPRECATION")
        runCatching { v.vibrate(VibrationEffect.createWaveform(longArrayOf(0, 600, 400, 600, 1400), 0), attrs) }
        h.removeCallbacksAndMessages(null)
        h.postDelayed({ v.cancel() }, 60_000)
    }

    override fun onDestroy() {
        h.removeCallbacksAndMessages(null)
        getSystemService(Vibrator::class.java)?.cancel()
        if (live?.get() === this) live = null
        super.onDestroy()
    }

    companion object {
        private var live: WeakReference<RoutineAlertActivity>? = null

        /** 다른 곳(폰, 알림의 확인 단추)에서 확인했을 때 열린 화면을 닫는다. */
        fun closeFor(key: String) {
            val a = live?.get() ?: return
            a.runOnUiThread { if (a.key == key) a.finish() }
        }
    }
}
