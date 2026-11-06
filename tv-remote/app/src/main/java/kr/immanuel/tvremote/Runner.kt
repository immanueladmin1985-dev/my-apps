package kr.immanuel.tvremote

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.widget.Toast
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.Executors

/** 모드 실행기. 한 번에 하나씩 차례대로 실행한다. */
object Runner {
    private val worker = Executors.newSingleThreadExecutor { Thread(it, "mode-runner").apply { isDaemon = true } }
    private val main = Handler(Looper.getMainLooper())
    val listeners = java.util.concurrent.CopyOnWriteArrayList<(String) -> Unit>()

    /** 결과 문구 (성공이면 "✅ ...", 실패면 "⚠ ...") */
    fun runBlocking(ctx: Context, mode: Mode, progress: (String) -> Unit = {}): String {
        val app = ctx.applicationContext
        val problems = mutableListOf<String>()
        var tvWasOn: Boolean? = null
        var tv: Atv.Session? = null

        if (mode.needsTv) {
            try {
                tv = Atv.session(app)
                tvWasOn = tv.isOn
            } catch (e: Exception) {
                problems += e.message ?: "구글 TV 연결 실패"
            }
        }

        for ((i, s) in mode.steps.withIndex()) {
            if (!s.runs(tvWasOn)) continue
            val name = s.label.ifEmpty { s.type }
            progress("${i + 1}/${mode.steps.size} $name")
            try {
                when (s.type) {
                    "wait" -> Thread.sleep(s.ms.coerceIn(0, 60_000))
                    "scene" -> Hej.runScene(app, s.familyId, s.sceneId)
                    "key", "app", "text" -> {
                        val t = tv?.takeIf { !it.closed } ?: Atv.session(app).also { tv = it }
                        when (s.type) {
                            "key" -> t.key(s.code)
                            "app" -> t.app(s.link)
                            else -> t.text(s.text)
                        }
                        Thread.sleep(150) // TV가 앞의 명령을 처리할 틈
                    }
                }
            } catch (e: InterruptedException) {
                break
            } catch (e: Exception) {
                problems += "$name: ${e.message ?: "실패"}"
            }
        }

        val time = SimpleDateFormat("HH:mm", Locale.KOREA).format(Date())
        val msg = if (problems.isEmpty()) "✅ ${mode.name} 실행 ($time)" else "⚠ ${mode.name}: " + problems.distinct().joinToString(" / ")
        Store.setLastRun(app, msg)
        listeners.forEach { runCatching { it(msg) } }
        main.postDelayed({ Atv.closeIfIdle(55_000) }, 60_000)
        return msg
    }

    /** 화면을 막지 않고 실행한다. toast=true 면 결과를 짧게 띄운다. */
    fun runAsync(ctx: Context, mode: Mode, toast: Boolean = true, done: (String) -> Unit = {}) {
        val app = ctx.applicationContext
        worker.execute {
            val r = runBlocking(app, mode)
            main.post {
                if (toast) Toast.makeText(app, r, if (r.startsWith("✅")) Toast.LENGTH_SHORT else Toast.LENGTH_LONG).show()
                done(r)
            }
        }
    }

    fun onWorker(task: () -> Unit) = worker.execute(task)
}

/**
 * 위젯·빠른 설정·음성 바로가기에서 실행할 때 쓰는 짧은 포그라운드 서비스.
 * 화면이 꺼져 있어도 실행이 끝날 때까지 프로세스가 살아 있게 한다.
 */
class RunService : Service() {
    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val mode = Store.mode(this, intent?.getStringExtra(EXTRA_MODE))
        startInForeground(mode?.name ?: "모드")
        if (mode == null) {
            stopSelf(startId); return START_NOT_STICKY
        }
        Runner.runAsync(this, mode) { stopSelf(startId) }
        return START_NOT_STICKY
    }

    private fun startInForeground(name: String) {
        val nm = getSystemService(NotificationManager::class.java)
        nm.createNotificationChannel(NotificationChannel(CH, "모드 실행", NotificationManager.IMPORTANCE_LOW))
        val open = PendingIntent.getActivity(this, 0, Intent(this, MainActivity::class.java), PendingIntent.FLAG_IMMUTABLE)
        val n = Notification.Builder(this, CH)
            .setSmallIcon(R.drawable.ic_stat)
            .setContentTitle("$name 실행 중")
            .setContentIntent(open)
            .build()
        if (Build.VERSION.SDK_INT >= 34) startForeground(7, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_SHORT_SERVICE)
        else startForeground(7, n)
    }

    override fun onTimeout(startId: Int) {
        stopSelf()
    }

    companion object {
        const val EXTRA_MODE = "mode"
        private const val CH = "run"

        fun intent(ctx: Context, modeId: String) = Intent(ctx, RunService::class.java).putExtra(EXTRA_MODE, modeId)

        /** 포그라운드 서비스를 못 띄우는 상황이면 그냥 실행한다. */
        fun start(ctx: Context, modeId: String) {
            try {
                ctx.startForegroundService(intent(ctx, modeId))
            } catch (_: Exception) {
                Store.mode(ctx, modeId)?.let { Runner.runAsync(ctx, it) }
            }
        }
    }
}
