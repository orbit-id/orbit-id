use orbit_id::{
    decode, encode, from_decimal_string, is_valid, parse, to_decimal_string, to_hex_string,
    GenerateDecision, GeneratorOptions, OrbitErrorCode, OrbitFields, OrbitGenerator,
    SequenceExhaustedMode,
};
use serde::Deserialize;
use std::sync::Arc;

#[derive(Deserialize)]
struct EncodeDecodeFixture {
    cases: Vec<EncodeDecodeCase>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct EncodeDecodeCase {
    timestamp: String,
    #[serde(rename = "type")]
    type_: u8,
    node: u8,
    sequence: u16,
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
    type_: u8,
    node: u8,
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
fn encode_decode_conformance() {
    let fixture: EncodeDecodeFixture =
        serde_json::from_str(include_str!("../../../spec/conformance/encode-decode.v1.json")).unwrap();

    for case in fixture.cases {
        let fields = OrbitFields {
            timestamp: case.timestamp.parse().unwrap(),
            r#type: case.type_,
            node: case.node,
            sequence: case.sequence,
        };
        let id = encode(fields).unwrap();
        assert_eq!(to_decimal_string(id), case.id_decimal);
        assert_eq!(to_hex_string(id), case.id_hex.to_lowercase());
        assert_eq!(decode(id), fields);
        assert_eq!(parse(&case.id_decimal).unwrap(), fields);
        assert_eq!(from_decimal_string(&case.id_decimal).unwrap(), id);
        assert!(is_valid(&case.id_decimal));
    }
}

#[test]
fn decimal_rejection_conformance() {
    let fixture: RejectFixture =
        serde_json::from_str(include_str!("../../../spec/conformance/decode-reject.v1.json")).unwrap();

    for case in fixture.cases {
        let error = from_decimal_string(&case.input).unwrap_err();
        assert_eq!(error.code, OrbitErrorCode::InvalidDecimal);
        assert!(!is_valid(&case.input));
    }
    assert_eq!(from_decimal_string("0").unwrap(), 0);
}

#[test]
fn generator_conformance() {
    let fixture: GeneratorFixture =
        serde_json::from_str(include_str!("../../../spec/conformance/generator.v1.json")).unwrap();

    for case in fixture.cases {
        let options = GeneratorOptions {
            node: case.node,
            clock: Arc::new(|| 0_i64),
            clock_rollback_tolerance_ms: 5_000,
            on_sequence_exhausted: SequenceExhaustedMode::Fail,
            confirm_ownership: None,
        };
        let generator = OrbitGenerator::new(options).unwrap();
        generator
            .restore_state(case.prior.last_timestamp.parse().unwrap(), case.prior.sequence)
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
                    GenerateDecision::WaitNextMs { .. } if allowed.iter().any(|a| a == "wait_next_ms") => {}
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
fn generator_rejects_type_zero() {
    let generator = OrbitGenerator::new(GeneratorOptions::new(7)).unwrap();
    let error = generator.generate(0).unwrap_err();
    assert_eq!(error.code, OrbitErrorCode::InvalidType);
}

#[test]
fn generate_helpers_and_getters() {
    use orbit_id::{
        encode, from_unix_time_ms, get_node, get_sequence, get_timestamp, get_type, to_unix_time_ms,
        OrbitErrorCode,
    };
    use std::sync::atomic::{AtomicUsize, Ordering};
    use std::sync::Mutex;

    let ticks = Arc::new(Mutex::new(vec![1000_i64, 1000, 1001, 1001]));
    let index = Arc::new(AtomicUsize::new(0));
    let ticks_c = ticks.clone();
    let index_c = index.clone();
    let generator = OrbitGenerator::new(GeneratorOptions {
        node: 7,
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
    assert_eq!(generator.node(), 7);
    assert_eq!(generator.last_timestamp(), 0);
    assert_eq!(generator.sequence(), 0);
    let id = generator.generate(1).unwrap();
    assert_ne!(id, 0);
    assert!(generator.last_timestamp() > 0);

    let wait_ticks = Arc::new(Mutex::new(vec![1000_i64, 1000, 1001, 1001]));
    let wait_index = Arc::new(AtomicUsize::new(0));
    let wait_ticks_c = wait_ticks.clone();
    let wait_index_c = wait_index.clone();
    let waiter = OrbitGenerator::new(GeneratorOptions {
        node: 7,
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
    waiter.restore_state(1000, 1023).unwrap();
    assert!(waiter.generate(1).unwrap() != 0);
    assert_eq!(waiter.last_timestamp(), 1001);

    let fields = OrbitFields {
        timestamp: 16_762_354_567,
        r#type: 2,
        node: 7,
        sequence: 42,
    };
    let sample = encode(fields).unwrap();
    assert_eq!(get_timestamp(sample), 16_762_354_567);
    assert_eq!(get_type(sample), 2);
    assert_eq!(get_node(sample), 7);
    assert_eq!(get_sequence(sample), 42);
    assert_eq!(from_unix_time_ms(to_unix_time_ms(0)).unwrap(), 0);

    assert!(encode(OrbitFields {
        timestamp: 1,
        r#type: 99,
        node: 1,
        sequence: 0
    })
    .unwrap_err()
    .code
        == OrbitErrorCode::InvalidType);

    let lost = OrbitGenerator::new(GeneratorOptions {
        node: 1,
        clock: Arc::new(|| 5),
        clock_rollback_tolerance_ms: 5_000,
        on_sequence_exhausted: SequenceExhaustedMode::Fail,
        confirm_ownership: Some(Arc::new(|| false)),
    })
    .unwrap();
    assert_eq!(lost.generate(1).unwrap_err().code, OrbitErrorCode::NodeOwnershipLost);
}
