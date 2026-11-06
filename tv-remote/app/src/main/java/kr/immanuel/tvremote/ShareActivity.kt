package kr.immanuel.tvremote

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.widget.Toast

/**
 * 폰의 공유 메뉴에서 “TV 한번에”를 고르면 주소를 구글 TV로 보낸다.
 * 유튜브 주소는 TV의 유튜브 앱에서, 다른 사이트는 TV에 설치된 브라우저(예: TV Bro)에서 열린다.
 */
class ShareActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val text = when (intent?.action) {
            Intent.ACTION_SEND -> intent.getStringExtra(Intent.EXTRA_TEXT)
            Intent.ACTION_VIEW -> intent.dataString
            else -> null
        }
        val url = text?.let { Regex("https?://\\S+").find(it)?.value }
        if (url == null) {
            Toast.makeText(this, "보낼 주소를 찾지 못했습니다", Toast.LENGTH_SHORT).show()
            finish(); return
        }
        val app = applicationContext
        Runner.onWorker {
            val msg = try {
                Atv.session(app).app(url); "📺 TV로 보냈습니다"
            } catch (e: Exception) {
                "⚠ " + (e.message ?: "보내지 못했습니다")
            }
            android.os.Handler(mainLooper).post { Toast.makeText(app, msg, Toast.LENGTH_SHORT).show() }
        }
        finish()
    }
}
