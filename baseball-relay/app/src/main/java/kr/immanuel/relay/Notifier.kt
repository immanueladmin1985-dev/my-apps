package kr.immanuel.relay

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat

/**
 * 알림 채널
 *  - live   : 폰에 고정되는 진행 중 알림(워치로는 보내지 않음)
 *  - atbat  : 매 타석 결과(소리·진동 없음)
 *  - major  : 득점·홈런·투수 교체·경기 시작/종료(진동)
 *  - inning : 이닝 종료 요약(가벼운 알림)
 * 채널별 소리·진동은 휴대폰 설정 > 알림에서 바꿀 수 있다.
 */
object Notifier {
    const val CH_LIVE = "live"
    const val CH_ATBAT = "atbat"
    const val CH_MAJOR = "major"
    const val CH_INNING = "inning"
    const val ID_LIVE = 1
    private const val GROUP = "kr.immanuel.relay.PLAYS"

    fun createChannels(ctx: Context) {
        val nm = ctx.getSystemService(NotificationManager::class.java)
        nm.createNotificationChannels(listOf(
            NotificationChannel(CH_LIVE, "실시간 스코어(고정)", NotificationManager.IMPORTANCE_LOW).apply {
                description = "경기 중 폰 알림창에 고정되는 스코어"
                setShowBadge(false)
            },
            NotificationChannel(CH_ATBAT, "타석 결과", NotificationManager.IMPORTANCE_LOW).apply {
                description = "매 타석 결과. 소리와 진동 없이 쌓입니다."
            },
            NotificationChannel(CH_MAJOR, "주요 상황", NotificationManager.IMPORTANCE_HIGH).apply {
                description = "득점, 홈런, 투수 교체, 경기 시작과 종료"
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 250, 120, 250)
            },
            NotificationChannel(CH_INNING, "이닝 종료 요약", NotificationManager.IMPORTANCE_DEFAULT).apply {
                description = "이닝이 끝날 때 스코어 요약"
                setSound(null, null)
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 120)
            },
        ))
    }

    fun openGameIntent(ctx: Context, gameId: String?): PendingIntent {
        val intent = if (gameId.isNullOrBlank()) Intent(ctx, MainActivity::class.java)
        else Intent(Intent.ACTION_VIEW, Uri.parse("https://m.sports.naver.com/game/$gameId/relay"))
        return PendingIntent.getActivity(ctx, 0, intent, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
    }

    fun live(ctx: Context, title: String, text: String, gameId: String?): Notification =
        NotificationCompat.Builder(ctx, CH_LIVE)
            .setSmallIcon(R.drawable.ic_stat)
            .setContentTitle(title)
            .setContentText(text)
            .setStyle(NotificationCompat.BigTextStyle().bigText(text))
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setLocalOnly(true)
            .setShowWhen(false)
            .setCategory(NotificationCompat.CATEGORY_PROGRESS)
            .setContentIntent(openGameIntent(ctx, gameId))
            .addAction(0, "이 경기 그만 보기",
                PendingIntent.getService(ctx, 1, Intent(ctx, RelayService::class.java).setAction(RelayService.ACTION_STOP),
                    PendingIntent.FLAG_IMMUTABLE))
            .build()

    fun updateLive(ctx: Context, title: String, text: String, gameId: String?) {
        if (!NotificationManagerCompat.from(ctx).areNotificationsEnabled()) return
        try {
            NotificationManagerCompat.from(ctx).notify(ID_LIVE, live(ctx, title, text, gameId))
        } catch (_: SecurityException) { }
    }

    fun post(ctx: Context, e: RelayEvent, gameId: String?) {
        val prefs = Prefs(ctx)
        if (!prefs.enabled(e.kind)) return
        val channel = when (e.kind) {
            Kind.ATBAT -> CH_ATBAT
            Kind.INNING -> CH_INNING
            else -> CH_MAJOR
        }
        val n = NotificationCompat.Builder(ctx, channel)
            .setSmallIcon(R.drawable.ic_stat)
            .setContentTitle(e.title)
            .setContentText(e.text)
            .setStyle(NotificationCompat.BigTextStyle().bigText(e.text))
            .setAutoCancel(true)
            .setGroup(GROUP)
            .setCategory(if (channel == CH_MAJOR) NotificationCompat.CATEGORY_EVENT else NotificationCompat.CATEGORY_STATUS)
            .setPriority(if (channel == CH_MAJOR) NotificationCompat.PRIORITY_HIGH else NotificationCompat.PRIORITY_LOW)
            .setContentIntent(openGameIntent(ctx, gameId))
            .build()
        val id = prefs.notifSeq.let { if (it > 100000) 100 else it + 1 }
        prefs.notifSeq = id
        try {
            NotificationManagerCompat.from(ctx).notify(id, n)
        } catch (_: SecurityException) { }
    }
}
