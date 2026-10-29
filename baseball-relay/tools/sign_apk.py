#!/usr/bin/env python3
"""
서명되지 않은 APK 에 APK Signature Scheme v2 서명을 넣는다 (안드로이드 7.0 이상에서 설치 가능).
안드로이드 SDK(apksigner) 없이 동작한다. 필요한 패키지: cryptography

사용법:
  python3 sign_apk.py <입력.apk> <출력.apk> <키스토어.p12|.jks> <비밀번호>
키스토어는 keytool 로 만든 PKCS12 형식이어야 한다.
"""
import hashlib
import struct
import sys

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives.serialization import pkcs12

SIG_RSA_PKCS1_SHA256 = 0x0103
V2_BLOCK_ID = 0x7109871A
MAGIC = b"APK Sig Block 42"
CHUNK = 1024 * 1024


def lp(b: bytes) -> bytes:
    """u32 길이 접두."""
    return struct.pack("<I", len(b)) + b


def find_eocd(data: bytes) -> int:
    for i in range(len(data) - 22, max(-1, len(data) - 22 - 65536) - 1, -1):
        if data[i:i + 4] == b"PK\x05\x06":
            comment_len = struct.unpack_from("<H", data, i + 20)[0]
            if i + 22 + comment_len == len(data):
                return i
    raise ValueError("ZIP 끝 레코드(EOCD)를 찾지 못했습니다")


def chunk_digest(sections) -> bytes:
    digests = []
    for sec in sections:
        for off in range(0, len(sec), CHUNK):
            c = sec[off:off + CHUNK]
            digests.append(hashlib.sha256(b"\xa5" + struct.pack("<I", len(c)) + c).digest())
    return hashlib.sha256(b"\x5a" + struct.pack("<I", len(digests)) + b"".join(digests)).digest()


def sign(src: str, dst: str, keystore: str, password: str) -> None:
    data = open(src, "rb").read()
    eocd = find_eocd(data)
    cd_size, cd_off = struct.unpack_from("<II", data, eocd + 12)
    if data[cd_off - 16:cd_off] == MAGIC:
        raise ValueError("이미 서명 블록이 있는 APK 입니다")

    key, cert, _ = pkcs12.load_key_and_certificates(open(keystore, "rb").read(), password.encode())
    cert_der = cert.public_bytes(serialization.Encoding.DER)
    pub_der = key.public_key().public_bytes(serialization.Encoding.DER,
                                            serialization.PublicFormat.SubjectPublicKeyInfo)

    zip_entries = data[:cd_off]
    central_dir = data[cd_off:cd_off + cd_size]
    eocd_bytes = data[eocd:]
    # 다이제스트 계산 시 EOCD 의 중앙 디렉터리 오프셋은 서명 블록 시작 위치(= 원래 cd_off)로 둔다.
    digest = chunk_digest([zip_entries, central_dir, eocd_bytes])

    digests = lp(lp(struct.pack("<I", SIG_RSA_PKCS1_SHA256) + lp(digest)))
    certificates = lp(lp(cert_der))
    attributes = lp(b"")
    signed_data = digests + certificates + attributes

    signature = key.sign(signed_data, padding.PKCS1v15(), hashes.SHA256())
    signatures = lp(lp(struct.pack("<I", SIG_RSA_PKCS1_SHA256) + lp(signature)))
    signer = lp(signed_data) + signatures + lp(pub_der)
    v2_value = lp(lp(signer))

    pair = struct.pack("<I", V2_BLOCK_ID) + v2_value
    pairs = struct.pack("<Q", len(pair)) + pair
    block_size = len(pairs) + 8 + 16  # 뒤쪽 크기 필드 + 매직
    block = struct.pack("<Q", block_size) + pairs + struct.pack("<Q", block_size) + MAGIC

    new_cd_off = cd_off + len(block)
    new_eocd = bytearray(eocd_bytes)
    struct.pack_into("<I", new_eocd, 16, new_cd_off)
    open(dst, "wb").write(zip_entries + block + central_dir + bytes(new_eocd))


if __name__ == "__main__":
    if len(sys.argv) != 5:
        print(__doc__)
        sys.exit(1)
    sign(*sys.argv[1:5])
    print("서명 완료:", sys.argv[2])
