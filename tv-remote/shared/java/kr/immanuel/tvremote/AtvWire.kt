package kr.immanuel.tvremote

import java.math.BigInteger
import java.security.MessageDigest

/**
 * 구글 TV(안드로이드 TV 리모컨 v2) 프로토콜의 메시지 모양.
 * 페어링: 6467 포트, polo.proto 의 OuterMessage
 * 리모컨: 6466 포트, remotemessage.proto 의 RemoteMessage
 * 소켓을 다루는 부분은 폰 앱의 Atv.kt 에 있고, 여기에는 단위 테스트할 수 있는 순수 로직만 둔다.
 */
object AtvWire {
    // ---- 페어링 (OuterMessage) ----
    private const val STATUS_OK = 200
    private const val ENC_HEX = 3
    private const val ROLE_INPUT = 1

    private fun outer() = PB().int(1, 2).int(2, STATUS_OK)

    fun pairingRequest(clientName: String): ByteArray =
        outer().msg(10, PB().str(1, "atvremote").str(2, clientName)).build()

    fun pairingOptions(): ByteArray =
        outer().msg(20, PB().msg(1, PB().int(1, ENC_HEX).int(2, 6)).int(3, ROLE_INPUT)).build()

    fun pairingConfiguration(): ByteArray =
        outer().msg(30, PB().msg(1, PB().int(1, ENC_HEX).int(2, 6)).int(2, ROLE_INPUT)).build()

    fun pairingSecret(secret: ByteArray): ByteArray = outer().msg(40, PB().bytes(1, secret)).build()

    /** 페어링 응답 종류. */
    enum class Pair { REQUEST_ACK, OPTIONS, CONFIG_ACK, SECRET_ACK, ERROR, OTHER }

    fun pairingKind(raw: ByteArray): Pair {
        val m = PMsg(raw)
        if (m.int(2) != STATUS_OK.toLong()) return Pair.ERROR
        return when {
            m.has(11) -> Pair.REQUEST_ACK
            m.has(20) -> Pair.OPTIONS
            m.has(31) -> Pair.CONFIG_ACK
            m.has(41) -> Pair.SECRET_ACK
            else -> Pair.OTHER
        }
    }

    fun pairingStatus(raw: ByteArray): Long = PMsg(raw).int(2)

    private fun hexBytes(n: BigInteger, zeroPrefix: Boolean): ByteArray {
        var h = n.toString(16)
        if (zeroPrefix) h = "0$h"
        if (h.length % 2 == 1) h = "0$h"
        return ByteArray(h.length / 2) { h.substring(it * 2, it * 2 + 2).toInt(16).toByte() }
    }

    /**
     * TV 화면에 나온 6자리 코드로 비밀값을 만든다.
     * SHA-256(클라이언트 모듈러스, 0+지수, 서버 모듈러스, 0+지수, 코드 뒤 4자리) 이고,
     * 결과 첫 바이트가 코드 앞 2자리와 같아야 코드를 맞게 입력한 것이다. 틀리면 null.
     */
    fun secret(clientMod: BigInteger, clientExp: BigInteger, serverMod: BigInteger, serverExp: BigInteger, pin: String): ByteArray? {
        val code = pin.trim().uppercase()
        if (!Regex("[0-9A-F]{6}").matches(code)) return null
        val md = MessageDigest.getInstance("SHA-256")
        md.update(hexBytes(clientMod, false))
        md.update(hexBytes(clientExp, true))
        md.update(hexBytes(serverMod, false))
        md.update(hexBytes(serverExp, true))
        md.update(ByteArray(2) { code.substring(2 + it * 2, 4 + it * 2).toInt(16).toByte() })
        val h = md.digest()
        return if ((h[0].toInt() and 0xFF) == code.substring(0, 2).toInt(16)) h else null
    }

    // ---- 리모컨 (RemoteMessage) ----
    /** 사용할 기능: PING|KEY|IME|POWER|VOLUME|APP_LINK */
    const val FEATURES = 1 or 2 or 4 or 32 or 64 or 512

    fun configure(tvFeatures: Long, model: String, vendor: String): ByteArray =
        PB().msg(
            1, PB().int(1, FEATURES.toLong() and tvFeatures)
                .msg(2, PB().str(1, model).str(2, vendor).int(3, 1).str(4, "1").str(5, "atvremote").str(6, "1.0.0"))
        ).build()

    fun setActive(tvFeatures: Long): ByteArray = PB().msg(2, PB().int(1, FEATURES.toLong() and tvFeatures)).build()

    fun pingResponse(v: Long): ByteArray = PB().msg(9, PB().int(1, v)).build()

    /** direction: 3 = 짧게 누름 */
    fun key(code: Int, direction: Int = 3): ByteArray = PB().msg(10, PB().int(1, code).int(2, direction)).build()

    private val SCHEME = Regex("^[a-zA-Z][a-zA-Z0-9+.-]*:")

    /**
     * 패키지 이름으로 앱을 여는 주소 후보. 예전에 쓰던 market://launch?id= 는
     * 플레이 스토어 업데이트 뒤로 막혀서(AVA Connect 같은 앱을 깔면 다시 됨) 맨 뒤에 둔다.
     * storeopen: 은 우리 앱이 처리하는 표시로, 스토어 화면을 열고 ‘열기’ 버튼을 대신 누른다.
     * TV마다 되는 방식이 달라서 화면에서 차례로 시험해 보고 되는 것을 저장한다.
     */
    fun launchCandidates(pkg: String): List<String> {
        val p = pkg.trim()
        return listOf(
            "intent:#Intent;action=android.intent.action.MAIN;category=android.intent.category.LEANBACK_LAUNCHER;package=$p;end",
            "$STORE_OPEN$p",
            "https://play.google.com/store/apps/details?id=$p&launch=true",
            "market://launch?id=$p",
        )
    }

    /** 플레이 스토어의 앱 화면을 연 뒤 잠시 기다렸다가 확인(‘열기’)을 누르는 방식 */
    const val STORE_OPEN = "storeopen:"
    fun storeDetails(pkg: String) = "market://details?id=$pkg"

    /** 주소면 그대로, 패키지 이름만 있으면 첫 번째 후보로 연다. */
    fun appLink(linkOrPackage: String): ByteArray {
        val s = linkOrPackage.trim()
        val link = if (SCHEME.containsMatchIn(s)) s else launchCandidates(s).first()
        return PB().msg(90, PB().str(1, link)).build()
    }

    fun text(imeCounter: Long, fieldCounter: Long, value: String): ByteArray {
        val p = (value.length - 1).coerceAtLeast(0)
        return PB().msg(
            21, PB().int(1, imeCounter).int(2, fieldCounter)
                .msg(3, PB().int(1, 1).msg(2, PB().int(1, p).int(2, p).str(3, value)))
        ).build()
    }

    /** TV 에서 받은 리모컨 메시지를 해석한 결과. */
    sealed class In {
        data class Configure(val features: Long) : In()
        object SetActive : In()
        data class Ping(val v: Long) : In()
        data class Started(val on: Boolean) : In()
        data class CurrentApp(val pkg: String) : In()
        data class Ime(val imeCounter: Long, val fieldCounter: Long) : In()
        data class Volume(val level: Long, val max: Long, val muted: Boolean) : In()
        object Error : In()
        object Other : In()
    }

    fun parse(raw: ByteArray): In {
        val m = PMsg(raw)
        return when {
            m.has(1) -> In.Configure(m.msg(1)?.int(1) ?: 0)
            m.has(2) -> In.SetActive
            m.has(8) -> In.Ping(m.msg(8)?.int(1) ?: 0)
            m.has(40) -> In.Started(m.msg(40)?.bool(1) ?: false)
            m.has(20) -> In.CurrentApp(m.msg(20)?.msg(1)?.str(12) ?: "")
            m.has(21) -> m.msg(21)!!.let { In.Ime(it.int(1), it.int(2)) }
            m.has(50) -> m.msg(50)!!.let { In.Volume(it.int(7), it.int(6), it.bool(8)) }
            m.has(3) -> In.Error
            else -> In.Other
        }
    }
}
