package kr.immanuel.haru

import android.Manifest
import android.app.Activity
import android.content.pm.PackageManager
import android.os.Build
import android.app.RemoteInput
import android.content.Intent
import android.os.Bundle
import android.widget.LinearLayout
import android.widget.Toast
import androidx.wear.input.RemoteInputIntentHelper
import org.json.JSONObject

/** 워치 첫 화면: 지금 할 일, 다음 알림, 말로 메모, 숨 고르기, 대화 타이머, 할 일·챙길 것 목록. */
class WatchActivity : Activity() {
    private lateinit var box: LinearLayout

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        box = Ui.page(this)
        if (intent?.getStringExtra("open") == "memo") memo()
        // 일과 알림·진동을 띄우려면 알림 권한이 필요함 (Wear OS 4 이상)
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 9)
        }
        WRoutine.schedule(this)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        if (intent.getStringExtra("open") == "memo") memo()
    }

    override fun onResume() {
        super.onResume()
        WStore.listener = { runOnUiThread { draw() } }
        WStore.flush(this)
        WStore.hello(this)
        draw()
    }

    override fun onPause() {
        WStore.listener = null
        super.onPause()
    }

    private fun draw() {
        val s = WStore.snap(this)
        val now = System.currentTimeMillis()
        box.removeAllViews()
        box.addView(Ui.text(this, "☀ 하루 도우미", 13f, Ui.ACCENT, bold = true))

        if (s.empty) {
            box.addView(Ui.gap(this, 6f))
            box.addView(Ui.text(this, "폰에서 하루 도우미 앱을\n한 번 열어 주세요", 13f, Ui.GRAY))
        }

        // 지금 할 일
        val cur = s.current
        val focus = Ui.card(this, Ui.FOCUS)
        focus.addView(Ui.text(this, if (s.focus != null || cur == null) "🎯 지금 할 일" else "📋 다음 할 일", 12f, Ui.AMBER, bold = true))
        focus.addView(Ui.text(this, cur?.text ?: "할 일이 없어요 👏", 17f, bold = true))
        if (cur != null) focus.addView(Ui.button(this, "✓  다 했어요", Ui.GREEN) {
            WStore.act(this, JSONObject().put("type", "taskDone").put("id", cur.id))
            WStore.buzz(this, 40, 60, 40)
            Toast.makeText(this, "잘했어요! 🎉", Toast.LENGTH_SHORT).show()
        })
        box.addView(focus)

        // 다음 알림 (지난 알림이면 바로 ‘했어요’)
        s.upcoming().firstOrNull()?.let { r ->
            val due = r.at <= now
            val c = Ui.card(this, if (due) 0xFF3A1F25.toInt() else Ui.CARD)
            c.addView(Ui.text(this, (if (due) "🔔 " else "⏰ ") + Fmt.label(r.at, now), 12f, if (due) Ui.ROSE else Ui.GRAY, bold = true))
            c.addView(Ui.text(this, r.text, 15f, bold = true))
            if (due) c.addView(Ui.button(this, "했어요", Ui.ROSE) {
                WStore.act(this, JSONObject().put("type", "remDone").put("id", r.id))
                WStore.buzz(this, 40)
            })
            box.addView(c)
        }

        // 다음 일과 알림
        if (s.feat("routine")) Routine.next(s.routine, now, emptySet())?.let { ev ->
            box.addView(Ui.text(this, "🗓 다음 " + Fmt.hm(ev.at) + "  " + ev.emoji + " " + ev.title, 12f, Ui.GRAY))
        }
        if (s.feat("sos")) box.addView(Ui.button(this, "🚨  화났을 때", Ui.ROSE) {
            startActivity(Intent(this, StepsActivity::class.java).putExtra("kind", "sos"))
        })
        if (s.feat("urge")) box.addView(Ui.button(this, "🍪  먹고 싶을 때", 0xFF7C3AED.toInt()) {
            startActivity(Intent(this, StepsActivity::class.java).putExtra("kind", "urge"))
        })
        box.addView(Ui.button(this, "💭  말로 메모", Ui.INDIGO) { memo() })
        box.addView(Ui.button(this, "🌬  숨 고르기", Ui.TEAL) { startActivity(Intent(this, BreathActivity::class.java)) })
        box.addView(Ui.button(this, "🗣  대화 타이머", Ui.AMBER) { startActivity(Intent(this, TalkActivity::class.java)) })
        box.addView(Ui.button(this, "📋  할 일 ${s.tasks.size}", Ui.CARD) {
            startActivity(Intent(this, ListActivity::class.java).putExtra("mode", "tasks"))
        })
        box.addView(Ui.button(this, "🎒  챙길 것", Ui.CARD) {
            startActivity(Intent(this, ListActivity::class.java).putExtra("mode", "lists"))
        })
    }

    /** 말로 메모: 워치에 대고 말하면 폰 메모함에 들어간다. */
    private fun memo() {
        val intent = RemoteInputIntentHelper.createActionRemoteInputIntent()
        RemoteInputIntentHelper.putRemoteInputsExtra(intent, listOf(RemoteInput.Builder(KEY).setLabel("떠오른 생각을 말해 주세요").build()))
        runCatching { startActivityForResult(intent, REQ_MEMO) }
            .onFailure { Toast.makeText(this, "이 워치에서는 음성 입력을 열 수 없어요", Toast.LENGTH_SHORT).show() }
    }

    @Deprecated("Deprecated in Java")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode != REQ_MEMO || data == null) return
        val text = RemoteInput.getResultsFromIntent(data)?.getCharSequence(KEY)?.toString()?.trim()
        if (text.isNullOrEmpty()) return
        WStore.act(this, JSONObject().put("type", "note").put("text", text).put("from", "watch"))
        WStore.buzz(this, 40)
        Toast.makeText(this, "폰 메모함에 넣었어요", Toast.LENGTH_SHORT).show()
    }

    companion object {
        private const val KEY = "memo"
        private const val REQ_MEMO = 1
    }
}
