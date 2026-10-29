package kr.immanuel.relay

import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.ZoneId

/** KBO 구단. code 는 네이버 스포츠의 팀 코드. */
data class Team(val code: String, val name: String, val short: String)

object Teams {
    val all = listOf(
        Team("SS", "삼성 라이온즈", "삼성"),
        Team("HT", "KIA 타이거즈", "KIA"),
        Team("LG", "LG 트윈스", "LG"),
        Team("OB", "두산 베어스", "두산"),
        Team("SK", "SSG 랜더스", "SSG"),
        Team("NC", "NC 다이노스", "NC"),
        Team("KT", "KT 위즈", "KT"),
        Team("LT", "롯데 자이언츠", "롯데"),
        Team("HH", "한화 이글스", "한화"),
        Team("WO", "키움 히어로즈", "키움"),
    )

    fun short(code: String, fallback: String = code): String =
        all.firstOrNull { it.code == code }?.short ?: fallback.ifBlank { code }
}

data class GameInfo(
    val id: String,
    val awayCode: String,
    val homeCode: String,
    val awayName: String,
    val homeName: String,
    val startMillis: Long,
    val status: String,      // BEFORE, STARTED, RESULT, CANCEL ...
    val statusInfo: String,  // "9회말" 같은 표시용 문구
    val awayScore: Int,
    val homeScore: Int,
    val category: String,
) {
    val isLive get() = status == "STARTED" || status == "LIVE"
    val isFinished get() = status == "RESULT" || status == "END"
    val isCanceled get() = status == "CANCEL" || status.contains("CANCEL")
    fun involves(code: String) = awayCode == code || homeCode == code
}

data class GameState(
    val awayScore: Int,
    val homeScore: Int,
    val ball: Int,
    val strike: Int,
    val out: Int,
    val base1: Boolean,
    val base2: Boolean,
    val base3: Boolean,
)

data class Play(
    val seq: Int,
    val inning: Int,
    val top: Boolean,        // true = 초(원정 공격), false = 말(홈 공격)
    val title: String,       // 타석 제목. 예: "5번타자 나성범"
    val type: Int,
    val text: String,
    val state: GameState?,
)

data class RelaySnapshot(
    val inning: Int,
    val top: Boolean,
    val plays: List<Play>,
    val state: GameState?,
)

/** 네이버 스포츠 내부 API. 공식 API가 아니므로 구조가 바뀌면 파서를 고쳐야 한다. */
object NaverApi {
    private const val BASE = "https://api-gw.sports.naver.com"
    private val KST: ZoneId = ZoneId.of("Asia/Seoul")

    fun get(url: String): String {
        val conn = URL(url).openConnection() as HttpURLConnection
        conn.connectTimeout = 8000
        conn.readTimeout = 8000
        conn.setRequestProperty("User-Agent", "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36")
        conn.setRequestProperty("Referer", "https://m.sports.naver.com/")
        conn.setRequestProperty("Accept", "application/json")
        try {
            val code = conn.responseCode
            val body = (if (code in 200..299) conn.inputStream else conn.errorStream)
                ?.bufferedReader(Charsets.UTF_8)?.use { it.readText() } ?: ""
            if (code !in 200..299) throw RuntimeException("HTTP $code")
            return body
        } finally {
            conn.disconnect()
        }
    }

    fun scheduleUrl(date: LocalDate) =
        "$BASE/schedule/games?fields=basic,baseball&upperCategoryId=kbaseball" +
            "&fromDate=$date&toDate=$date&size=500"

    fun gameUrl(id: String) = "$BASE/schedule/games/$id"
    fun relayUrl(id: String, inning: Int? = null) =
        "$BASE/schedule/games/$id/relay" + (if (inning != null) "?inning=$inning" else "")

    fun schedule(date: LocalDate): List<GameInfo> = parseSchedule(JSONObject(get(scheduleUrl(date))))
    fun game(id: String): GameInfo? = parseGameRoot(JSONObject(get(gameUrl(id))))
    fun relay(id: String, inning: Int? = null): RelaySnapshot? =
        parseRelay(JSONObject(get(relayUrl(id, inning))))

    // ---- 파싱 (JSON 구조에 관한 지식은 모두 여기에 모은다) ----

    fun parseSchedule(root: JSONObject): List<GameInfo> {
        val games = root.optJSONObject("result")?.optJSONArray("games") ?: return emptyList()
        return (0 until games.length()).mapNotNull { parseGame(games.optJSONObject(it)) }
    }

    fun parseGameRoot(root: JSONObject): GameInfo? {
        val result = root.optJSONObject("result") ?: return null
        return parseGame(result.optJSONObject("game") ?: result)
    }

    fun parseGame(o: JSONObject?): GameInfo? {
        o ?: return null
        val id = o.optString("gameId")
        if (id.isBlank()) return null
        val start = o.optString("gameDateTime").takeIf { it.length >= 16 }?.let {
            runCatching { LocalDateTime.parse(it.take(19)).atZone(KST).toInstant().toEpochMilli() }.getOrNull()
        } ?: 0L
        return GameInfo(
            id = id,
            awayCode = o.optString("awayTeamCode"),
            homeCode = o.optString("homeTeamCode"),
            awayName = o.optString("awayTeamName"),
            homeName = o.optString("homeTeamName"),
            startMillis = start,
            status = o.optString("statusCode").uppercase(),
            statusInfo = o.optString("statusInfo"),
            awayScore = o.intOf("awayTeamScore"),
            homeScore = o.intOf("homeTeamScore"),
            category = o.optString("categoryId"),
        )
    }

    fun parseState(o: JSONObject?): GameState? {
        o ?: return null
        if (!o.has("homeScore") && !o.has("awayScore")) return null
        return GameState(
            awayScore = o.intOf("awayScore"),
            homeScore = o.intOf("homeScore"),
            ball = o.intOf("ball"),
            strike = o.intOf("strike"),
            out = o.intOf("out"),
            base1 = o.baseOf("base1"),
            base2 = o.baseOf("base2"),
            base3 = o.baseOf("base3"),
        )
    }

    fun parseRelay(root: JSONObject): RelaySnapshot? {
        val data = root.optJSONObject("result")?.optJSONObject("textRelayData") ?: return null
        val relays = data.optJSONArray("textRelays") ?: JSONArray()
        val plays = ArrayList<Play>()
        for (i in 0 until relays.length()) {
            val r = relays.optJSONObject(i) ?: continue
            val inning = r.intOf("inn")
            val top = r.optString("homeOrAway") != "1"
            val title = r.optString("title")
            val options = r.optJSONArray("textOptions") ?: continue
            for (j in 0 until options.length()) {
                val t = options.optJSONObject(j) ?: continue
                val text = t.optString("text").trim()
                if (text.isEmpty()) continue
                plays += Play(
                    seq = t.intOf("seqno"),
                    inning = inning,
                    top = top,
                    title = title,
                    type = t.intOf("type"),
                    text = text,
                    state = parseState(t.optJSONObject("currentGameState")),
                )
            }
        }
        plays.sortBy { it.seq }
        val inning = data.intOf("inn").takeIf { it > 0 } ?: plays.lastOrNull()?.inning ?: 0
        val top = if (data.has("homeOrAway")) data.optString("homeOrAway") != "1" else plays.lastOrNull()?.top ?: true
        return RelaySnapshot(
            inning = inning,
            top = top,
            plays = plays,
            state = parseState(data.optJSONObject("currentGameState")) ?: plays.lastOrNull { it.state != null }?.state,
        )
    }

    private fun JSONObject.intOf(key: String): Int {
        val v = opt(key) ?: return 0
        return when (v) {
            is Number -> v.toInt()
            is String -> v.trim().toIntOrNull() ?: 0
            else -> 0
        }
    }

    /** 주자 정보는 선수 코드(문자열)나 숫자로 올 수 있다. 비어 있거나 0 이면 주자 없음. */
    private fun JSONObject.baseOf(key: String): Boolean {
        val v = opt(key) ?: return false
        return when (v) {
            is Boolean -> v
            is Number -> v.toLong() != 0L
            is String -> v.isNotBlank() && v != "0" && v != "null"
            else -> false
        }
    }
}
