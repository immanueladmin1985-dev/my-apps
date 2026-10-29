package kr.immanuel.relay

import android.app.Activity
import android.graphics.Typeface
import android.os.Bundle
import android.view.Gravity
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView

/** 워치에서 앱을 열었을 때 보이는 화면. 타일과 같은 내용을 크게 보여 준다. */
class WatchActivity : Activity() {
    private lateinit var view: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val pad = (resources.displayMetrics.widthPixels * 0.12).toInt()
        view = TextView(this).apply {
            gravity = Gravity.CENTER
            textSize = 15f
            setPadding(pad, pad, pad, pad)
        }
        setContentView(ScrollView(this).apply {
            addView(LinearLayout(this@WatchActivity).apply {
                orientation = LinearLayout.VERTICAL
                gravity = Gravity.CENTER
                addView(view)
            })
        })
    }

    override fun onResume() {
        super.onResume()
        val b = Board.load(this)
        view.text = if (b.empty) "⚾ 야구 중계\n\n폰 앱에서 감시를 시작하면\n스코어가 여기에 나옵니다.\n\n타일 목록에서 '야구 중계'\n타일을 추가해 보세요."
        else buildString {
            append(b.inning).append("\n")
            append(b.awayShort).append("  ").append(b.score).append("  ").append(b.homeShort).append("\n")
            if (b.live) append("${b.ball}B ${b.strike}S ${b.out}O  ${b.bases}\n")
            if (b.lastText.isNotBlank()) append("\n").append(b.lastText)
        }
        view.setTypeface(view.typeface, Typeface.BOLD)
        Board.refreshSurfaces(this)
    }
}
