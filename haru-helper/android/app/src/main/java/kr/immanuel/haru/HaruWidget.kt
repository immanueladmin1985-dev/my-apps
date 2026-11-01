package kr.immanuel.haru

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.view.View
import android.widget.RemoteViews

/** 홈 화면 위젯: 지금 할 일(다 했어요 단추), 다가오는 알림 두 개, 바로가기 단추 네 개. */
class HaruWidget : AppWidgetProvider() {

    override fun onUpdate(ctx: Context, mgr: AppWidgetManager, ids: IntArray) {
        mgr.updateAppWidget(ids, views(ctx))
    }

    companion object {
        fun updateAll(ctx: Context) {
            val m = AppWidgetManager.getInstance(ctx) ?: return
            val ids = m.getAppWidgetIds(ComponentName(ctx, HaruWidget::class.java))
            if (ids.isNotEmpty()) m.updateAppWidget(ids, views(ctx))
        }

        private fun views(ctx: Context): RemoteViews {
            val s = Store.snap(ctx)
            val now = System.currentTimeMillis()
            val v = RemoteViews(ctx.packageName, R.layout.widget)

            val cur = s.current
            v.setTextViewText(R.id.w_label, if (s.focus != null || cur == null) "🎯 지금 할 일" else "📋 다음 할 일")
            if (cur != null) {
                v.setTextViewText(R.id.w_focus, cur.text)
                v.setViewVisibility(R.id.w_done, View.VISIBLE)
                v.setOnClickPendingIntent(R.id.w_done, action(ctx, "taskDone", cur.id))
            } else {
                v.setTextViewText(R.id.w_focus, if (s.empty) "앱을 한 번 열어 주세요" else "눌러서 하나 정하기")
                v.setViewVisibility(R.id.w_done, View.GONE)
            }
            v.setOnClickPendingIntent(R.id.w_focus_box, open(ctx, if (cur == null) "focus" else "today"))

            val open = s.tasks.size
            v.setTextViewText(R.id.w_sub, "할 일 $open · 메모 ${s.noteCount}")

            val rems = s.upcoming()
            val lines = listOf(R.id.w_rem1, R.id.w_rem2)
            lines.forEachIndexed { i, id ->
                val r = rems.getOrNull(i)
                when {
                    r != null -> {
                        val due = r.at <= now
                        v.setTextViewText(id, (if (due) "🔔 " else "⏰ ") + Fmt.label(r.at, now) + "  " + r.text)
                        v.setViewVisibility(id, View.VISIBLE)
                    }
                    i == 0 -> {
                        v.setTextViewText(id, "⏰ 정해 둔 알림이 없어요")
                        v.setViewVisibility(id, View.VISIBLE)
                    }
                    else -> v.setViewVisibility(id, View.GONE)
                }
                v.setOnClickPendingIntent(id, open(ctx, "rem"))
            }

            v.setOnClickPendingIntent(R.id.w_head, open(ctx, "today"))
            v.setOnClickPendingIntent(R.id.w_b_memo, open(ctx, "capture"))
            v.setOnClickPendingIntent(R.id.w_b_breath, open(ctx, "breath"))
            v.setOnClickPendingIntent(R.id.w_b_talk, open(ctx, "talk"))
            v.setOnClickPendingIntent(R.id.w_b_list, open(ctx, "lists"))
            return v
        }

        private fun open(ctx: Context, what: String): PendingIntent = PendingIntent.getActivity(
            ctx, what.hashCode(),
            Intent(ctx, MainActivity::class.java).setAction("open.$what").putExtra("open", what)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        private fun action(ctx: Context, type: String, id: String): PendingIntent = PendingIntent.getBroadcast(
            ctx, 0,
            Intent(ctx, ActionReceiver::class.java).setData(Uri.parse("haru://w/$type/" + Uri.encode(id)))
                .putExtra("type", type).putExtra("id", id),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }
}
