package kr.immanuel.haru

import android.app.Activity
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.Gravity
import android.view.WindowManager
import android.widget.LinearLayout
import android.widget.TextView
import org.json.JSONObject

/**
 * 대화 타이머: 내가 말할 때 큰 원을 누르고, 다 말하면 다시 누른다.
 * 정해 둔 시간(폰 앱의 대화 설정)보다 오래 이어서 말하면 손목에 진동으로만 살짝 알려 준다.
 */
class TalkActivity : Activity() {
    private val h = Handler(Looper.getMainLooper())
    private lateinit var total: TextView
    private lateinit var btn: TextView
    private lateinit var ratio: TextView
    private val start = System.currentTimeMillis()
    private var me = 0L
    private var curStart = 0L
    private var longest = 0L
    private var alerts = 0
    private var lastAlert = 0L
    private var limit = 45_000L
    private var ended = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        limit = WStore.snap(this).talkSec * 1000L
        val w = resources.displayMetrics.widthPixels
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setBackgroundColor(Ui.BG)
        }
        total = Ui.text(this, "0:00", 14f, Ui.GRAY, bold = true)
        btn = Ui.text(this, "", 15f, bold = true).apply {
            layoutParams = LinearLayout.LayoutParams((w * 0.56).toInt(), (w * 0.56).toInt()).apply { topMargin = Ui.dp(this@TalkActivity, 4f) }
            setOnClickListener { toggle() }
        }
        ratio = Ui.text(this, "", 12f, Ui.GRAY)
        val end = Ui.text(this, "끝내기", 13f, Ui.ROSE, bold = true).apply {
            setPadding(0, Ui.dp(this@TalkActivity, 6f), 0, 0)
            setOnClickListener { finishTalk() }
        }
        root.addView(total)
        root.addView(btn)
        root.addView(ratio)
        root.addView(end)
        setContentView(root)
        paint()
        h.post(tick)
    }

    private val tick = object : Runnable {
        override fun run() {
            if (ended) return
            val cur = if (curStart > 0) System.currentTimeMillis() - curStart else 0
            if (curStart > 0 && cur >= limit && System.currentTimeMillis() - lastAlert >= (if (lastAlert == 0L) 0 else 20_000)) {
                lastAlert = System.currentTimeMillis()
                alerts++
                WStore.buzz(this@TalkActivity, 180, 120, 180)
            }
            paint()
            h.postDelayed(this, 500)
        }
    }

    private fun toggle() {
        val now = System.currentTimeMillis()
        if (curStart > 0) {
            val c = now - curStart
            me += c
            longest = maxOf(longest, c)
            curStart = 0
        } else {
            curStart = now
            lastAlert = 0
        }
        WStore.buzz(this, 25)
        paint()
    }

    private fun paint() {
        val now = System.currentTimeMillis()
        val tot = now - start
        val cur = if (curStart > 0) now - curStart else 0
        val mine = me + cur
        val pct = if (tot > 0) (mine * 100 / tot).toInt() else 0
        total.text = "대화 ${Fmt.mmss(tot)}"
        ratio.text = "나 $pct% · 상대 ${100 - pct}%"
        val (color, label) = when {
            curStart == 0L -> Ui.CARD to "🗣\n말할 때\n누르기"
            cur >= limit -> Ui.ROSE to "✋\n넘겨 볼까요?\n${Fmt.mmss(cur)}"
            else -> Ui.AMBER to "✋\n다 말했으면\n누르기 ${Fmt.mmss(cur)}"
        }
        btn.text = label
        btn.background = GradientDrawable().apply {
            shape = GradientDrawable.OVAL
            setColor(color)
            if (curStart == 0L) setStroke(Ui.dp(this@TalkActivity, 3f), Ui.TEAL)
        }
    }

    private fun finishTalk() {
        if (ended) return
        if (curStart > 0) toggle()
        ended = true
        val dur = System.currentTimeMillis() - start
        if (dur > 15_000) {
            WStore.act(this, JSONObject().put("type", "talkLog").put("t", start).put("dur", dur).put("me", me).put("longest", longest).put("alerts", alerts))
        }
        val pct = if (dur > 0) (me * 100 / dur).toInt() else 0
        btn.background = GradientDrawable().apply { shape = GradientDrawable.OVAL; setColor(Ui.CARD) }
        btn.text = "대화 끝\n나 $pct%\n가장 길게 ${Fmt.mmss(longest)}"
        btn.setOnClickListener { finish() }
        ratio.text = if (pct <= 50) "잘 들어 줬어요 👏" else "다음엔 질문을 하나 더 💬"
        h.postDelayed({ finish() }, 8000)
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        if (!ended && System.currentTimeMillis() - start > 15_000) finishTalk() else super.onBackPressed()
    }

    override fun onDestroy() {
        h.removeCallbacksAndMessages(null)
        super.onDestroy()
    }
}
