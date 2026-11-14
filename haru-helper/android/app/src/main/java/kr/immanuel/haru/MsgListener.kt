package kr.immanuel.haru

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import org.json.JSONObject

/**
 * 문자·카톡 알림을 읽어 일정을 찾는다 (사용자가 ‘알림 접근’을 허용했을 때만 동작).
 * 내용은 휴대폰 안에서만 읽고 어디에도 보내지 않는다. 일정·병원 결제가 아닌 글은 바로 버린다.
 *  - 병원 예약 문자(날짜·시간 + 예약 + [보낸 곳]) → 바로 일정·알림에 넣고 알려 줌 (취소 단추)
 *  - 등록한 병원 카드 결제 → “다녀오셨나요?” 알림 → 다녀왔어요를 누르면 다음 방문 알림
 *  - 그 밖에 날짜·시간이 있는 글(카톡 약속 등) → 확인 목록에 넣고 알려 줌
 */
class MsgListener : NotificationListenerService() {

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        val pkg = sbn.packageName ?: return
        val src = when {
            pkg in SMS_APPS -> "sms"
            pkg == KAKAO -> "kakao"
            else -> return
        }
        val snap = Store.snap(this)
        if (!snap.msgSource(src)) return
        val ex = sbn.notification?.extras ?: return
        val from = ex.getCharSequence(Notification.EXTRA_TITLE)?.toString() ?: ""
        val text = textOf(ex) ?: return
        if (text.length < 4) return
        // 같은 글이 여러 번 알림으로 오면 한 번만
        val sig = (src + text).hashCode().toString()
        val sp = Store.sp(this)
        val seen = sp.getStringSet("msgSeen", emptySet())?.toMutableList() ?: mutableListOf()
        if (sig in seen) return
        seen += sig
        sp.edit().putStringSet("msgSeen", seen.takeLast(200).toSet()).apply()
        handle(this, text, src, from, snap)
    }

    /** 알림에서 글 내용 꺼내기: 카톡은 MessagingStyle 의 마지막 메시지, 문자는 긴 글. */
    private fun textOf(ex: Bundle): String? {
        val msgs = ex.getParcelableArray(Notification.EXTRA_MESSAGES)
        if (!msgs.isNullOrEmpty()) {
            val last = msgs.last() as? Bundle
            last?.getCharSequence("text")?.toString()?.let { return it }
        }
        return (ex.getCharSequence(Notification.EXTRA_BIG_TEXT) ?: ex.getCharSequence(Notification.EXTRA_TEXT))?.toString()
    }

    companion object {
        private const val KAKAO = "com.kakao.talk"
        private val SMS_APPS = setOf("com.samsung.android.messaging", "com.google.android.apps.messaging", "com.android.mms", "com.android.messaging")
        private const val CH = "msg"

        fun enabled(ctx: Context): Boolean =
            android.provider.Settings.Secure.getString(ctx.contentResolver, "enabled_notification_listeners")
                ?.contains(ComponentName(ctx, MsgListener::class.java).flattenToString()) == true

        fun handle(ctx: Context, text: String, src: String, from: String, snap: Snap) {
            val now = System.currentTimeMillis()
            val p = MsgParse.parse(text, now, snap.clinics)
            val id = "m" + java.lang.Long.toString(now, 36)
            when (p.kind) {
                "appt" -> {
                    if (!snap.feat("clinic") && !snap.feat("msg")) return
                    val rems = MsgParse.apptRems(id, p.title, p.at, p.items, now)
                    Store.act(ctx, JSONObject().put("type", "appt").put("id", id).put("at", p.at).put("title", p.title).put("org", p.org)
                        .put("items", org.json.JSONArray(p.items)).put("clinicId", p.clinicId).put("src", src).put("raw", text.take(500)).put("rems", rems))
                    notify(ctx, id.hashCode(), "📅 일정에 넣었어요", "${Fmt.label(p.at, now)} ${p.title}" +
                        (if (p.items.isNotEmpty()) " · 준비물 ${p.items.joinToString(", ")}" else "") + "\n전날 저녁과 1시간 전에 알려 줄게요.",
                        open(ctx, "appts"), listOf("취소" to action(ctx, "apptCancel", id, Bundle())))
                }
                "pay" -> {
                    if (!snap.feat("clinic")) return
                    val c = snap.clinics.firstOrNull { it.id == p.clinicId }
                    if (c != null) {
                        val extra = Bundle().apply { putString("clinic", c.id); putLong("payAt", p.payAt) }
                        val next = if (c.every > 0) "다녀왔으면 다음 방문(${c.every}일 뒤) 알림을 넣을게요." else "다녀왔으면 기록해 둘게요."
                        notify(ctx, ("visit" + c.id).hashCode(), "🏥 ${c.name}에 다녀오셨나요?", "${Fmt.label(p.payAt, now)} 결제 문자를 봤어요. $next",
                            open(ctx, "clinics"), listOf("다녀왔어요" to action(ctx, "visitYes", c.id, extra), "아니에요" to action(ctx, "visitNo", c.id, extra)))
                    } else if (p.merchant.isNotBlank()) {
                        // 병원 같은 곳에서 결제 → 자주 가는 병원으로 등록할지 확인 목록에
                        Store.act(ctx, JSONObject().put("type", "inbox").put("id", id).put("src", src).put("from", from).put("raw", text.take(500)).put("p", p.toJson()))
                        notify(ctx, id.hashCode(), "🏥 ${p.merchant}에서 결제했어요", "자주 가는 병원이면 눌러서 등록해 두세요. 다음에 갈 때를 알려 줄게요.", open(ctx, "inbox"), emptyList())
                    }
                }
                "event" -> {
                    if (!snap.feat("msg")) return
                    Store.act(ctx, JSONObject().put("type", "inbox").put("id", id).put("src", src).put("from", from).put("raw", text.take(500)).put("p", p.toJson()))
                    notify(ctx, id.hashCode(), "📩 " + (if (src == "kakao") "카톡" else "문자") + "에서 일정을 찾았어요",
                        "${Fmt.label(p.at, now)} · ${p.title}" + (if (p.items.isNotEmpty()) " · 준비물 ${p.items.size}개" else "") + "\n눌러서 일정에 넣어요.",
                        open(ctx, "inbox"), emptyList())
                }
            }
        }

        private fun open(ctx: Context, what: String): PendingIntent = PendingIntent.getActivity(
            ctx, what.hashCode(),
            Intent(ctx, MainActivity::class.java).setAction("open.$what").putExtra("open", what).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        private fun action(ctx: Context, type: String, id: String, extra: Bundle): PendingIntent = PendingIntent.getBroadcast(
            ctx, 0,
            Intent(ctx, ActionReceiver::class.java).setData(Uri.parse("haru://msg/$type/" + Uri.encode(id))).putExtra("type", type).putExtra("id", id).putExtras(extra),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        fun notify(ctx: Context, nid: Int, title: String, body: String, content: PendingIntent, actions: List<Pair<String, PendingIntent>>) {
            val nm = ctx.getSystemService(NotificationManager::class.java) ?: return
            if (nm.getNotificationChannel(CH) == null) {
                nm.createNotificationChannel(NotificationChannel(CH, "문자·카톡에서 찾은 일정", NotificationManager.IMPORTANCE_DEFAULT).apply {
                    description = "문자·카톡에서 일정이나 병원 결제를 찾았을 때"
                })
            }
            val b = Notification.Builder(ctx, CH)
                .setSmallIcon(R.drawable.ic_stat)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(Notification.BigTextStyle().bigText(body))
                .setColor(0xFF6366F1.toInt())
                .setAutoCancel(true)
                .setContentIntent(content)
            actions.forEach { (label, pi) -> b.addAction(Notification.Action.Builder(null, label, pi).build()) }
            runCatching { nm.notify(nid, b.build()) }
        }

        fun cancel(ctx: Context, nid: Int) { ctx.getSystemService(NotificationManager::class.java)?.cancel(nid) }

        /** 알림의 ‘다녀왔어요’: 방문 기록과 다음 방문 알림을 넣는다. */
        fun visit(ctx: Context, clinicId: String, at: Long) {
            val now = System.currentTimeMillis()
            val c = Store.snap(ctx).clinics.firstOrNull { it.id == clinicId } ?: return
            val rems = org.json.JSONArray()
            MsgParse.visitRem(c, at, now)?.let { rems.put(it) }
            Store.act(ctx, JSONObject().put("type", "visit").put("id", clinicId).put("clinicId", clinicId).put("at", at).put("rems", rems))
        }
    }
}
