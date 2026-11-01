package kr.immanuel.haru

import android.app.PendingIntent
import android.content.Intent
import androidx.wear.watchface.complications.data.ComplicationData
import androidx.wear.watchface.complications.data.ComplicationType
import androidx.wear.watchface.complications.data.LongTextComplicationData
import androidx.wear.watchface.complications.data.PlainComplicationText
import androidx.wear.watchface.complications.data.ShortTextComplicationData
import androidx.wear.watchface.complications.datasource.ComplicationRequest
import androidx.wear.watchface.complications.datasource.SuspendingComplicationDataSourceService

/**
 * 시계 화면 컴플리케이션.
 * 짧은 칸: 다음 알림 시각과 내용 앞부분 (알림이 없으면 남은 할 일 수).
 * 긴 칸: 지금 할 일과 다음 알림.
 */
class HaruComplicationService : SuspendingComplicationDataSourceService() {

    private fun plain(s: String) = PlainComplicationText.Builder(s).build()

    private fun tap(): PendingIntent = PendingIntent.getActivity(
        this, 0, Intent(this, WatchActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )

    private fun build(type: ComplicationType, s: Snap): ComplicationData? {
        val now = System.currentTimeMillis()
        val r = s.upcoming().firstOrNull()
        val cur = s.current
        return when (type) {
            ComplicationType.SHORT_TEXT -> {
                val (main, title) = when {
                    r != null -> Fmt.clock(r.at) to (if (r.at <= now) "🔔" else "") + r.text.take(4)
                    else -> "${s.tasks.size}" to "할 일"
                }
                ShortTextComplicationData.Builder(plain(main), plain("하루 도우미"))
                    .setTitle(plain(title))
                    .setTapAction(tap())
                    .build()
            }
            ComplicationType.LONG_TEXT -> {
                val main = cur?.let { "🎯 " + it.text } ?: "할 일이 없어요"
                val title = r?.let { "⏰ " + Fmt.hm(it.at) + " " + it.text } ?: "하루 도우미"
                LongTextComplicationData.Builder(plain(main), plain("하루 도우미"))
                    .setTitle(plain(title))
                    .setTapAction(tap())
                    .build()
            }
            else -> null
        }
    }

    override fun getPreviewData(type: ComplicationType): ComplicationData? = build(
        type,
        Snap("""{"ts":1,"focus":{"id":"a","text":"보고서 첫 줄 쓰기"},"tasks":[{"id":"a","text":"보고서 첫 줄 쓰기"}],"reminders":[{"id":"r","text":"약 먹기","at":${System.currentTimeMillis() + 3_600_000}}]}""")
    )

    override suspend fun onComplicationRequest(request: ComplicationRequest): ComplicationData? =
        build(request.complicationType, WStore.snap(this))
}
