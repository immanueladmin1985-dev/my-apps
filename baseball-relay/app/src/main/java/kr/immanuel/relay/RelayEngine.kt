package kr.immanuel.relay

import org.json.JSONObject

enum class Kind { START, END, CANCEL, ATBAT, SCORE, HOMERUN, PITCHER, INNING }

data class RelayEvent(val kind: Kind, val title: String, val text: String)

/**
 * 네이버 중계 데이터를 받아서, 새로 생긴 플레이를 알림용 사건으로 바꾼다.
 * 안드로이드에 의존하지 않으므로 끝난 경기 데이터로 테스트할 수 있다.
 */
class RelayEngine(private val myTeam: String) {
    var gameId: String = ""
    var lastSeq: Int = -1
    var lastAway = 0
    var lastHome = 0
    var halfInning = 0
    var halfTop = true
    var halfStartAway = 0
    var halfStartHome = 0
    var halfSummarized = false
    var lastStatus = ""
    var lastText = ""
    var primed = false

    fun toJson(): String = JSONObject().apply {
        put("gameId", gameId); put("lastSeq", lastSeq); put("lastAway", lastAway); put("lastHome", lastHome)
        put("halfInning", halfInning); put("halfTop", halfTop); put("halfStartAway", halfStartAway)
        put("halfStartHome", halfStartHome); put("halfSummarized", halfSummarized)
        put("lastStatus", lastStatus); put("lastText", lastText); put("primed", primed)
    }.toString()

    fun restore(json: String?) {
        if (json.isNullOrBlank()) return
        runCatching {
            val o = JSONObject(json)
            gameId = o.optString("gameId"); lastSeq = o.optInt("lastSeq", -1)
            lastAway = o.optInt("lastAway"); lastHome = o.optInt("lastHome")
            halfInning = o.optInt("halfInning"); halfTop = o.optBoolean("halfTop", true)
            halfStartAway = o.optInt("halfStartAway"); halfStartHome = o.optInt("halfStartHome")
            halfSummarized = o.optBoolean("halfSummarized"); lastStatus = o.optString("lastStatus")
            lastText = o.optString("lastText"); primed = o.optBoolean("primed")
        }
    }

    /**
     * game: 경기 정보(점수, 상태). relay: 이번에 받은 중계 데이터(여러 이닝을 합쳐도 된다).
     * 처음 호출될 때(primed=false)는 이미 지나간 플레이로 알림을 보내지 않고 위치만 기억한다.
     */
    fun process(game: GameInfo, plays: List<Play>): List<RelayEvent> {
        val out = ArrayList<RelayEvent>()
        if (gameId != game.id) {
            gameId = game.id; lastSeq = -1; primed = false; lastStatus = ""
            lastAway = 0; lastHome = 0; halfInning = 0; halfSummarized = false
        }
        val names = Names(game, myTeam)

        // 경기 상태 변화
        if (primed && lastStatus != game.status) {
            if (game.isLive && (lastStatus == "BEFORE" || lastStatus == "READY" || lastStatus.isEmpty())) {
                out += RelayEvent(Kind.START, "⚾ 경기 시작", "${names.away} vs ${names.home} 경기가 시작되었습니다.")
            }
        }

        val fresh = plays.filter { it.seq > lastSeq }.sortedBy { it.seq }
        if (!primed) {
            // 처음에는 현재 위치만 맞춘다.
            fresh.lastOrNull()?.let { p ->
                lastSeq = p.seq
                halfInning = p.inning; halfTop = p.top
                p.state?.let { lastAway = it.awayScore; lastHome = it.homeScore }
                halfStartAway = lastAway; halfStartHome = lastHome
                halfSummarized = p.state?.out == 3
                lastText = p.text
            }
            if (fresh.isEmpty()) { lastAway = game.awayScore; lastHome = game.homeScore }
            primed = true
        } else {
            for (p in fresh) {
                handlePlay(p, names, out)
                lastSeq = p.seq
            }
        }

        // 경기 종료·취소
        if (lastStatus != game.status && lastStatus.isNotEmpty()) {
            if (game.isFinished) {
                if (!halfSummarized && halfInning > 0) {
                    // 마지막 이닝 요약은 경기 종료 알림에 포함한다.
                    halfSummarized = true
                }
                val a = game.awayScore; val h = game.homeScore
                val result = when {
                    a == h -> "무승부"
                    (a > h) == (game.awayCode == myTeam) -> "${Teams.short(myTeam)} 승리!"
                    else -> "${Teams.short(myTeam)} 패배"
                }
                out += RelayEvent(Kind.END, "🏁 경기 종료 · $result", "${names.away} $a : $h ${names.home}")
            } else if (game.isCanceled) {
                out += RelayEvent(Kind.CANCEL, "경기 취소", "${names.away} vs ${names.home} 경기가 취소되었습니다.")
            }
        }
        lastStatus = game.status
        return out
    }

    private fun handlePlay(p: Play, names: Names, out: MutableList<RelayEvent>) {
        // 새 하프 이닝이 시작되었는데 이전 하프 요약을 아직 못 보냈다면 지금 보낸다.
        if (p.inning != halfInning || p.top != halfTop) {
            if (halfInning > 0 && !halfSummarized) out += inningSummary(names)
            halfInning = p.inning; halfTop = p.top
            halfStartAway = lastAway; halfStartHome = lastHome
            halfSummarized = false
        }

        val st = p.state
        val scored = st != null && (st.awayScore != lastAway || st.homeScore != lastHome)
        val text = p.text
        val isHomeRun = text.contains("홈런") && !text.contains("주자")
        val isPitcherChange = text.contains("교체") && text.contains("투수")
        val isResult = isResultLine(p)
        val score = st?.let { "${names.away} ${it.awayScore} : ${it.homeScore} ${names.home}" } ?: ""
        val half = "${p.inning}회${if (p.top) "초" else "말"}"

        when {
            isHomeRun -> out += RelayEvent(Kind.HOMERUN, "💥 홈런! $score", "$half ${batterOf(p)} $text")
            scored && st != null -> {
                val who = if (st.awayScore != lastAway) names.away else names.home
                out += RelayEvent(Kind.SCORE, "🔔 $who 득점 · $score", "$half $text")
            }
            isPitcherChange -> out += RelayEvent(Kind.PITCHER, "투수 교체 · $half", text)
            isResult -> out += RelayEvent(Kind.ATBAT, "$half ${batterOf(p)}", "$text${if (score.isNotEmpty()) " · $score" else ""}")
        }
        // 득점 줄이 타석 결과와 함께 올 때, 타석 결과도 따로 남긴다.
        if ((isHomeRun || scored) && isResult && !isHomeRun) {
            out += RelayEvent(Kind.ATBAT, "$half ${batterOf(p)}", "$text · $score")
        }

        if (st != null) { lastAway = st.awayScore; lastHome = st.homeScore }
        lastText = text

        if (st?.out == 3 && !halfSummarized) {
            out += inningSummary(names)
            halfSummarized = true
        }
    }

    private fun inningSummary(n: Names): RelayEvent {
        val half = "${halfInning}회${if (halfTop) "초" else "말"}"
        val runs = if (halfTop) lastAway - halfStartAway else lastHome - halfStartHome
        val team = if (halfTop) n.away else n.home
        val desc = if (runs > 0) "$team ${runs}득점" else "$team 무득점"
        return RelayEvent(Kind.INNING, "$half 종료 · ${n.away} $lastAway : $lastHome ${n.home}", desc)
    }

    private fun batterOf(p: Play): String =
        p.title.replace(Regex("^\\d+번타자\\s*"), "").trim().ifBlank { p.title }

    companion object {
        /** 타석 결과 줄인지 판단한다. 예: "나성범 : 우익수 뒤 홈런", 주자 진루 줄과 투구 줄은 제외. */
        fun isResultLine(p: Play): Boolean {
            val t = p.text
            if (!t.contains(":")) return false
            if (t.contains("주자")) return false
            if (Regex("^\\d+구").containsMatchIn(t)) return false
            if (t.contains("교체")) return false
            return true
        }
    }

    private class Names(game: GameInfo, myTeam: String) {
        val away = Teams.short(game.awayCode, game.awayName)
        val home = Teams.short(game.homeCode, game.homeName)
    }
}
