package kr.immanuel.haru

import android.app.Activity
import android.os.Bundle
import android.widget.LinearLayout
import android.widget.Toast
import org.json.JSONObject

/** 할 일 목록(누르면 끝냄) 또는 챙길 것 목록(누르면 체크). */
class ListActivity : Activity() {
    private lateinit var box: LinearLayout
    private val mode get() = intent?.getStringExtra("mode") ?: "tasks"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        box = Ui.page(this)
    }

    override fun onResume() {
        super.onResume()
        WStore.listener = { runOnUiThread { draw() } }
        draw()
    }

    override fun onPause() {
        WStore.listener = null
        super.onPause()
    }

    private fun draw() {
        val s = WStore.snap(this)
        box.removeAllViews()
        if (mode == "tasks") {
            box.addView(Ui.text(this, "📋 할 일", 15f, Ui.ACCENT, bold = true))
            box.addView(Ui.text(this, "누르면 끝낸 일로 표시해요", 11f, Ui.GRAY))
            if (s.tasks.isEmpty()) box.addView(Ui.text(this, "\n남은 할 일이 없어요 👏", 14f))
            s.tasks.forEach { t ->
                val mark = if (s.focus?.id == t.id) "🎯 " else "○  "
                box.addView(Ui.button(this, mark + t.text, Ui.CARD) {
                    WStore.act(this, JSONObject().put("type", "taskDone").put("id", t.id))
                    WStore.buzz(this, 40, 60, 40)
                    Toast.makeText(this, "잘했어요! 🎉", Toast.LENGTH_SHORT).show()
                })
            }
        } else {
            if (s.lists.isEmpty()) box.addView(Ui.text(this, "챙길 것 목록이 없어요", 14f))
            s.lists.forEach { l ->
                val n = l.items.count { it.on }
                box.addView(Ui.gap(this, 6f))
                box.addView(Ui.text(this, "${l.name}  $n/${l.items.size}", 14f, Ui.ACCENT, bold = true))
                l.items.forEach { i ->
                    box.addView(Ui.button(this, (if (i.on) "☑  " else "☐  ") + i.text, if (i.on) 0xFF173324.toInt() else Ui.CARD, if (i.on) 0xFF7BE0A3.toInt() else Ui.WHITE) {
                        WStore.act(this, JSONObject().put("type", "listTog").put("list", l.id).put("item", i.id).put("on", !i.on))
                        WStore.buzz(this, 25)
                        val after = WStore.snap(this).lists.firstOrNull { it.id == l.id }
                        if (after != null && after.items.isNotEmpty() && after.items.all { it.on }) {
                            Toast.makeText(this, "다 챙겼어요! 👋", Toast.LENGTH_SHORT).show()
                        }
                    })
                }
                if (n > 0) box.addView(Ui.button(this, "모두 해제", 0xFF2D2C42.toInt(), Ui.GRAY) {
                    WStore.act(this, JSONObject().put("type", "listReset").put("list", l.id))
                })
            }
        }
    }
}
