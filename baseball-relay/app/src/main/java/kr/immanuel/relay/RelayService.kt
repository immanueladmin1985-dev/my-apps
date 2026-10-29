package kr.immanuel.relay

import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import androidx.core.app.NotificationManagerCompat
import androidx.core.app.ServiceCompat
import androidx.core.content.ContextCompat
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.time.LocalDate
import java.time.ZoneId
import java.util.Date
import java.util.Locale

/** 경기 중에 10초마다 중계를 확인해서 알림과 워치로 보내는 서비스. */
class RelayService : Service() {

    companion object {
        const val ACTION_START = "kr.immanuel.relay.START"
        const val ACTION_STOP = "kr.immanuel.relay.STOP"
        const val EXTRA_GAME = "gameId"
        @Volatile var running = false

        fun start(ctx: Context, gameId: String? = null) {
            val i = Intent(ctx, RelayService::class.java).setAction(ACTION_START)
            if (gameId != null) i.putExtra(EXTRA_GAME, gameId)
            ContextCompat.startForegroundService(ctx, i)
        }

        fun stop(ctx: Context) {
            ctx.startService(Intent(ctx, RelayService::class.java).setAction(ACTION_STOP))
        }
    }

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private var loop: Job? = null
    private var wakeLock: PowerManager.WakeLock? = null
    private var gameId: String? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Notifier.createChannels(this)
        val notification = Notifier.live(this, "야구 중계 알림", "경기 정보를 확인하고 있습니다.", null)
        ServiceCompat.startForeground(
            this, Notifier.ID_LIVE, notification,
            if (Build.VERSION.SDK_INT >= 34) ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE else 0
        )

        if (intent?.action == ACTION_STOP) {
            gameId?.let { Prefs(this).stoppedGameId = it }
            finish("감시를 멈췄습니다.")
            return START_NOT_STICKY
        }

        intent?.getStringExtra(EXTRA_GAME)?.let { gameId = it }
        if (loop?.isActive != true) {
            running = true
            acquireWakeLock()
            loop = scope.launch { runLoop() }
        }
        return START_STICKY
    }

    private fun acquireWakeLock() {
        if (wakeLock?.isHeld == true) return
        val pm = getSystemService(PowerManager::class.java)
        wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "relay:game").apply {
            setReferenceCounted(false)
            acquire(5 * 60 * 60 * 1000L)
        }
    }

    private suspend fun runLoop() {
        val prefs = Prefs(this)
        val engine = RelayEngine(prefs.team)
        engine.restore(prefs.engineState)
        var errors = 0

        while (scope.isActive) {
            var waitSec = prefs.intervalSec.coerceIn(5, 60)
            try {
                val game = currentGame(prefs.team)
                if (game == null) {
                    finish("오늘은 ${Teams.short(prefs.team)} 경기가 없습니다.")
                    return
                }
                gameId = game.id
                val names = Teams.short(game.awayCode, game.awayName) to Teams.short(game.homeCode, game.homeName)
                val myAway = game.awayCode == prefs.team

                if (!game.isLive && !game.isFinished && !game.isCanceled) {
                    // 경기 전: 1분마다 확인한다.
                    val time = SimpleDateFormat("HH:mm", Locale.KOREA).format(Date(game.startMillis))
                    engine.process(game, emptyList())
                    prefs.engineState = engine.toJson()
                    val line = "${names.first} vs ${names.second} · $time 시작 예정"
                    prefs.lastStatusLine = line
                    Notifier.updateLive(this, "경기 전", line, game.id)
                    WatchSync.send(this, WatchSync.Board(names.first, names.second, 0, 0, "경기 전 $time",
                        0, 0, 0, false, false, false, line, false, myAway))
                    waitSec = 60
                } else {
                    val snap = NaverApi.relay(game.id)
                    saveRaw()
                    val plays = ArrayList(snap?.plays ?: emptyList())
                    // 이닝이 바뀌는 사이에 지나간 플레이를 놓치지 않도록 이전 이닝도 같이 받는다.
                    if (snap != null && engine.halfInning > 0 && engine.halfInning != snap.inning) {
                        runCatching { NaverApi.relay(game.id, engine.halfInning) }.getOrNull()?.let { prev ->
                            val known = plays.map { it.seq }.toHashSet()
                            plays.addAll(prev.plays.filter { it.seq !in known })
                        }
                    }
                    val events = engine.process(game, plays)
                    prefs.engineState = engine.toJson()
                    events.forEach { Notifier.post(this, it, game.id) }

                    val st = snap?.state
                    val away = if (game.isFinished) game.awayScore else st?.awayScore ?: game.awayScore
                    val home = if (game.isFinished) game.homeScore else st?.homeScore ?: game.homeScore
                    val inning = when {
                        game.isFinished -> "경기 종료"
                        game.isCanceled -> "경기 취소"
                        snap != null && snap.inning > 0 -> "${snap.inning}회${if (snap.top) "초" else "말"}"
                        else -> game.statusInfo
                    }
                    val count = if (st != null && game.isLive) " · ${st.ball}B ${st.strike}S ${st.out}O" else ""
                    val title = "${names.first} $away : $home ${names.second}"
                    val text = "$inning$count\n${engine.lastText}"
                    prefs.lastStatusLine = "$title · $inning"
                    Notifier.updateLive(this, title, text, game.id)
                    WatchSync.send(this, WatchSync.Board(names.first, names.second, away, home, inning,
                        st?.ball ?: 0, st?.strike ?: 0, st?.out ?: 0,
                        st?.base1 ?: false, st?.base2 ?: false, st?.base3 ?: false,
                        engine.lastText, game.isLive, myAway))

                    if (game.isFinished || game.isCanceled) {
                        finish(null)
                        return
                    }
                }
                errors = 0
            } catch (e: Exception) {
                errors++
                Notifier.updateLive(this, "야구 중계 알림", "연결 오류로 다시 시도하는 중입니다 ($errors) · ${e.message ?: e.javaClass.simpleName}", gameId)
                waitSec = if (errors > 5) 30 else waitSec
            }
            delay(waitSec * 1000L)
        }
    }

    /** 진단용: 경기 중 처음 받은 중계와 마지막으로 받은 중계 원본을 저장한다. */
    private fun saveRaw() {
        val raw = NaverApi.lastRelayRaw ?: return
        runCatching {
            val dir = java.io.File(cacheDir, "diag").apply { mkdirs() }
            val first = java.io.File(dir, "relay_first.json")
            if (!first.exists() || !first.readText().contains(gameId ?: "-")) {
                first.writeText("// gameId=$gameId\n$raw")
            }
            java.io.File(dir, "relay_last.json").writeText("// gameId=$gameId\n$raw")
        }
    }

    /** 응원 팀의 오늘(또는 지정한) 경기를 찾는다. */
    private fun currentGame(team: String): GameInfo? {
        gameId?.let { id -> NaverApi.game(id)?.let { return it } }
        val today = LocalDate.now(ZoneId.of("Asia/Seoul"))
        return Scheduler.pickGame(NaverApi.schedule(today), team)
    }

    private fun finish(message: String?) {
        running = false
        loop?.cancel()
        if (message != null) Prefs(this).lastStatusLine = message
        ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE)
        NotificationManagerCompat.from(this).cancel(Notifier.ID_LIVE)
        wakeLock?.let { if (it.isHeld) it.release() }
        stopSelf()
    }

    override fun onDestroy() {
        running = false
        wakeLock?.let { if (it.isHeld) it.release() }
        scope.cancel()
        super.onDestroy()
    }
}
