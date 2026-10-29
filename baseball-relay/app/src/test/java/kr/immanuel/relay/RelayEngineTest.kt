package kr.immanuel.relay

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class RelayEngineTest {
    private fun game(status: String, a: Int = 0, h: Int = 0) =
        GameInfo("G1", "SS", "HT", "삼성", "KIA", 0L, status, "", a, h, "kbo")

    private fun st(a: Int, h: Int, out: Int = 0) = GameState(a, h, 0, 0, out, false, false, false)

    @Test
    fun 득점과_홈런과_이닝요약() {
        val e = RelayEngine("SS")
        e.process(game("BEFORE"), emptyList())
        val start = e.process(game("STARTED"), emptyList())
        assertEquals(Kind.START, start.single().kind)

        val plays = listOf(
            Play(1, 1, true, "1번타자 김지찬", 1, "1구 스트라이크", st(0, 0)),
            Play(2, 1, true, "1번타자 김지찬", 13, "김지찬 : 좌전 안타", st(0, 0)),
            Play(3, 1, true, "2번타자 박승규", 13, "박승규 : 우익수 뒤 홈런 (홈런거리:125M)", st(2, 0)),
            Play(4, 1, true, "3번타자 구자욱", 13, "구자욱 : 삼진 아웃", st(2, 0, 3)),
            Play(5, 1, false, "1번타자 박찬호", 13, "박찬호 : 유격수 땅볼 아웃", st(2, 0, 1)),
        )
        val ev = e.process(game("STARTED", 2, 0), plays)
        val kinds = ev.map { it.kind }
        assertTrue(kinds.toString(), kinds.contains(Kind.HOMERUN))
        assertTrue(kinds.toString(), kinds.contains(Kind.INNING))
        assertEquals(3, kinds.count { it == Kind.ATBAT })
        val inning = ev.first { it.kind == Kind.INNING }
        assertTrue(inning.text, inning.text.contains("삼성 2득점"))

        val end = e.process(game("RESULT", 2, 0), emptyList())
        assertTrue(end.single().title.contains("삼성 승리"))
    }

    @Test
    fun 처음에는_지난_플레이로_알림을_보내지_않는다() {
        val e = RelayEngine("SS")
        val plays = listOf(Play(9, 5, true, "타자", 13, "누구 : 안타", st(3, 1)))
        assertTrue(e.process(game("STARTED", 3, 1), plays).isEmpty())
        assertEquals(9, e.lastSeq)
    }
}
