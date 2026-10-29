package kr.immanuel.relay

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.time.LocalDate
import java.time.ZoneId
import java.time.ZonedDateTime
import java.util.Date
import java.util.Locale

/**
 * 자동 감시: 매일 오전 9시에 오늘 경기를 찾고, 경기 시작 10분 전에 중계 감시를 켠다.
 */
object Scheduler {
    private val KST = ZoneId.of("Asia/Seoul")
    const val ACTION_DAILY = "kr.immanuel.relay.DAILY"
    const val ACTION_GAME = "kr.immanuel.relay.GAME"

    fun pickGame(games: List<GameInfo>, team: String): GameInfo? {
        val mine = games.filter { it.involves(team) && !it.category.contains("futures", ignoreCase = true) }
        return mine.firstOrNull { it.isLive }
            ?: mine.filter { !it.isFinished && !it.isCanceled }.minByOrNull { it.startMillis }
            ?: mine.maxByOrNull { it.startMillis }
    }

    private fun pending(ctx: Context, action: String, code: Int, gameId: String? = null): PendingIntent {
        val i = Intent(ctx, GameCheckReceiver::class.java).setAction(action)
        if (gameId != null) i.putExtra(RelayService.EXTRA_GAME, gameId)
        return PendingIntent.getBroadcast(ctx, code, i, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
    }

    private fun setExact(ctx: Context, at: Long, pi: PendingIntent) {
        val am = ctx.getSystemService(AlarmManager::class.java)
        val canExact = Build.VERSION.SDK_INT < 31 || am.canScheduleExactAlarms()
        if (canExact) am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi)
        else am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi)
    }

    fun scheduleDaily(ctx: Context) {
        var next = ZonedDateTime.now(KST).withHour(9).withMinute(0).withSecond(0).withNano(0)
        if (!next.isAfter(ZonedDateTime.now(KST))) next = next.plusDays(1)
        setExact(ctx, next.toInstant().toEpochMilli(), pending(ctx, ACTION_DAILY, 10))
    }

    fun cancelAll(ctx: Context) {
        val am = ctx.getSystemService(AlarmManager::class.java)
        am.cancel(pending(ctx, ACTION_DAILY, 10))
        am.cancel(pending(ctx, ACTION_GAME, 11))
    }

    /** 오늘 경기를 찾아서 지금 감시를 켜거나, 시작 10분 전에 켜지도록 예약한다. */
    suspend fun checkToday(ctx: Context): String {
        val prefs = Prefs(ctx)
        if (!prefs.autoWatch) return "자동 감시가 꺼져 있습니다."
        scheduleDaily(ctx)
        val game = pickGame(NaverApi.schedule(LocalDate.now(KST)), prefs.team)
        val msg: String
        if (game == null) {
            msg = "오늘은 ${Teams.short(prefs.team)} 경기가 없습니다."
        } else {
            val vs = "${Teams.short(game.awayCode, game.awayName)} vs ${Teams.short(game.homeCode, game.homeName)}"
            val time = SimpleDateFormat("M월 d일 HH:mm", Locale.KOREA).format(Date(game.startMillis))
            val startAt = game.startMillis - 10 * 60 * 1000L
            msg = when {
                game.isFinished -> "오늘 경기($vs)는 끝났습니다."
                game.isCanceled -> "오늘 경기($vs)는 취소되었습니다."
                prefs.stoppedGameId == game.id -> "$vs 경기는 직접 감시를 멈춰 두었습니다."
                game.isLive || startAt <= System.currentTimeMillis() -> {
                    RelayService.start(ctx, game.id)
                    "$vs 경기를 감시하고 있습니다."
                }
                else -> {
                    setExact(ctx, startAt, pending(ctx, ACTION_GAME, 11, game.id))
                    "$time $vs 경기, 시작 10분 전에 감시를 시작합니다."
                }
            }
        }
        prefs.nextGameLine = msg
        return msg
    }
}

class GameCheckReceiver : BroadcastReceiver() {
    override fun onReceive(ctx: Context, intent: Intent) {
        val pending = goAsync()
        CoroutineScope(Dispatchers.IO).launch {
            try {
                when (intent.action) {
                    Scheduler.ACTION_GAME -> {
                        val id = intent.getStringExtra(RelayService.EXTRA_GAME)
                        if (Prefs(ctx).autoWatch && id != Prefs(ctx).stoppedGameId) RelayService.start(ctx, id)
                    }
                    else -> Scheduler.checkToday(ctx)
                }
            } catch (_: Exception) {
                // 네트워크 오류 등: 30분 뒤 다시 확인
                runCatching { retryLater(ctx) }
            } finally {
                pending.finish()
            }
        }
    }

    private fun retryLater(ctx: Context) {
        val am = ctx.getSystemService(AlarmManager::class.java)
        val pi = PendingIntent.getBroadcast(ctx, 12,
            Intent(ctx, GameCheckReceiver::class.java).setAction(Scheduler.ACTION_DAILY),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, System.currentTimeMillis() + 30 * 60 * 1000L, pi)
    }
}

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(ctx: Context, intent: Intent) {
        if (!Prefs(ctx).autoWatch) return
        val pending = goAsync()
        CoroutineScope(Dispatchers.IO).launch {
            try {
                Scheduler.checkToday(ctx)
            } catch (_: Exception) {
                runCatching { Scheduler.scheduleDaily(ctx) }
            } finally {
                pending.finish()
            }
        }
    }
}
