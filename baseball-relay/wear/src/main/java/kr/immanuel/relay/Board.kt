package kr.immanuel.relay

import android.content.ComponentName
import android.content.Context
import androidx.wear.tiles.TileService
import androidx.wear.watchface.complications.datasource.ComplicationDataSourceUpdateRequester
import com.google.android.gms.wearable.DataEvent
import com.google.android.gms.wearable.DataEventBuffer
import com.google.android.gms.wearable.DataMapItem
import com.google.android.gms.wearable.WearableListenerService

/** 폰에서 받은 현재 스코어. 워치 안에 저장해 두고 타일·컴플리케이션이 읽는다. */
data class Board(
    val awayShort: String = "",
    val homeShort: String = "",
    val awayScore: Int = 0,
    val homeScore: Int = 0,
    val inning: String = "",
    val ball: Int = 0,
    val strike: Int = 0,
    val out: Int = 0,
    val base1: Boolean = false,
    val base2: Boolean = false,
    val base3: Boolean = false,
    val lastText: String = "",
    val live: Boolean = false,
    val ts: Long = 0,
) {
    val empty get() = awayShort.isBlank()
    val score get() = "$awayScore : $homeScore"

    /** "9말"처럼 짧게 줄인 이닝 표시. */
    val shortInning: String
        get() = Regex("(\\d+)회([초말])").find(inning)?.let { it.groupValues[1] + it.groupValues[2] }
            ?: when {
                inning.contains("종료") -> "종료"
                inning.contains("경기 전") -> inning.substringAfter("경기 전").trim().ifBlank { "예정" }
                else -> inning.take(4)
            }

    val bases: String
        get() = (if (base3) "◆" else "◇") + (if (base2) "◆" else "◇") + (if (base1) "◆" else "◇")

    companion object {
        private const val SP = "board"

        fun load(ctx: Context): Board {
            val sp = ctx.getSharedPreferences(SP, Context.MODE_PRIVATE)
            return Board(
                awayShort = sp.getString("awayShort", "") ?: "",
                homeShort = sp.getString("homeShort", "") ?: "",
                awayScore = sp.getInt("awayScore", 0),
                homeScore = sp.getInt("homeScore", 0),
                inning = sp.getString("inning", "") ?: "",
                ball = sp.getInt("ball", 0),
                strike = sp.getInt("strike", 0),
                out = sp.getInt("out", 0),
                base1 = sp.getBoolean("base1", false),
                base2 = sp.getBoolean("base2", false),
                base3 = sp.getBoolean("base3", false),
                lastText = sp.getString("lastText", "") ?: "",
                live = sp.getBoolean("live", false),
                ts = sp.getLong("ts", 0),
            )
        }

        fun save(ctx: Context, b: Board) {
            ctx.getSharedPreferences(SP, Context.MODE_PRIVATE).edit()
                .putString("awayShort", b.awayShort).putString("homeShort", b.homeShort)
                .putInt("awayScore", b.awayScore).putInt("homeScore", b.homeScore)
                .putString("inning", b.inning).putInt("ball", b.ball).putInt("strike", b.strike)
                .putInt("out", b.out).putBoolean("base1", b.base1).putBoolean("base2", b.base2)
                .putBoolean("base3", b.base3).putString("lastText", b.lastText)
                .putBoolean("live", b.live).putLong("ts", b.ts)
                .apply()
        }

        fun refreshSurfaces(ctx: Context) {
            runCatching { TileService.getUpdater(ctx).requestUpdate(ScoreTileService::class.java) }
            runCatching {
                ComplicationDataSourceUpdateRequester.create(
                    ctx, ComponentName(ctx, ScoreComplicationService::class.java)
                ).requestUpdateAll()
            }
        }
    }
}

/** 폰 앱이 보낸 스코어를 받는다. */
class DataLayerService : WearableListenerService() {
    override fun onDataChanged(events: DataEventBuffer) {
        for (e in events) {
            if (e.type != DataEvent.TYPE_CHANGED || e.dataItem.uri.path != "/relay/state") continue
            val m = DataMapItem.fromDataItem(e.dataItem).dataMap
            Board.save(this, Board(
                awayShort = m.getString("awayShort", ""),
                homeShort = m.getString("homeShort", ""),
                awayScore = m.getInt("awayScore"),
                homeScore = m.getInt("homeScore"),
                inning = m.getString("inning", ""),
                ball = m.getInt("ball"),
                strike = m.getInt("strike"),
                out = m.getInt("out"),
                base1 = m.getBoolean("base1"),
                base2 = m.getBoolean("base2"),
                base3 = m.getBoolean("base3"),
                lastText = m.getString("lastText", ""),
                live = m.getBoolean("live"),
                ts = m.getLong("ts"),
            ))
        }
        Board.refreshSurfaces(this)
    }
}
