package kr.immanuel.tvremote

import android.content.Context
import android.content.SharedPreferences
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import org.json.JSONArray
import org.json.JSONObject
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/** 앱 설정과 모드 목록. 헤이홈 비밀번호와 토큰은 안드로이드 키 저장소의 키로 암호화해 둔다. */
object Store {
    private fun p(ctx: Context): SharedPreferences = ctx.applicationContext.getSharedPreferences("tv", Context.MODE_PRIVATE)

    // ---------------- 모드 ----------------
    fun modesJson(ctx: Context): String = p(ctx).getString("modes", null) ?: defaultModes()
    fun modes(ctx: Context): List<Mode> = Mode.list(modesJson(ctx))
    fun mode(ctx: Context, id: String?): Mode? = modes(ctx).firstOrNull { it.id == id }

    fun saveModes(ctx: Context, json: String) {
        val list = Mode.list(json)
        p(ctx).edit().putString("modes", Mode.toJson(list)).apply()
        changed(ctx)
    }

    /** 처음 실행했을 때 보여 줄 예시 모드. 레시피는 사용자가 직접 고른다. */
    private fun defaultModes(): String = Mode.toJson(
        listOf(
            Mode(
                "m-on", "티비 켜기", "📺", listOf(
                    Step("key", "구글 TV 깨우기", code = Keys.WAKEUP),
                )
            ),
            Mode(
                "m-off", "티비 끄기", "🌙", listOf(
                    Step("key", "구글 TV 잠자기", code = Keys.SLEEP),
                )
            ),
        )
    )

    // ---------------- 설정 ----------------
    fun settings(ctx: Context): JSONObject = runCatching { JSONObject(p(ctx).getString("settings", "{}")!!) }.getOrDefault(JSONObject())

    fun saveSettings(ctx: Context, json: String) {
        val o = runCatching { JSONObject(json) }.getOrNull() ?: return
        p(ctx).edit().putString("settings", o.toString()).apply()
        changed(ctx)
    }

    fun setting(ctx: Context, key: String): String = settings(ctx).optString(key)

    /** 음성(제미나이)·빠른 설정에 연결한 모드. 따로 고르지 않았으면 첫 번째·두 번째 모드. */
    fun slotMode(ctx: Context, slot: String): Mode? {
        val all = modes(ctx)
        val id = setting(ctx, slot)
        return all.firstOrNull { it.id == id } ?: when (slot) {
            "voiceOn", "qsMode" -> all.getOrNull(0)
            "voiceOff" -> all.getOrNull(1)
            else -> null
        }
    }

    // ---------------- 구글 TV ----------------
    fun tvHost(ctx: Context): String? = p(ctx).getString("tvHost", null)?.takeIf { it.isNotBlank() }
    fun tvName(ctx: Context): String = p(ctx).getString("tvName", "") ?: ""
    fun setTv(ctx: Context, host: String, name: String) {
        p(ctx).edit().putString("tvHost", host).putString("tvName", name).apply()
    }

    /** 리모컨 화면에 둘 TV 앱 버튼 [{name, link}] */
    fun tvApps(ctx: Context): String = p(ctx).getString("tvApps", null) ?: JSONArray().apply {
        put(JSONObject().put("name", "유튜브").put("link", "com.google.android.youtube.tv"))
        put(JSONObject().put("name", "넷플릭스").put("link", "com.netflix.ninja"))
    }.toString()

    fun saveTvApps(ctx: Context, json: String) {
        if (runCatching { JSONArray(json) }.isSuccess) p(ctx).edit().putString("tvApps", json).apply()
    }

    // ---------------- 헤이홈 ----------------
    fun hejEmail(ctx: Context): String = p(ctx).getString("hejEmail", "") ?: ""

    fun hejCredentials(ctx: Context): Pair<String, String>? {
        val email = hejEmail(ctx).ifEmpty { return null }
        val pw = decrypt(p(ctx).getString("hejPw", null)) ?: return null
        return email to pw
    }

    fun setHejCredentials(ctx: Context, email: String, pw: String) {
        p(ctx).edit().putString("hejEmail", email).putString("hejPw", encrypt(pw)).apply()
    }

    fun hejSession(ctx: Context): Hej.Session? = Hej.Session.from(decrypt(p(ctx).getString("hejSession", null)))
    fun setHejSession(ctx: Context, s: Hej.Session) {
        p(ctx).edit().putString("hejSession", encrypt(s.toJson())).apply()
    }

    fun hejLogout(ctx: Context) {
        p(ctx).edit().remove("hejPw").remove("hejSession").remove("hejScenes").apply()
    }

    /** 마지막으로 받아 온 레시피 목록 (네트워크 없이도 편집 화면에 보이도록). */
    fun hejScenesCache(ctx: Context): String = p(ctx).getString("hejScenes", "[]") ?: "[]"
    fun setHejScenesCache(ctx: Context, json: String) {
        p(ctx).edit().putString("hejScenes", json).apply()
    }

    // ---------------- 실행 기록 ----------------
    fun lastRun(ctx: Context): String = p(ctx).getString("lastRun", "") ?: ""
    fun setLastRun(ctx: Context, s: String) {
        p(ctx).edit().putString("lastRun", s).apply()
    }

    // ---------------- 변경 알림 ----------------
    /** 모드가 바뀌면 위젯·워치·바로가기를 함께 새로 고친다. */
    fun changed(ctx: Context) {
        runCatching { TvWidget.refresh(ctx) }
        runCatching { WatchSync.push(ctx) }
        runCatching { Shortcuts.update(ctx) }
    }

    // ---------------- 암호화 ----------------
    private const val KEY_ALIAS = "tv-remote-secret"

    private fun key(): SecretKey {
        val ks = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        (ks.getEntry(KEY_ALIAS, null) as? KeyStore.SecretKeyEntry)?.let { return it.secretKey }
        val kg = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore")
        kg.init(
            KeyGenParameterSpec.Builder(KEY_ALIAS, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .build()
        )
        return kg.generateKey()
    }

    private fun encrypt(s: String): String {
        val c = Cipher.getInstance("AES/GCM/NoPadding")
        c.init(Cipher.ENCRYPT_MODE, key())
        val enc = c.doFinal(s.toByteArray(Charsets.UTF_8))
        return Base64.encodeToString(c.iv, Base64.NO_WRAP) + ":" + Base64.encodeToString(enc, Base64.NO_WRAP)
    }

    private fun decrypt(s: String?): String? = try {
        val (iv, data) = s!!.split(":", limit = 2)
        val c = Cipher.getInstance("AES/GCM/NoPadding")
        c.init(Cipher.DECRYPT_MODE, key(), GCMParameterSpec(128, Base64.decode(iv, Base64.NO_WRAP)))
        String(c.doFinal(Base64.decode(data, Base64.NO_WRAP)), Charsets.UTF_8)
    } catch (_: Exception) {
        null
    }
}
