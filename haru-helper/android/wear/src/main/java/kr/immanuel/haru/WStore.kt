package kr.immanuel.haru

import android.content.ComponentName
import android.content.Context
import android.content.SharedPreferences
import android.os.VibrationEffect
import android.os.Vibrator
import androidx.wear.tiles.TileService
import androidx.wear.watchface.complications.datasource.ComplicationDataSourceUpdateRequester
import com.google.android.gms.wearable.DataEvent
import com.google.android.gms.wearable.DataEventBuffer
import com.google.android.gms.wearable.DataMapItem
import com.google.android.gms.wearable.Wearable
import com.google.android.gms.wearable.WearableListenerService
import org.json.JSONArray
import org.json.JSONObject

/**
 * 워치 쪽 저장소. 폰에서 받은 요약을 보관하고, 워치에서 누른 동작은 바로 반영한 뒤 폰으로 보낸다.
 * 폰과 연결이 끊겨 있으면 보내지 못한 동작을 쌓아 두었다가 다음에 보낸다.
 */
object WStore {
    private const val SP = "haru"
    var listener: (() -> Unit)? = null

    private fun sp(ctx: Context): SharedPreferences = ctx.getSharedPreferences(SP, Context.MODE_PRIVATE)

    fun snap(ctx: Context): Snap = Snap(sp(ctx).getString("snap", null))

    fun saveFromPhone(ctx: Context, json: String) {
        val s = Snap(json)
        val q = queue(ctx)
        val now = System.currentTimeMillis()
        for (i in 0 until q.length()) q.optJSONObject(i)?.let { s.apply(it, now) }
        sp(ctx).edit().putString("snap", s.toString()).apply()
        refresh(ctx)
    }

    fun act(ctx: Context, a: JSONObject) {
        val now = System.currentTimeMillis()
        if (!a.has("t")) a.put("t", now)
        val s = snap(ctx)
        s.apply(a, now)
        sp(ctx).edit().putString("snap", s.toString()).putString("queue", queue(ctx).put(a).toString()).apply()
        refresh(ctx)
        flush(ctx)
    }

    private fun queue(ctx: Context): JSONArray =
        runCatching { JSONArray(sp(ctx).getString("queue", "[]")) }.getOrElse { JSONArray() }

    /** 쌓아 둔 동작을 연결된 폰으로 보낸다. */
    fun flush(ctx: Context) {
        val app = ctx.applicationContext
        val q = queue(app)
        if (q.length() == 0) return
        Wearable.getNodeClient(app).connectedNodes.addOnSuccessListener { nodes ->
            if (nodes.isEmpty()) return@addOnSuccessListener
            val mc = Wearable.getMessageClient(app)
            for (i in 0 until q.length()) {
                val data = (q.optJSONObject(i) ?: continue).toString().toByteArray(Charsets.UTF_8)
                nodes.forEach { mc.sendMessage(it.id, "/haru/action", data) }
            }
            // 그사이 새로 쌓인 동작은 남겨 둔다
            val now = queue(app)
            val rest = JSONArray()
            for (i in q.length() until now.length()) rest.put(now.opt(i))
            sp(app).edit().putString("queue", rest.toString()).apply()
        }
    }

    /** 폰에 최신 요약을 다시 보내 달라고 한다. */
    fun hello(ctx: Context) {
        val app = ctx.applicationContext
        Wearable.getNodeClient(app).connectedNodes.addOnSuccessListener { nodes ->
            nodes.forEach { Wearable.getMessageClient(app).sendMessage(it.id, "/haru/hello", ByteArray(0)) }
        }
    }

    fun refresh(ctx: Context) {
        runCatching { TileService.getUpdater(ctx).requestUpdate(HaruTileService::class.java) }
        runCatching {
            ComplicationDataSourceUpdateRequester.create(ctx, ComponentName(ctx, HaruComplicationService::class.java)).requestUpdateAll()
        }
        listener?.invoke()
    }

    fun buzz(ctx: Context, vararg ms: Long) {
        val v = ctx.getSystemService(Vibrator::class.java) ?: return
        val t = LongArray(ms.size + 1)
        ms.forEachIndexed { i, x -> t[i + 1] = x }
        runCatching { v.vibrate(VibrationEffect.createWaveform(t, -1)) }
    }
}

/** 폰이 보낸 요약을 받는다. */
class DataLayerService : WearableListenerService() {
    override fun onDataChanged(events: DataEventBuffer) {
        for (e in events) {
            if (e.type != DataEvent.TYPE_CHANGED || e.dataItem.uri.path != "/haru/snap") continue
            val m = DataMapItem.fromDataItem(e.dataItem).dataMap
            WStore.saveFromPhone(this, m.getString("snap") ?: "{}")
        }
    }
}
