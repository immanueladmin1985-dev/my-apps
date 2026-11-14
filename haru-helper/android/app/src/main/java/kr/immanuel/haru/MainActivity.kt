package kr.immanuel.haru

import android.Manifest
import android.app.Activity
import android.app.AlarmManager
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.view.WindowManager
import android.webkit.JavascriptInterface
import android.webkit.PermissionRequest
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.core.view.WindowCompat
import androidx.webkit.WebViewAssetLoader
import org.json.JSONObject
import java.lang.ref.WeakReference

/**
 * 웹 앱(haru-helper/index.html)을 그대로 띄우는 화면.
 * 웹 앱은 window.HaruNative 로 요약을 보내고(위젯·워치·알람용), 위젯·워치에서 누른 동작을 가져간다.
 */
class MainActivity : Activity() {
    private lateinit var web: WebView
    private var ready = false
    private var pendingOpen: String? = null
    private var fileCb: ValueCallback<Array<Uri>>? = null
    private var saveText: String? = null
    private var micRequest: PermissionRequest? = null
    private var pendingShare: String? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        live = WeakReference(this)
        val loader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()
        web = WebView(this).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.mediaPlaybackRequiresUserGesture = false
            settings.allowFileAccess = false
            setBackgroundColor(0xFFF4F3FB.toInt())
            webViewClient = object : WebViewClient() {
                override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? =
                    loader.shouldInterceptRequest(request.url)

                override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                    if (request.url.host == HOST) return false
                    runCatching { startActivity(Intent(Intent.ACTION_VIEW, request.url)) }
                    return true
                }

                override fun onPageFinished(view: WebView, url: String) {
                    ready = true
                    pendingOpen?.let { open(it) }
                    pendingOpen = null
                    pendingShare?.let { share(it) }
                    pendingShare = null
                }
            }
            webChromeClient = object : WebChromeClient() {
                // 대화 도우미의 자동 말하기 감지가 마이크를 쓸 때
                override fun onPermissionRequest(request: PermissionRequest) {
                    runOnUiThread {
                        if (PermissionRequest.RESOURCE_AUDIO_CAPTURE !in request.resources) {
                            request.deny()
                        } else if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
                            request.grant(arrayOf(PermissionRequest.RESOURCE_AUDIO_CAPTURE))
                        } else {
                            micRequest?.deny()
                            micRequest = request
                            requestPermissions(arrayOf(Manifest.permission.RECORD_AUDIO), REQ_MIC)
                        }
                    }
                }

                override fun onShowFileChooser(view: WebView, cb: ValueCallback<Array<Uri>>, params: FileChooserParams): Boolean {
                    fileCb?.onReceiveValue(null)
                    fileCb = cb
                    return try {
                        startActivityForResult(params.createIntent(), REQ_FILE); true
                    } catch (_: Exception) {
                        fileCb = null; false
                    }
                }
            }
            addJavascriptInterface(Bridge(this@MainActivity), "HaruNative")
        }
        setContentView(web)
        pendingOpen = intent?.getStringExtra("open")
        pendingShare = shareText(intent)
        web.loadUrl(URL)
        if (notifState() == "default") requestNotif()
    }

    /** 카톡·문자에서 ‘공유’로 보낸 글. */
    private fun shareText(i: Intent?): String? =
        if (i?.action == Intent.ACTION_SEND) i.getStringExtra(Intent.EXTRA_TEXT)?.takeIf { it.isNotBlank() } else null

    private fun share(text: String) {
        web.evaluateJavascript("window.haruShare && haruShare(${JSONObject.quote(text)})", null)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        shareText(intent)?.let { if (ready) share(it) else pendingShare = it; return }
        val what = intent.getStringExtra("open") ?: return
        if (ready) open(what) else pendingOpen = what
    }

    override fun onResume() {
        super.onResume()
        if (ready) pull()
    }

    override fun onDestroy() {
        if (live?.get() === this) live = null
        web.destroy()
        super.onDestroy()
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        if (!ready) { finish(); return }
        web.evaluateJavascript("window.haruBack ? haruBack() : false") { r -> if (r != "true") finish() }
    }

    private fun open(what: String) {
        web.evaluateJavascript("window.haruOpen && haruOpen(${JSONObject.quote(what)})", null)
    }

    /** 위젯·워치에서 누른 동작을 웹 앱이 가져가게 한다. */
    fun pull() = runOnUiThread {
        if (ready) web.evaluateJavascript("window.haruPull && haruPull()", null)
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode != REQ_MIC) return
        val r = micRequest ?: return
        micRequest = null
        if (grantResults.firstOrNull() == PackageManager.PERMISSION_GRANTED) r.grant(arrayOf(PermissionRequest.RESOURCE_AUDIO_CAPTURE)) else r.deny()
    }

    @Deprecated("Deprecated in Java")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        when (requestCode) {
            REQ_FILE -> {
                fileCb?.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(resultCode, data))
                fileCb = null
            }
            REQ_SAVE -> {
                val uri = data?.data
                val text = saveText
                saveText = null
                if (resultCode == RESULT_OK && uri != null && text != null) {
                    val ok = runCatching { contentResolver.openOutputStream(uri)?.use { it.write(text.toByteArray()) } }.isSuccess
                    Toast.makeText(this, if (ok) "백업 파일을 저장했어요" else "저장하지 못했어요", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }

    fun saveFile(name: String, mime: String, text: String) {
        saveText = text
        runCatching {
            startActivityForResult(
                Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType(mime).putExtra(Intent.EXTRA_TITLE, name),
                REQ_SAVE
            )
        }
    }

    fun notifState(): String {
        val nm = getSystemService(android.app.NotificationManager::class.java)
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            return if (Store.sp(this).getBoolean("askedNotif", false)) "denied" else "default"
        }
        return if (nm?.areNotificationsEnabled() != false) "granted" else "denied"
    }

    fun requestNotif() {
        if (Build.VERSION.SDK_INT >= 33 && !Store.sp(this).getBoolean("askedNotif", false)) {
            Store.sp(this).edit().putBoolean("askedNotif", true).apply()
            requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), REQ_NOTIF)
        } else {
            runCatching {
                startActivity(Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, packageName))
            }
        }
    }

    fun exactAlarmOk(): Boolean =
        Build.VERSION.SDK_INT < 31 || getSystemService(AlarmManager::class.java)?.canScheduleExactAlarms() != false

    fun openAlarmSettings() {
        if (Build.VERSION.SDK_INT >= 31) runCatching {
            startActivity(Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, Uri.parse("package:$packageName")))
        }
    }

    /** 웹 앱의 화면 색에 맞춰 상태 표시줄과 아래 막대 색을 바꾼다. */
    fun bars(bg: String, nav: String, dark: Boolean) {
        val c = runCatching { Color.parseColor(bg) }.getOrNull() ?: return
        val n = runCatching { Color.parseColor(nav) }.getOrNull() ?: c
        @Suppress("DEPRECATION")
        window.statusBarColor = c
        @Suppress("DEPRECATION")
        window.navigationBarColor = n
        WindowCompat.getInsetsController(window, window.decorView).apply {
            isAppearanceLightStatusBars = !dark
            isAppearanceLightNavigationBars = !dark
        }
        web.setBackgroundColor(c)
    }

    fun widgetCount(): Int =
        runCatching { AppWidgetManager.getInstance(this).getAppWidgetIds(ComponentName(this, HaruWidget::class.java)).size }.getOrDefault(0)

    /** 홈 화면 런처가 지원하면 ‘위젯 추가’ 창을 바로 띄운다. */
    fun pinWidget(): Boolean = runCatching {
        val m = AppWidgetManager.getInstance(this)
        m.isRequestPinAppWidgetSupported && m.requestPinAppWidget(ComponentName(this, HaruWidget::class.java), null, null)
    }.getOrDefault(false)

    fun keepScreen(on: Boolean) {
        if (on) window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        else window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    }

    companion object {
        private const val HOST = "appassets.androidplatform.net"
        private const val URL = "https://$HOST/assets/web/index.html"
        private const val REQ_FILE = 1
        private const val REQ_SAVE = 2
        private const val REQ_NOTIF = 3
        private const val REQ_MIC = 4
        private var live: WeakReference<MainActivity>? = null

        fun current(): MainActivity? = live?.get()
    }
}

/** 웹 앱에서 부르는 window.HaruNative. 자바스크립트 쪽 스레드에서 불리므로 화면 작업은 UI 스레드로 넘긴다. */
class Bridge(private val a: MainActivity) {
    private val ctx = a.applicationContext

    @JavascriptInterface fun sync(json: String) = Store.fromWeb(ctx, json)
    @JavascriptInterface fun takeActions(): String = Store.takeActions(ctx)
    @JavascriptInterface fun vibrate(pattern: String) = Haptics.play(ctx, pattern)
    @JavascriptInterface fun keepScreen(on: Boolean) = a.runOnUiThread { a.keepScreen(on) }
    @JavascriptInterface fun saveFile(name: String, mime: String, text: String) = a.runOnUiThread { a.saveFile(name, mime, text) }
    @JavascriptInterface fun bars(bg: String, nav: String, dark: Boolean) = a.runOnUiThread { a.bars(bg, nav, dark) }
    @JavascriptInterface fun notifState(): String = a.notifState()
    @JavascriptInterface fun requestNotif() = a.runOnUiThread { a.requestNotif() }
    @JavascriptInterface fun exactAlarmOk(): Boolean = a.exactAlarmOk()
    @JavascriptInterface fun openAlarmSettings() = a.runOnUiThread { a.openAlarmSettings() }
    @JavascriptInterface fun widgetCount(): Int = a.widgetCount()

    /** 문자·카톡 글에서 일정·결제 찾기 (MsgParse). 병원 목록은 지금 요약에서. */
    @JavascriptInterface fun parseMsg(text: String): String =
        MsgParse.parse(text, System.currentTimeMillis(), Store.snap(ctx).clinics).toJson().toString()

    /** 예약 일정 알림 계획 (전날 저녁, 1시간 전). */
    @JavascriptInterface fun apptRems(id: String, title: String, at: Double, items: String): String {
        val list = runCatching { org.json.JSONArray(items) }.getOrNull()
        val its = if (list == null) emptyList() else (0 until list.length()).map { list.optString(it) }
        return MsgParse.apptRems(id, title, at.toLong(), its, System.currentTimeMillis()).toString()
    }

    @JavascriptInterface fun msgAccess(): Boolean = MsgListener.enabled(ctx)
    @JavascriptInterface fun openMsgAccess() = a.runOnUiThread {
        runCatching { a.startActivity(Intent("android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS")) }
    }
    @JavascriptInterface fun pinWidget(): Boolean = a.pinWidget()

    @JavascriptInterface fun copy(text: String) = a.runOnUiThread {
        a.getSystemService(ClipboardManager::class.java)?.setPrimaryClip(ClipData.newPlainText("하루 도우미", text))
    }
}
