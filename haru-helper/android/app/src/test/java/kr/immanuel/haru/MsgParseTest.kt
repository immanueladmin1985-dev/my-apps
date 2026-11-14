package kr.immanuel.haru

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.util.Calendar

class MsgParseTest {
    private fun at(y: Int, mo: Int, d: Int, h: Int = 0, mi: Int = 0) =
        Calendar.getInstance().apply { clear(); set(y, mo - 1, d, h, mi, 0) }.timeInMillis

    // 2026-11-14(토) 오전 10시
    private val now = at(2026, 11, 14, 10, 0)
    private val clinics = listOf(
        MsgParse.Clinic("in", "연세조은내과", listOf("연세조은내과"), "혈압약", 60, 7),
        MsgParse.Clinic("ps", "안녕정신과", listOf("안녕정신과"), "", 0, 7),
    )

    @Test fun hospitalReservation() {
        val r = MsgParse.parse("[Web발신]\n[안녕정신과]\n정성모님 2026/11/20(금) 18:00 예약변동시 전화 부탁드립니다.", now, clinics)
        assertEquals("appt", r.kind)
        assertEquals(at(2026, 11, 20, 18, 0), r.at)
        assertEquals("안녕정신과", r.org)
        assertEquals("안녕정신과 예약", r.title)
        assertEquals("ps", r.clinicId)
    }

    @Test fun cardPaymentAtClinic() {
        val r = MsgParse.parse("KB국민카드2082\n승인\n4,700 원(일시불)\n연세조은내과의원\n고객명 정*모님\n승인시각 10/13 09:23\n누적 512,077원", now, clinics)
        assertEquals("pay", r.kind)
        assertEquals(4700, r.amount)
        assertEquals("in", r.clinicId)
        assertEquals("연세조은내과의원", r.merchant)
        assertEquals(at(2026, 10, 13, 9, 23), r.payAt)
    }

    @Test fun unknownClinicPayment() {
        val r = MsgParse.parse("[Web발신]\n신한카드 승인 정*모 12,000원 일시불 11/10 14:02 튼튼정형외과의원 누적 30,000원", now, clinics)
        assertEquals("pay", r.kind)
        assertEquals("", r.clinicId)
        assertEquals(at(2026, 11, 10, 14, 2), r.payAt)
        val r2 = MsgParse.parse("신한카드 승인취소 12,000원 11/10 튼튼의원", now, clinics)
        assertEquals("none", r2.kind)
    }

    @Test fun kakaoMeeting() {
        val r = MsgParse.parse("다음주 화요일 오후 2시에 강남역에서 만나요! 신분증 꼭 챙겨오세요", now, clinics)
        assertEquals("event", r.kind)
        assertEquals(at(2026, 11, 17, 14, 0), r.at)
        assertEquals(listOf("신분증"), r.items)
    }

    @Test fun relativeAndItems() {
        val r = MsgParse.parse("내일 10시 30분 회의 있습니다. 준비물: 노트북, 발표자료", now, clinics)
        assertEquals("event", r.kind)
        assertEquals(at(2026, 11, 15, 10, 30), r.at)
        assertEquals(listOf("노트북", "발표자료"), r.items)
        val r2 = MsgParse.parse("토요일 저녁 7시반 모임", now, clinics)
        assertEquals(at(2026, 11, 14, 19, 30), r2.at)
        val r3 = MsgParse.parse("12월 3일 3시 치과 예약 [튼튼치과]", now, clinics)
        assertEquals("appt", r3.kind)
        assertEquals(at(2026, 12, 3, 15, 0), r3.at)
        assertEquals("튼튼치과 예약", r3.title)
        val r4 = MsgParse.parse("11/20(금) 09:30 건강검진 예약되었습니다 - 신분증\n- 문진표", now, clinics)
        assertEquals(at(2026, 11, 20, 9, 30), r4.at)
        assertTrue(r4.items.contains("문진표"))
    }

    @Test fun noScheduleAndPast() {
        assertEquals("none", MsgParse.parse("밥 먹었어?", now, clinics).kind)
        assertEquals("none", MsgParse.parse("[OO은행] 입금 50,000원 잔액 1,000원", now, clinics).kind)
        // 이미 지난 오늘 아침 일정은 일정으로 보지 않음
        assertEquals("none", MsgParse.parse("오늘 8시 회의", now, clinics).kind)
        // 1월 5일은 지났으므로 내년
        assertEquals(at(2027, 1, 5, 15, 0), MsgParse.parse("1월 5일 오후 3시 약속", now, clinics).at)
    }

    @Test fun reminderPlans() {
        val appt = at(2026, 11, 20, 18, 0)
        val rems = MsgParse.apptRems("a1", "안녕정신과 예약", appt, listOf("신분증"), now)
        assertEquals(2, rems.length())
        assertEquals(at(2026, 11, 19, 20, 0), rems.getJSONObject(0).getLong("at"))
        assertEquals(at(2026, 11, 20, 17, 0), rems.getJSONObject(1).getLong("at"))
        assertTrue(rems.getJSONObject(0).getString("text").contains("준비물 1개"))
        val v = MsgParse.visitRem(clinics[0], at(2026, 10, 13, 9, 23), now)!!
        assertEquals("visit-in", v.getString("id"))
        assertEquals(at(2026, 12, 5, 10, 0), v.getLong("at"))   // 10/13 + 60일 - 7일
        assertTrue(v.getString("text").contains("12/12쯤까지"))
        assertEquals(null, MsgParse.visitRem(clinics[1], now, now))
    }

    @Test fun snapApplyActions() {
        val s = Snap("""{"ts":1,"reminders":[],"routine":{"on":true}}""")
        s.apply(org.json.JSONObject().put("type", "appt").put("id", "a1").put("rems", MsgParse.apptRems("a1", "치과", at(2026, 11, 20, 18, 0), emptyList(), now)), now)
        assertEquals(2, s.reminders.size)
        s.apply(org.json.JSONObject().put("type", "apptCancel").put("id", "a1"), now)
        assertEquals(0, s.reminders.size)
        s.apply(org.json.JSONObject().put("type", "medTaken").put("key", "20261114:med-bp-0800"), now)
        assertEquals(setOf("20261114:med-bp-0800"), Routine.doneKeys(s.routine))
    }
}
