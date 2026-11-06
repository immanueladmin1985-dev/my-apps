package kr.immanuel.tvremote

import java.io.ByteArrayOutputStream
import java.io.InputStream

/**
 * 구글 TV 리모컨 프로토콜에 필요한 만큼만 구현한 protobuf 인코더·디코더.
 * (protobuf 라이브러리를 넣지 않으려고 직접 만들었다. 필드 번호는 polo.proto, remotemessage.proto 기준)
 */
class PB {
    private val out = ByteArrayOutputStream()

    private fun varint(v: Long) {
        var x = v
        while (true) {
            if (x and 0x7FL.inv() == 0L) {
                out.write(x.toInt()); return
            }
            out.write(((x and 0x7F) or 0x80).toInt())
            x = x ushr 7
        }
    }

    private fun tag(field: Int, wire: Int) = varint(((field shl 3) or wire).toLong())

    fun int(field: Int, v: Long): PB { tag(field, 0); varint(v); return this }
    fun int(field: Int, v: Int): PB = int(field, v.toLong())
    fun bool(field: Int, v: Boolean): PB = int(field, if (v) 1 else 0)
    fun bytes(field: Int, b: ByteArray): PB { tag(field, 2); varint(b.size.toLong()); out.write(b); return this }
    fun str(field: Int, s: String): PB = bytes(field, s.toByteArray(Charsets.UTF_8))
    fun msg(field: Int, m: PB): PB = bytes(field, m.build())
    fun build(): ByteArray = out.toByteArray()

    companion object {
        /** 메시지 앞에 varint 길이를 붙인다 (구글 TV 프로토콜의 메시지 구분 방식). */
        fun frame(body: ByteArray): ByteArray {
            val o = ByteArrayOutputStream()
            var x = body.size.toLong()
            while (x >= 0x80) { o.write(((x and 0x7F) or 0x80).toInt()); x = x ushr 7 }
            o.write(x.toInt())
            o.write(body)
            return o.toByteArray()
        }

        /** 스트림에서 길이가 붙은 메시지 하나를 읽는다. 연결이 끊기면 null. */
        fun readFrame(input: InputStream): ByteArray? {
            var len = 0L
            var shift = 0
            while (true) {
                val b = input.read()
                if (b < 0) return null
                len = len or ((b and 0x7F).toLong() shl shift)
                if (b and 0x80 == 0) break
                shift += 7
                if (shift > 35) throw IllegalStateException("메시지 길이를 읽지 못했습니다")
            }
            if (len > 1_000_000) throw IllegalStateException("메시지가 너무 깁니다")
            val buf = ByteArray(len.toInt())
            var off = 0
            while (off < buf.size) {
                val n = input.read(buf, off, buf.size - off)
                if (n < 0) return null
                off += n
            }
            return buf
        }
    }
}

/** 디코딩한 protobuf 메시지. 같은 번호의 필드가 여러 번 오면 모두 보관한다. */
class PMsg(bytes: ByteArray) {
    private val ints = HashMap<Int, MutableList<Long>>()
    private val blobs = HashMap<Int, MutableList<ByteArray>>()

    init {
        var p = 0
        fun rv(): Long {
            var r = 0L
            var s = 0
            while (true) {
                if (p >= bytes.size) throw IllegalStateException("protobuf 끝이 잘렸습니다")
                val b = bytes[p++].toInt() and 0xFF
                r = r or ((b and 0x7F).toLong() shl s)
                if (b and 0x80 == 0) return r
                s += 7
            }
        }
        while (p < bytes.size) {
            val key = rv()
            val field = (key ushr 3).toInt()
            when ((key and 7).toInt()) {
                0 -> ints.getOrPut(field) { mutableListOf() }.add(rv())
                1 -> p += 8
                2 -> {
                    val n = rv().toInt()
                    if (n < 0 || p + n > bytes.size) throw IllegalStateException("protobuf 길이가 잘못되었습니다")
                    blobs.getOrPut(field) { mutableListOf() }.add(bytes.copyOfRange(p, p + n))
                    p += n
                }
                5 -> p += 4
                else -> throw IllegalStateException("알 수 없는 protobuf 형식")
            }
        }
    }

    fun has(field: Int) = ints.containsKey(field) || blobs.containsKey(field)
    fun int(field: Int, def: Long = 0): Long = ints[field]?.lastOrNull() ?: def
    fun bool(field: Int) = int(field) != 0L
    fun bytes(field: Int): ByteArray? = blobs[field]?.lastOrNull()
    fun str(field: Int): String = bytes(field)?.toString(Charsets.UTF_8) ?: ""
    fun msg(field: Int): PMsg? = bytes(field)?.let { PMsg(it) }
}
