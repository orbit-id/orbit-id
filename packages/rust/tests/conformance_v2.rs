use orbit_id::v2::{
    decode, encode, from_decimal_string, get_format_version, get_node, get_region, get_reserved,
    get_sequence, get_tenant, get_timestamp, get_type, is_valid, is_valid_id, parse,
    to_decimal_string, to_hex_string, to_base64url_string, from_base64url_string,
    GenerateDecision, GeneratorOptions, OrbitErrorCode,
    OrbitFields, OrbitGenerator, SequenceExhaustedMode, ISSUED_FORMAT_VERSION, MAX_SEQUENCE,
};
use serde::Deserialize;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::{Arc, Mutex};

#[derive(Deserialize)]
struct EncodeDecodeFixture {
    cases: Vec<EncodeDecodeCase>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct EncodeDecodeCase {
    format_version: u8,
    timestamp: String,
    #[serde(rename = "type")]
    type_: u16,
    node: u16,
    sequence: u16,
    region: u8,
    tenant: u16,
    reserved: u8,
    id_decimal: String,
    id_hex: String,
}

#[derive(Deserialize)]
struct RejectFixture {
    cases: Vec<RejectCase>,
}

#[derive(Deserialize)]
struct RejectCase {
    input: String,
    code: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct GeneratorFixture {
    cases: Vec<GeneratorCase>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct GeneratorCase {
    id: String,
    prior: Prior,
    now_timestamp: String,
    #[serde(rename = "type")]
    type_: u16,
    node: u16,
    expect: Expected,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Prior {
    last_timestamp: String,
    sequence: u16,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Expected {
    action: String,
    timestamp: Option<String>,
    sequence: Option<u16>,
    wait_until_timestamp: Option<String>,
    allowed_actions: Option<Vec<String>>,
    error: Option<String>,
}

#[test]
fn encode_decode_conformance_v2() {
    let fixture: EncodeDecodeFixture =
        serde_json::from_str(include_str!("../../../spec/conformance/encode-decode.v2.json"))
            .unwrap();

    for case in fixture.cases {
        let fields = OrbitFields {
            format_version: case.format_version,
            timestamp: case.timestamp.parse().unwrap(),
            r#type: case.type_,
            node: case.node,
            sequence: case.sequence,
            region: case.region,
            tenant: case.tenant,
            reserved: case.reserved,
        };
        let id = encode(fields).unwrap();
        assert_eq!(to_decimal_string(id), case.id_decimal);
        assert_eq!(to_hex_string(id), case.id_hex.to_lowercase());
        assert_eq!(
            from_base64url_string(&to_base64url_string(id)).unwrap(),
            id
        );
        assert_eq!(decode(id).unwrap(), fields);
        assert_eq!(parse(&case.id_decimal).unwrap(), fields);
        assert_eq!(from_decimal_string(&case.id_decimal).unwrap(), id);
        assert_eq!(get_format_version(id).unwrap(), case.format_version);
        assert_eq!(get_timestamp(id).unwrap(), fields.timestamp);
        assert_eq!(get_type(id).unwrap(), case.type_);
        assert_eq!(get_node(id).unwrap(), case.node);
        assert_eq!(get_sequence(id).unwrap(), case.sequence);
        assert_eq!(get_region(id).unwrap(), case.region);
        assert_eq!(get_tenant(id).unwrap(), case.tenant);
        assert_eq!(get_reserved(id).unwrap(), case.reserved);
        assert!(is_valid(&case.id_decimal));
        assert!(is_valid_id(id));
    }
}

#[test]
fn decimal_rejection_conformance_v2() {
    let fixture: RejectFixture =
        serde_json::from_str(include_str!("../../../spec/conformance/decode-reject.v2.json"))
            .unwrap();

    for case in fixture.cases {
        let code = case.code.as_deref().unwrap_or("INVALID_DECIMAL");
        if code == "INVALID_DECIMAL" {
            let error = from_decimal_string(&case.input).unwrap_err();
            assert_eq!(error.code, OrbitErrorCode::InvalidDecimal);
        } else {
            assert!(from_decimal_string(&case.input).is_ok());
            let error = parse(&case.input).unwrap_err();
            assert_eq!(
                error.code,
                match code {
                    "INVALID_RESERVED" => OrbitErrorCode::InvalidReserved,
                    "INVALID_FORMAT_VERSION" => OrbitErrorCode::InvalidFormatVersion,
                    other => panic!("unexpected reject code: {other}"),
                }
            );
        }
        assert!(!is_valid(&case.input));
    }
    assert_eq!(from_decimal_string("0").unwrap(), 0);
    assert!(!is_valid("0")); // FormatVersion 0
}

#[test]
fn generator_conformance_v2() {
    let fixture: GeneratorFixture =
        serde_json::from_str(include_str!("../../../spec/conformance/generator.v2.json")).unwrap();

    for case in fixture.cases {
        let options = GeneratorOptions {
            node: case.node,
            region: 0,
            tenant: 0,
            clock: Arc::new(|| 0_i64),
            clock_rollback_tolerance_ms: 5_000,
            on_sequence_exhausted: SequenceExhaustedMode::Fail,
            confirm_ownership: None,
        };
        let generator = OrbitGenerator::new(options).unwrap();
        generator
            .restore_state(
                case.prior.last_timestamp.parse().unwrap(),
                case.prior.sequence,
            )
            .unwrap();
        let decision = generator.decide_at(case.type_, case.now_timestamp.parse().unwrap());

        match case.expect.action.as_str() {
            "issue" => assert_eq!(
                decision,
                GenerateDecision::Issue {
                    timestamp: case.expect.timestamp.unwrap().parse().unwrap(),
                    sequence: case.expect.sequence.unwrap(),
                }
            ),
            "wait" => assert_eq!(
                decision,
                GenerateDecision::Wait {
                    wait_until_timestamp: case.expect.wait_until_timestamp.unwrap().parse().unwrap(),
                }
            ),
            "wait_or_fail" => {
                let allowed = case.expect.allowed_actions.clone().unwrap_or_default();
                match &decision {
                    GenerateDecision::WaitNextMs { .. }
                        if allowed.iter().any(|a| a == "wait_next_ms") => {}
                    GenerateDecision::Error { error }
                        if allowed.iter().any(|a| a == "error")
                            && matches!(
                                (error, case.expect.error.as_deref()),
                                (OrbitErrorCode::SequenceExhausted, Some("SEQUENCE_EXHAUSTED"))
                            ) => {}
                    other => panic!("unexpected wait_or_fail decision for {}: {other:?}", case.id),
                }
            }
            "error" => assert_eq!(
                decision,
                GenerateDecision::Error {
                    error: match case.expect.error.as_deref().unwrap() {
                        "CLOCK_ROLLBACK" => OrbitErrorCode::ClockRollback,
                        "SEQUENCE_EXHAUSTED" => OrbitErrorCode::SequenceExhausted,
                        "INVALID_TYPE" => OrbitErrorCode::InvalidType,
                        value => panic!("unexpected error code: {value}"),
                    },
                }
            ),
            action => panic!("unexpected action: {action}"),
        }
    }
}

#[test]
fn generator_rejects_type_zero_v2() {
    let generator = OrbitGenerator::new(GeneratorOptions::new(7)).unwrap();
    let error = generator.generate(0).unwrap_err();
    assert_eq!(error.code, OrbitErrorCode::InvalidType);
}

#[test]
fn generate_helpers_and_decode_guards_v2() {
    let ticks = Arc::new(Mutex::new(vec![1000_i64, 1000, 1001, 1001]));
    let index = Arc::new(AtomicUsize::new(0));
    let ticks_c = ticks.clone();
    let index_c = index.clone();
    let generator = OrbitGenerator::new(GeneratorOptions {
        node: 7,
        region: 3,
        tenant: 1000,
        clock: Arc::new(move || {
            let i = index_c.fetch_add(1, Ordering::SeqCst);
            let values = ticks_c.lock().unwrap();
            values[i.min(values.len() - 1)]
        }),
        clock_rollback_tolerance_ms: 5_000,
        on_sequence_exhausted: SequenceExhaustedMode::Wait,
        confirm_ownership: None,
    })
    .unwrap();
    assert_eq!(generator.region(), 3);
    assert_eq!(generator.tenant(), 1000);
    let id = generator.generate(1).unwrap();
    assert_eq!(get_format_version(id).unwrap(), ISSUED_FORMAT_VERSION);
    assert_eq!(get_region(id).unwrap(), 3);
    assert_eq!(get_tenant(id).unwrap(), 1000);
    assert_eq!(get_reserved(id).unwrap(), 0);

    let wait_ticks = Arc::new(Mutex::new(vec![1000_i64, 1000, 1001, 1001]));
    let wait_index = Arc::new(AtomicUsize::new(0));
    let wait_ticks_c = wait_ticks.clone();
    let wait_index_c = wait_index.clone();
    let waiter = OrbitGenerator::new(GeneratorOptions {
        node: 7,
        region: 0,
        tenant: 0,
        clock: Arc::new(move || {
            let i = wait_index_c.fetch_add(1, Ordering::SeqCst);
            let values = wait_ticks_c.lock().unwrap();
            values[i.min(values.len() - 1)]
        }),
        clock_rollback_tolerance_ms: 5_000,
        on_sequence_exhausted: SequenceExhaustedMode::Wait,
        confirm_ownership: None,
    })
    .unwrap();
    waiter.restore_state(1000, MAX_SEQUENCE).unwrap();
    let waited = waiter.generate(1).unwrap();
    assert_eq!(get_timestamp(waited).unwrap(), 1001);

    assert_eq!(
        encode(OrbitFields {
            format_version: 0,
            timestamp: 0,
            r#type: 1,
            node: 1,
            sequence: 0,
            region: 0,
            tenant: 0,
            reserved: 0,
        })
        .unwrap_err()
        .code,
        OrbitErrorCode::InvalidFormatVersion
    );
    assert_eq!(
        encode(OrbitFields {
            format_version: 1,
            timestamp: 0,
            r#type: 1,
            node: 1,
            sequence: 0,
            region: 16,
            tenant: 0,
            reserved: 0,
        })
        .unwrap_err()
        .code,
        OrbitErrorCode::InvalidRegion
    );
    assert_eq!(
        encode(OrbitFields {
            format_version: 1,
            timestamp: 0,
            r#type: 1,
            node: 1,
            sequence: 0,
            region: 0,
            tenant: 0,
            reserved: 1,
        })
        .unwrap_err()
        .code,
        OrbitErrorCode::InvalidReserved
    );
    assert_eq!(
        decode(0).unwrap_err().code,
        OrbitErrorCode::InvalidFormatVersion
    );
    let with_reserved = encode(OrbitFields {
        format_version: 1,
        timestamp: 0,
        r#type: 1,
        node: 7,
        sequence: 0,
        region: 0,
        tenant: 0,
        reserved: 0,
    })
    .unwrap()
        | 1;
    assert_eq!(
        decode(with_reserved).unwrap_err().code,
        OrbitErrorCode::InvalidReserved
    );
    assert_eq!(
        OrbitGenerator::new(GeneratorOptions {
            node: 1,
            region: 16,
            tenant: 0,
            clock: Arc::new(|| 0_i64),
            clock_rollback_tolerance_ms: 5_000,
            on_sequence_exhausted: SequenceExhaustedMode::Wait,
            confirm_ownership: None,
        })
        .err()
        .map(|e| e.code),
        Some(OrbitErrorCode::InvalidRegion)
    );
}
