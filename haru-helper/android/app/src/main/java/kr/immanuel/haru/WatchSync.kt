package kr.immanuel.haru

import android.content.Context
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import com.google.android.gms.wearable.MessageEvent
import com.google.android.gms.wearable.PutDataMapRequest
import com.google.android.gms.wearable.Wearable
import com.google.android.gms.wearable.WearableListenerService
import org.json.JSONObject

/** 워치 앱(타일·컴플리케이션·앱)으로 요약을 보낸다. 워치가 없으면 조용히 넘어간다. */
object WatchSync {
    const val PATH = "/haru/snap"

    fun push(ctx: Context) {
        try {
            val req = PutDataMapRequest.create(PATH).apply {
                dataMap.putString("snap", Store.snap(ctx).toString())
                dataMap.putLong("ts", System.currentTimeMillis())
            }.asPutDataRequest().setUrgent()
            Wearable.getDataClient(ctx.applicationContext).putDataItem(req)
        } catch (_: Exception) {
            // Play 서비스가 없거나 워치가 연결되어 있지 않을 때
        }
    }
}

/** 워치에 ‘일과 알림 확인함’을 알린다. */
fun WatchSync.sendAck(ctx: Context, key: String) {
    val app = ctx.applicationContext
    runCatching {
        Wearable.getNodeClient(app).connectedNodes.addOnSuccessListener { nodes ->
            nodes.forEach { Wearable.getMessageClient(app).sendMessage(it.id, "/haru/ack", key.toByteArray(Charsets.UTF_8)) }
        }
    }
}

/** 워치에서 누른 동작(다 했어요, 말로 메모, 대화 기록 등)을 받는다. */
class PhoneListener : WearableListenerService() {
    override fun onMessageReceived(e: MessageEvent) {
        when (e.path) {
            "/haru/action" -> runCatching { Store.act(this, JSONObject(String(e.data, Charsets.UTF_8))) }
            "/haru/hello" -> WatchSync.push(this)
            "/haru/ack" -> RoutineAlarms.ack(this, String(e.data, Charsets.UTF_8), false)
        }
    }
}

object Haptics {
    /** "on,off,on…" (밀리초) 모양의 진동. 웹의 navigator.vibrate 와 같은 형식. */
    fun play(ctx: Context, pattern: String) {
        val parts = pattern.split(',').mapNotNull { it.trim().toLongOrNull() }.filter { it >= 0 }
        if (parts.isEmpty()) return
        val v: Vibrator? = if (Build.VERSION.SDK_INT >= 31) ctx.getSystemService(VibratorManager::class.java)?.defaultVibrator
        else @Suppress("DEPRECATION") ctx.getSystemService(Vibrator::class.java)
        val timings = LongArray(parts.size + 1)
        parts.forEachIndexed { i, x -> timings[i + 1] = x }
        runCatching { v?.vibrate(VibrationEffect.createWaveform(timings, -1)) }
    }
}
