package kr.immanuel.haru

import android.app.Activity
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.WindowManager
import android.widget.LinearLayout
import android.widget.TextView
import org.json.JSONObject

/**
 * 단계별 도우미(화났을 때 SOS, 먹고 싶을 때). 한 단계씩 보여 주고 ‘했어요’를 눌러야 다음으로 넘어간다.
 * 단계 내용은 폰 앱에서 정한 것을 그대로 쓴다.
 */
class StepsActivity : Activity() {
    private val h = Handler(Looper.getMainLooper())
    private lateinit var box: LinearLayout
    private var steps: List<Snap.Step> = emptyList()
    private var i = 0
    private var last = "ok"
    private val kind get() = intent?.getStringExtra("kind") ?: "sos"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        box = Ui.page(this)
        steps = WStore.snap(this).flow(kind)
        if (steps.isEmpty()) {
            box.addView(Ui.text(this, "폰 앱을 한 번 열어 주세요.\n단계가 아직 워치에 없어요.", 14f))
            return
        }
        paint()
    }

    private fun paint() {
        h.removeCallbacksAndMessages(null)
        val s = steps[i]
        box.removeAllViews()
        box.addView(Ui.text(this, "${i + 1} / ${steps.size}", 11f, Ui.GRAY))
        box.addView(Ui.text(this, s.e, 34f))
        box.addView(Ui.text(this, s.t, 17f, bold = true))
        box.addView(Ui.gap(this, 4f))
        box.addView(Ui.text(this, s.b, 13f, Ui.GRAY))
        val extra = Ui.text(this, "", 14f, Ui.AMBER, bold = true)
        box.addView(extra)
        box.addView(Ui.button(this, s.ok, if (kind == "sos") Ui.ROSE else Ui.INDIGO) { next("ok") })
        if (s.alt.isNotBlank()) box.addView(Ui.button(this, s.alt, Ui.CARD, Ui.GRAY) { next("alt") })
        WStore.buzz(this, 40)
        if (s.breath > 0) breathe(extra, s.breath, 0, true)
        if (s.timer > 0) countdown(extra, System.currentTimeMillis() + s.timer * Snap.MIN)
        (box.parent as? android.widget.ScrollView)?.scrollTo(0, 0)
    }

    private fun breathe(v: TextView, total: Int, n: Int, inhale: Boolean) {
        if (n >= total) { v.text = "잘했어요 👏"; WStore.buzz(this, 60, 100, 60); return }
        v.text = (if (inhale) "들이쉬기" else "내쉬기") + " · ${n + 1}/$total"
        if (inhale) WStore.buzz(this, 70) else WStore.buzz(this, 40, 90, 40)
        h.postDelayed({ breathe(v, total, if (inhale) n else n + 1, !inhale) }, if (inhale) 4000 else 6000)
    }

    private fun countdown(v: TextView, end: Long) {
        val left = end - System.currentTimeMillis()
        if (left <= 0) { v.text = "10분이 지났어요"; WStore.buzz(this, 300, 150, 300); return }
        v.text = "⏳ " + Fmt.mmss(left + 999)
        h.postDelayed({ countdown(v, end) }, 1000)
    }

    private fun next(choice: String) {
        last = choice
        i++
        if (i < steps.size) { paint(); return }
        h.removeCallbacksAndMessages(null)
        val passed = last == "ok"
        WStore.act(this, JSONObject().put("type", "flowDone").put("kind", kind).put("outcome", if (passed) "passed" else if (kind == "sos") "still" else "gave").put("from", "watch"))
        box.removeAllViews()
        box.addView(Ui.text(this, if (passed) "🌿" else "🫂", 40f))
        box.addView(Ui.text(this, if (passed) "잘 넘겼어요" else "괜찮아요", 18f, bold = true))
        box.addView(Ui.text(this, when {
            passed && kind == "sos" -> "멈춘 것만으로도 큰 일을 해냈어요."
            passed -> "충동 하나를 흘려보냈어요!"
            kind == "sos" -> "조금 더 걸으면서 숨을 고르세요. 지금은 대화로 돌아가지 않아도 돼요."
            else -> "한 번 먹을 만큼만 덜어서, 앉아서 천천히 먹어요."
        }, 13f, Ui.GRAY))
        box.addView(Ui.button(this, "마치기", Ui.CARD) { finish() })
        WStore.buzz(this, 60, 100, 60)
    }

    override fun onDestroy() {
        h.removeCallbacksAndMessages(null)
        super.onDestroy()
    }
}
