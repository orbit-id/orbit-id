//! Unpadded Base64 URL (RFC 4648 §5) for Orbit ID big-endian bytes.

const ALPHABET: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

fn decode_table() -> [i8; 128] {
    let mut table = [-1i8; 128];
    for (i, &c) in ALPHABET.iter().enumerate() {
        table[c as usize] = i as i8;
    }
    table
}

pub fn encode(bytes: &[u8]) -> String {
    let mut out = String::with_capacity((bytes.len() * 8 + 5) / 6);
    let mut i = 0;
    while i < bytes.len() {
        let a = bytes[i] as u32;
        let b = if i + 1 < bytes.len() { bytes[i + 1] as u32 } else { 0 };
        let c = if i + 2 < bytes.len() { bytes[i + 2] as u32 } else { 0 };
        let n = (a << 16) | (b << 8) | c;
        out.push(ALPHABET[((n >> 18) & 63) as usize] as char);
        out.push(ALPHABET[((n >> 12) & 63) as usize] as char);
        if i + 1 < bytes.len() {
            out.push(ALPHABET[((n >> 6) & 63) as usize] as char);
        }
        if i + 2 < bytes.len() {
            out.push(ALPHABET[(n & 63) as usize] as char);
        }
        i += 3;
    }
    out
}

pub fn decode(input: &str, expected_byte_len: usize) -> Result<Vec<u8>, &'static str> {
    let expected_chars = (expected_byte_len * 8 + 5) / 6;
    if input.len() != expected_chars {
        return Err("base64url length mismatch");
    }
    if !input
        .bytes()
        .all(|b| matches!(b, b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_'))
    {
        return Err("invalid base64url alphabet");
    }

    let table = decode_table();
    let bytes = input.as_bytes();
    let mut out = Vec::with_capacity(expected_byte_len);
    let mut i = 0;
    while i < bytes.len() {
        let c0 = table[bytes[i] as usize];
        let c1 = table[bytes[i + 1] as usize];
        let c2 = if i + 2 < bytes.len() {
            table[bytes[i + 2] as usize]
        } else {
            0
        };
        let c3 = if i + 3 < bytes.len() {
            table[bytes[i + 3] as usize]
        } else {
            0
        };
        if c0 < 0 || c1 < 0 || (i + 2 < bytes.len() && c2 < 0) || (i + 3 < bytes.len() && c3 < 0) {
            return Err("invalid base64url alphabet");
        }
        let n = ((c0 as u32) << 18) | ((c1 as u32) << 12) | ((c2 as u32) << 6) | (c3 as u32);
        if out.len() < expected_byte_len {
            out.push(((n >> 16) & 0xff) as u8);
        }
        if i + 2 < bytes.len() && out.len() < expected_byte_len {
            out.push(((n >> 8) & 0xff) as u8);
        }
        if i + 3 < bytes.len() && out.len() < expected_byte_len {
            out.push((n & 0xff) as u8);
        }
        i += 4;
    }
    Ok(out)
}

pub fn u128_to_be_bytes(id: u128) -> [u8; 16] {
    id.to_be_bytes()
}

pub fn u64_to_be_bytes(id: u64) -> [u8; 8] {
    id.to_be_bytes()
}

pub fn be_bytes_to_u128(bytes: &[u8]) -> u128 {
    let mut buf = [0u8; 16];
    buf.copy_from_slice(bytes);
    u128::from_be_bytes(buf)
}

pub fn be_bytes_to_u64(bytes: &[u8]) -> u64 {
    let mut buf = [0u8; 8];
    buf.copy_from_slice(bytes);
    u64::from_be_bytes(buf)
}
