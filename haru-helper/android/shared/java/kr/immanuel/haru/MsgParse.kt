package kr.immanuel.haru

import org.json.JSONArray
import org.json.JSONObject
import java.util.Calendar

/**
 * 문자·카톡 내용에서 날짜·시간, 보낸 곳, 준비물, 카드 결제(병원)를 찾는다.
 * 폰 앱이 문자·카톡 알림을 받을 때와, 웹 화면에서 붙여 넣거나 공유한 글을 읽을 때 같이 쓴다.
 *
 * kind
 *  - appt  : 날짜와 시간이 있고 예약·진료 같은 말이 있거나 [보낸 곳]이 있는 문자 → 바로 일정에 넣는다
 *  - event : 날짜와 시간은 있지만 확실하지 않은 글(카톡 약속 등) → 확인 목록에 넣는다
 *  - pay   : 카드 승인 문자 (merchant, amount, payAt, clinicId)
 *  - none  : 일정이 없음
 */
object MsgParse {
    data class Clinic(val id: String, val name: String, val keys: List<String>, val purpose: String, val every: Int, val lead: Int)

    data class Result(
        val kind: String,
        val at: Long,
        val hasTime: Boolean,
        val org: String,
        val title: String,
        val items: List<String>,
        val amount: Int,
        val merchant: String,
        val clinicId: String,
        val payAt: Long,
    ) {
        fun toJson(): JSONObject = JSONObject()
            .put("kind", kind).put("at", at).put("hasTime", hasTime).put("org", org).put("title", title)
            .put("items", JSONArray(items)).put("amount", amount).put("merchant", merchant)
            .put("clinicId", clinicId).put("payAt", payAt)
    }

    private val WD = "일월화수목금토"
    private val SKIP_ORG = Regex("Web발신|광고|국외발신|국제발신|알림|안내")
    private val APPT_WORDS = Regex("예약|진료|내원|검사|상담|접수|시술|수술|치료|방문 ?예정")
    private val EVENT_WORDS = Regex("약속|모임|만나|만날|보자|봐요|회의|미팅|예배|행사|면접|수업|레슨|출발|모이|오세요|와 ?주세요|까지|일정|시작")
    private val MED_PLACE = Regex("(의원|병원|치과|한의원|약국|클리닉|정신과|내과|외과|센터)$")

    fun parse(text: String, now: Long, clinics: List<Clinic> = emptyList()): Result {
        val t = text.replace(' ', ' ').replace("\r", "")
        val org = findOrg(t)

        // 카드 결제 문자
        val isPay = Regex("승인|결제").containsMatchIn(t) && Regex("[0-9][0-9,]*\\s*원").containsMatchIn(t) && !Regex("취소|거절|실패").containsMatchIn(t)
        if (isPay) {
            val amount = Regex("([0-9][0-9,]*)\\s*원").find(t)?.groupValues?.get(1)?.replace(",", "")?.toIntOrNull() ?: 0
            val lines = t.lines().map { it.trim() }.filter { it.isNotEmpty() }
            val clinic = clinics.firstOrNull { c -> (c.keys + c.name).filter { it.isNotBlank() }.any { k -> t.contains(k) } }
            val merchant = clinic?.let { c -> lines.firstOrNull { l -> (c.keys + c.name).any { k -> k.isNotBlank() && l.contains(k) } } }
                ?: lines.firstOrNull { MED_PLACE.containsMatchIn(it) && !it.contains("카드") }
                ?: ""
            val payAt = findDate(t, now, past = true)?.let { d -> combine(d, findTime(t, colonOnly = true)) } ?: now
            return Result("pay", 0, false, org, merchant, emptyList(), amount, merchant, clinic?.id ?: "", payAt)
        }

        val items = findItems(t)
        val day = findDate(t, now, past = false)
        val time = findTime(t, colonOnly = false)
        if (day == null || time == null) {
            return Result("none", 0, false, org, title(t, org), items, 0, "", "", 0)
        }
        val at = combine(day, time)
        // 이미 지난 일정(1시간 넘게)은 일정으로 보지 않음
        if (at < now - Snap.HOUR) return Result("none", at, true, org, title(t, org), items, 0, "", "", 0)
        val clinic = clinics.firstOrNull { c -> (c.keys + c.name).filter { it.isNotBlank() }.any { k -> t.contains(k) } }
        val kind = if (APPT_WORDS.containsMatchIn(t) && (org.isNotBlank() || clinic != null)) "appt" else "event"
        return Result(kind, at, true, org, title(t, if (org.isBlank() && clinic != null) clinic.name else org), items, 0, "", clinic?.id ?: "", 0)
    }

    /** [안녕병원] 처럼 대괄호 안의 보낸 곳 (Web발신 같은 것은 건너뜀). */
    private fun findOrg(t: String): String =
        Regex("\\[([^\\]\\n]{1,20})\\]").findAll(t).map { it.groupValues[1].trim() }.firstOrNull { it.isNotBlank() && !SKIP_ORG.containsMatchIn(it) } ?: ""

    private fun title(t: String, org: String): String {
        val word = APPT_WORDS.find(t)?.value ?: EVENT_WORDS.find(t)?.value ?: ""
        if (org.isNotBlank()) return (org + " " + if (word.isBlank() || word == "까지" || word == "시작") "일정" else word.replace(" ", "")).trim()
        // 보낸 곳이 없으면 날짜·시간을 뺀 첫 줄을 짧게
        val line = t.lines().map { it.trim() }.firstOrNull { it.isNotEmpty() && !it.contains("Web발신") } ?: ""
        val clean = line.replace(Regex("\\[[^\\]]*\\]"), "").trim()
        return if (clean.length > 24) clean.take(24) + "…" else clean
    }

    /** 날짜(그날 0시). past=true 이면 결제 문자처럼 지난 날짜로 본다. */
    fun findDate(t: String, now: Long, past: Boolean): Calendar? {
        val today = Calendar.getInstance().apply { timeInMillis = Routine.dayStart(now) }
        fun ymd(y: Int, m: Int, d: Int): Calendar? {
            if (m !in 1..12 || d !in 1..31) return null
            return Calendar.getInstance().apply { clear(); set(y, m - 1, d) }
        }
        fun noYear(m: Int, d: Int): Calendar? {
            val c = ymd(today.get(Calendar.YEAR), m, d) ?: return null
            if (!past && c.timeInMillis < today.timeInMillis - Snap.DAY) c.add(Calendar.YEAR, 1)
            if (past && c.timeInMillis > today.timeInMillis + Snap.DAY) c.add(Calendar.YEAR, -1)
            return c
        }
        Regex("(20\\d{2})\\s*[./년-]\\s*(\\d{1,2})\\s*[./월-]\\s*(\\d{1,2})").find(t)?.let { m ->
            return ymd(m.groupValues[1].toInt(), m.groupValues[2].toInt(), m.groupValues[3].toInt())
        }
        Regex("(\\d{1,2})\\s*월\\s*(\\d{1,2})\\s*일").find(t)?.let { m -> return noYear(m.groupValues[1].toInt(), m.groupValues[2].toInt()) }
        Regex("(?<![\\d/.:-])(\\d{1,2})\\s*[/.]\\s*(\\d{1,2})(?![\\d/.])(?!\\s*원)").find(t)?.let { m ->
            noYear(m.groupValues[1].toInt(), m.groupValues[2].toInt())?.let { return it }
        }
        // 20일(금) 처럼 날짜만
        Regex("(?<!\\d)(\\d{1,2})\\s*일\\s*\\(?\\s*[월화수목금토일]").find(t)?.let { m ->
            val d = m.groupValues[1].toInt()
            val c = ymd(today.get(Calendar.YEAR), today.get(Calendar.MONTH) + 1, d)
            if (c != null) { if (c.before(today)) c.add(Calendar.MONTH, 1); return c }
        }
        val rel = mapOf("오늘" to 0, "금일" to 0, "내일" to 1, "낼" to 1, "명일" to 1, "모레" to 2, "글피" to 3)
        Regex("(오늘|금일|내일|명일|모레|글피)").find(t)?.let { m -> return (today.clone() as Calendar).apply { add(Calendar.DATE, rel[m.value] ?: 0) } }
        Regex("(이번\\s*주|이번주|다음\\s*주|담주|차주|다다음\\s*주)?\\s*([월화수목금토일])\\s*요일").find(t)?.let { m ->
            val target = WD.indexOf(m.groupValues[2])
            val cur = today.get(Calendar.DAY_OF_WEEK) - 1
            val w = m.groupValues[1].replace(" ", "")
            val c = today.clone() as Calendar
            // 다음 주의 그 요일 (한 주는 월요일부터)
            val nextWeek = 7 - (cur + 6) % 7 + (target + 6) % 7
            when {
                w.startsWith("다다음") -> c.add(Calendar.DATE, nextWeek + 7)
                w.startsWith("다음") || w == "담주" || w == "차주" -> c.add(Calendar.DATE, nextWeek)
                else -> c.add(Calendar.DATE, (target - cur + 7) % 7)
            }
            return c
        }
        return null
    }

    /** 시간(0시부터 분). colonOnly 이면 09:23 같은 모양만. */
    fun findTime(t: String, colonOnly: Boolean): Int? {
        Regex("(오전|오후|낮|저녁|밤|아침|새벽)?\\s*(?<![\\d:])(\\d{1,2}):(\\d{2})(?!\\d)").find(t)?.let { m ->
            var h = m.groupValues[2].toInt()
            val mi = m.groupValues[3].toInt()
            if (h > 24 || mi > 59) return@let
            h = adjust(m.groupValues[1], h, colon = true, short = m.groupValues[2].length == 1)
            return h * 60 + mi
        }
        if (colonOnly) return null
        Regex("(오전|오후|낮|저녁|밤|아침|새벽)?\\s*(?<!\\d)(\\d{1,2})\\s*시\\s*(반|(\\d{1,2})\\s*분)?").find(t)?.let { m ->
            var h = m.groupValues[2].toInt()
            if (h > 24) return null
            val mi = when {
                m.groupValues[3] == "반" -> 30
                m.groupValues[4].isNotBlank() -> m.groupValues[4].toInt().coerceIn(0, 59)
                else -> 0
            }
            h = adjust(m.groupValues[1], h, colon = false, short = true)
            return h * 60 + mi
        }
        return null
    }

    private fun adjust(mark: String, h: Int, colon: Boolean, short: Boolean): Int = when {
        mark == "오후" || mark == "저녁" || mark == "밤" -> if (h < 12) h + 12 else h
        mark == "낮" -> if (h <= 6) h + 12 else h
        mark == "오전" || mark == "아침" || mark == "새벽" -> if (h == 12) 0 else h
        // 표시가 없으면 1~7시는 오후로 봄 (약속은 보통 낮·저녁), 09:00 처럼 두 자리로 쓴 시간은 그대로
        !colon && h in 1..7 -> h + 12
        colon && short && h in 1..6 -> h + 12
        else -> h
    }

    private fun combine(day: Calendar, minutes: Int?): Long =
        day.timeInMillis + (minutes ?: 9 * 60) * Snap.MIN

    /** 준비물: “준비물: 신분증, 도장” 또는 “신분증 지참” 같은 말에서. */
    fun findItems(t: String): List<String> {
        val out = mutableListOf<String>()
        Regex("(준비물|지참물|챙길\\s*것|가져올\\s*것|가져오실\\s*것)\\s*[:：은는]?\\s*([^\\n]+)").findAll(t).forEach { m ->
            out += m.groupValues[2].split(Regex("[,，、/·]|\\s및\\s|\\s그리고\\s|\\s랑\\s")).map { it.trim().trimEnd('.', '!', ' ') }
        }
        Regex("([가-힣A-Za-z0-9]{1,10}(?:\\s[가-힣A-Za-z0-9]{1,10})?)\\s*(?:을|를)?\\s*(?:꼭\\s*)?(지참|챙겨|가져)").findAll(t).forEach { m ->
            val w = m.groupValues[1].trim()
            if (w.isNotBlank() && !Regex("^(꼭|반드시|잊지|모두|다들|준비물)$").matches(w)) out += w.removePrefix("꼭 ").trim()
        }
        t.lines().map { it.trim() }.filter { it.startsWith("- ") || it.startsWith("• ") || it.startsWith("* ") }.forEach { out += it.drop(2).trim() }
        return out.map { it.replace(Regex("^(꼭|반드시)\\s*"), "").replace(Regex("\\s*(꼭|반드시)$"), "").replace(Regex("(을|를)$"), "").trim() }.filter { it.isNotBlank() && it.length <= 20 }.distinct().take(10)
    }

    /** 예약 일정에 넣을 알림들: 전날 저녁 8시, 1시간 전. */
    fun apptRems(id: String, title: String, at: Long, items: List<String>, now: Long): JSONArray {
        val out = JSONArray()
        val prep = if (items.isNotEmpty()) " · 준비물 ${items.size}개" else ""
        val eve = Routine.dayStart(at) - Snap.DAY + 20 * Snap.HOUR
        if (eve > now && at - eve > 3 * Snap.HOUR) out.put(JSONObject().put("id", "$id-d1").put("text", "📅 내일 ${Fmt.hm(at)} $title$prep").put("at", eve))
        val h1 = at - Snap.HOUR
        if (h1 > now) out.put(JSONObject().put("id", "$id-h1").put("text", "📅 1시간 뒤 $title · 출발 준비해요$prep").put("at", h1))
        else if (at > now) out.put(JSONObject().put("id", "$id-h0").put("text", "📅 곧 $title$prep").put("at", at))
        return out
    }

    /** 병원 다녀온 날 → 다음에 갈 때 알림 (방문 + every - lead 일, 오전 10시). */
    fun visitRem(c: Clinic, visitAt: Long, now: Long): JSONObject? {
        if (c.every <= 0) return null
        var at = Routine.dayStart(visitAt + (c.every - c.lead.coerceIn(0, c.every)) * Snap.DAY) + 10 * Snap.HOUR
        if (at < now) at = Routine.dayStart(now + Snap.DAY) + 10 * Snap.HOUR
        val due = Routine.dayStart(visitAt + c.every * Snap.DAY)
        val cal = Calendar.getInstance().apply { timeInMillis = due }
        val text = "🏥 ${c.name} 갈 때가 됐어요" + (if (c.purpose.isNotBlank()) " · ${c.purpose}" else "") +
            " (${cal.get(Calendar.MONTH) + 1}/${cal.get(Calendar.DAY_OF_MONTH)}쯤까지)"
        return JSONObject().put("id", "visit-${c.id}").put("text", text).put("at", at)
    }
}
