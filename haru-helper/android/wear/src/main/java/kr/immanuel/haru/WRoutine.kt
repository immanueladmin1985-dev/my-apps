package kr.immanuel.haru

import android.app.AlarmManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import com.google.android.gms.wearable.Wearable
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * 워치의 하루 일과 알림. 폰에서 받은 일과 설정으로 워치가 스스로 알람을 건다(폰과 떨어져 있어도 울림).
 * 알람이 울리면 전체 화면 알림과 진동을 띄우고, 확인을 누를 때까지 30초마다 다시 알린다(최대 10분).
 */
object WRoutine {
    private const val FIRE = "kr.immanuel.haru.R_FIRE"
    private const val NAG = "kr.immanuel.haru.R_NAG"
    private const val CH = "routine"
    private const val NAG_MS = 30_000L
    private const val NAG_MAX = 20

    private fun sp(ctx: Context) = ctx.getSharedPreferences("haru", Context.MODE_PRIVATE)

    private fun set(ctx: Context, name: String): MutableSet<String> {
        val cut = SimpleDateFormat("yyyyMMdd", Locale.US).format(Date(System.currentTimeMillis() - 3 * Snap.DAY))
        return (sp(ctx).getStringSet(name, emptySet()) ?: emptySet()).filter { it.take(8) >= cut }.toMutableSet()
    }

    private fun intent(ctx: Context, action: String, key: String?, e: String = "", t: String = "", b: String = "", n: Int = 0, at: Long = 0) =
        Intent(ctx, WRoutineReceiver::class.java).setAction(action).apply {
            if (key != null) putExtra("key", key).putExtra("e", e).putExtra("t", t).putExtra("b", b).putExtra("n", n).putExtra("at", at)
        }

    private fun exact(ctx: Context, whenMs: Long, p: PendingIntent) {
        val am = ctx.getSystemService(AlarmManager::class.java) ?: return
        if (Build.VERSION.SDK_INT < 31 || am.canScheduleExactAlarms()) am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, whenMs, p)
        else am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, whenMs, p)
    }

    /** 다음 일과 알람 하나를 건다. 요약이 바뀌거나 알람이 울릴 때마다 다시 부른다. */
    fun schedule(ctx: Context) {
        val am = ctx.getSystemService(AlarmManager::class.java) ?: return
        PendingIntent.getBroadcast(ctx, 7, intent(ctx, FIRE, null), PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE)?.let { am.cancel(it); it.cancel() }
        val cfg = WStore.snap(ctx).routine ?: return
        // 폰(웹 화면)에서 이미 확인한 알림은 워치에서도 끔
        val acked = set(ctx, "rAcked")
        Routine.doneKeys(cfg).filter { it !in acked }.forEach { ack(ctx, it, false) }
        if (cfg.optString("target", "watch") == "phone") return
        val now = System.currentTimeMillis()
        val ev = Routine.next(cfg, now, set(ctx, "rFired") + set(ctx, "rAcked")) ?: return
        val p = PendingIntent.getBroadcast(ctx, 7, intent(ctx, FIRE, ev.key, ev.emoji, ev.title, ev.body, 0, ev.at), PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        exact(ctx, maxOf(ev.at, now + 500), p)
    }

    fun isAcked(ctx: Context, key: String) = key in set(ctx, "rAcked")

    fun fired(ctx: Context, key: String) {
        sp(ctx).edit().putStringSet("rFired", set(ctx, "rFired").apply { add(key) }).apply()
    }

    fun nag(ctx: Context, key: String, e: String, t: String, b: String, n: Int) {
        val p = PendingIntent.getBroadcast(ctx, key.hashCode(), intent(ctx, NAG, key, e, t, b, n).setData(Uri.parse("haru://nag/" + Uri.encode(key))), PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        exact(ctx, System.currentTimeMillis() + NAG_MS, p)
    }

    /** 확인: 진동·알림·다시 알림을 모두 멈추고, 폰에도 알린다. */
    fun ack(ctx: Context, key: String, tellPhone: Boolean) {
        sp(ctx).edit().putStringSet("rAcked", set(ctx, "rAcked").apply { add(key) }).apply()
        ctx.getSystemService(NotificationManager::class.java)?.cancel(key.hashCode())
        val am = ctx.getSystemService(AlarmManager::class.java)
        PendingIntent.getBroadcast(ctx, key.hashCode(), intent(ctx, NAG, null).setData(Uri.parse("haru://nag/" + Uri.encode(key))), PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE)?.let { am?.cancel(it); it.cancel() }
        RoutineAlertActivity.closeFor(key)
        if (tellPhone) {
            val app = ctx.applicationContext
            runCatching {
                Wearable.getNodeClient(app).connectedNodes.addOnSuccessListener { nodes ->
                    nodes.forEach { Wearable.getMessageClient(app).sendMessage(it.id, "/haru/ack", key.toByteArray(Charsets.UTF_8)) }
                }
            }
        }
    }

    fun show(ctx: Context, key: String, e: String, t: String, b: String) {
        val nm = ctx.getSystemService(NotificationManager::class.java) ?: return
        if (nm.getNotificationChannel(CH) == null) {
            nm.createNotificationChannel(NotificationChannel(CH, "하루 일과", NotificationManager.IMPORTANCE_HIGH).apply {
                description = "확인을 누를 때까지 알려 줘요"
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 600, 300, 600, 300, 600)
            })
        }
        val screen = PendingIntent.getActivity(
            ctx, 0,
            Intent(ctx, RoutineAlertActivity::class.java).putExtra("key", key).putExtra("e", e).putExtra("t", t).putExtra("b", b)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val ack = PendingIntent.getBroadcast(
            ctx, 0,
            Intent(ctx, WAckReceiver::class.java).setData(Uri.parse("haru://ack/" + Uri.encode(key))).putExtra("key", key),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val n = Notification.Builder(ctx, CH)
            .setSmallIcon(R.drawable.ic_stat)
            .setContentTitle("$e $t")
            .setContentText(b)
            .setCategory(Notification.CATEGORY_ALARM)
            .setOngoing(true)
            .setFullScreenIntent(screen, true)
            .setContentIntent(screen)
            .addAction(Notification.Action.Builder(null, "확인", ack).build())
            .build()
        runCatching { nm.notify(key.hashCode(), n) }
    }
}

class WRoutineReceiver : BroadcastReceiver() {
    override fun onReceive(ctx: Context, intent: Intent) {
        val key = intent.getStringExtra("key")
        val e = intent.getStringExtra("e") ?: ""
        val t = intent.getStringExtra("t") ?: ""
        val b = intent.getStringExtra("b") ?: ""
        when (intent.action) {
            "kr.immanuel.haru.R_FIRE" -> {
                if (key != null) {
                    WRoutine.fired(ctx, key)
                    val late = System.currentTimeMillis() - intent.getLongExtra("at", 0) > 15 * Snap.MIN
                    if (!late && !WRoutine.isAcked(ctx, key)) {
                        WRoutine.show(ctx, key, e, t, b)
                        WRoutine.nag(ctx, key, e, t, b, 1)
                    }
                }
                WRoutine.schedule(ctx)
            }
            "kr.immanuel.haru.R_NAG" -> {
                if (key == null || WRoutine.isAcked(ctx, key)) return
                val n = intent.getIntExtra("n", 1)
                WRoutine.show(ctx, key, e, t, b)
                if (n < 20) WRoutine.nag(ctx, key, e, t, b, n + 1)
            }
            else -> WRoutine.schedule(ctx)   // 워치를 다시 켰거나 시간이 바뀜
        }
    }
}

class WAckReceiver : BroadcastReceiver() {
    override fun onReceive(ctx: Context, intent: Intent) {
        intent.getStringExtra("key")?.let { WRoutine.ack(ctx, it, true) }
    }
}
