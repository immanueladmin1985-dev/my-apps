package kr.immanuel.haru

import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import org.json.JSONObject

/** 알림 시각마다 AlarmManager 로 정확한 알람을 걸어 둔다. 앱을 닫아 두어도 제시간에 울린다. */
object Alarms {
    private const val ACTION = "kr.immanuel.haru.ALARM"
    /** 이보다 오래 지난 알림은 새로 울리지 않는다 (앱을 오래 안 열었을 때 한꺼번에 울리지 않도록). */
    private const val STALE = 6 * Snap.HOUR

    private fun key(id: String, at: Long) = "$id@$at"

    fun schedule(ctx: Context) {
        val am = ctx.getSystemService(AlarmManager::class.java) ?: return
        val sp = Store.sp(ctx)
        val now = System.currentTimeMillis()
        (sp.getStringSet("alarmIds", emptySet()) ?: emptySet()).forEach { id ->
            pending(ctx, id, null, 0, PendingIntent.FLAG_NO_CREATE)?.let { am.cancel(it); it.cancel() }
        }
        val fired = sp.getStringSet("fired", emptySet()) ?: emptySet()
        val ids = mutableSetOf<String>()
        for (r in Store.snap(ctx).reminders) {
            var at = r.at
            // 매일 알림은 이미 울린 시각이면 다음 날로
            if (r.daily) while (at <= now && (key(r.id, at) in fired || at < now - STALE)) at += Snap.DAY
            if (key(r.id, at) in fired || at < now - STALE) continue
            val p = pending(ctx, r.id, r, at, PendingIntent.FLAG_UPDATE_CURRENT) ?: continue
            val whenMs = maxOf(at, now + 1000)
            if (Build.VERSION.SDK_INT < 31 || am.canScheduleExactAlarms()) am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, whenMs, p)
            else am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, whenMs, p)
            ids += r.id
        }
        sp.edit().putStringSet("alarmIds", ids).apply()
    }

    private fun pending(ctx: Context, id: String, r: Snap.Rem?, at: Long, flag: Int): PendingIntent? {
        val i = Intent(ctx, AlarmReceiver::class.java).setAction(ACTION).setData(Uri.parse("haru://rem/" + Uri.encode(id)))
        if (r != null) i.putExtra("id", r.id).putExtra("text", r.text).putExtra("at", at)
        return PendingIntent.getBroadcast(ctx, 0, i, flag or PendingIntent.FLAG_IMMUTABLE)
    }

    fun markFired(ctx: Context, id: String, at: Long) {
        val sp = Store.sp(ctx)
        val now = System.currentTimeMillis()
        // 이틀 넘게 지난 기록은 정리
        val keep = (sp.getStringSet("fired", emptySet()) ?: emptySet()).filter {
            (it.substringAfterLast('@').toLongOrNull() ?: 0) > now - 2 * Snap.DAY
        }.toMutableSet()
        keep += key(id, at)
        sp.edit().putStringSet("fired", keep).apply()
    }
}

/** 알람 시각이 되면 알림을 띄운다. */
class AlarmReceiver : BroadcastReceiver() {
    override fun onReceive(ctx: Context, intent: Intent) {
        val id = intent.getStringExtra("id") ?: return
        val text = intent.getStringExtra("text") ?: ""
        val at = intent.getLongExtra("at", System.currentTimeMillis())
        Alarms.markFired(ctx, id, at)
        Notifier.reminder(ctx, id, text, at)
        Alarms.schedule(ctx)
        HaruWidget.updateAll(ctx)
    }
}

/** 휴대폰을 다시 켜거나 시간이 바뀌면 알람을 다시 건다. */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(ctx: Context, intent: Intent) {
        Store.changed(ctx)
    }
}

/** 위젯·알림 단추: 다 했어요, 10분 뒤 등. */
class ActionReceiver : BroadcastReceiver() {
    override fun onReceive(ctx: Context, intent: Intent) {
        val type = intent.getStringExtra("type") ?: return
        val id = intent.getStringExtra("id") ?: ""
        val a = JSONObject().put("type", type).put("id", id)
        if (type == "remSnooze") a.put("at", System.currentTimeMillis() + intent.getIntExtra("min", 10) * Snap.MIN)
        Store.act(ctx, a)
        if (type.startsWith("rem")) ctx.getSystemService(NotificationManager::class.java)?.cancel(id.hashCode())
        if (type == "taskDone") Haptics.play(ctx, "30,60,30")
    }
}

object Notifier {
    private const val CH = "reminder"

    private fun ensure(ctx: Context): NotificationManager? {
        val nm = ctx.getSystemService(NotificationManager::class.java) ?: return null
        if (nm.getNotificationChannel(CH) == null) {
            nm.createNotificationChannel(NotificationChannel(CH, "알림", NotificationManager.IMPORTANCE_HIGH).apply {
                description = "정해 둔 시간에 할 일을 알려 줘요"
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 400, 200, 400)
            })
        }
        return nm
    }

    fun reminder(ctx: Context, id: String, text: String, at: Long) {
        val nm = ensure(ctx) ?: return
        val open = PendingIntent.getActivity(
            ctx, id.hashCode(),
            Intent(ctx, MainActivity::class.java).setAction("open.rem").putExtra("open", "rem")
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        fun action(type: String, min: Int = 0) = PendingIntent.getBroadcast(
            ctx, 0,
            Intent(ctx, ActionReceiver::class.java).setData(Uri.parse("haru://n/$type/" + Uri.encode(id)))
                .putExtra("type", type).putExtra("id", id).putExtra("min", min),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val n = android.app.Notification.Builder(ctx, CH)
            .setSmallIcon(R.drawable.ic_stat)
            .setContentTitle("⏰ $text")
            .setContentText("하루 도우미 · ${Fmt.hm(at)}")
            .setCategory(android.app.Notification.CATEGORY_REMINDER)
            .setColor(0xFF6366F1.toInt())
            .setAutoCancel(true)
            .setContentIntent(open)
            .addAction(android.app.Notification.Action.Builder(null, "했어요", action("remDone")).build())
            .addAction(android.app.Notification.Action.Builder(null, "10분 뒤", action("remSnooze", 10)).build())
            .build()
        runCatching { nm.notify(id.hashCode(), n) }
    }
}
