package kr.immanuel.haru

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.util.Calendar

class RoutineTest {
    private fun at(y: Int, mo: Int, d: Int, h: Int, mi: Int) =
        Calendar.getInstance().apply { set(y, mo - 1, d, h, mi, 0); set(Calendar.MILLISECOND, 0) }.timeInMillis

    private val cfg = JSONObject(
        """{"on":true,"workOn":true,"days":[1,2,3,4,5],"start":"09:00","end":"18:00","lunch":"12:00","lunchEnd":"13:00",
            "focus":50,"rest":10,"alerts":{"start":true,"rest":true,"lunch":true,"end":true},"target":"watch",
            "events":[{"id":"wed","name":"수요예배","time":"19:30","days":[3],"before":30,"on":true,"msg":""},
                      {"id":"off","name":"꺼진 일정","time":"20:00","days":[3],"before":0,"on":false}]}"""
    )

    @Test fun weekdaySchedule() {
        // 2026-11-04 은 수요일
        val evs = Routine.events(cfg, at(2026, 11, 4, 8, 0))
        val list = evs.map { Fmt.clock(it.at) + " " + it.title }
        assertEquals("8:30 출근 준비할 시간이에요", list.first())
        assertTrue(evs.first().body.contains("오전 9:00 출근까지 30분"))
        assertTrue(list.contains("9:50 쉬는 시간 10분"))
        assertTrue(list.contains("12:00 점심시간이에요"))
        assertTrue(list.contains("1:00 점심시간 끝"))
        assertTrue(list.contains("4:50 쉬는 시간 10분"))
        assertTrue(list.contains("5:50 퇴근 10분 전이에요"))
        assertTrue(list.contains("7:00 수요예배 30분 전"))
        assertTrue(list.contains("7:30 수요예배 시간이에요"))
        assertTrue(list.none { it.contains("꺼진 일정") })
        // 점심 직전(11:50)에는 쉬는 시간을 따로 넣지 않음
        assertTrue(list.none { it.startsWith("11:50") })
        assertEquals(evs.map { it.key }.toSet().size, evs.size)
    }

    @Test fun weekendAndOff() {
        assertTrue(Routine.events(cfg, at(2026, 11, 8, 8, 0)).isEmpty())  // 일요일
        val off = JSONObject(cfg.toString()).put("on", false)
        assertNull(Routine.next(off, at(2026, 11, 4, 8, 0), emptySet()))
    }

    @Test fun nextSkipsDoneAndRollsOver() {
        val now = at(2026, 11, 4, 9, 55)
        val n = Routine.next(cfg, now, emptySet())!!
        assertEquals("다시 집중", n.title)
        val n2 = Routine.next(cfg, now, setOf(n.key))!!
        assertEquals("쉬는 시간 10분", n2.title)
        // 수요일 밤 → 다음 날(목) 출근
        val late = Routine.next(cfg, at(2026, 11, 4, 22, 0), emptySet())!!
        assertEquals("출근 준비할 시간이에요", late.title)
        assertEquals(at(2026, 11, 5, 8, 30), late.at)
        // 금요일 퇴근 뒤 → 월요일 출근
        val fri = Routine.next(cfg, at(2026, 11, 6, 19, 0), emptySet())!!
        assertEquals(at(2026, 11, 9, 8, 30), fri.at)
    }

    @Test fun leadZeroAndMeds() {
        val c = JSONObject(cfg.toString()).put("leadStart", 0).put("leadEnd", 0)
            .put("meds", org.json.JSONArray().put(JSONObject("{\"id\":\"bp\",\"name\":\"혈압약\",\"times\":[\"08:00\",\"20:00\"],\"days\":[0,1,2,3,4,5,6],\"on\":true}")))
        val list = Routine.events(c, at(2026, 11, 4, 8, 0)).map { Fmt.clock(it.at) + " " + it.title }
        assertEquals("8:00 혈압약 먹을 시간이에요", list.first())
        assertTrue(list.contains("9:00 출근 시간이에요"))
        assertTrue(list.contains("6:00 퇴근 시간이에요"))
        assertTrue(list.contains("8:00 혈압약 먹을 시간이에요") && list.count { it.contains("혈압약") } == 2)
        // 일과 알림을 꺼도 약 알림은 울림
        val off = JSONObject(c.toString()).put("on", false)
        val offList = Routine.events(off, at(2026, 11, 8, 8, 0))
        assertEquals(2, offList.size)
        assertTrue(Routine.isMed(offList[0].key))
        // 웹에서 먹었다고 누른 키는 건너뜀
        off.put("done", org.json.JSONArray().put(offList[0].key))
        assertEquals(offList[1].key, Routine.next(off, at(2026, 11, 8, 7, 0), emptySet())!!.key)
    }
}
