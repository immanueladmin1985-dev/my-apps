package kr.immanuel.haru

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class SnapTest {
    private val now = 1_800_000_000_000L

    private fun sample() = Snap(
        """{"v":1,"ts":1,"talkSec":30,
            "focus":{"id":"a","text":"보고서"},
            "tasks":[{"id":"a","text":"보고서"},{"id":"b","text":"빨래"}],
            "reminders":[{"id":"r1","text":"약","at":${now - 1000},"daily":true},{"id":"r2","text":"전화","at":${now + 5000},"daily":false}],
            "lists":[{"id":"out","name":"나가기 전","items":[{"id":"i1","text":"지갑","on":false}]}],
            "notes":2}"""
    )

    private fun act(type: String, vararg kv: Pair<String, Any>) = JSONObject().put("type", type).apply { kv.forEach { put(it.first, it.second) } }

    @Test fun readsSummary() {
        val s = sample()
        assertFalse(s.empty)
        assertEquals(30, s.talkSec)
        assertEquals("보고서", s.current?.text)
        assertEquals(listOf("r1", "r2"), s.upcoming().map { it.id })
        assertEquals("지갑", s.lists[0].items[0].text)
    }

    @Test fun taskDoneClearsFocus() {
        val s = sample()
        s.apply(act("taskDone", "id" to "a"), now)
        assertNull(s.focus)
        assertEquals("빨래", s.current?.text)
        assertEquals(1, s.tasks.size)
    }

    @Test fun dailyReminderMovesToNextDay() {
        val s = sample()
        s.apply(act("remDone", "id" to "r1"), now)
        val r = s.reminders.first { it.id == "r1" }
        assertTrue(r.at > now)
        assertEquals(now - 1000 + Snap.DAY, r.at)
        s.apply(act("remDone", "id" to "r2"), now)
        assertTrue(s.reminders.none { it.id == "r2" })
    }

    @Test fun snoozeListAndNote() {
        val s = sample()
        s.apply(act("remSnooze", "id" to "r2", "at" to now + 600_000), now)
        assertEquals(now + 600_000, s.reminders.first { it.id == "r2" }.at)
        s.apply(act("listTog", "list" to "out", "item" to "i1", "on" to true), now)
        assertTrue(s.lists[0].items[0].on)
        s.apply(act("listReset", "list" to "out"), now)
        assertFalse(s.lists[0].items[0].on)
        s.apply(act("note", "text" to "우유"), now)
        assertEquals(3, s.noteCount)
        s.apply(act("focus", "id" to "b"), now)
        assertEquals("빨래", s.focus?.text)
    }

    @Test fun brokenJsonIsEmpty() {
        val s = Snap("not json")
        assertTrue(s.empty)
        assertNull(s.current)
    }
}
