package kr.immanuel.tvremote

import android.content.Context
import android.util.Base64
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder

/**
 * 헤이홈 웹 대시보드(square.hej.so)의 요청을 그대로 쓴다. 공식 공개 API 가 아니므로
 * 헤이홈이 바꾸면 고쳐야 한다. 참고: homebridge-hejhome, ha-hejhome (오픈소스).
 *
 * 로그인: 처음 한 번 이메일 인증번호 확인 → 비밀번호 로그인 → OAuth 코드 → 토큰.
 * 이후 토큰이 만료되면 저장해 둔 비밀번호로 조용히 다시 로그인한다.
 */
object Hej {
    private const val SQUARE = "https://square.hej.so"
    private const val TWO_FACTOR = "https://2factor.goqual.com"
    private const val CLIENT_ID = "62f4020744ca4510827d3b4a4d2c7e7f"
    private const val CLIENT_SECRET = "fcd4302cece447a9ab009296f649d2c0"

    class AuthError(msg: String) : Exception(msg)

    data class Session(val token: String, val jsession: String, val user: String, val expiresAt: Long) {
        fun toJson() = JSONObject().put("token", token).put("jsession", jsession).put("user", user).put("exp", expiresAt).toString()

        companion object {
            fun from(s: String?): Session? = if (s == null) null else try {
                JSONObject(s).let { Session(it.getString("token"), it.getString("jsession"), it.getString("user"), it.getLong("exp")) }
            } catch (_: Exception) {
                null
            }
        }
    }

    data class Scene(val familyId: Long, val family: String, val sceneId: String, val name: String)

    private class Resp(val code: Int, val body: String, val headers: Map<String?, List<String>>, val location: String?)

    private fun http(
        url: String, method: String, headers: Map<String, String>, body: String? = null, follow: Boolean = true,
    ): Resp {
        val c = URL(url).openConnection() as HttpURLConnection
        c.requestMethod = method
        c.instanceFollowRedirects = follow
        c.connectTimeout = 10_000
        c.readTimeout = 15_000
        headers.forEach { (k, v) -> c.setRequestProperty(k, v) }
        if (body != null) {
            c.doOutput = true
            c.outputStream.use { it.write(body.toByteArray(Charsets.UTF_8)) }
        } else if (method == "POST") {
            c.doOutput = true
            c.setFixedLengthStreamingMode(0)
            c.outputStream.close()
        }
        val code = c.responseCode
        val text = runCatching { (if (code >= 400) c.errorStream else c.inputStream)?.bufferedReader()?.use { it.readText() } ?: "" }.getOrDefault("")
        val r = Resp(code, text, c.headerFields, c.getHeaderField("Location"))
        c.disconnect()
        return r
    }

    private fun basic(a: String, b: String) = "Basic " + Base64.encodeToString("$a:$b".toByteArray(Charsets.UTF_8), Base64.NO_WRAP)
    private fun enc(s: String) = URLEncoder.encode(s, "UTF-8")

    // ---------------- 로그인 ----------------
    fun sendCode(email: String) {
        val r = http(
            "$TWO_FACTOR/api/2factor/send/email?vendor=web", "POST",
            mapOf("accept" to "*/*", "content-type" to "application/json;charset=UTF-8"),
            JSONObject().put("email", email).toString()
        )
        if (r.code >= 400) throw AuthError("인증번호를 보내지 못했습니다 (HTTP ${r.code}). 헤이홈 앱에 등록한 이메일인지 확인해 주세요.")
    }

    fun verifyCode(email: String, code: String) {
        val r = http(
            "$TWO_FACTOR/api/2factor/verify", "POST",
            mapOf("accept" to "*/*", "content-type" to "application/json;charset=UTF-8"),
            JSONObject().put("username", email).put("authCode", code.trim()).toString()
        )
        if (r.code >= 400) throw AuthError("인증번호가 맞지 않습니다 (HTTP ${r.code}).")
    }

    fun login(email: String, password: String): Session {
        val r = http(
            "$SQUARE/oauth/login?vendor=shop", "POST",
            mapOf(
                "accept" to "text/plain, */*; q=0.01",
                "accept-language" to "ko-kr",
                "authorization" to basic(email, password),
                "content-type" to "application/x-www-form-urlencoded",
                "x-requested-with" to "XMLHttpRequest, XMLHttpRequest",
            ),
            follow = false,
        )
        if (r.code == 401 || r.code == 403) throw AuthError("이메일이나 비밀번호가 맞지 않습니다. (처음 로그인이라면 인증번호 확인을 먼저 해 주세요.)")
        if (r.code >= 400) throw AuthError("헤이홈 로그인에 실패했습니다 (HTTP ${r.code}).")
        val jsession = r.headers.entries.filter { it.key.equals("Set-Cookie", true) }.flatMap { it.value }
            .firstNotNullOfOrNull { Regex("JSESSIONID=([^;]+)").find(it)?.groupValues?.get(1) }
            ?: throw AuthError("헤이홈 로그인 응답에 세션이 없습니다.")
        val user = enc(email)
        val cookie = "username=$user; JSESSIONID=$jsession; autoLogin=true"

        val auth = http(
            "$SQUARE/oauth/authorize?client_id=$CLIENT_ID&redirect_uri=${enc("$SQUARE/list")}&response_type=code&scope=shop",
            "GET", mapOf("cookie" to cookie), follow = false,
        )
        val code = auth.location?.let { Regex("[?&]code=([^&]+)").find(it)?.groupValues?.get(1) }
            ?: throw AuthError("헤이홈 인증 코드를 받지 못했습니다.")

        val t = http(
            "$SQUARE/oauth/token", "POST",
            mapOf(
                "accept" to "application/json, text/javascript, */*; q=0.01",
                "authorization" to basic(CLIENT_ID, CLIENT_SECRET),
                "content-type" to "application/x-www-form-urlencoded",
                "cookie" to cookie,
                "x-requested-with" to "XMLHttpRequest",
            ),
            "grant_type=authorization_code&code=${enc(code)}&client_id=$CLIENT_ID&redirect_uri=${enc("$SQUARE/list")}"
        )
        if (t.code >= 400) throw AuthError("헤이홈 토큰을 받지 못했습니다 (HTTP ${t.code}).")
        val o = JSONObject(t.body)
        val token = o.optString("access_token").ifEmpty { throw AuthError("헤이홈 토큰이 비어 있습니다.") }
        val exp = System.currentTimeMillis() + o.optLong("expires_in", 86_400) * 1000
        return Session(token, jsession, user, exp)
    }

    // ---------------- 요청 ----------------
    private fun session(ctx: Context, forceNew: Boolean = false): Session {
        val cached = Store.hejSession(ctx)
        if (!forceNew && cached != null && cached.expiresAt - 10 * 60_000 > System.currentTimeMillis()) return cached
        val (email, pw) = Store.hejCredentials(ctx) ?: throw AuthError("먼저 설정에서 헤이홈에 로그인해 주세요.")
        val s = login(email, pw)
        Store.setHejSession(ctx, s)
        return s
    }

    private fun call(ctx: Context, method: String, path: String, retried: Boolean = false): String {
        val s = session(ctx, forceNew = retried)
        val r = http(
            "$SQUARE/$path", method,
            mapOf(
                "accept" to "application/json, text/javascript, */*; q=0.01",
                "authorization" to "Bearer ${s.token}",
                "content-type" to "application/json;charset=UTF-8",
                "cookie" to "username=${s.user}; autoLogin=true; JSESSIONID=${s.jsession}; accessToken=${s.token}",
                "Referer" to "$SQUARE/list",
                "x-requested-with" to "XMLHttpRequest",
            ),
            follow = false,
        )
        val toLogin = r.code in 300..399 && (r.location ?: "").contains("login")
        if (r.code == 401 || r.code == 403 || toLogin) {
            if (!retried) return call(ctx, method, path, true)
            throw AuthError("헤이홈 로그인이 풀렸습니다. 설정에서 다시 로그인해 주세요.")
        }
        if (r.code >= 400) throw IllegalStateException("헤이홈 요청 실패 (HTTP ${r.code})")
        return r.body
    }

    /** 집(가족) 목록의 모든 레시피를 가져온다. */
    fun scenes(ctx: Context): List<Scene> {
        val fam = JSONObject(call(ctx, "GET", "dashboard/family")).optJSONArray("result") ?: JSONArray()
        val out = mutableListOf<Scene>()
        for (i in 0 until fam.length()) {
            val f = fam.optJSONObject(i) ?: continue
            val fid = f.optLong("familyId")
            val fname = f.optString("name")
            val body = runCatching { JSONObject(call(ctx, "GET", "dashboard/scene?family-id=$fid")) }.getOrNull() ?: continue
            val arr = body.optJSONArray("result") ?: continue
            for (j in 0 until arr.length()) {
                val s = arr.optJSONObject(j) ?: continue
                val id = s.optString("sceneId")
                val name = s.optString("name").trim()
                if (id.isNotEmpty() && name.isNotEmpty()) out += Scene(fid, fname, id, name)
            }
        }
        return out
    }

    fun runScene(ctx: Context, familyId: Long, sceneId: String) {
        call(ctx, "POST", "dashboard/scene/?family-id=$familyId&scene-id=${enc(sceneId)}")
    }
}
