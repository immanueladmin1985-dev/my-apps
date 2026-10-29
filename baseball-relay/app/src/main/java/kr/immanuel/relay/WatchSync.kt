package kr.immanuel.relay

import android.content.Context
import com.google.android.gms.wearable.PutDataMapRequest
import com.google.android.gms.wearable.Wearable
import kotlinx.coroutines.tasks.await

/** 워치 앱(타일·컴플리케이션)으로 현재 스코어를 보낸다. 워치 앱이 없으면 조용히 넘어간다. */
object WatchSync {
    const val PATH = "/relay/state"

    data class Board(
        val awayShort: String,
        val homeShort: String,
        val awayScore: Int,
        val homeScore: Int,
        val inning: String,     // "9회말", "경기 전 18:30", "종료"
        val ball: Int,
        val strike: Int,
        val out: Int,
        val base1: Boolean,
        val base2: Boolean,
        val base3: Boolean,
        val lastText: String,
        val live: Boolean,
        val myTeamIsAway: Boolean,
    )

    suspend fun send(ctx: Context, b: Board) {
        try {
            val req = PutDataMapRequest.create(PATH).apply {
                dataMap.putString("awayShort", b.awayShort)
                dataMap.putString("homeShort", b.homeShort)
                dataMap.putInt("awayScore", b.awayScore)
                dataMap.putInt("homeScore", b.homeScore)
                dataMap.putString("inning", b.inning)
                dataMap.putInt("ball", b.ball)
                dataMap.putInt("strike", b.strike)
                dataMap.putInt("out", b.out)
                dataMap.putBoolean("base1", b.base1)
                dataMap.putBoolean("base2", b.base2)
                dataMap.putBoolean("base3", b.base3)
                dataMap.putString("lastText", b.lastText)
                dataMap.putBoolean("live", b.live)
                dataMap.putBoolean("myTeamIsAway", b.myTeamIsAway)
                dataMap.putLong("ts", System.currentTimeMillis())
            }.asPutDataRequest().setUrgent()
            Wearable.getDataClient(ctx).putDataItem(req).await()
        } catch (_: Exception) {
            // 워치가 연결되어 있지 않거나 Play 서비스가 없을 때
        }
    }
}
