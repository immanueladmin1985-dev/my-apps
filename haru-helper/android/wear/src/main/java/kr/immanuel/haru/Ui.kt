package kr.immanuel.haru

import android.app.Activity
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.view.Gravity
import android.view.View
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView

/** 워치 화면을 코드로 꾸미는 작은 도구들. 둥근 화면에 맞춰 위아래 여백을 넉넉히 둔다. */
object Ui {
    const val BG = 0xFF000000.toInt()
    const val WHITE = 0xFFFFFFFF.toInt()
    const val GRAY = 0xFFB4B2C8.toInt()
    const val ACCENT = 0xFF9B9BFF.toInt()
    const val INDIGO = 0xFF6366F1.toInt()
    const val TEAL = 0xFF0EA5A8.toInt()
    const val AMBER = 0xFFF59E0B.toInt()
    const val ROSE = 0xFFF43F5E.toInt()
    const val GREEN = 0xFF22B45A.toInt()
    const val CARD = 0xFF1E1E2E.toInt()
    const val FOCUS = 0xFF3A2C17.toInt()

    fun dp(a: Activity, v: Float) = (v * a.resources.displayMetrics.density).toInt()

    /** 세로로 쌓는 스크롤 화면. 돌리는 베젤로도 스크롤된다. */
    fun page(a: Activity): LinearLayout {
        val w = a.resources.displayMetrics.widthPixels
        val box = LinearLayout(a).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            setPadding((w * 0.1).toInt(), (w * 0.14).toInt(), (w * 0.1).toInt(), (w * 0.22).toInt())
        }
        val sv = ScrollView(a).apply {
            setBackgroundColor(BG)
            isVerticalScrollBarEnabled = false
            addView(box)
        }
        a.setContentView(sv)
        sv.requestFocus()
        return box
    }

    fun text(a: Activity, s: String, size: Float, color: Int = WHITE, bold: Boolean = false, center: Boolean = true): TextView =
        TextView(a).apply {
            text = s
            textSize = size
            setTextColor(color)
            if (bold) typeface = Typeface.DEFAULT_BOLD
            gravity = if (center) Gravity.CENTER else Gravity.START
            layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)
        }

    fun rounded(color: Int, radius: Float) = GradientDrawable().apply { setColor(color); cornerRadius = radius }

    /** 둥근 알약 모양 단추. */
    fun button(a: Activity, s: String, color: Int, textColor: Int = WHITE, onClick: () -> Unit): TextView =
        text(a, s, 15f, textColor, bold = true).apply {
            background = rounded(color, dp(a, 26f).toFloat())
            minHeight = dp(a, 50f)
            setPadding(dp(a, 12f), dp(a, 8f), dp(a, 12f), dp(a, 8f))
            (layoutParams as LinearLayout.LayoutParams).topMargin = dp(a, 8f)
            setOnClickListener { onClick() }
        }

    /** 색 바탕 카드. */
    fun card(a: Activity, color: Int = CARD): LinearLayout = LinearLayout(a).apply {
        orientation = LinearLayout.VERTICAL
        gravity = Gravity.CENTER_HORIZONTAL
        background = rounded(color, dp(a, 22f).toFloat())
        setPadding(dp(a, 12f), dp(a, 10f), dp(a, 12f), dp(a, 12f))
        layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply {
            topMargin = dp(a, 8f)
        }
    }

    fun gap(a: Activity, h: Float) = View(a).apply { layoutParams = LinearLayout.LayoutParams(1, dp(a, h)) }

    fun blend(c: Int, alpha: Float) = Color.argb((255 * alpha).toInt(), Color.red(c), Color.green(c), Color.blue(c))
}
