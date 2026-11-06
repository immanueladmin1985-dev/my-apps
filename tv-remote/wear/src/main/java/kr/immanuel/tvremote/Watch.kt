package kr.immanuel.tvremote

import android.app.Activity
import android.content.Context
import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.view.Gravity
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast
import androidx.wear.tiles.TileService
import com.google.android.gms.wearable.DataEvent
import com.google.android.gms.wearable.DataEventBuffer
import com.google.android.gms.wearable.DataMapItem
import com.google.android.gms.wearable.MessageEvent
import com.google.android.gms.wearable.Wearable
import com.google.android.gms.wearable.WearableListenerService
import org.json.JSONArray

/** 폰에서 받은 모드 목록 (id, 이름, 아이콘)과 마지막 실행 결과. */
object WStore {
    data class M(val id: String, val name: String, val emoji: String)

    private fun p(ctx: Context) = ctx.applicationContext.getSharedPreferences("w", Context.MODE_PRIVATE)

    fun modes(ctx: Context): List<M> = try {
        val a = JSONArray(p(ctx).getString("modes", "[]"))
        (0 until a.length()).map { a.getJSONObject(it).let { o -> M(o.getString("id"), o.optString("name"), o.optString("emoji", "📺")) } }
    } catch (_: Exception) {
        emptyList()
    }

    fun last(ctx: Context): String = p(ctx).getString("last", "") ?: ""

    fun save(ctx: Context, modes: String?, last: String?) {
        val e = p(ctx).edit()
        if (modes != null) e.putString("modes", modes)
        if (last != null) e.putString("last", last)
        e.apply()
    }

    /** 폰으로 메시지를 보낸다 (연결된 모든 폰 노드). */
    fun send(ctx: Context, path: String, data: String, done: (Boolean) -> Unit = {}) {
        Wearable.getNodeClient(ctx).connectedNodes.addOnCompleteListener { t ->
            val nodes = t.result ?: emptyList()
            if (!t.isSuccessful || nodes.isEmpty()) { done(false); return@addOnCompleteListener }
            nodes.forEach { Wearable.getMessageClient(ctx).sendMessage(it.id, path, data.toByteArray(Charsets.UTF_8)) }
            done(true)
        }
    }

    fun refreshTile(ctx: Context) = runCatching { TileService.getUpdater(ctx).requestUpdate(TvTileService::class.java) }
}

/** 폰에서 보낸 모드 목록과 실행 결과를 받는다. */
class DataLayerService : WearableListenerService() {
    override fun onDataChanged(events: DataEventBuffer) {
        for (e in events) {
            if (e.type != DataEvent.TYPE_CHANGED || e.dataItem.uri.path != "/tv/modes") continue
            val map = DataMapItem.fromDataItem(e.dataItem).dataMap
            WStore.save(this, map.getString("modes"), map.getString("last"))
        }
        WStore.refreshTile(this)
    }

    override fun onMessageReceived(e: MessageEvent) {
        if (e.path == "/tv/result") {
            val msg = String(e.data, Charsets.UTF_8)
            WStore.save(this, null, msg)
            WStore.refreshTile(this)
            android.os.Handler(mainLooper).post { Toast.makeText(this, msg, Toast.LENGTH_SHORT).show() }
        }
    }
}

/** 워치 앱 화면: 모드 버튼 목록 + 간단한 리모컨. */
class WatchActivity : Activity() {
    private lateinit var status: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        WStore.send(this, "/tv/hello", "")
        intent.getStringExtra("run")?.let { run(it) }
        build()
    }

    override fun onResume() {
        super.onResume()
        build()
    }

    private fun dp(v: Int) = (v * resources.displayMetrics.density).toInt()

    private fun btn(text: String, color: Int, onClick: () -> Unit): Button = Button(this).apply {
        this.text = text
        isAllCaps = false
        setTextColor(Color.WHITE)
        textSize = 15f
        background = GradientDrawable().apply { setColor(color); cornerRadius = dp(22).toFloat() }
        setOnClickListener { onClick() }
    }

    private fun build() {
        val col = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            setPadding(dp(18), dp(28), dp(18), dp(40))
        }
        status = TextView(this).apply {
            text = WStore.last(this@WatchActivity).ifEmpty { "TV 한번에" }
            setTextColor(0xFFB4B9C8.toInt()); textSize = 12f; gravity = Gravity.CENTER
        }
        col.addView(status)
        val modes = WStore.modes(this)
        if (modes.isEmpty()) {
            col.addView(TextView(this).apply {
                text = "폰에서 ‘TV 한번에’ 앱을 한 번 열어 주세요"
                setTextColor(Color.WHITE); gravity = Gravity.CENTER; setPadding(0, dp(12), 0, 0)
            })
        }
        modes.forEach { m ->
            col.addView(btn("${m.emoji} ${m.name}", 0xFF2D5FC2.toInt()) { run(m.id) }, lp(dp(48)))
        }
        // 간단한 리모컨
        col.addView(TextView(this).apply { text = "리모컨"; setTextColor(0xFFB4B9C8.toInt()); textSize = 12f; gravity = Gravity.CENTER; setPadding(0, dp(14), 0, 0) })
        col.addView(row("▲" to Keys.UP))
        col.addView(row("◀" to Keys.LEFT, "확인" to Keys.OK, "▶" to Keys.RIGHT))
        col.addView(row("▼" to Keys.DOWN))
        col.addView(row("↩" to Keys.BACK, "⌂" to Keys.HOME))
        col.addView(row("🔉" to Keys.VOL_DOWN, "🔊" to Keys.VOL_UP))
        setContentView(ScrollView(this).apply { setBackgroundColor(Color.BLACK); addView(col) })
    }

    private fun lp(h: Int) = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, h).apply { topMargin = dp(6) }

    private fun row(vararg keys: Pair<String, Int>): LinearLayout = LinearLayout(this).apply {
        orientation = LinearLayout.HORIZONTAL
        gravity = Gravity.CENTER
        keys.forEach { (label, code) ->
            addView(btn(label, 0xFF2A3040.toInt()) { WStore.send(this@WatchActivity, "/tv/key", code.toString()) },
                LinearLayout.LayoutParams(dp(54), dp(44)).apply { setMargins(dp(3), dp(3), dp(3), dp(3)) })
        }
    }

    private fun run(id: String) {
        val name = WStore.modes(this).firstOrNull { it.id == id }?.name ?: "모드"
        WStore.send(this, "/tv/run", id) { ok ->
            val msg = if (ok) "▶ $name 실행 요청" else "폰과 연결되어 있지 않습니다"
            runOnUiThread { if (::status.isInitialized) status.text = msg; Toast.makeText(this, msg, Toast.LENGTH_SHORT).show() }
        }
    }
}
