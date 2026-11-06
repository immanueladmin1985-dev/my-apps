package kr.immanuel.haru

import org.json.JSONArray
import org.json.JSONObject
import java.util.Calendar

/**
 * 하루 일과 알림(출근·쉬는 시간·점심·퇴근·예배 같은 일정) 시각 계산.
 * 웹 앱의 routineEvents 와 같은 규칙을 따른다. 폰과 워치가 각자 이 계산으로 알람을 건다.
 */
object Routine {
    data class Ev(val key: String, val at: Long, val emoji: String, val title: String, val body: String)

    private fun mins(s: String?): Int {
        val p = (s ?: "").split(":")
        return (p.getOrNull(0)?.trim()?.toIntOrNull() ?: 0) * 60 + (p.getOrNull(1)?.trim()?.toIntOrNull() ?: 0)
    }

    private fun has(arr: JSONArray?, v: Int): Boolean {
        if (arr == null) return false
        for (i in 0 until arr.length()) if (arr.optInt(i, -1) == v) return true
        return false
    }

    fun dayStart(t: Long): Long = Calendar.getInstance().apply {
        timeInMillis = t
        set(Calendar.HOUR_OF_DAY, 0); set(Calendar.MINUTE, 0); set(Calendar.SECOND, 0); set(Calendar.MILLISECOND, 0)
    }.timeInMillis

    /** 그날(anyTime 이 속한 날) 울릴 알림 목록, 시간 순서. */
    fun events(cfg: JSONObject?, anyTime: Long): List<Ev> {
        if (cfg == null || !cfg.optBoolean("on")) return emptyList()
        val base = dayStart(anyTime)
        val c = Calendar.getInstance().apply { timeInMillis = base }
        val dow = c.get(Calendar.DAY_OF_WEEK) - 1
        val day = "%04d%02d%02d".format(c.get(Calendar.YEAR), c.get(Calendar.MONTH) + 1, c.get(Calendar.DAY_OF_MONTH))
        val out = mutableListOf<Ev>()
        fun add(m: Int, code: String, e: String, t: String, b: String) {
            out += Ev("$day:$code", base + m * Snap.MIN, e, t, b)
        }

        if (cfg.optBoolean("workOn", true) && has(cfg.optJSONArray("days"), dow)) {
            val s = mins(cfg.optString("start", "09:00"))
            val e = mins(cfg.optString("end", "18:00"))
            val l1 = mins(cfg.optString("lunch", "12:00"))
            val l2 = mins(cfg.optString("lunchEnd", "13:00"))
            val w = cfg.optInt("focus", 50)
            val rest = cfg.optInt("rest", 10)
            val al = cfg.optJSONObject("alerts")
            fun on(k: String) = al?.optBoolean(k, true) ?: true
            if (e > s) {
                if (on("start")) add(s, "start", "🏢", "출근 시간이에요", "오늘 할 일 하나를 정하고 시작해요")
                var lunchDone = !(l2 > l1 && l1 > s && l2 < e)
                fun lunch() {
                    if (on("lunch")) {
                        add(l1, "lunch", "🍚", "점심시간이에요", "일어나서 밥 먹으러 가요. 약 먹는 날도 점심은 꼭 챙겨요")
                        add(l2, "lunchEnd", "💼", "점심시간 끝", "다시 시작해요. 할 일 하나만 골라요")
                    }
                }
                var t = s
                var k = 0
                while (k < 40 && w > 0 && rest > 0) {
                    k++
                    val b = t + w
                    if (!lunchDone && b >= l1 - 10) {
                        lunch(); t = l2; lunchDone = true; continue
                    }
                    if (b + rest > e - 5) break
                    if (on("rest")) {
                        add(b, "rest$k", "☕", "쉬는 시간 ${rest}분", "일어나서 물 한 잔 마시고 몸을 풀어요")
                        add(b + rest, "back$k", "⏱", "다시 집중", "쉬는 시간 끝. 하던 일로 돌아가요")
                    }
                    t = b + rest
                }
                if (!lunchDone) lunch()
                if (on("end")) add(e, "end", "🏠", "퇴근 시간이에요", "오늘도 수고했어요. 내일 첫 할 일 하나만 적어 두세요")
            }
        }

        val evs = cfg.optJSONArray("events")
        if (evs != null) for (i in 0 until evs.length()) {
            val ev = evs.optJSONObject(i) ?: continue
            if (!ev.optBoolean("on") || !has(ev.optJSONArray("days"), dow)) continue
            val tm = mins(ev.optString("time"))
            val name = ev.optString("name")
            val msg = ev.optString("msg")
            val id = ev.optString("id")
            val before = ev.optInt("before")
            val emo = if (name.contains("예배")) "⛪" else "📌"
            if (before > 0) add(tm - before, "ev-$id-b", emo, "$name ${before}분 전", msg.ifBlank { "준비하고 출발해요" })
            add(tm, "ev-$id", emo, "$name 시간이에요", msg)
        }
        return out.sortedBy { it.at }
    }

    /** now 이후(1분 전까지 포함) 가장 먼저 울릴 알림. done 에 있는 키는 건너뛴다. */
    fun next(cfg: JSONObject?, now: Long, done: Set<String>): Ev? {
        for (d in 0..7) {
            events(cfg, now + d * Snap.DAY).firstOrNull { it.at > now - 60_000 && it.key !in done }?.let { return it }
        }
        return null
    }
}
