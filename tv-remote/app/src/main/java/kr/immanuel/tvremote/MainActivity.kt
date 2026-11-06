package kr.immanuel.tvremote

import android.annotation.SuppressLint
import android.app.Activity
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.core.content.pm.ShortcutInfoCompat
import androidx.core.content.pm.ShortcutManagerCompat
import androidx.core.graphics.drawable.IconCompat
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.Executors

/** 화면은 assets/web/index.html (웹) 이고, 기기 제어는 TvNative 로 넘겨받는다. */
class MainActivity : Activity() {
    private lateinit var web: WebView
    private val main = Handler(Looper.getMainLooper())
    private val net = Executors.newCachedThreadPool()
    private var pairing: Atv.Pairing? = null
    private val tvListener: () -> Unit = { main.post { js("window.tvChanged && tvChanged()") } }
    private val runListener: (String) -> Unit = { msg -> main.post { js("window.runDone && runDone(${JSONObject.quote(msg)})") } }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        web = WebView(this)
        web.settings.javaScriptEnabled = true
        web.settings.domStorageEnabled = true
        web.webViewClient = WebViewClient()
        web.setBackgroundColor(0xFF111318.toInt())
        web.addJavascriptInterface(Bridge(), "TvNative")
        web.loadUrl("file:///android_asset/web/index.html")
        setContentView(web)
        if (Build.VERSION.SDK_INT >= 33) requestPermissions(arrayOf(android.Manifest.permission.POST_NOTIFICATIONS), 1)
        Atv.listeners.add(tvListener)
        Runner.listeners.add(runListener)
        Runner.onWorker { runCatching { Shortcuts.update(this) }; runCatching { TvWidget.refresh(this) }; WatchSync.push(this) }
    }

    override fun onDestroy() {
        Atv.listeners.remove(tvListener)
        Runner.listeners.remove(runListener)
        pairing?.close()
        super.onDestroy()
    }

    override fun onPause() {
        super.onPause()
        // 리모컨 화면을 떠나면 잠시 뒤 연결을 닫는다.
        main.postDelayed({ if (!hasWindowFocus()) Atv.closeIfIdle(30_000) }, 45_000)
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        web.evaluateJavascript("window.goBack ? goBack() : false") { r ->
            if (r != "true") @Suppress("DEPRECATION") super.onBackPressed()
        }
    }

    private fun js(code: String) = runCatching { web.evaluateJavascript(code, null) }

    /** 오래 걸리는 일은 다른 스레드에서 하고 결과를 tvCb(id, ok, data) 로 돌려준다. */
    private fun async(cb: String, task: () -> Any?) {
        net.execute {
            val (ok, data) = try {
                true to task()
            } catch (e: Exception) {
                false to (e.message ?: e.javaClass.simpleName)
            }
            val payload = when (data) {
                null -> "null"
                is JSONObject, is JSONArray -> data.toString()
                is String -> JSONObject.quote(data)
                else -> JSONObject.quote(data.toString())
            }
            main.post { js("tvCb(${JSONObject.quote(cb)}, $ok, $payload)") }
        }
    }

    private fun tvStatus(): JSONObject {
        val s = Atv.current()
        return JSONObject()
            .put("connected", s != null)
            .put("on", s?.isOn ?: JSONObject.NULL)
            .put("app", s?.currentApp ?: "")
            .put("volume", s?.volume ?: "")
    }

    inner class Bridge {
        private val ctx get() = this@MainActivity

        @JavascriptInterface
        fun state(): String {
            val scenes = Store.hejScenesCache(ctx)
            return JSONObject()
                .put("modes", JSONArray(Store.modesJson(ctx)))
                .put("settings", Store.settings(ctx))
                .put("tvHost", Store.tvHost(ctx) ?: "")
                .put("tvName", Store.tvName(ctx))
                .put("tvApps", JSONArray(Store.tvApps(ctx)))
                .put("hejEmail", Store.hejEmail(ctx))
                .put("hejLoggedIn", Store.hejCredentials(ctx) != null)
                .put("scenes", JSONArray(scenes))
                .put("lastRun", Store.lastRun(ctx))
                .put("tv", tvStatus())
                .put("version", runCatching { packageManager.getPackageInfo(packageName, 0).versionName }.getOrDefault(""))
                .toString()
        }

        @JavascriptInterface fun saveModes(json: String) = Store.saveModes(ctx, json)
        @JavascriptInterface fun saveSettings(json: String) = Store.saveSettings(ctx, json)
        @JavascriptInterface fun saveTvApps(json: String) = Store.saveTvApps(ctx, json)
        @JavascriptInterface fun toast(msg: String) = main.post { Toast.makeText(ctx, msg, Toast.LENGTH_SHORT).show() }.let { }

        @JavascriptInterface
        fun runMode(id: String) {
            val m = Store.mode(ctx, id) ?: return
            Runner.runAsync(ctx, m, toast = false)
        }

        /** 편집 중인 (저장 전) 모드를 시험 실행 */
        @JavascriptInterface
        fun testMode(json: String) {
            val m = runCatching { Mode.from(JSONObject(json)) }.getOrNull() ?: return
            Runner.runAsync(ctx, m, toast = false)
        }

        @JavascriptInterface fun tvStatus(): String = this@MainActivity.tvStatus().toString()

        @JavascriptInterface fun tvConnect(cb: String) = async(cb) { Atv.session(ctx); this@MainActivity.tvStatus() }

        @JavascriptInterface fun key(cb: String, code: Int) = async(cb) { Atv.session(ctx).key(code); null }
        @JavascriptInterface fun app(cb: String, link: String) = async(cb) { Atv.session(ctx).app(link); null }
        @JavascriptInterface fun text(cb: String, value: String) = async(cb) { Atv.session(ctx).text(value); null }

        @JavascriptInterface
        fun discover(cb: String) = async(cb) {
            JSONArray().apply { Atv.discover(ctx).forEach { put(JSONObject().put("name", it.name).put("host", it.host)) } }
        }

        @JavascriptInterface
        fun pairStart(cb: String, host: String, name: String) = async(cb) {
            pairing?.close()
            Atv.disconnect()
            pairing = Atv.startPairing(ctx, host.trim())
            Store.setTv(ctx, host.trim(), name.ifBlank { host.trim() })
            null
        }

        @JavascriptInterface
        fun pairFinish(cb: String, pin: String) = async(cb) {
            val p = pairing ?: throw IllegalStateException("페어링을 다시 시작해 주세요.")
            pairing = null
            p.finish(pin)
            Atv.session(ctx)
            this@MainActivity.tvStatus()
        }

        /** 이미 페어링한 TV 의 주소만 바꿀 때 */
        @JavascriptInterface
        fun setTvHost(host: String, name: String) {
            Atv.disconnect()
            Store.setTv(ctx, host.trim(), name.ifBlank { host.trim() })
        }

        @JavascriptInterface
        fun switchInput(cb: String, name: String) = async(cb) { Runner.switchInput(ctx, name); null }

        @JavascriptInterface fun setCurrentInput(index: Int) = Store.setCurrentInput(ctx, index)

        @JavascriptInterface
        fun launchCandidates(pkg: String): String = JSONArray(AtvWire.launchCandidates(pkg)).toString()

        @JavascriptInterface fun hejSendCode(cb: String, email: String) = async(cb) { Hej.sendCode(email.trim()); null }
        @JavascriptInterface fun hejVerify(cb: String, email: String, code: String) = async(cb) { Hej.verifyCode(email.trim(), code); null }

        @JavascriptInterface
        fun hejLogin(cb: String, email: String, pw: String) = async(cb) {
            val s = Hej.login(email.trim(), pw)
            Store.setHejCredentials(ctx, email.trim(), pw)
            Store.setHejSession(ctx, s)
            loadScenes()
        }

        @JavascriptInterface fun hejLogout() = Store.hejLogout(ctx)

        @JavascriptInterface fun hejScenes(cb: String) = async(cb) { loadScenes() }

        private fun loadScenes(): JSONArray {
            val arr = JSONArray()
            Hej.scenes(ctx).forEach {
                arr.put(JSONObject().put("familyId", it.familyId).put("family", it.family).put("sceneId", it.sceneId).put("name", it.name))
            }
            Store.setHejScenesCache(ctx, arr.toString())
            return arr
        }

        @JavascriptInterface
        fun runScene(cb: String, familyId: Long, sceneId: String) = async(cb) { Hej.runScene(ctx, familyId, sceneId); null }

        /** 모드 바로가기를 홈 화면에 꺼내 둔다. */
        @JavascriptInterface
        fun pinShortcut(id: String): Boolean {
            val m = Store.mode(ctx, id) ?: return false
            if (!ShortcutManagerCompat.isRequestPinShortcutSupported(ctx)) return false
            val info = ShortcutInfoCompat.Builder(ctx, "pin-${m.id}")
                .setShortLabel(m.name.take(20))
                .setIcon(IconCompat.createWithResource(ctx, R.mipmap.ic_launcher))
                .setIntent(Intent(ctx, RunActivity::class.java).setAction(Intent.ACTION_VIEW).putExtra(RunService.EXTRA_MODE, m.id))
                .build()
            return ShortcutManagerCompat.requestPinShortcut(ctx, info, null)
        }
    }
}
