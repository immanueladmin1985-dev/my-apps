package kr.immanuel.relay

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Typeface
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.PowerManager
import android.provider.Settings
import android.view.View
import android.view.ViewGroup
import android.widget.AdapterView
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.CheckBox
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.Spinner
import android.widget.Switch
import android.widget.TextView
import android.widget.Toast
import androidx.core.content.FileProvider
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File
import java.time.LocalDate
import java.time.ZoneId

class MainActivity : Activity() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    private lateinit var prefs: Prefs
    private lateinit var statusView: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        prefs = Prefs(this)
        Notifier.createChannels(this)
        setContentView(buildUi())
        if (Build.VERSION.SDK_INT >= 33 &&
            checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 1)
        }
    }

    override fun onResume() {
        super.onResume()
        refreshStatus()
    }

    override fun onDestroy() {
        scope.cancel()
        super.onDestroy()
    }

    private fun dp(v: Int) = (v * resources.displayMetrics.density).toInt()

    private fun buildUi(): View {
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(20), dp(28), dp(20), dp(28))
        }
        fun header(text: String) = TextView(this).apply {
            this.text = text
            textSize = 15f
            setTypeface(typeface, Typeface.BOLD)
            setPadding(0, dp(22), 0, dp(6))
        }
        fun button(text: String, onClick: () -> Unit) = Button(this).apply {
            this.text = text
            setOnClickListener { onClick() }
        }

        root.addView(TextView(this).apply {
            text = "⚾ 야구 중계 알림"
            textSize = 24f
            setTypeface(typeface, Typeface.BOLD)
        })
        statusView = TextView(this).apply {
            textSize = 15f
            setPadding(0, dp(12), 0, 0)
        }
        root.addView(statusView)

        root.addView(header("응원 팀"))
        root.addView(Spinner(this).apply {
            adapter = ArrayAdapter(this@MainActivity, android.R.layout.simple_spinner_dropdown_item, Teams.all.map { it.name })
            setSelection(Teams.all.indexOfFirst { it.code == prefs.team }.coerceAtLeast(0))
            onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
                override fun onItemSelected(p: AdapterView<*>?, v: View?, pos: Int, id: Long) {
                    val code = Teams.all[pos].code
                    if (code != prefs.team) {
                        prefs.team = code
                        prefs.engineState = null
                        checkNow()
                    }
                }
                override fun onNothingSelected(p: AdapterView<*>?) {}
            }
        })

        root.addView(Switch(this).apply {
            text = "경기 시작 전에 자동으로 감시 시작"
            isChecked = prefs.autoWatch
            setPadding(0, dp(12), 0, 0)
            setOnCheckedChangeListener { _, on ->
                prefs.autoWatch = on
                if (on) checkNow() else { Scheduler.cancelAll(this@MainActivity); prefs.nextGameLine = "자동 감시가 꺼져 있습니다."; refreshStatus() }
            }
        })

        root.addView(header("받을 알림"))
        listOf(
            listOf(Kind.ATBAT) to "매 타석 결과 (조용히)",
            listOf(Kind.SCORE) to "득점",
            listOf(Kind.HOMERUN) to "홈런",
            listOf(Kind.PITCHER) to "투수 교체",
            listOf(Kind.INNING) to "이닝 종료 요약",
            listOf(Kind.START, Kind.END, Kind.CANCEL) to "경기 시작·종료",
        ).forEach { (kinds, label) ->
            root.addView(CheckBox(this).apply {
                text = label
                isChecked = prefs.enabled(kinds.first())
                setOnCheckedChangeListener { _, on -> kinds.forEach { prefs.setEnabled(it, on) } }
            })
        }

        root.addView(header("실행"))
        root.addView(button("지금 오늘 경기 찾아서 시작") {
            prefs.stoppedGameId = ""
            checkNow(forceStart = true)
        })
        root.addView(button("감시 멈추기") {
            RelayService.stop(this)
            statusView.postDelayed({ refreshStatus() }, 800)
        })
        root.addView(button("알림 테스트 (워치 확인용)") {
            Notifier.post(this, RelayEvent(Kind.HOMERUN, "💥 홈런! 삼성 6 : 4 KIA", "테스트 알림입니다. 워치에도 표시되는지 확인해 주세요."), null)
        })

        root.addView(header("설정"))
        root.addView(button("배터리 최적화에서 제외 (권장)") { askBatteryExemption() })
        root.addView(button("알림 종류별 소리·진동 설정") {
            startActivity(Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, packageName))
        })
        root.addView(button("진단 데이터 공유 (문제가 있을 때)") { shareDiagnostics() })

        root.addView(TextView(this).apply {
            text = "알림창의 스코어를 누르면 네이버 문자중계가 열립니다. 갤럭시 워치에서는 '야구 중계' 타일과 워치페이스 컴플리케이션으로 스코어를 볼 수 있습니다."
            textSize = 13f
            alpha = 0.7f
            setPadding(0, dp(20), 0, 0)
        })

        return ScrollView(this).apply {
            addView(root, ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT))
        }
    }

    private fun refreshStatus() {
        val pm = getSystemService(PowerManager::class.java)
        val battery = if (pm.isIgnoringBatteryOptimizations(packageName)) "" else "\n⚠ 배터리 최적화에서 제외하면 화면이 꺼져도 알림이 늦지 않습니다."
        val running = if (RelayService.running) "● 감시 중" else "○ 대기 중"
        statusView.text = buildString {
            append(running)
            if (prefs.lastStatusLine.isNotBlank()) append("\n").append(prefs.lastStatusLine)
            if (prefs.nextGameLine.isNotBlank()) append("\n").append(prefs.nextGameLine)
            append(battery)
        }
    }

    private fun checkNow(forceStart: Boolean = false) {
        statusView.text = "오늘 경기를 찾고 있습니다…"
        scope.launch {
            val msg = withContext(Dispatchers.IO) {
                runCatching {
                    if (forceStart) {
                        val game = Scheduler.pickGame(NaverApi.schedule(LocalDate.now(ZoneId.of("Asia/Seoul"))), prefs.team)
                        when {
                            game == null -> "오늘은 ${Teams.short(prefs.team)} 경기가 없습니다."
                            else -> { RelayService.start(this@MainActivity, game.id); "감시를 시작했습니다." }
                        }.also { if (prefs.autoWatch) Scheduler.scheduleDaily(this@MainActivity) }
                    } else Scheduler.checkToday(this@MainActivity)
                }.getOrElse { "경기 정보를 가져오지 못했습니다: ${it.message}" }
            }
            prefs.nextGameLine = msg
            refreshStatus()
        }
    }

    private fun askBatteryExemption() {
        try {
            startActivity(Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:$packageName")))
        } catch (_: Exception) {
            startActivity(Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS))
        }
    }

    /** 네이버 응답 원본을 파일로 저장해서 공유한다. 구조가 바뀌어 알림이 이상할 때 확인용. */
    private fun shareDiagnostics() {
        Toast.makeText(this, "데이터를 모으는 중입니다…", Toast.LENGTH_SHORT).show()
        scope.launch {
            val file = withContext(Dispatchers.IO) {
                val dir = File(cacheDir, "diag").apply { mkdirs() }
                val f = File(dir, "naver_diag.txt")
                val sb = StringBuilder()
                fun grab(label: String, url: String): String? {
                    sb.append("===== ").append(label).append("\n").append(url).append("\n")
                    return runCatching { NaverApi.get(url) }
                        .onSuccess { sb.append(it).append("\n\n") }
                        .onFailure { sb.append("오류: ").append(it.message).append("\n\n") }
                        .getOrNull()
                }
                val today = LocalDate.now(ZoneId.of("Asia/Seoul"))
                val sched = grab("schedule", NaverApi.scheduleUrl(today))
                val game = sched?.let { runCatching { Scheduler.pickGame(NaverApi.parseSchedule(org.json.JSONObject(it)), prefs.team) }.getOrNull() }
                if (game != null) {
                    grab("game", NaverApi.gameUrl(game.id))
                    grab("relay", NaverApi.relayUrl(game.id))
                }
                sb.append("===== engine\n").append(prefs.engineState).append("\n")
                f.writeText(sb.toString())
                f
            }
            val uri = FileProvider.getUriForFile(this@MainActivity, "kr.immanuel.relay.files", file)
            startActivity(Intent.createChooser(Intent(Intent.ACTION_SEND).apply {
                type = "text/plain"
                putExtra(Intent.EXTRA_STREAM, uri)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }, "진단 데이터 공유"))
        }
    }
}
