package kr.immanuel.relay

import android.content.Context

class Prefs(context: Context) {
    private val sp = context.getSharedPreferences("relay", Context.MODE_PRIVATE)

    var team: String
        get() = sp.getString("team", "SS") ?: "SS"
        set(v) = sp.edit().putString("team", v).apply()

    var autoWatch: Boolean
        get() = sp.getBoolean("autoWatch", true)
        set(v) = sp.edit().putBoolean("autoWatch", v).apply()

    var intervalSec: Int
        get() = sp.getInt("intervalSec", 10)
        set(v) = sp.edit().putInt("intervalSec", v).apply()

    fun enabled(kind: Kind): Boolean = sp.getBoolean("kind_${kind.name}", true)
    fun setEnabled(kind: Kind, on: Boolean) = sp.edit().putBoolean("kind_${kind.name}", on).apply()

    var engineState: String?
        get() = sp.getString("engine", null)
        set(v) = sp.edit().putString("engine", v).apply()

    var lastStatusLine: String
        get() = sp.getString("statusLine", "") ?: ""
        set(v) = sp.edit().putString("statusLine", v).apply()

    var nextGameLine: String
        get() = sp.getString("nextGame", "") ?: ""
        set(v) = sp.edit().putString("nextGame", v).apply()

    /** 사용자가 이 경기 감시를 직접 멈췄으면 같은 경기를 다시 자동으로 시작하지 않는다. */
    var stoppedGameId: String
        get() = sp.getString("stoppedGame", "") ?: ""
        set(v) = sp.edit().putString("stoppedGame", v).apply()

    var notifSeq: Int
        get() = sp.getInt("notifSeq", 100)
        set(v) = sp.edit().putInt("notifSeq", v).apply()
}
