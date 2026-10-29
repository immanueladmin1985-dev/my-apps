package kr.immanuel.relay

import androidx.wear.watchface.complications.data.ComplicationData
import androidx.wear.watchface.complications.data.ComplicationType
import androidx.wear.watchface.complications.data.LongTextComplicationData
import androidx.wear.watchface.complications.data.PlainComplicationText
import androidx.wear.watchface.complications.data.ShortTextComplicationData
import androidx.wear.watchface.complications.datasource.ComplicationRequest
import androidx.wear.watchface.complications.datasource.SuspendingComplicationDataSourceService

/** 워치페이스 컴플리케이션: 짧은 칸에는 "6:4 / 9말", 긴 칸에는 "삼성 6:4 KIA · 9회말". */
class ScoreComplicationService : SuspendingComplicationDataSourceService() {

    private fun plain(s: String) = PlainComplicationText.Builder(s).build()

    private fun build(type: ComplicationType, b: Board): ComplicationData? {
        val shortText = if (b.empty) "⚾" else "${b.awayScore}:${b.homeScore}"
        val title = if (b.empty) "야구" else b.shortInning
        val desc = if (b.empty) "야구 스코어" else "${b.awayShort} ${b.score} ${b.homeShort} ${b.inning}"
        return when (type) {
            ComplicationType.SHORT_TEXT ->
                ShortTextComplicationData.Builder(plain(shortText), plain(desc)).setTitle(plain(title)).build()
            ComplicationType.LONG_TEXT ->
                LongTextComplicationData.Builder(
                    plain(if (b.empty) "야구 중계 대기 중" else "${b.awayShort} ${b.awayScore}:${b.homeScore} ${b.homeShort}"),
                    plain(desc)
                ).setTitle(plain(if (b.empty) "⚾" else b.inning)).build()
            else -> null
        }
    }

    override fun getPreviewData(type: ComplicationType): ComplicationData? =
        build(type, Board(awayShort = "삼성", homeShort = "KIA", awayScore = 6, homeScore = 4, inning = "9회말", live = true))

    override suspend fun onComplicationRequest(request: ComplicationRequest): ComplicationData? =
        build(request.complicationType, Board.load(this))
}
