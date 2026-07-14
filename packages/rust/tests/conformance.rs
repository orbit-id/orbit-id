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
