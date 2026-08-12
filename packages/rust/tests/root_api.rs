//! Smoke tests for crate-root = v2 and the `v1` / `v2` namespaces.

#[test]
fn root_is_v2_and_v2_is_alias() {
    assert_eq!(orbit_id::MAX_NODE, 65_535);
    assert_eq!(orbit_id::v2::MAX_NODE, 65_535);
    assert_eq!(orbit_id::v1::MAX_NODE, 127);

    let fields = orbit_id::OrbitFields {
        format_version: orbit_id::ISSUED_FORMAT_VERSION,
        timestamp: 1,
        r#type: 1,
        node: 7,
        sequence: 42,
        region: 0,
        tenant: 0,
        reserved: 0,
    };
    let id = orbit_id::encode(fields).unwrap();
    let decoded = orbit_id::decode(id).unwrap();
    assert_eq!(decoded, fields);
    assert_eq!(orbit_id::v2::decode(id).unwrap(), fields);
}

#[test]
fn v1_namespace_still_encodes_64bit() {
    let fields = orbit_id::v1::OrbitFields {
        timestamp: 1,
        r#type: 1,
        node: 7,
        sequence: 42,
    };
    let id = orbit_id::v1::encode(fields).unwrap();
    assert_eq!(orbit_id::v1::decode(id).sequence, 42);
}
