package kr.immanuel.haru

import org.json.JSONArray
import org.json.JSONObject
import java.util.Calendar

/**
 * 웹 앱이 보내 준 요약(지금 할 일, 할 일, 알림, 챙길 것).
 * 폰 위젯과 워치(타일·컴플리케이션·앱)는 이것만 읽고, 누른 동작은 [apply]로 바로 반영한 뒤 웹 앱에도 전달한다.
 */
class Snap(val o: JSONObject) {
    constructor(s: String?) : this(runCatching { JSONObject(s ?: "{}") }.getOrElse { JSONObject() })

    data class Task(val id: String, val text: String)
    data class Rem(val id: String, val text: String, val at: Long, val daily: Boolean)
    data class Item(val id: String, val text: String, val on: Boolean)
    data class Lst(val id: String, val name: String, val items: List<Item>)

    val empty get() = !o.has("ts")
    val talkSec get() = o.optInt("talkSec", 45)
    val vib get() = o.optBoolean("vib", true)
    val noteCount get() = o.optInt("notes", 0)

    val focus: Task?
        get() = o.optJSONObject("focus")?.let { Task(it.optString("id"), it.optString("text")) }

    val tasks: List<Task>
        get() = objs("tasks").map { Task(it.optString("id"), it.optString("text")) }

    val reminders: List<Rem>
        get() = objs("reminders").map { Rem(it.optString("id"), it.optString("text"), it.optLong("at"), it.optBoolean("daily")) }

    val lists: List<Lst>
        get() = objs("lists").map { l ->
            Lst(l.optString("id"), l.optString("name"), objs(l.optJSONArray("items")).map { Item(it.optString("id"), it.optString("text"), it.optBoolean("on")) })
        }

    /** 지금 보여 줄 할 일: 정해 둔 ‘지금 할 일’, 없으면 첫 할 일. */
    val current: Task? get() = focus ?: tasks.firstOrNull()

    /** 시간 순서대로 정렬한 알림 (지난 알림이 맨 앞). */
    fun upcoming(): List<Rem> = reminders.sortedBy { it.at }

    /** 위젯·워치·알림에서 누른 동작을 요약에 반영한다. 웹 앱의 applyAction 과 같은 규칙을 따른다. */
    fun apply(a: JSONObject, now: Long) {
        val id = a.optString("id")
        when (a.optString("type")) {
            "taskDone" -> {
                removeById(o.optJSONArray("tasks"), id)
                if (focus?.id == id) o.put("focus", JSONObject.NULL)
            }
            "focus" -> objs("tasks").firstOrNull { it.optString("id") == id }?.let {
                o.put("focus", JSONObject().put("id", id).put("text", it.optString("text")))
            }
            "remDone" -> {
                val arr = o.optJSONArray("reminders") ?: return
                val r = objs(arr).firstOrNull { it.optString("id") == id } ?: return
                if (r.optBoolean("daily")) {
                    var at = r.optLong("at")
                    while (at <= now) at += DAY
                    r.put("at", at)
                } else removeById(arr, id)
            }
            "remSnooze" -> objs("reminders").firstOrNull { it.optString("id") == id }?.put("at", a.optLong("at"))
            "listTog" -> objs("lists").firstOrNull { it.optString("id") == a.optString("list") }?.let { l ->
                objs(l.optJSONArray("items")).firstOrNull { it.optString("id") == a.optString("item") }?.put("on", a.optBoolean("on"))
            }
            "listReset" -> objs("lists").firstOrNull { it.optString("id") == a.optString("list") }?.let { l ->
                objs(l.optJSONArray("items")).forEach { it.put("on", false) }
            }
            "note" -> o.put("notes", noteCount + 1)
        }
    }

    override fun toString(): String = o.toString()

    private fun objs(name: String): List<JSONObject> = objs(o.optJSONArray(name))

    private fun objs(arr: JSONArray?): List<JSONObject> {
        if (arr == null) return emptyList()
        return (0 until arr.length()).mapNotNull { arr.optJSONObject(it) }
    }

    private fun removeById(arr: JSONArray?, id: String) {
        if (arr == null) return
        for (i in arr.length() - 1 downTo 0) if (arr.optJSONObject(i)?.optString("id") == id) arr.remove(i)
    }

    companion object {
        const val MIN = 60_000L
        const val HOUR = 3_600_000L
        const val DAY = 86_400_000L
    }
}

/** 한국어 시간 표시. */
object Fmt {
    private fun cal(t: Long) = Calendar.getInstance().apply { timeInMillis = t }

    /** "오후 3:05" */
    fun hm(t: Long): String {
        val c = cal(t)
        val h = c.get(Calendar.HOUR_OF_DAY)
        return (if (h < 12) "오전 " else "오후 ") + clock(t)
    }

    /** "3:05" (12시간) */
    fun clock(t: Long): String {
        val c = cal(t)
        val h = c.get(Calendar.HOUR_OF_DAY) % 12
        return "${if (h == 0) 12 else h}:" + "%02d".format(c.get(Calendar.MINUTE))
    }

    private fun dayStart(t: Long): Long = cal(t).apply {
        set(Calendar.HOUR_OF_DAY, 0); set(Calendar.MINUTE, 0); set(Calendar.SECOND, 0); set(Calendar.MILLISECOND, 0)
    }.timeInMillis

    /** "오늘 오후 3:05", "내일 오전 9:00", "11/3 오후 2:00" */
    fun label(t: Long, now: Long): String {
        val diff = Math.round((dayStart(t) - dayStart(now)) / Snap.DAY.toDouble())
        val c = cal(t)
        val day = when (diff) {
            0L -> "오늘"
            1L -> "내일"
            -1L -> "어제"
            else -> "${c.get(Calendar.MONTH) + 1}/${c.get(Calendar.DAY_OF_MONTH)}"
        }
        return "$day ${hm(t)}"
    }

    /** "1:05" (분:초) */
    fun mmss(ms: Long): String {
        val s = (ms / 1000).coerceAtLeast(0)
        return "${s / 60}:" + "%02d".format(s % 60)
    }
}
