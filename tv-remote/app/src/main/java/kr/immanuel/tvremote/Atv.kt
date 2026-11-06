package kr.immanuel.tvremote

import android.content.Context
import android.net.nsd.NsdManager
import android.net.nsd.NsdServiceInfo
import android.os.Build
import org.bouncycastle.asn1.x500.X500Name
import org.bouncycastle.asn1.x509.BasicConstraints
import org.bouncycastle.asn1.x509.Extension
import org.bouncycastle.cert.jcajce.JcaX509CertificateConverter
import org.bouncycastle.cert.jcajce.JcaX509v3CertificateBuilder
import org.bouncycastle.operator.jcajce.JcaContentSignerBuilder
import java.io.File
import java.io.InputStream
import java.io.OutputStream
import java.math.BigInteger
import java.net.InetSocketAddress
import java.security.KeyPairGenerator
import java.security.KeyStore
import java.security.SecureRandom
import java.security.cert.X509Certificate
import java.security.interfaces.RSAPublicKey
import java.util.Date
import java.util.concurrent.ArrayBlockingQueue
import java.util.concurrent.TimeUnit
import javax.net.ssl.KeyManagerFactory
import javax.net.ssl.SSLContext
import javax.net.ssl.SSLSocket
import javax.net.ssl.TrustManager
import javax.net.ssl.X509TrustManager

/** 구글 TV 연결 (페어링, 리모컨 세션, 같은 와이파이의 TV 찾기). */
object Atv {
    private const val PAIR_PORT = 6467
    private const val REMOTE_PORT = 6466
    private const val PASS = "tvremote"

    // ---------------- 인증서 ----------------
    /** 이 폰의 리모컨 인증서. 처음 한 번 만들어 앱 저장소에 둔다. 지우면 다시 페어링해야 한다. */
    @Synchronized
    private fun keyStore(ctx: Context): KeyStore {
        val f = File(ctx.filesDir, "atv-client.p12")
        val ks = KeyStore.getInstance("PKCS12")
        if (f.exists()) {
            runCatching { f.inputStream().use { ks.load(it, PASS.toCharArray()) }; return ks }
        }
        val kpg = KeyPairGenerator.getInstance("RSA")
        kpg.initialize(2048, SecureRandom())
        val kp = kpg.generateKeyPair()
        val name = X500Name("CN=atvremote/${Build.MODEL}")
        val now = System.currentTimeMillis()
        val builder = JcaX509v3CertificateBuilder(
            name, BigInteger.valueOf(now), Date(now - 86_400_000L), Date(now + 3650L * 86_400_000L), name, kp.public
        ).addExtension(Extension.basicConstraints, true, BasicConstraints(true))
        val signer = JcaContentSignerBuilder("SHA256WithRSA").build(kp.private)
        val cert = JcaX509CertificateConverter().getCertificate(builder.build(signer))
        ks.load(null, null)
        ks.setKeyEntry("client", kp.private, PASS.toCharArray(), arrayOf(cert))
        f.outputStream().use { ks.store(it, PASS.toCharArray()) }
        return ks
    }

    private fun clientCert(ctx: Context): X509Certificate = keyStore(ctx).getCertificate("client") as X509Certificate

    private fun open(ctx: Context, host: String, port: Int, timeoutMs: Int): SSLSocket {
        val kmf = KeyManagerFactory.getInstance(KeyManagerFactory.getDefaultAlgorithm())
        kmf.init(keyStore(ctx), PASS.toCharArray())
        // TV 인증서는 TV가 스스로 만든 것이라 검증할 기관이 없다. 같은 집 와이파이 안에서만 쓴다.
        val trustAll = object : X509TrustManager {
            override fun checkClientTrusted(chain: Array<X509Certificate>?, authType: String?) {}
            override fun checkServerTrusted(chain: Array<X509Certificate>?, authType: String?) {}
            override fun getAcceptedIssuers(): Array<X509Certificate> = emptyArray()
        }
        val ssl = SSLContext.getInstance("TLS")
        ssl.init(kmf.keyManagers, arrayOf<TrustManager>(trustAll), SecureRandom())
        val raw = java.net.Socket()
        raw.connect(InetSocketAddress(host, port), timeoutMs)
        raw.soTimeout = timeoutMs
        val s = ssl.socketFactory.createSocket(raw, host, port, true) as SSLSocket
        s.startHandshake()
        return s
    }

    private fun send(out: OutputStream, body: ByteArray) {
        synchronized(out) { out.write(PB.frame(body)); out.flush() }
    }

    // ---------------- 페어링 ----------------
    /** 진행 중인 페어링 (TV에 코드가 떠 있는 상태). */
    class Pairing internal constructor(private val ctx: Context, val host: String, private val sock: SSLSocket) {
        private val input: InputStream = sock.inputStream
        private val out: OutputStream = sock.outputStream

        /** TV 화면의 6자리 코드를 넣어 페어링을 마친다. */
        fun finish(pin: String) {
            try {
                val c = (clientCert(ctx).publicKey as RSAPublicKey)
                val s = (sock.session.peerCertificates[0] as X509Certificate).publicKey as RSAPublicKey
                val secret = AtvWire.secret(c.modulus, c.publicExponent, s.modulus, s.publicExponent, pin)
                    ?: throw IllegalArgumentException("코드가 맞지 않습니다. TV 화면의 6자리를 다시 확인해 주세요.")
                send(out, AtvWire.pairingSecret(secret))
                val r = PB.readFrame(input) ?: throw IllegalStateException("TV가 연결을 끊었습니다.")
                if (AtvWire.pairingKind(r) != AtvWire.Pair.SECRET_ACK)
                    throw IllegalStateException("TV가 코드를 받아들이지 않았습니다 (상태 ${AtvWire.pairingStatus(r)}).")
            } finally {
                close()
            }
        }

        fun close() = runCatching { sock.close() }
    }

    /** 페어링을 시작한다. 성공하면 TV 화면에 6자리 코드가 뜬다. */
    fun startPairing(ctx: Context, host: String): Pairing {
        val sock = open(ctx, host, PAIR_PORT, 10_000)
        try {
            val input = sock.inputStream
            val out = sock.outputStream
            send(out, AtvWire.pairingRequest("TV 한번에 (${Build.MODEL})"))
            while (true) {
                val r = PB.readFrame(input) ?: throw IllegalStateException("TV가 연결을 끊었습니다.")
                when (AtvWire.pairingKind(r)) {
                    AtvWire.Pair.REQUEST_ACK -> send(out, AtvWire.pairingOptions())
                    AtvWire.Pair.OPTIONS -> send(out, AtvWire.pairingConfiguration())
                    AtvWire.Pair.CONFIG_ACK -> {
                        sock.soTimeout = 120_000
                        return Pairing(ctx, host, sock)
                    }
                    AtvWire.Pair.ERROR -> throw IllegalStateException("TV가 페어링을 거절했습니다 (상태 ${AtvWire.pairingStatus(r)}).")
                    else -> {}
                }
            }
        } catch (e: Exception) {
            runCatching { sock.close() }
            throw e
        }
    }

    // ---------------- 리모컨 세션 ----------------
    /**
     * 리모컨 연결. 연결 후 TV가 준비를 마치면(remote_start) 명령을 보낼 수 있다.
     * 받는 쪽 스레드가 핑에 답하고, 켜짐 상태·지금 앱·입력창 정보를 기억한다.
     */
    class Session internal constructor(val host: String, private val sock: SSLSocket) {
        private val out = sock.outputStream
        @Volatile var isOn: Boolean? = null; private set
        @Volatile var currentApp: String = ""; private set
        @Volatile var volume: String = ""; private set
        @Volatile private var ime: Pair<Long, Long> = 0L to 0L
        @Volatile var closed = false; private set
        @Volatile var lastUse = System.currentTimeMillis()
        private val started = ArrayBlockingQueue<Boolean>(1)
        var onChange: (() -> Unit)? = null

        init {
            Thread({ readLoop() }, "atv-read").apply { isDaemon = true }.start()
        }

        private fun readLoop() {
            try {
                sock.soTimeout = 0
                val input = sock.inputStream
                var features = 0L
                while (!closed) {
                    val raw = PB.readFrame(input) ?: break
                    when (val m = AtvWire.parse(raw)) {
                        is AtvWire.In.Configure -> {
                            features = m.features
                            send(out, AtvWire.configure(features, Build.MODEL, Build.MANUFACTURER))
                        }
                        AtvWire.In.SetActive -> send(out, AtvWire.setActive(features))
                        is AtvWire.In.Ping -> send(out, AtvWire.pingResponse(m.v))
                        is AtvWire.In.Started -> { isOn = m.on; started.offer(m.on); onChange?.invoke() }
                        is AtvWire.In.CurrentApp -> { if (m.pkg.isNotEmpty()) currentApp = m.pkg; onChange?.invoke() }
                        is AtvWire.In.Ime -> ime = m.imeCounter to m.fieldCounter
                        is AtvWire.In.Volume -> { volume = if (m.muted) "음소거" else "${m.level}/${m.max}"; onChange?.invoke() }
                        else -> {}
                    }
                }
            } catch (_: Exception) {
            } finally {
                close()
                onChange?.invoke()
            }
        }

        /** TV가 명령을 받을 준비가 될 때까지 기다린다. */
        fun awaitReady(ms: Long): Boolean = isOn != null || started.poll(ms, TimeUnit.MILLISECONDS) != null

        private fun write(b: ByteArray) {
            if (closed) throw IllegalStateException("구글 TV 연결이 끊겼습니다.")
            lastUse = System.currentTimeMillis()
            try { send(out, b) } catch (e: Exception) { close(); throw IllegalStateException("구글 TV에 보내지 못했습니다.") }
        }

        fun key(code: Int) = write(AtvWire.key(code))
        fun app(link: String) = write(AtvWire.appLink(link))
        fun text(value: String) {
            if (value.isEmpty()) return
            write(AtvWire.text(ime.first, ime.second, value))
        }

        fun close() {
            closed = true
            runCatching { sock.close() }
        }
    }

    @Volatile private var session: Session? = null

    /** 열려 있는 연결을 다시 쓰거나 새로 연결한다. */
    @Synchronized
    fun session(ctx: Context, waitReadyMs: Long = 4000): Session {
        val host = Store.tvHost(ctx) ?: throw IllegalStateException("먼저 설정에서 구글 TV를 연결해 주세요.")
        session?.let { if (!it.closed && it.host == host) return it }
        session?.close()
        val s = try {
            Session(host, open(ctx, host, REMOTE_PORT, 5000))
        } catch (e: javax.net.ssl.SSLException) {
            throw IllegalStateException("구글 TV가 이 폰을 모릅니다. 설정에서 다시 페어링해 주세요.")
        } catch (e: java.io.IOException) {
            throw IllegalStateException("구글 TV($host)에 연결하지 못했습니다. 같은 와이파이인지 확인해 주세요.")
        }
        session = s
        s.onChange = { listeners.forEach { runCatching { it() } } }
        s.awaitReady(waitReadyMs)
        return s
    }

    fun current(): Session? = session?.takeIf { !it.closed }

    fun disconnect() {
        session?.close(); session = null
    }

    val listeners = java.util.concurrent.CopyOnWriteArrayList<() -> Unit>()

    /** 오래 쓰지 않은 연결은 닫는다 (배터리). */
    fun closeIfIdle(ms: Long) {
        val s = session ?: return
        if (System.currentTimeMillis() - s.lastUse > ms) disconnect()
    }

    // ---------------- 찾기 ----------------
    data class Found(val name: String, val host: String)

    /** 같은 와이파이에서 리모컨 서비스(_androidtvremote2._tcp)를 찾는다. */
    fun discover(ctx: Context, ms: Long = 4000): List<Found> {
        val nsd = ctx.getSystemService(NsdManager::class.java) ?: return emptyList()
        val found = java.util.concurrent.ConcurrentHashMap<String, Found>()
        val pending = java.util.concurrent.LinkedBlockingQueue<NsdServiceInfo>()
        val listener = object : NsdManager.DiscoveryListener {
            override fun onDiscoveryStarted(serviceType: String?) {}
            override fun onDiscoveryStopped(serviceType: String?) {}
            override fun onStartDiscoveryFailed(serviceType: String?, errorCode: Int) {}
            override fun onStopDiscoveryFailed(serviceType: String?, errorCode: Int) {}
            override fun onServiceLost(serviceInfo: NsdServiceInfo?) {}
            override fun onServiceFound(info: NsdServiceInfo) { pending.offer(info) }
        }
        try {
            nsd.discoverServices("_androidtvremote2._tcp", NsdManager.PROTOCOL_DNS_SD, listener)
            val end = System.currentTimeMillis() + ms
            while (System.currentTimeMillis() < end) {
                val info = pending.poll(200, TimeUnit.MILLISECONDS) ?: continue
                val done = ArrayBlockingQueue<Boolean>(1)
                @Suppress("DEPRECATION")
                nsd.resolveService(info, object : NsdManager.ResolveListener {
                    override fun onResolveFailed(serviceInfo: NsdServiceInfo?, errorCode: Int) { done.offer(false) }
                    override fun onServiceResolved(r: NsdServiceInfo) {
                        val h = r.host?.hostAddress
                        if (h != null && !h.contains(':')) found[h] = Found(r.serviceName ?: h, h)
                        done.offer(true)
                    }
                })
                done.poll(3, TimeUnit.SECONDS)
            }
        } catch (_: Exception) {
        } finally {
            runCatching { nsd.stopServiceDiscovery(listener) }
        }
        return found.values.sortedBy { it.name }
    }
}
