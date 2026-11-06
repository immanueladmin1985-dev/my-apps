package kr.immanuel.tvremote

import android.app.Activity
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.service.quicksettings.Tile
import android.service.quicksettings.TileService
import android.widget.RemoteViews
import androidx.core.content.pm.ShortcutInfoCompat
import androidx.core.content.pm.ShortcutManagerCompat
import androidx.core.graphics.drawable.IconCompat
import com.google.android.gms.wearable.MessageEvent
import com.google.android.gms.wearable.PutDataMapRequest
import com.google.android.gms.wearable.Wearable
import com.google.android.gms.wearable.WearableListenerService
import org.json.JSONArray
import org.json.JSONObject

/**
 * 화면 없이 모드를 실행하는 입구.
 * - 런처 별칭 "티비 켜기"/"티비 끄기" (제미나이에게 "티비 켜기 열어 줘")
 * - 앱 바로가기(아이콘 길게 누르기, 홈 화면에 꺼내 둔 바로가기)
 */
class RunActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val id = intent.getStringExtra(RunService.EXTRA_MODE)
            ?: when (intent.component?.className) {
                "$packageName.VoiceOn" -> Store.slotMode(this, "voiceOn")?.id
                "$packageName.VoiceOff" -> Store.slotMode(this, "voiceOff")?.id
                else -> null
            }
        if (id != null) RunService.start(this, id)
        else startActivity(Intent(this, MainActivity::class.java))
        finish()
    }
}

/** 모드마다 앱 바로가기를 만든다. 순서대로 최대 4개(런처 제한). */
object Shortcuts {
    fun update(ctx: Context) {
        val list = Store.modes(ctx).take(4).mapIndexed { i, m ->
            ShortcutInfoCompat.Builder(ctx, "mode-${m.id}")
                .setShortLabel(m.name.take(20))
                .setLongLabel(m.name)
                .setIcon(IconCompat.createWithResource(ctx, R.mipmap.ic_launcher))
                .setRank(i)
                .setIntent(
                    Intent(ctx, RunActivity::class.java)
                        .setAction(Intent.ACTION_VIEW)
                        .putExtra(RunService.EXTRA_MODE, m.id)
                )
                .build()
        }
        ShortcutManagerCompat.setDynamicShortcuts(ctx, list)
    }
}

/** 빠른 설정(알림창을 내렸을 때) 타일. 누르면 고른 모드를 실행한다. */
class QsTile : TileService() {
    override fun onStartListening() {
        val t = qsTile ?: return
        t.label = Store.slotMode(this, "qsMode")?.name ?: "TV 한번에"
        t.state = Tile.STATE_INACTIVE
        t.updateTile()
    }

    override fun onClick() {
        val m = Store.slotMode(this, "qsMode") ?: return
        try {
            startForegroundService(RunService.intent(this, m.id))
        } catch (_: Exception) {
            val i = Intent(this, RunActivity::class.java).putExtra(RunService.EXTRA_MODE, m.id).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            if (Build.VERSION.SDK_INT >= 34) {
                startActivityAndCollapse(PendingIntent.getActivity(this, 9, i, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT))
            } else {
                @Suppress("DEPRECATION", "StartActivityAndCollapseDeprecated")
                startActivityAndCollapse(i)
            }
        }
    }
}

/** 홈 화면 위젯: 모드 버튼 4개. */
class TvWidget : AppWidgetProvider() {
    override fun onUpdate(ctx: Context, mgr: AppWidgetManager, ids: IntArray) = refresh(ctx)

    companion object {
        private val BTN = intArrayOf(R.id.w1, R.id.w2, R.id.w3, R.id.w4)

        fun refresh(ctx: Context) {
            val mgr = AppWidgetManager.getInstance(ctx)
            val ids = mgr.getAppWidgetIds(ComponentName(ctx, TvWidget::class.java))
            if (ids.isEmpty()) return
            val modes = Store.modes(ctx)
            val v = RemoteViews(ctx.packageName, R.layout.widget)
            BTN.forEachIndexed { i, id ->
                val m = modes.getOrNull(i)
                if (m == null) {
                    v.setViewVisibility(id, android.view.View.GONE)
                } else {
                    v.setViewVisibility(id, android.view.View.VISIBLE)
                    v.setTextViewText(id, "${m.emoji} ${m.name}")
                    v.setOnClickPendingIntent(
                        id, PendingIntent.getForegroundService(
                            ctx, 100 + i, RunService.intent(ctx, m.id),
                            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
                        )
                    )
                }
            }
            v.setOnClickPendingIntent(
                R.id.wOpen, PendingIntent.getActivity(ctx, 99, Intent(ctx, MainActivity::class.java), PendingIntent.FLAG_IMMUTABLE)
            )
            mgr.updateAppWidget(ids, v)
        }
    }
}

/** 워치로 모드 목록을 보낸다. 워치가 없으면 조용히 넘어간다. */
object WatchSync {
    fun push(ctx: Context) {
        try {
            val arr = JSONArray()
            Store.modes(ctx).forEach { arr.put(JSONObject().put("id", it.id).put("name", it.name).put("emoji", it.emoji)) }
            val req = PutDataMapRequest.create("/tv/modes").apply {
                dataMap.putString("modes", arr.toString())
                dataMap.putString("last", Store.lastRun(ctx))
                dataMap.putLong("ts", System.currentTimeMillis())
            }.asPutDataRequest().setUrgent()
            Wearable.getDataClient(ctx.applicationContext).putDataItem(req)
        } catch (_: Exception) {
        }
    }
}

/** 워치에서 누른 모드·리모컨 버튼을 받아 실행한다. */
class PhoneListener : WearableListenerService() {
    override fun onMessageReceived(e: MessageEvent) {
        val data = String(e.data, Charsets.UTF_8)
        when (e.path) {
            "/tv/run" -> Store.mode(this, data)?.let {
                Runner.runBlocking(this, it)
                WatchSync.push(this)
                reply(e.sourceNodeId, Store.lastRun(this))
            }
            "/tv/key" -> {
                val r = runCatching { Atv.session(this).key(data.toInt()); "" }.getOrElse { "⚠ " + (it.message ?: "실패") }
                if (r.isNotEmpty()) reply(e.sourceNodeId, r)
            }
            "/tv/hello" -> WatchSync.push(this)
        }
    }

    private fun reply(node: String, msg: String) {
        runCatching { Wearable.getMessageClient(this).sendMessage(node, "/tv/result", msg.toByteArray(Charsets.UTF_8)) }
    }
}
