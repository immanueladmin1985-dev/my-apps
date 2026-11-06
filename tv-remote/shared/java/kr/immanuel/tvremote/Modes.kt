package kr.immanuel.tvremote

import org.json.JSONArray
import org.json.JSONObject

/**
 * 모드 = 버튼 하나로 차례대로 실행할 단계 묶음.
 * 화면(웹)과 폰 실행기, 워치가 같은 JSON 형식을 쓴다.
 *
 * 단계 종류(type)
 *  - scene : 헤이홈 레시피 실행 (familyId, sceneId)
 *  - key   : 구글 TV 버튼 (code = 안드로이드 키코드)
 *  - app   : 구글 TV 앱 실행 (link = 패키지 이름 또는 주소)
 *  - text  : 구글 TV 입력창에 글자 넣기 (text)
 *  - wait  : 기다리기 (ms)
 *  - input : 외부입력 이동 (target = 입력 이름). 설정의 입력 목록 순서로 몇 번 움직일지 계산한다.
 * 모든 단계에 delay(ms)를 주면 그 단계를 실행하기 전에 그만큼 기다린다.
 * 조건(when): "always" | "tvOff" (구글 TV가 꺼져 있었을 때만) | "tvOn" (켜져 있었을 때만)
 * 조건은 모드를 시작할 때 확인한 구글 TV 상태로 판단한다.
 */
data class Step(
    val type: String,
    val label: String = "",
    val familyId: Long = 0,
    val sceneId: String = "",
    val code: Int = 0,
    val link: String = "",
    val text: String = "",
    val ms: Long = 0,
    val cond: String = "always",
    val delay: Long = 0,
    val target: String = "",
) {
    fun toJson(): JSONObject = JSONObject().apply {
        put("type", type)
        if (label.isNotEmpty()) put("label", label)
        if (familyId != 0L) put("familyId", familyId)
        if (sceneId.isNotEmpty()) put("sceneId", sceneId)
        if (code != 0) put("code", code)
        if (link.isNotEmpty()) put("link", link)
        if (text.isNotEmpty()) put("text", text)
        if (ms != 0L) put("ms", ms)
        if (cond != "always") put("when", cond)
        if (delay != 0L) put("delay", delay)
        if (target.isNotEmpty()) put("target", target)
    }

    /** 이 단계를 실행하려면 구글 TV 연결이 필요한가. */
    val needsTv: Boolean get() = type == "key" || type == "app" || type == "text"

    fun runs(tvWasOn: Boolean?): Boolean = when (cond) {
        "tvOff" -> tvWasOn == false
        "tvOn" -> tvWasOn == true
        else -> true
    }

    companion object {
        fun from(o: JSONObject) = Step(
            type = o.optString("type"),
            label = o.optString("label"),
            familyId = o.optLong("familyId"),
            sceneId = o.optString("sceneId"),
            code = o.optInt("code"),
            link = o.optString("link"),
            text = o.optString("text"),
            ms = o.optLong("ms").coerceIn(0, 60_000),
            cond = o.optString("when", "always").ifEmpty { "always" },
            delay = o.optLong("delay").coerceIn(0, 60_000),
            target = o.optString("target"),
        )
    }
}

data class Mode(
    val id: String,
    val name: String,
    val emoji: String = "📺",
    val steps: List<Step> = emptyList(),
) {
    /** 조건 판단에 TV 상태가 필요하거나 TV 단계가 있으면 미리 연결한다. */
    val needsTv: Boolean get() = steps.any { it.needsTv || it.cond != "always" }

    fun toJson(): JSONObject = JSONObject().apply {
        put("id", id); put("name", name); put("emoji", emoji)
        put("steps", JSONArray().apply { steps.forEach { put(it.toJson()) } })
    }

    companion object {
        fun from(o: JSONObject): Mode {
            val arr = o.optJSONArray("steps") ?: JSONArray()
            return Mode(
                id = o.optString("id"),
                name = o.optString("name").ifEmpty { "이름 없는 모드" },
                emoji = o.optString("emoji").ifEmpty { "📺" },
                steps = (0 until arr.length()).mapNotNull { arr.optJSONObject(it)?.let(Step::from) },
            )
        }

        fun list(json: String?): List<Mode> = try {
            val arr = JSONArray(json ?: "[]")
            (0 until arr.length()).mapNotNull { arr.optJSONObject(it)?.let(::from) }.filter { it.id.isNotEmpty() }
        } catch (_: Exception) {
            emptyList()
        }

        fun toJson(modes: List<Mode>): String = JSONArray().apply { modes.forEach { put(it.toJson()) } }.toString()
    }
}

/** 구글 TV 키코드 (안드로이드 KeyEvent 값과 같다). */
object Keys {
    const val HOME = 3
    const val BACK = 4
    const val UP = 19
    const val DOWN = 20
    const val LEFT = 21
    const val RIGHT = 22
    const val OK = 23
    const val VOL_UP = 24
    const val VOL_DOWN = 25
    const val POWER = 26
    const val ENTER = 66
    const val DEL = 67
    const val PLAY_PAUSE = 85
    const val MUTE = 164
    const val SETTINGS = 176
    const val TV_INPUT = 178
    const val SLEEP = 223
    const val WAKEUP = 224
}

/**
 * 외부입력 이동 계획.
 * style "menu"  : 외부입력 버튼으로 목록을 열면 커서가 지금 입력에 있고, 다음/이전 버튼으로 움직인 뒤 (확인)
 * style "cycle" : 외부입력 버튼을 누를 때마다 다음 입력으로 바뀐다 (firstOpens 면 첫 누름은 목록만 연다)
 * 결과는 "open" / "next" / "prev" / "ok" 의 차례.
 */
object InputPlan {
    fun plan(
        count: Int, current: Int, target: Int, style: String,
        wrap: Boolean, hasPrev: Boolean, hasOk: Boolean, firstOpens: Boolean,
    ): List<String> {
        if (count <= 0 || target !in 0 until count) return emptyList()
        val cur = current.coerceIn(0, count - 1)
        if (style == "cycle") {
            var n = Math.floorMod(target - cur, count)
            if (n == 0) return emptyList()
            if (firstOpens) n += 1
            return List(n) { "open" } + if (hasOk) listOf("ok") else emptyList()
        }
        if (target == cur) return emptyList()
        val forward = Math.floorMod(target - cur, count)
        val backward = Math.floorMod(cur - target, count)
        val moves: List<String> = when {
            wrap && hasPrev -> if (forward <= backward) List(forward) { "next" } else List(backward) { "prev" }
            wrap -> List(forward) { "next" }
            target > cur -> List(target - cur) { "next" }
            hasPrev -> List(cur - target) { "prev" }
            else -> return emptyList() // 이전 버튼 없이 되돌아갈 수 없다
        }
        return listOf("open") + moves + if (hasOk) listOf("ok") else emptyList()
    }
}
