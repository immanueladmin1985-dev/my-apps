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
        if (type == "ack") { RoutineAlarms.ack(ctx, id, true); return }
        when (type) {
            "visitYes" -> {
                MsgListener.visit(ctx, intent.getStringExtra("clinic") ?: id, intent.getLongExtra("payAt", System.currentTimeMillis()))
                MsgListener.cancel(ctx, ("visit" + id).hashCode())
                android.widget.Toast.makeText(ctx, "기록했어요. 다음에 갈 때 알려 줄게요", android.widget.Toast.LENGTH_SHORT).show()
                return
            }
            "visitNo" -> { MsgListener.cancel(ctx, ("visit" + id).hashCode()); return }
            "apptCancel" -> {
                Store.act(ctx, JSONObject().put("type", "apptCancel").put("id", id))
                MsgListener.cancel(ctx, id.hashCode())
                android.widget.Toast.makeText(ctx, "일정을 뺐어요", android.widget.Toast.LENGTH_SHORT).show()
                return
            }
        }
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

/**
 * 하루 일과 알림(휴대폰 쪽). ‘알림 받을 곳’이 휴대폰이나 둘 다일 때만 울린다.
 * 확인을 누를 때까지 소리·진동이 되풀이되고(FLAG_INSISTENT), 워치에서 확인하면 같이 꺼진다.
 */
object RoutineAlarms {
    private const val ACTION = "kr.immanuel.haru.ROUTINE"
    private const val CH = "routine"

    private fun pending(ctx: Context, ev: Routine.Ev?, flag: Int): PendingIntent? {
        val i = Intent(ctx, RoutineReceiver::class.java).setAction(ACTION)
        if (ev != null) i.putExtra("key", ev.key).putExtra("at", ev.at).putExtra("e", ev.emoji).putExtra("t", ev.title).putExtra("b", ev.body)
        return PendingIntent.getBroadcast(ctx, 7, i, flag or PendingIntent.FLAG_IMMUTABLE)
    }

    private fun set(ctx: Context, name: String): MutableSet<String> {
        val cut = java.text.SimpleDateFormat("yyyyMMdd", java.util.Locale.US).format(java.util.Date(System.currentTimeMillis() - 3 * Snap.DAY))
        return (Store.sp(ctx).getStringSet(name, emptySet()) ?: emptySet()).filter { it.take(8) >= cut }.toMutableSet()
    }

    fun schedule(ctx: Context) {
        val am = ctx.getSystemService(AlarmManager::class.java) ?: return
        pending(ctx, null, PendingIntent.FLAG_NO_CREATE)?.let { am.cancel(it); it.cancel() }
        val cfg = Store.snap(ctx).routine ?: return
        val acked = set(ctx, "rAcked")
        Routine.doneKeys(cfg).filter { it !in acked }.forEach { k ->
            Store.sp(ctx).edit().putStringSet("rAcked", set(ctx, "rAcked").apply { add(k) }).apply()
            ctx.getSystemService(NotificationManager::class.java)?.cancel(k.hashCode())
        }
        if (cfg.optString("target", "watch") == "watch") return
        val now = System.currentTimeMillis()
        val ev = Routine.next(cfg, now, set(ctx, "rFired") + set(ctx, "rAcked")) ?: return
        val p = pending(ctx, ev, PendingIntent.FLAG_UPDATE_CURRENT) ?: return
        val whenMs = maxOf(ev.at, now + 500)
        if (Build.VERSION.SDK_INT < 31 || am.canScheduleExactAlarms()) am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, whenMs, p)
        else am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, whenMs, p)
    }

    fun fired(ctx: Context, key: String) {
        Store.sp(ctx).edit().putStringSet("rFired", set(ctx, "rFired").apply { add(key) }).apply()
    }

    fun isAcked(ctx: Context, key: String) = key in set(ctx, "rAcked")

    /** 확인: 알림을 끄고, 다른 기기(워치)에도 알린다. */
    fun ack(ctx: Context, key: String, tellWatch: Boolean) {
        val first = key !in set(ctx, "rAcked")
        Store.sp(ctx).edit().putStringSet("rAcked", set(ctx, "rAcked").apply { add(key) }).apply()
        // 약 알림을 확인했으면 ‘먹었음’으로 기록
        if (first && Routine.isMed(key)) Store.act(ctx, JSONObject().put("type", "medTaken").put("key", key))
        ctx.getSystemService(NotificationManager::class.java)?.cancel(key.hashCode())
        if (tellWatch) WatchSync.sendAck(ctx, key)
    }

    fun show(ctx: Context, key: String, e: String, t: String, b: String) {
        val nm = ctx.getSystemService(NotificationManager::class.java) ?: return
        if (nm.getNotificationChannel(CH) == null) {
            nm.createNotificationChannel(NotificationChannel(CH, "하루 일과", NotificationManager.IMPORTANCE_HIGH).apply {
                description = "쉬는 시간·점심·퇴근·일정을 확인할 때까지 알려 줘요"
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 500, 300, 500)
            })
        }
        val ack = PendingIntent.getBroadcast(
            ctx, 0,
            Intent(ctx, ActionReceiver::class.java).setData(Uri.parse("haru://ack/" + Uri.encode(key))).putExtra("type", "ack").putExtra("id", key),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val n = android.app.Notification.Builder(ctx, CH)
            .setSmallIcon(R.drawable.ic_stat)
            .setContentTitle("$e $t")
            .setContentText(b)
            .setStyle(android.app.Notification.BigTextStyle().bigText(b))
            .setCategory(android.app.Notification.CATEGORY_ALARM)
            .setColor(0xFF6366F1.toInt())
            .setOngoing(true)
            .setLocalOnly(true)   // 워치는 자기 알람으로 따로 울림
            .setContentIntent(ack)
            .setDeleteIntent(ack)
            .addAction(android.app.Notification.Action.Builder(null, "확인", ack).build())
            .build()
        n.flags = n.flags or android.app.Notification.FLAG_INSISTENT
        runCatching { nm.notify(key.hashCode(), n) }
    }
}

class RoutineReceiver : BroadcastReceiver() {
    override fun onReceive(ctx: Context, intent: Intent) {
        val key = intent.getStringExtra("key") ?: return
        RoutineAlarms.fired(ctx, key)
        val late = System.currentTimeMillis() - intent.getLongExtra("at", 0) > 15 * Snap.MIN
        if (!late && !RoutineAlarms.isAcked(ctx, key)) {
            RoutineAlarms.show(ctx, key, intent.getStringExtra("e") ?: "", intent.getStringExtra("t") ?: "", intent.getStringExtra("b") ?: "")
        }
        RoutineAlarms.schedule(ctx)
    }
}
