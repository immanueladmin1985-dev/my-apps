package kr.immanuel.haru

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONArray
import org.json.JSONObject

/**
 * 폰 쪽 저장소.
 * - snap: 웹 앱이 보낸 요약 (위젯·워치가 읽음)
 * - queue: 위젯·워치·알림에서 누른 동작 중 웹 앱이 아직 가져가지 않은 것
 */
object Store {
    private const val SP = "haru"
    private val lock = Any()

    fun sp(ctx: Context): SharedPreferences = ctx.getSharedPreferences(SP, Context.MODE_PRIVATE)

    fun snap(ctx: Context): Snap = Snap(sp(ctx).getString("snap", null))

    private fun queue(ctx: Context): JSONArray =
        runCatching { JSONArray(sp(ctx).getString("queue", "[]")) }.getOrElse { JSONArray() }

    /** 웹 앱이 보낸 새 요약. 웹 앱이 아직 가져가지 않은 동작은 다시 반영해 둔다. */
    fun fromWeb(ctx: Context, json: String) {
        synchronized(lock) {
            val s = Snap(json)
            val q = queue(ctx)
            val now = System.currentTimeMillis()
            for (i in 0 until q.length()) q.optJSONObject(i)?.let { s.apply(it, now) }
            sp(ctx).edit().putString("snap", s.toString()).apply()
        }
        changed(ctx)
    }

    /** 위젯·워치·알림에서 누른 동작: 요약에 바로 반영하고 웹 앱이 가져가도록 쌓아 둔다. */
    fun act(ctx: Context, a: JSONObject) {
        val now = System.currentTimeMillis()
        if (!a.has("t")) a.put("t", now)
        synchronized(lock) {
            val s = snap(ctx)
            s.apply(a, now)
            val q = queue(ctx).put(a)
            sp(ctx).edit().putString("snap", s.toString()).putString("queue", q.toString()).apply()
        }
        changed(ctx)
        MainActivity.current()?.pull()
    }

    fun takeActions(ctx: Context): String = synchronized(lock) {
        val q = sp(ctx).getString("queue", "[]") ?: "[]"
        sp(ctx).edit().putString("queue", "[]").apply()
        q
    }

    /** 요약이 바뀌면 알림 예약, 위젯, 워치를 모두 새로 맞춘다. */
    fun changed(ctx: Context) {
        Alarms.schedule(ctx)
        HaruWidget.updateAll(ctx)
        WatchSync.push(ctx)
    }
}
