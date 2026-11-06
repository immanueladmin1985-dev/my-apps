package kr.immanuel.tvremote

import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.math.BigInteger

/** 기대값은 androidtvremote2(파이썬) 의 protobuf 직렬화와 페어링 해시로 만들었다. */
class AtvWireTest {
    private fun hex(b: ByteArray) = b.joinToString("") { "%02x".format(it) }

    @Test fun pairingMessages() {
        assertEquals("080210c801520e0a0961747672656d6f7465120158", hex(AtvWire.pairingRequest("X")))
        assertEquals("080210c801a201080a04080310061801", hex(AtvWire.pairingOptions()))
        assertEquals("080210c801f201080a04080310061001", hex(AtvWire.pairingConfiguration()))
    }

    @Test fun remoteMessages() {
        assertEquals("520508e0011003", hex(AtvWire.key(224)))
        assertEquals(
            "d205260a246d61726b65743a2f2f6c61756e63683f69643d636f6d2e6e6574666c69782e6e696e6a61",
            hex(AtvWire.appLink("com.netflix.ninja"))
        )
        assertEquals("0a2208e704121d0a014d12015618012201312a0961747672656d6f74653205312e302e30", hex(AtvWire.configure(0xFFFF, "M", "V")))
        assertEquals("aa0113080310051a0d08011209080210021a03616263", hex(AtvWire.text(3, 5, "abc")))
    }

    @Test fun appLinkKeepsUrls() {
        assertTrue(hex(AtvWire.appLink("https://www.youtube.com")).contains(hex("https://www.youtube.com".toByteArray())))
    }

    @Test fun parse() {
        fun b(h: String) = ByteArray(h.length / 2) { h.substring(it * 2, it * 2 + 2).toInt(16).toByte() }
        assertEquals(AtvWire.In.Started(true), AtvWire.parse(b("c202020801")))
        assertEquals(AtvWire.In.Ping(7), AtvWire.parse(b("420408071009")))
        assertEquals(AtvWire.In.CurrentApp("com.google.android.youtube.tv"), AtvWire.parse(b("a201210a1f621d636f6d2e676f6f676c652e616e64726f69642e796f75747562652e7476")))
        assertEquals(AtvWire.Pair.CONFIG_ACK, AtvWire.pairingKind(b("080210c801fa0100")))
        assertEquals(AtvWire.Pair.ERROR, AtvWire.pairingKind(b("0802109003")))
    }

    @Test fun frame() {
        val body = ByteArray(300) { it.toByte() }
        val f = PB.frame(body)
        assertEquals(0xAC.toByte(), f[0]); assertEquals(0x02.toByte(), f[1])
        assertArrayEquals(body, PB.readFrame(f.inputStream()))
    }

    @Test fun secret() {
        val cn = BigInteger("26211061529972496058808931736751053416274786521126889213534222138772949697550933453472138448663480348770815305718375766972407440935956399645807030105314898189743793602101363059537495352442551059601144579922665365887636253250258664527345539188760640507304895658242482340123844110922653163729277715678610811519938716236139509375334224074422311592693034669997234590656936361618614529672560190224979648940395261405626048628469287151748913602256924866632936367171899165955690560517600342017635923075102423349197424400244711285089849517046759166064750738146582583985165771750595390593167136556857082302162841372271517061709")
        val sn = BigInteger("22530289707082609254698425219184326006349186081235128085302658617562261588843183793263395356033431754298066553740221186043120828064669457081957700399150772428995433836193452037009059375997953570100179097182792725571814907863778392539358803502766366145786604259307893040580906604702313325347430011669433965520556848633144385507802772430518218320226500202198343459486050908781051483958877047176351614151002865698764766398827606825893316404369212866820869654740699117856042455695046668334632899851770896653710954197666895287662119267461856704651695994685051134808211909821699572972588169597280518545347484515687720873371")
        val e = BigInteger.valueOf(65537)
        val h = AtvWire.secret(cn, e, sn, e, "38abcd")
        assertEquals("38babafb782ab78325c0ddb21936ac0ff23fbc8931c7a9d5c254aee6139d3a7a", hex(h!!))
        assertNull(AtvWire.secret(cn, e, sn, e, "39ABCD"))
        assertNull(AtvWire.secret(cn, e, sn, e, "12345"))
    }

    @Test fun modes() {
        val json = """[{"id":"a","name":"닌텐도","emoji":"🎮","steps":[{"type":"scene","label":"TV 전원","familyId":3,"sceneId":"s1","when":"tvOff"},{"type":"wait","ms":99999},{"type":"key","code":224}]}]"""
        val m = Mode.list(json).single()
        assertEquals(3, m.steps.size)
        assertEquals(60_000L, m.steps[1].ms)
        assertTrue(m.needsTv)
        assertTrue(m.steps[0].runs(false)); assertTrue(!m.steps[0].runs(true)); assertTrue(!m.steps[0].runs(null))
        assertEquals(m, Mode.list(Mode.toJson(listOf(m))).single())
        assertTrue(Mode.list("not json").isEmpty())
    }
}
